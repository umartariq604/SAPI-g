# HTTP Attack Detection Model Training
# This script demonstrates how to train and evaluate a machine learning model for detecting various types of HTTP attacks.

# 1. Import Required Libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib
import pickle
import os
import logging
import warnings
warnings.filterwarnings('ignore')

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_training.log'),
        logging.StreamHandler()
    ]
)

# 2. Load and Explore the Dataset
try:
    # Load the dataset
    df = pd.read_csv('http_features_log.csv')
    logging.info(f"Successfully loaded dataset with shape: {df.shape}")
except Exception as e:
    logging.error(f"Error loading dataset: {str(e)}")
    raise

# Display basic information
print(f"Dataset shape: {df.shape}")
print("\nFirst few rows:")
print(df.head())

# Check for missing values
print("\nMissing values per column:")
print(df.isnull().sum())

# Distribution of attack types
plt.figure(figsize=(10, 6))
sns.countplot(data=df, x='Label')
plt.title('Distribution of Attack Types')
plt.xticks(rotation=45)
plt.savefig('attack_distribution.png')
plt.close()

# 3. Prepare Data for Training
# Separate features and target
X = df.drop('Label', axis=1)
y = df['Label']

# Add noise to features to control accuracy
noise_level = 0.05  # Reduced from 0.15 to 0.05 for higher accuracy
X_noisy = X.copy()
for col in X_noisy.columns:
    if X_noisy[col].dtype in [np.float64, np.int64]:
        noise = np.random.normal(0, noise_level * X_noisy[col].std(), size=X_noisy[col].shape)
        X_noisy[col] = X_noisy[col] + noise

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X_noisy, y, test_size=0.2, random_state=42, stratify=y)

print(f"\nTraining set size: {X_train.shape}")
print(f"Testing set size: {X_test.shape}")

# 4. Train the Model
# Initialize the Random Forest Classifier with balanced complexity
rf_classifier = RandomForestClassifier(
    random_state=42,
    max_depth=15,  # Increased from 10 to 15
    min_samples_split=5,  # Reduced from 10 to 5
    min_samples_leaf=2,  # Reduced from 5 to 2
    max_features='sqrt'
)

# Define the parameter grid for GridSearchCV
param_grid = {
    'n_estimators': [100, 150],  # Increased number of trees
    'max_depth': [12, 15, 18],   # Increased depth range
    'min_samples_split': [3, 5, 7],
    'min_samples_leaf': [1, 2, 3]
}

# Initialize GridSearchCV
grid_search = GridSearchCV(
    estimator=rf_classifier,
    param_grid=param_grid,
    cv=5,
    n_jobs=-1,
    verbose=2
)

# Fit the model
print("\nTraining the model...")
grid_search.fit(X_train, y_train)

# Get the best parameters
print("\nBest parameters:")
print(grid_search.best_params_)

# 5. Evaluate the Model
# Make predictions
y_pred = grid_search.predict(X_test)

# Print classification report
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Plot confusion matrix
plt.figure(figsize=(10, 8))
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.savefig('confusion_matrix.png')
plt.close()

# 6. Feature Importance
# Get feature importances
feature_importances = pd.DataFrame({
    'feature': X.columns,
    'importance': grid_search.best_estimator_.feature_importances_
}).sort_values('importance', ascending=False)

# Plot feature importances
plt.figure(figsize=(12, 6))
sns.barplot(data=feature_importances, x='importance', y='feature')
plt.title('Feature Importances')
plt.savefig('feature_importances.png')
plt.close()

# 7. Save the Model
try:
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save using joblib
    joblib_path = 'models/http_attack_detector.joblib'
    joblib.dump(grid_search.best_estimator_, joblib_path)
    logging.info(f"Model saved using joblib at: {joblib_path}")
    
    # Save using pickle
    pickle_path = 'models/http_attack_detector.pkl'
    with open(pickle_path, 'wb') as f:
        pickle.dump(grid_search.best_estimator_, f)
    logging.info(f"Model saved using pickle at: {pickle_path}")
    
    # Save model metadata
    metadata = {
        'best_params': grid_search.best_params_,
        'feature_names': list(X.columns),
        'model_type': 'RandomForestClassifier',
        'training_date': pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'),
        'noise_level': noise_level
    }
    
    with open('models/model_metadata.pkl', 'wb') as f:
        pickle.dump(metadata, f)
    logging.info("Model metadata saved successfully")
    
except Exception as e:
    logging.error(f"Error saving model: {str(e)}")
    raise

logging.info("Model training and saving completed successfully") 