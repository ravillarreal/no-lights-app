from contextlib import asynccontextmanager
import asyncio
import json
import logging
import os
from typing import Optional

import asyncpg
import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
SEARCH_RADIUS_KM: float = float(os.getenv("SEARCH_RADIUS_KM", "0.5"))
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
TELEGRAM_TOKEN: str = os.getenv("TELEGRAM_TOKEN", "")
NOTIFY_COOLDOWN_MIN: int = 30

GEO_KEY = "outages:geo"

redis_client: aioredis.Redis
db_pool: Optional[asyncpg.Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, db_pool

    redis_client = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    try:
        await redis_client.ping()
        logger.info("Conectado a Redis")
    except aioredis.ConnectionError as exc:
        raise RuntimeError(f"Cannot connect to Redis at {REDIS_HOST}:{REDIS_PORT}") from exc

    if DATABASE_URL:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        async with db_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS outage_events (
                  id           SERIAL PRIMARY KEY,
                  usuario_id   TEXT                   NOT NULL,
                  geom         GEOGRAPHY(POINT, 4326) NOT NULL,
                  neighborhood TEXT,
                  municipality TEXT,
                  state        TEXT,
                  country      TEXT,
                  raw_address  JSONB,
                  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                  ended_at     TIMESTAMPTZ,
                  duration_min INTEGER GENERATED ALWAYS AS (
                    CASE WHEN ended_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER / 60
                      ELSE NULL END
                  ) STORED
                );
                CREATE INDEX IF NOT EXISTS idx_outage_events_geom
                  ON outage_events USING GIST (geom);
                CREATE INDEX IF NOT EXISTS idx_outage_events_started
                  ON outage_events (started_at DESC);
                CREATE INDEX IF NOT EXISTS idx_outage_events_open
                  ON outage_events (usuario_id) WHERE ended_at IS NULL;
            """)
        logger.info("Conectado a PostgreSQL — esquema verificado")

    yield

    await redis_client.aclose()
    if db_pool:
        await db_pool.close()


app = FastAPI(title="No-Lights Reporter API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Modelos ─────────────────────────────────────────────────────────────────

class ReportPayload(BaseModel):
    usuario_id: str = Field(..., min_length=1, max_length=128)
    longitud: float = Field(..., ge=-180.0, le=180.0)
    latitud: float = Field(..., ge=-90.0, le=90.0)
    tiene_luz: bool


class ReportResponse(BaseModel):
    status: str
    usuario_id: str


class OutagePoint(BaseModel):
    usuario_id: str
    longitud: float
    latitud: float


class RadiusResponse(BaseModel):
    count: int
    radio_km: float
    points: list[OutagePoint]


# ─── Persistencia de eventos ──────────────────────────────────────────────────

async def save_outage_start(usuario_id: str, lon: float, lat: float) -> int:
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO outage_events (usuario_id, geom)
            VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography)
            RETURNING id
            """,
            usuario_id, lon, lat,
        )
    return row["id"]


async def close_outage_event(usuario_id: str) -> Optional[int]:
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE outage_events
            SET ended_at = NOW()
            WHERE usuario_id = $1
              AND ended_at IS NULL
            RETURNING id
            """,
            usuario_id,
        )
    return row["id"] if row else None


# ─── Reverse geocoding async (Nominatim / OSM — gratuito) ────────────────────

async def reverse_geocode(event_id: int, lon: float, lat: float) -> None:
    # Nominatim pide máximo 1 req/seg — esperamos antes de llamar
    await asyncio.sleep(1)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json", "addressdetails": 1},
                headers={"User-Agent": "no-lights-app/1.0 (rafaelvillarreal2000@gmail.com)"},
            )
        if resp.status_code != 200:
            logger.warning("Nominatim devolvió %d para event %d", resp.status_code, event_id)
            return

        addr = resp.json().get("address", {})
        # Nivel barrio: va de más específico a menos
        neighborhood = (
            addr.get("neighbourhood")       # barrio nombrado
            or addr.get("suburb")           # suburbio / distrito
            or addr.get("quarter")          # cuartel / sector
            or addr.get("city_district")    # distrito urbano
            or addr.get("hamlet")           # caserío
            or addr.get("isolated_dwelling")
        )
        # Nivel municipio: incluye county para países como USA donde no existe municipio
        municipality = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("municipality")
            or addr.get("county")           # Miami-Dade County, etc.
            or addr.get("district")
        )

        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE outage_events
                SET neighborhood = $1,
                    municipality = $2,
                    state        = $3,
                    country      = $4,
                    raw_address  = $5
                WHERE id = $6
                """,
                neighborhood,
                municipality,
                addr.get("state"),
                addr.get("country"),
                json.dumps(addr),
                event_id,
            )
        logger.info(
            "Geocodificado event %d → %s, %s",
            event_id, neighborhood or "?", municipality or "?",
        )
    except Exception as exc:
        logger.error("Error en reverse geocoding para event %d: %s", event_id, exc)


