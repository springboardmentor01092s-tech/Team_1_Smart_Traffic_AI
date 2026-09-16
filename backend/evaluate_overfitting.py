import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score

TRAIN_CSV = "train_traffic_data.csv"
TEST_CSV = "test_traffic_data.csv"
MODEL_PATH = "baseline_traffic_model.joblib"

def evaluate_train_vs_test():
    print(f"Loading '{TRAIN_CSV}' and '{TEST_CSV}'...")
    train_df = pd.read_csv(TRAIN_CSV)
    test_df = pd.read_csv(TEST_CSV)
    
    drop_cols = ['area_name', 'road_name', 'recorded_at', 'weather_conditions', 'roadwork_activity', 'congestion_code']
    
    X_train = train_df.drop(columns=[col for col in drop_cols if col in train_df.columns])
    y_train = train_df['congestion_code']
    
    X_test = test_df.drop(columns=[col for col in drop_cols if col in test_df.columns])
    y_test = test_df['congestion_code']
    
    print(f"Loading existing trained model from '{MODEL_PATH}'...")
    model = joblib.load(MODEL_PATH)
    
    # Evaluate on Train
    y_train_pred = model.predict(X_train)
    train_acc = accuracy_score(y_train, y_train_pred)
    train_macro_f1 = f1_score(y_train, y_train_pred, average='macro')
    
    # Evaluate on Test
    y_test_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_test_pred)
    test_macro_f1 = f1_score(y_test, y_test_pred, average='macro')
    
    print("\n=================== INITIAL UNCONSTRAINED BASELINE EVALUATION ===================")
    print(f"Train Accuracy : {train_acc:.4f} ({train_acc*100:.2f}%) | Train Macro F1 : {train_macro_f1:.4f}")
    print(f"Test Accuracy  : {test_acc:.4f} ({test_acc*100:.2f}%) | Test Macro F1  : {test_macro_f1:.4f}")
    
    gap = train_acc - test_acc
    print(f"Train-Test Accuracy Gap: {gap*100:.2f}%")
    
    if train_acc >= 0.98 or gap >= 0.08:
        print("\n--> OVERFITTING DETECTED! Train accuracy is ~99%+ / gap is large.")
        print("Training regularized Random Forest model (max_depth=10, min_samples_leaf=5, min_samples_split=10)...")
        
        reg_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_leaf=5,
            min_samples_split=10,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        
        reg_model.fit(X_train, y_train)
        
        y_train_reg_pred = reg_model.predict(X_train)
        reg_train_acc = accuracy_score(y_train, y_train_reg_pred)
        reg_train_macro_f1 = f1_score(y_train, y_train_reg_pred, average='macro')
        
        y_test_reg_pred = reg_model.predict(X_test)
        reg_test_acc = accuracy_score(y_test, y_test_reg_pred)
        reg_test_macro_f1 = f1_score(y_test, y_test_reg_pred, average='macro')
        
        print("\n=================== REGULARIZED MODEL EVALUATION ===================")
        print(f"Regularized Train Accuracy : {reg_train_acc:.4f} ({reg_train_acc*100:.2f}%) | Train Macro F1 : {reg_train_macro_f1:.4f}")
        print(f"Regularized Test Accuracy  : {reg_test_acc:.4f} ({reg_test_acc*100:.2f}%) | Test Macro F1  : {reg_test_macro_f1:.4f}")
        print(f"Regularized Train-Test Gap : {(reg_train_acc - reg_test_acc)*100:.2f}%")
        
        print("\n--- Regularized Model Test Classification Report ---")
        target_names = ['Low (0)', 'Moderate (1)', 'High (2)', 'Severe (3)']
        print(classification_report(y_test, y_test_reg_pred, target_names=target_names, digits=4))
        
        # Overwrite with regularized model
        joblib.dump(reg_model, MODEL_PATH)
        print(f"Regularized model saved to '{MODEL_PATH}' successfully.")

if __name__ == "__main__":
    evaluate_train_vs_test()
