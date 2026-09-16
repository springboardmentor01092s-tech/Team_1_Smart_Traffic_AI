import os
import psycopg2
import pandas as pd
from datetime import datetime

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "trafficvision_ai")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")

# Coordinates mapping for Bangalore areas
LOCATION_COORDS = {
    'Indiranagar': (12.9784, 77.6408),
    'Whitefield': (12.9698, 77.7499),
    'Koramangala': (12.9352, 77.6245),
    'M.G. Road': (12.9756, 77.6066),
    'Jayanagar': (12.9308, 77.5838),
    'Hebbal': (13.0358, 77.5970),
    'Silk Board': (12.9177, 77.6238),
    'Electronic City': (12.8452, 77.6602),
    'Marathahalli': (12.9592, 77.6974),
    'BTM Layout': (12.9166, 77.6101)
}

def sync_database():
    df = pd.read_csv("bangalore_traffic_dataset.csv")
    print(f"Loaded {len(df)} rows from 'bangalore_traffic_dataset.csv'")

    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()

    # Clear synthetic data first
    print("Clearing synthetic data from Postgres tables...")
    cursor.execute("TRUNCATE TABLE traffic_data CASCADE;")
    cursor.execute("DELETE FROM locations WHERE road_type IS NOT NULL;")

    # Insert Bangalore locations
    location_map = {}
    unique_combinations = df[['Area Name', 'Road/Intersection Name']].drop_duplicates()

    for idx, row in unique_combinations.iterrows():
        area = row['Area Name']
        road = row['Road/Intersection Name']
        loc_name = f"{area} - {road}"
        lat, lon = LOCATION_COORDS.get(area, (12.9716, 77.5946))
        
        cursor.execute(
            """
            INSERT INTO locations (name, latitude, longitude, road_type)
            VALUES (%s, %s, %s, %s)
            RETURNING location_id;
            """,
            (loc_name, lat, lon, 'arterial')
        )
        loc_id = cursor.fetchone()[0]
        location_map[(area, road)] = loc_id

    conn.commit()
    print(f"Inserted {len(location_map)} unique Bangalore monitoring locations into Postgres.")

    # Insert traffic records
    traffic_records = []
    for idx, row in df.iterrows():
        loc_id = location_map.get((row['Area Name'], row['Road/Intersection Name']))
        if not loc_id:
            continue
            
        speed = float(row['Average Speed'])
        c_level_num = float(row['Congestion Level'])
        
        if c_level_num >= 75.0:
            c_level_str = 'severe'
        elif c_level_num >= 50.0:
            c_level_str = 'high'
        elif c_level_num >= 25.0:
            c_level_str = 'moderate'
        else:
            c_level_str = 'low'
            
        recorded_at = row['Date']

        traffic_records.append((
            loc_id,
            recorded_at,
            speed,
            c_level_str,
            'Bangalore_Open_Dataset'
        ))

    insert_query = """
    INSERT INTO traffic_data (location_id, recorded_at, average_speed_kmph, congestion_level, source)
    VALUES (%s, %s, %s, %s, %s);
    """
    
    print("Bulk inserting real Bangalore traffic data into database...")
    cursor.executemany(insert_query, traffic_records)
    conn.commit()
    
    cursor.close()
    conn.close()
    print(f"Successfully populated PostgreSQL database with {len(traffic_records)} real Bangalore dataset records!")

if __name__ == "__main__":
    sync_database()
