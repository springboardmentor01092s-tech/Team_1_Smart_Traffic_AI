import os
import psycopg2
import pandas as pd

# Database configuration matching trafficvision-backend env
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "trafficvision_ai")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    
    query = """
    SELECT 
        td.data_id, 
        td.location_id, 
        l.name AS location_name, 
        l.road_type,
        td.recorded_at, 
        td.vehicle_count, 
        td.average_speed_kmph, 
        td.congestion_level, 
        td.source
    FROM traffic_data td
    LEFT JOIN locations l ON td.location_id = l.location_id
    ORDER BY td.recorded_at DESC;
    """
    
    df = pd.read_sql(query, conn)
    conn.close()

    print("=================== DataFrame Info ===================")
    df.info()
    print("\n=================== DataFrame Describe ===================")
    print(df.describe(include='all'))
    print("\n=================== DataFrame Head ===================")
    print(df.head(10))

except Exception as e:
    print(f"Error loading traffic data: {e}")
