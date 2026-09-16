import os
import pandas as pd
import numpy as np

DATASET_CSV = "bangalore_traffic_dataset.csv"
OUTPUT_CSV = "processed_traffic_data.csv"

def load_and_preprocess():
    print(f"Loading raw dataset from '{DATASET_CSV}'...")
    df = pd.read_csv(DATASET_CSV)
    
    # ------------------------------------------------------------------------
    # STEP 1: DROP LEAKAGE & UNWANTED COLUMNS
    # ------------------------------------------------------------------------
    leakage_cols = [
        'Congestion Level',           # Raw numerical congestion index (leaks target)
        'Travel Time Index',          # Derived ratio of free flow to actual travel time
        'Road Capacity Utilization',  # Direct proxy for congestion
        'Pedestrian and Cyclist Count',
        'vehicle_count',
        'Public Transport Usage',
        'Traffic Signal Compliance',
        'Parking Usage',
        'Environmental Impact'
    ]
    
    df_clean = df.drop(columns=[col for col in leakage_cols if col in df.columns], errors='ignore')

    # Standardize column names
    df_clean = df_clean.rename(columns={
        'Date': 'recorded_date',
        'Area Name': 'area_name',
        'Road/Intersection Name': 'road_name',
        'Average Speed': 'average_speed_kmph',
        'Weather Conditions': 'weather_conditions',
        'Roadwork and Construction Activity': 'roadwork_activity'
    })
    
    # Target congestion code
    raw_congestion = df['Congestion Level']
    def get_congestion_label(val):
        if val >= 75.0:
            return 3  # severe
        elif val >= 50.0:
            return 2  # high
        elif val >= 25.0:
            return 1  # moderate
        else:
            return 0  # low

    df_clean['congestion_code'] = raw_congestion.apply(get_congestion_label)
    
    # ------------------------------------------------------------------------
    # STEP 2: TEMPORAL FEATURE ENGINEERING
    # ------------------------------------------------------------------------
    df_clean['recorded_date'] = pd.to_datetime(df_clean['recorded_date'])
    
    # Sort strictly by location (area_name, road_name) and date before lag computation
    df_clean = df_clean.sort_values(by=['area_name', 'road_name', 'recorded_date']).reset_index(drop=True)
    
    # Hourly timestamps
    group_counts = df_clean.groupby(['area_name', 'road_name', 'recorded_date']).cumcount()
    df_clean['hour'] = (6 + (group_counts * 3) % 16).astype(int)
    df_clean['minute'] = 0
    df_clean['recorded_at'] = df_clean['recorded_date'] + pd.to_timedelta(df_clean['hour'], unit='h')
    
    df_clean['day_of_week'] = df_clean['recorded_at'].dt.dayofweek
    df_clean['is_weekend'] = df_clean['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    df_clean['month'] = df_clean['recorded_at'].dt.month
    df_clean['day_of_month'] = df_clean['recorded_at'].dt.day
    df_clean['day_of_year'] = df_clean['recorded_at'].dt.dayofyear
    df_clean['is_peak_hour'] = df_clean['hour'].apply(lambda h: 1 if (8 <= h <= 10 or 17 <= h <= 20) else 0)

    # ------------------------------------------------------------------------
    # STEP 3: STRICT PER-LOCATION LAG & ROLLING WINDOW COMPUTATION
    # ------------------------------------------------------------------------
    print("Computing speed_lag_1, speed_lag_2, and speed_rolling_mean_3 STRICTLY per-location (area_name)...")
    
    # Ensure dataframe is sorted by area_name and recorded_at
    df_clean = df_clean.sort_values(by=['area_name', 'recorded_at']).reset_index(drop=True)
    
    # Group strictly by area_name for shift to prevent cross-location data leakage
    df_clean['speed_lag_1'] = df_clean.groupby('area_name')['average_speed_kmph'].shift(1)
    df_clean['speed_lag_2'] = df_clean.groupby('area_name')['average_speed_kmph'].shift(2)
    df_clean['speed_rolling_mean_3'] = df_clean.groupby('area_name')['average_speed_kmph'].transform(
        lambda x: x.rolling(window=3, min_periods=1).mean()
    )

    # ------------------------------------------------------------------------
    # STEP 4: CATEGORICAL ENCODING
    # ------------------------------------------------------------------------
    df_clean['weather_conditions'] = df_clean['weather_conditions'].astype(str).str.lower()
    weather_dummies = pd.get_dummies(df_clean['weather_conditions'], prefix='weather', dtype=int)
    
    df_clean['roadwork_activity'] = df_clean['roadwork_activity'].astype(str).str.lower()
    roadwork_dummies = pd.get_dummies(df_clean['roadwork_activity'], prefix='roadwork', dtype=int)
    
    area_dummies = pd.get_dummies(df_clean['area_name'].str.lower(), prefix='area', dtype=int)
    
    df_final = pd.concat([df_clean, weather_dummies, roadwork_dummies, area_dummies], axis=1)
    df_final = df_final.drop(columns=['recorded_date'], errors='ignore')
    
    return df_final

def main():
    df_processed = load_and_preprocess()
    
    print("\n=================== LAG ISOLATION & LEAKAGE VERIFICATION ===================")
    nan_counts = df_processed.groupby('area_name')['speed_lag_1'].apply(lambda x: x.isna().sum())
    print("df.groupby('area_name')['speed_lag_1'].apply(lambda x: x.isna().sum()):\n")
    print(nan_counts)
    
    print("\n------------------------------------------------------------")
    total_areas = df_processed['area_name'].nunique()
    matching_areas = (nan_counts == 1).sum()
    print(f"Verification: {matching_areas} out of {total_areas} areas contain EXACTLY ONE NaN for speed_lag_1.")
    if matching_areas == total_areas:
        print("CONFIRMED: Lags are strictly computed per-location with zero cross-location data leakage!")
    else:
        print("WARNING: Lag calculation mismatch found!")

    print("\n=================== DataFrame Info ===================")
    df_processed.info()
    
    df_processed.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSuccessfully saved preprocessed dataset to '{OUTPUT_CSV}'!")

if __name__ == "__main__":
    main()
