import os
import psycopg2
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "trafficvision_ai")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")

def get_congestion_level(speed, max_speed):
    ratio = speed / max_speed
    if ratio >= 0.8:
        return 'low'
    elif ratio >= 0.6:
        return 'moderate'
    elif ratio >= 0.35:
        return 'high'
    else:
        return 'severe'

def generate_historical_data():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    
    # Get existing locations
    cursor.execute("SELECT location_id, road_type FROM locations;")
    locations = cursor.fetchall()
    
    if not locations:
        print("No locations found in database.")
        conn.close()
        return

    print(f"Generating historical data for {len(locations)} locations over 14 days...")
    
    end_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=14)
    
    speed_configs = {
        'highway': 80.0,
        'arterial': 50.0,
        'local': 35.0
    }
    
    records = []
    
    for loc_id, road_type in locations:
        free_flow = speed_configs.get(road_type, 50.0)
        current_time = start_time
        
        while current_time <= end_time:
            hour = current_time.hour
            is_weekend = current_time.weekday() >= 5
            
            # Speed reduction factor based on rush hour & weekend
            if not is_weekend:
                if 7 <= hour <= 9:  # Morning rush hour
                    speed_factor = np.random.uniform(0.25, 0.55)
                elif 17 <= hour <= 19:  # Evening rush hour
                    speed_factor = np.random.uniform(0.20, 0.50)
                elif 12 <= hour <= 14:  # Mid-day light congestion
                    speed_factor = np.random.uniform(0.60, 0.85)
                elif 0 <= hour <= 5:  # Late night free flow
                    speed_factor = np.random.uniform(0.85, 0.98)
                else:
                    speed_factor = np.random.uniform(0.70, 0.90)
            else:
                if 12 <= hour <= 18:  # Weekend afternoon moderate movement
                    speed_factor = np.random.uniform(0.65, 0.85)
                else:
                    speed_factor = np.random.uniform(0.80, 0.98)

            speed = round(float(free_flow * speed_factor + np.random.normal(0, 2)), 2)
            speed = max(5.0, min(speed, free_flow))
            congestion = get_congestion_level(speed, free_flow)
            
            records.append((
                loc_id,
                current_time,
                speed,
                congestion,
                'TomTom_Historical'
            ))
            
            current_time += timedelta(minutes=15)
            
    print(f"Total historical records generated: {len(records)}")
    
    insert_query = """
    INSERT INTO traffic_data (location_id, recorded_at, average_speed_kmph, congestion_level, source)
    VALUES (%s, %s, %s, %s, %s);
    """
    
    cursor.executemany(insert_query, records)
    conn.commit()
    cursor.close()
    conn.close()
    print("Historical data successfully committed to database!")

if __name__ == "__main__":
    generate_historical_data()