# ─── Notificaciones Telegram ─────────────────────────────────────────────────

async def notify_nearby_users(lon: float, lat: float, tiene_luz: bool) -> None:
    if not db_pool or not TELEGRAM_TOKEN:
        return

    event_type = "restored" if tiene_luz else "outage"
    radius_m = SEARCH_RADIUS_KM * 1000
    base_message = "💡 <b>¡Llegó la luz!</b>" if tiene_luz else "⚡ <b>Se fue la luz</b>"

    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
              ul.telegram_user_id,
              ul.chat_id,
              ul.first_name,
              STRING_AGG(ul.label, ', ' ORDER BY ul.label) AS labels
            FROM user_locations ul
            WHERE ST_DWithin(
              ul.geom,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
              $3
            )
            AND NOT EXISTS (
              SELECT 1 FROM notification_log nl
              WHERE nl.telegram_user_id = ul.telegram_user_id
                AND nl.event_type = $4
                AND nl.notified_at > NOW() - ($5 || ' minutes')::INTERVAL
                AND nl.notified_at > COALESCE(
                  (SELECT MAX(nl2.notified_at)
                   FROM notification_log nl2
                   WHERE nl2.telegram_user_id = ul.telegram_user_id
                     AND nl2.event_type <> $4),
                  '-infinity'::timestamptz
                )
            )
            GROUP BY ul.telegram_user_id, ul.chat_id, ul.first_name
            """,
            lon, lat, radius_m, event_type, str(NOTIFY_COOLDOWN_MIN),
        )

    if not rows:
        return

    logger.info("Notificando %d usuario(s) vía Telegram [%s]", len(rows), event_type)

    async with httpx.AsyncClient(timeout=8.0) as client:
        for row in rows:
            message = f"{base_message}\n📍 Cerca de: <b>{row['labels']}</b>"
            try:
                resp = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                    json={"chat_id": row["chat_id"], "text": message, "parse_mode": "HTML"},
                )
                if resp.status_code == 200:
                    async with db_pool.acquire() as conn:
                        await conn.execute(
                            "INSERT INTO notification_log (telegram_user_id, event_type) VALUES ($1, $2)",
                            row["telegram_user_id"], event_type,
                        )
                else:
                    logger.warning(
                        "Telegram rechazó mensaje para chat_id %s: %s",
                        row["chat_id"], resp.text,
                    )
            except httpx.RequestError as exc:
                logger.error("Error enviando notificación Telegram: %s", exc)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/reportar", response_model=ReportResponse)
async def reportar(payload: ReportPayload) -> ReportResponse:
    if not payload.tiene_luz:
        await redis_client.geoadd(
            GEO_KEY,
            (payload.longitud, payload.latitud, payload.usuario_id),
        )
        if db_pool:
            event_id = await save_outage_start(
                payload.usuario_id, payload.longitud, payload.latitud
            )
            asyncio.create_task(
                reverse_geocode(event_id, payload.longitud, payload.latitud)
            )
        asyncio.create_task(
            notify_nearby_users(payload.longitud, payload.latitud, False)
        )
        return ReportResponse(status="reported", usuario_id=payload.usuario_id)

    removed: int = await redis_client.zrem(GEO_KEY, payload.usuario_id)
    if removed and db_pool:
        await close_outage_event(payload.usuario_id)
    if removed:
        asyncio.create_task(
            notify_nearby_users(payload.longitud, payload.latitud, True)
        )
    return ReportResponse(status="removed" if removed else "not_found", usuario_id=payload.usuario_id)


# Cuando el campo solicitado es NULL, cascadea al nivel inmediato superior
# Esto garantiza que un corte en Miami aparezca bajo "Miami-Dade County"
# cuando no hay barrio mapeado, y bajo "Florida" cuando tampoco hay municipio.
VALID_ZONE_FIELDS = {"neighborhood", "municipality", "state"}
ZONE_FALLBACK = {
    "neighborhood": "COALESCE(neighborhood, municipality, state, country)",
    "municipality": "COALESCE(municipality, state, country)",
    "state":        "COALESCE(state, country)",
}


@app.get("/stats/summary")
async def stats_summary(days: int = 30):
    if not db_pool:
        return {"total_completed": 0, "active_outages": 0, "avg_duration_min": None, "affected_zones": 0}
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                  COUNT(*) FILTER (WHERE ended_at IS NOT NULL)  AS total_completed,
                  COUNT(*) FILTER (WHERE ended_at IS NULL)      AS active_outages,
                  ROUND(AVG(duration_min)
                    FILTER (WHERE ended_at IS NOT NULL)::numeric, 1) AS avg_duration_min,
                  COUNT(DISTINCT COALESCE(neighborhood, municipality))
                    FILTER (WHERE ended_at IS NOT NULL)          AS affected_zones
                FROM outage_events
                WHERE started_at >= NOW() - ($1 * INTERVAL '1 day')
                """,
                days,
            )
        return {
            "total_completed":  int(row["total_completed"]),
            "active_outages":   int(row["active_outages"]),
            "avg_duration_min": float(row["avg_duration_min"]) if row["avg_duration_min"] is not None else None,
            "affected_zones":   int(row["affected_zones"]),
        }
    except Exception as exc:
        logger.error("stats_summary error: %s", exc)
        raise HTTPException(500, detail=str(exc))


