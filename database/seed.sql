-- TrafficVision AI Seed Data

-- Insert sample monitoring locations (Intersections / Highway segments)
INSERT INTO locations (location_id, name, latitude, longitude, road_type)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Central Expressway & 5th Ave', 40.712776, -74.005974, 'highway'),
  ('22222222-2222-2222-2222-222222222222', 'Downtown Arterial & Main St', 40.730610, -73.935242, 'arterial'),
  ('33333333-3333-3333-3333-333333333333', 'Tech Corridor & Innovation Blvd', 40.758896, -73.985130, 'local')
ON CONFLICT (location_id) DO NOTHING;

-- Insert sample traffic data for locations with fixed data_id and recorded_at timestamps
INSERT INTO traffic_data (data_id, location_id, recorded_at, vehicle_count, average_speed_kmph, congestion_level, source)
VALUES 
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2026-01-01 00:00:00', 145, 22.50, 'high', 'sensor'),
  ('d2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2026-01-01 00:15:00', 160, 18.00, 'high', 'sensor'),
  ('d3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '2026-01-01 00:30:00', 180, 12.00, 'severe', 'sensor'),
  ('d4444444-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-01-01 00:15:00', 80, 45.00, 'moderate', 'sensor'),
  ('d5555555-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-01-01 00:30:00', 90, 42.00, 'moderate', 'sensor'),
  ('d6666666-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2026-01-01 00:30:00', 30, 65.00, 'low', 'sensor')
ON CONFLICT (data_id) DO NOTHING;

-- Insert sample route
INSERT INTO routes (route_id, name)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'City Center Express Corridor')
ON CONFLICT (route_id) DO NOTHING;

-- Link locations to the route
INSERT INTO route_locations (route_id, location_id, sequence_order)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 2)
ON CONFLICT (route_id, location_id) DO NOTHING;

-- =========================================================
-- Deterministic Seed Data for Travel Time Math & Fallback Verification
-- =========================================================

-- 1. Locations for Deterministic Math Verification
INSERT INTO locations (location_id, name, latitude, longitude, road_type)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'Math Test Loc 1', 12.000000, 77.000000, 'arterial'),
  ('55555555-5555-5555-5555-555555555555', 'Math Test Loc 2', 12.050000, 77.000000, 'arterial'),
  ('66666666-6666-6666-6666-666666666666', 'Math Test Loc 3', 12.050000, 77.050000, 'arterial')
ON CONFLICT (location_id) DO NOTHING;

-- Route: Test Route: Seed Verification
INSERT INTO routes (route_id, name)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Route: Seed Verification')
ON CONFLICT (route_id) DO NOTHING;

-- Route Locations in order 1 -> 2 -> 3
INSERT INTO route_locations (route_id, location_id, sequence_order)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 3)
ON CONFLICT (route_id, location_id) DO NOTHING;

-- Traffic data with explicit data_id UUIDs, fixed far-future timestamp (so ORDER BY recorded_at DESC selects test seed data), and fixed current_speed (no nulls)
INSERT INTO traffic_data (data_id, location_id, recorded_at, average_speed_kmph, current_speed, free_flow_speed, congestion_level, source)
VALUES 
  ('d4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '2099-01-01 00:00:00', 60.00, 60.00, 60.00, 'low', 'test_seed'),
  ('d5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '2099-01-01 00:00:00', 30.00, 30.00, 60.00, 'moderate', 'test_seed'),
  ('d6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '2099-01-01 00:00:00', 45.00, 45.00, 60.00, 'low', 'test_seed')
ON CONFLICT (data_id) DO UPDATE SET 
  recorded_at = EXCLUDED.recorded_at,
  current_speed = EXCLUDED.current_speed,
  free_flow_speed = EXCLUDED.free_flow_speed,
  average_speed_kmph = EXCLUDED.average_speed_kmph;

-- 2. Locations for Speed Fallback Verification
INSERT INTO locations (location_id, name, latitude, longitude, road_type)
VALUES 
  ('77777777-7777-7777-7777-777777777777', 'Fallback Test Loc 1', 12.000000, 77.000000, 'arterial'),
  ('88888888-8888-8888-8888-888888888888', 'Fallback Test Loc 2', 12.050000, 77.000000, 'arterial')
ON CONFLICT (location_id) DO NOTHING;

-- Route: Test Route: Fallback Verification
INSERT INTO routes (route_id, name)
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Route: Fallback Verification')
ON CONFLICT (route_id) DO NOTHING;

-- Route Locations in order 1 -> 2
INSERT INTO route_locations (route_id, location_id, sequence_order)
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 2)
ON CONFLICT (route_id, location_id) DO NOTHING;

-- Traffic data with explicit data_id UUIDs, fixed far-future timestamp, and current_speed IS NULL (testing free_flow_speed fallback)
INSERT INTO traffic_data (data_id, location_id, recorded_at, average_speed_kmph, current_speed, free_flow_speed, congestion_level, source)
VALUES 
  ('d7777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', '2099-01-01 00:00:00', NULL, NULL, 40.00, 'low', 'test_seed'),
  ('d8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', '2099-01-01 00:00:00', 60.00, 60.00, 60.00, 'low', 'test_seed')
ON CONFLICT (data_id) DO UPDATE SET 
  recorded_at = EXCLUDED.recorded_at,
  current_speed = EXCLUDED.current_speed,
  free_flow_speed = EXCLUDED.free_flow_speed,
  average_speed_kmph = EXCLUDED.average_speed_kmph;
