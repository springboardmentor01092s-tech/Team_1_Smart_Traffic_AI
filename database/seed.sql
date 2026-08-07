-- TrafficVision AI Seed Data

-- Insert sample monitoring locations (Intersections / Highway segments)
INSERT INTO locations (location_id, name, latitude, longitude, road_type)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Central Expressway & 5th Ave', 40.712776, -74.005974, 'highway'),
  ('22222222-2222-2222-2222-222222222222', 'Downtown Arterial & Main St', 40.730610, -73.935242, 'arterial'),
  ('33333333-3333-3333-3333-333333333333', 'Tech Corridor & Innovation Blvd', 40.758896, -73.985130, 'local')
ON CONFLICT (location_id) DO NOTHING;

-- Insert sample traffic data for locations
INSERT INTO traffic_data (location_id, recorded_at, vehicle_count, average_speed_kmph, congestion_level, source)
VALUES 
  ('11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 minutes', 145, 22.50, 'high', 'sensor'),
  ('11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 minutes', 160, 18.00, 'high', 'sensor'),
  ('11111111-1111-1111-1111-111111111111', NOW(), 180, 12.00, 'severe', 'sensor'),
  ('22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '15 minutes', 80, 45.00, 'moderate', 'sensor'),
  ('22222222-2222-2222-2222-222222222222', NOW(), 90, 42.00, 'moderate', 'sensor'),
  ('33333333-3333-3333-3333-333333333333', NOW(), 30, 65.00, 'low', 'sensor');

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
