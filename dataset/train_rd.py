import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# 1. Load dataset
df = pd.read_csv("balanced_500k_random_cicids.csv")
print("✅ Loaded dataset:", df.shape)

# 2. Encode target labels
label_encoder = LabelEncoder()
df['Label'] = label_encoder.fit_transform(df['Label'])  # e.g., BENIGN → 0, DDoS → 1, ...

# 3. Separate features and target
X = df.drop('Label', axis=1)
y = df['Label']

# Save feature names to use them during inference
with open("features.pkl", "wb") as f:
    pickle.dump(X.columns.tolist(), f)

# 4. Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 5. Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
print("🔍 Train size:", len(X_train), "| Test size:", len(X_test))

# 6. Train Random Forest
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)
print("✅ Training complete!")

# 7. Save model, scaler, encoder
with open('rf_model.pkl', 'wb') as f:
    pickle.dump(model, f)
with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
with open('label_encoder.pkl', 'wb') as f:
    pickle.dump(label_encoder, f)
print("💾 Model, scaler, and label encoder saved.")

# 8. Evaluation
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n🎯 Accuracy: {round(acc * 100, 2)}%")

# Classification Report
print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

# Confusion Matrix
plt.figure(figsize=(10, 6))
sns.heatmap(confusion_matrix(y_test, y_pred), annot=True, fmt='d',
            xticklabels=label_encoder.classes_,
            yticklabels=label_encoder.classes_,
            cmap="Blues")
plt.title("Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.tight_layout()
plt.show()
