-- =========================================================
-- TrafficVision AI: Smart Traffic Prediction & Congestion
-- Management System — Database Schema
-- =========================================================

-- Enable UUID generation (run once per database)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 1. USERS
-- Handles authentication and role-based access
-- =========================================================
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'analyst', 'viewer')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 2. LOCATIONS
-- Physical monitoring points (intersections, road segments)
-- =========================================================
CREATE TABLE locations (
    location_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    latitude        DECIMAL(9,6) NOT NULL,
    longitude       DECIMAL(9,6) NOT NULL,
    road_type       VARCHAR(50),          -- e.g. highway, arterial, local
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 3. TRAFFIC_DATA
-- Raw sensor/traffic readings over time
-- =========================================================
CREATE TABLE traffic_data (
    data_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id         UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    recorded_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    vehicle_count       INTEGER,
    average_speed_kmph  DECIMAL(5,2),
    congestion_level    VARCHAR(20) CHECK (congestion_level IN ('low', 'moderate', 'high', 'severe')),
    source              VARCHAR(50)        -- e.g. sensor, camera, manual entry
);

-- Index for fast time-based queries per location
CREATE INDEX idx_traffic_data_location_time ON traffic_data(location_id, recorded_at);

-- =========================================================
-- 4. PREDICTIONS
-- AI-generated forecasts based on traffic_data
-- =========================================================
CREATE TABLE predictions (
    prediction_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id           UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    predicted_for         TIMESTAMP NOT NULL,   -- the future time this prediction targets
    predicted_congestion  VARCHAR(20) CHECK (predicted_congestion IN ('low', 'moderate', 'high', 'severe')),
    confidence_score      DECIMAL(4,3),         -- e.g. 0.873
    model_version         VARCHAR(50),
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_location_time ON predictions(location_id, predicted_for);

-- =========================================================
-- 5. ROUTES
-- A named path made up of multiple locations
-- =========================================================
CREATE TABLE routes (
    route_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    created_by      UUID REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction table: many-to-many between routes and locations,
-- with sequence_order to preserve the path order
CREATE TABLE route_locations (
    route_id        UUID NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    location_id     UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    sequence_order  INTEGER NOT NULL,
    PRIMARY KEY (route_id, location_id)
);

-- =========================================================
-- 6. ALERTS
-- Congestion warnings, tied to a location and optionally a prediction
-- =========================================================
CREATE TABLE alerts (
    alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    prediction_id   UUID REFERENCES predictions(prediction_id) ON DELETE SET NULL,
    severity        VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),
    message         TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    created_by      UUID REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMP
);

CREATE INDEX idx_alerts_status ON alerts(status);

-- =========================================================
-- End of schema
-- =========================================================
