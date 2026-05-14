from contextlib import asynccontextmanager
import asyncio
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
        logger.info("Conectado a PostgreSQL")

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


# ─── Notificaciones Telegram ─────────────────────────────────────────────────

async def notify_nearby_users(lon: float, lat: float, tiene_luz: bool) -> None:
    """
    Consulta PostGIS para encontrar usuarios de Telegram con ubicaciones guardadas
    dentro del radio de búsqueda y les envía una notificación.
    Respeta un cooldown de NOTIFY_COOLDOWN_MIN minutos por usuario.
    """
    if not db_pool or not TELEGRAM_TOKEN:
        return

    event_type = "restored" if tiene_luz else "outage"
    radius_m = SEARCH_RADIUS_KM * 1000

    # El mensaje se personaliza por fila según los labels del usuario
    base_message = (
        "💡 <b>¡Llegó la luz!</b>" if tiene_luz else "⚡ <b>Se fue la luz</b>"
    )

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
            labels = row["labels"]
            message = f"{base_message}\n📍 Cerca de: <b>{labels}</b>"
            try:
                resp = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                    json={
                        "chat_id": row["chat_id"],
                        "text": message,
                        "parse_mode": "HTML",
                    },
                )
                if resp.status_code == 200:
                    # Registrar notificación enviada exitosamente
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
        asyncio.create_task(notify_nearby_users(payload.longitud, payload.latitud, False))
        return ReportResponse(status="reported", usuario_id=payload.usuario_id)

    removed: int = await redis_client.zrem(GEO_KEY, payload.usuario_id)
    if removed:
        asyncio.create_task(notify_nearby_users(payload.longitud, payload.latitud, True))
    status = "removed" if removed else "not_found"
    return ReportResponse(status=status, usuario_id=payload.usuario_id)


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
