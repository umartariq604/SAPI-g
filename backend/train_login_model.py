import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from scipy.sparse import hstack, csr_matrix
import joblib
import os

# Load dataset
csv_path = os.path.join('dataset', 'http_features_log.csv')
df = pd.read_csv(csv_path)

# Numeric features
numeric_features = [
    'email_length','password_length','password_special_chars','request_method_post','endpoint_login',
    'user_agent_length','ip1','ip2','ip3','ip4','time_since_last','num_params',
    'has_sql_keywords','has_script_tag','has_union_select','has_or_equals','entropy',
    'hour_of_day','day_of_week','is_email_gmail','is_email_yahoo','is_email_outlook','dummy'
]
X_numeric = df[numeric_features]
y = df['Label']

# TF-IDF on password
tfidf = TfidfVectorizer(ngram_range=(1,3), max_features=200)
X_tfidf = tfidf.fit_transform(df['raw_password'].astype(str))

# Scale numeric features
scaler = StandardScaler()
X_numeric_scaled = scaler.fit_transform(X_numeric)

# Combine numeric and tfidf features
X_combined = hstack([csr_matrix(X_numeric_scaled), X_tfidf])

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_combined, y, test_size=0.2, random_state=42, stratify=y)

# Train model
clf = LogisticRegression(max_iter=1000)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))

# Save model and vectorizer
os.makedirs(os.path.join('backend', 'models'), exist_ok=True)
joblib.dump(clf, os.path.join('backend', 'models', 'login_attack_detector.joblib'))
joblib.dump(tfidf, os.path.join('backend', 'models', 'tfidf_vectorizer.joblib'))
joblib.dump(scaler, os.path.join('backend', 'models', 'numeric_scaler.joblib'))
print('✅ Model, TF-IDF vectorizer, and scaler saved in backend/models/') 