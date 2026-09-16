import pandas as pd
import numpy as np

DATASET_CSV = "processed_traffic_data.csv"

def perform_chronological_split(df, train_ratio=0.80):
    print("=================== CHRONOLOGICAL TRAIN/TEST SPLIT ===================")
    
    # Ensure dataset is sorted strictly by timestamp
    df['recorded_at'] = pd.to_datetime(df['recorded_at'])
    df_sorted = df.sort_values(by='recorded_at').reset_index(drop=True)
    
    total_rows = len(df_sorted)
    split_index = int(total_rows * train_ratio)
    
    # Chronological Split
    train_df = df_sorted.iloc[:split_index].copy()
    test_df = df_sorted.iloc[split_index:].copy()
    
    train_min_date = train_df['recorded_at'].min()
    train_max_date = train_df['recorded_at'].max()
    
    test_min_date = test_df['recorded_at'].min()
    test_max_date = test_df['recorded_at'].max()
    
    print(f"Total Dataset Size : {total_rows} rows")
    print(f"Train Dataset Size : {len(train_df)} rows ({len(train_df)/total_rows*100:.1f}%)")
    print(f"Test Dataset Size  : {len(test_df)} rows ({len(test_df)/total_rows*100:.1f}%)")
    
    print("\n--- Chronological Time Window Verification ---")
    print(f"Training Window : {train_min_date}  -->  {train_max_date}")
    print(f"Testing Window  : {test_min_date}  -->  {test_max_date}")
    
    # Verification assertion
    is_strictly_chronological = train_max_date <= test_min_date
    print(f"\nVerification (train_max_date <= test_min_date): {is_strictly_chronological}")
    
    if is_strictly_chronological:
        print("CONFIRMED: Train/Test split is strictly chronological. NO future data leaks into training!")
    else:
        print("WARNING: Temporal leakage detected in split!")
        
    return train_df, test_df

def main():
    print(f"Loading '{DATASET_CSV}'...")
    df = pd.read_csv(DATASET_CSV)
    
    train_df, test_df = perform_chronological_split(df, train_ratio=0.80)
    
    # Save split datasets
    train_df.to_csv("train_traffic_data.csv", index=False)
    test_df.to_csv("test_traffic_data.csv", index=False)
    print("\nSaved 'train_traffic_data.csv' and 'test_traffic_data.csv'.")

if __name__ == "__main__":
    main()