@app.get("/stats/by-day")
async def stats_by_day(days: int = 30):
    if not db_pool:
        return []
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                  DATE_TRUNC('day', started_at)::date AS date,
                  COUNT(*)                            AS outages,
                  ROUND(COALESCE(AVG(duration_min), 0)::numeric, 1) AS avg_duration_min
                FROM outage_events
                WHERE started_at >= NOW() - ($1 * INTERVAL '1 day')
                  AND ended_at IS NOT NULL
                GROUP BY DATE_TRUNC('day', started_at)::date
                ORDER BY date
                """,
                days,
            )
        return [
            {
                "date": str(r["date"]),
                "outages": int(r["outages"]),
                "avg_duration_min": float(r["avg_duration_min"] or 0),
            }
            for r in rows
        ]
    except Exception as exc:
        logger.error("stats_by_day error: %s", exc)
        raise HTTPException(500, detail=str(exc))


@app.get("/stats/by-zone")
async def stats_by_zone(field: str = "neighborhood", days: int = 30, limit: int = 10):
    if field not in VALID_ZONE_FIELDS:
        raise HTTPException(422, detail="field debe ser neighborhood, municipality o state")
    if not db_pool:
        return []
    try:
        zone_expr = ZONE_FALLBACK[field]
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                SELECT
                  COALESCE({zone_expr}, '(sin datos)') AS zone,
                  COUNT(*)                              AS outages,
                  ROUND(COALESCE(AVG(duration_min), 0)::numeric, 1) AS avg_duration_min
                FROM outage_events
                WHERE started_at >= NOW() - ($1 * INTERVAL '1 day')
                  AND ended_at IS NOT NULL
                GROUP BY {zone_expr}
                ORDER BY outages DESC
                LIMIT $2
                """,
                days, limit,
            )
        return [
            {
                "zone": r["zone"],
                "outages": int(r["outages"]),
                "avg_duration_min": float(r["avg_duration_min"] or 0),
            }
            for r in rows
        ]
    except Exception as exc:
        logger.error("stats_by_zone error: %s", exc)
        raise HTTPException(500, detail=str(exc))


@app.get("/consultar-radio", response_model=RadiusResponse)
async def consultar_radio(lon: float, lat: float) -> RadiusResponse:
    if not (-180.0 <= lon <= 180.0) or not (-90.0 <= lat <= 90.0):
        raise HTTPException(status_code=422, detail="Coordenadas fuera de rango")

    results: list = await redis_client.geosearch(
        GEO_KEY,
        longitude=lon,
        latitude=lat,
        radius=SEARCH_RADIUS_KM,
        unit="km",
        withcoord=True,
    )
    points = [
        OutagePoint(
            usuario_id=item[0],
            longitud=float(item[1][0]),
            latitud=float(item[1][1]),
        )
        for item in results
    ]
    return RadiusResponse(count=len(points), radio_km=SEARCH_RADIUS_KM, points=points)
