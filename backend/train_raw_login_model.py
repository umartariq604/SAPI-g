import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib
import os

# Load raw dataset
df = pd.read_csv('dataset/raw_login_dataset.csv')

# Use only the password field for TF-IDF
X_text = df['password'].astype(str)
y = df['label']

# Print label distribution
print('Label distribution:')
print(y.value_counts())

# TF-IDF vectorization (improved)
vectorizer = TfidfVectorizer(ngram_range=(1,4), max_features=1000)
X_tfidf = vectorizer.fit_transform(X_text)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_tfidf, y, test_size=0.2, random_state=42, stratify=y)

# Train model with class_weight balanced and higher max_iter
clf = LogisticRegression(max_iter=2000, class_weight='balanced')
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))

# Save model and vectorizer
os.makedirs(os.path.join('backend', 'models'), exist_ok=True)
joblib.dump(clf, os.path.join('backend', 'models', 'raw_login_attack_detector.joblib'))
joblib.dump(vectorizer, os.path.join('backend', 'models', 'raw_tfidf_vectorizer.joblib'))
print('✅ Raw login model and TF-IDF vectorizer saved in backend/models/') 