from contextlib import asynccontextmanager
import os

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
SEARCH_RADIUS_KM: float = float(os.getenv("SEARCH_RADIUS_KM", "0.5"))

GEO_KEY = "outages:geo"

redis_client: aioredis.Redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = aioredis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
    )
    try:
        await redis_client.ping()
    except aioredis.ConnectionError as exc:
        raise RuntimeError(f"Cannot connect to Redis at {REDIS_HOST}:{REDIS_PORT}") from exc
    yield
    await redis_client.aclose()


app = FastAPI(title="No-Lights Reporter API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/reportar", response_model=ReportResponse)
async def reportar(payload: ReportPayload) -> ReportResponse:
    if not payload.tiene_luz:
        await redis_client.geoadd(
            GEO_KEY,
            (payload.longitud, payload.latitud, payload.usuario_id),
        )
        return ReportResponse(status="reported", usuario_id=payload.usuario_id)

    removed: int = await redis_client.zrem(GEO_KEY, payload.usuario_id)
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
    # redis-py devuelve: [['member', (lon_float, lat_float)], ...]
    points = [
        OutagePoint(
            usuario_id=item[0],
            longitud=float(item[1][0]),
            latitud=float(item[1][1]),
        )
        for item in results
    ]
    return RadiusResponse(count=len(points), radio_km=SEARCH_RADIUS_KM, points=points)
