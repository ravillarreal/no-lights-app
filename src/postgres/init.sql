CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS user_locations (
  id               SERIAL PRIMARY KEY,
  telegram_user_id BIGINT       NOT NULL,
  chat_id          BIGINT       NOT NULL,
  first_name       TEXT,
  label            TEXT         NOT NULL DEFAULT 'Mi ubicación',
  geom             GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_geom
  ON user_locations USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id
  ON user_locations (telegram_user_id);

-- Evita notificar al mismo usuario más de una vez por tipo de evento en 30 min
CREATE TABLE IF NOT EXISTS notification_log (
  id               SERIAL PRIMARY KEY,
  telegram_user_id BIGINT      NOT NULL,
  event_type       TEXT        NOT NULL,  -- 'outage' | 'restored'
  notified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_lookup
  ON notification_log (telegram_user_id, event_type, notified_at);
