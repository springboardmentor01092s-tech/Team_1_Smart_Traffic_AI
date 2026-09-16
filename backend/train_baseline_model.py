import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import xgboost as xgb

TRAIN_CSV = "train_traffic_data.csv"
TEST_CSV = "test_traffic_data.csv"
MODEL_PATH = "baseline_traffic_model.joblib"

def train_and_evaluate():
    print(f"Loading '{TRAIN_CSV}' and '{TEST_CSV}'...")
    train_df = pd.read_csv(TRAIN_CSV)
    test_df = pd.read_csv(TEST_CSV)
    
    # Raw columns to drop (not numeric features)
    drop_cols = ['area_name', 'road_name', 'recorded_at', 'weather_conditions', 'roadwork_activity', 'congestion_code']
    
    # Separate features (X) and target (y = congestion_code)
    X_train = train_df.drop(columns=[col for col in drop_cols if col in train_df.columns])
    y_train = train_df['congestion_code']
    
    X_test = test_df.drop(columns=[col for col in drop_cols if col in test_df.columns])
    y_test = test_df['congestion_code']
    
    print(f"Feature set size : {X_train.shape[1]} features")
    print(f"Training samples : {len(X_train)} | Testing samples : {len(X_test)}")
    
    print("\nTraining Random Forest Baseline Classifier (with balanced class weights)...")
    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )
    
    clf.fit(X_train, y_train)
    
    # Predict on test set
    y_pred = clf.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    target_names = ['Low (0)', 'Moderate (1)', 'High (2)', 'Severe (3)']
    
    print("\n=================== MODEL EVALUATION RESULTS ===================")
    print(f"Accuracy Score: {acc:.4f} ({acc*100:.2f}%)\n")
    
    print("--- Classification Report (Per-Class F1, Precision, Recall) ---")
    report = classification_report(y_test, y_pred, target_names=target_names, digits=4)
    print(report)
    
    print("--- Confusion Matrix ---")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=target_names, columns=target_names)
    print(cm_df)
    
    # Save model artifact
    joblib.dump(clf, MODEL_PATH)
    print(f"\nTrained baseline classifier saved to '{MODEL_PATH}' successfully!")

if __name__ == "__main__":
    train_and_evaluate()
