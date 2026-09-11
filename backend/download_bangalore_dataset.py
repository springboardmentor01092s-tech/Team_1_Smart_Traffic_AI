import os
import requests
import pandas as pd

URL = "https://raw.githubusercontent.com/benedictpaul321-del/Bangalore_Traffic_Visualization_and_Machine_learning/main/Banglore_traffic_Dataset.csv"
OUTPUT_FILE = "bangalore_traffic_dataset.csv"

def download_dataset():
    print(f"Downloading real Bangalore traffic dataset from Kaggle mirror...")
    response = requests.get(URL)
    response.raise_for_status()
    
    with open(OUTPUT_FILE, "wb") as f:
        f.write(response.content)
        
    print(f"Saved dataset as '{OUTPUT_FILE}'.")
    
    df = pd.read_csv(OUTPUT_FILE)
    print("\n--- Dataset Info ---")
    df.info()
    
    print("\n--- Dataset Columns ---")
    print(df.columns.tolist())
    
    print("\n--- First 5 Rows ---")
    print(df.head())

if __name__ == "__main__":
    download_dataset()
