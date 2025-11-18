from pymongo import MongoClient
from datetime import datetime
import os
import certifi

# Read MongoDB URI from environment variable (set this in Render)
MONGODB_URI = os.getenv("MONGO_URI")

if not MONGODB_URI:
    raise ValueError("MONGO_URI is not set in environment variables.")

# Database name
DATABASE_NAME = os.getenv("DB_NAME", "government_schemes_db")

# Initialize MongoDB client with TLS support
client = MongoClient(MONGODB_URI, tls=True, tlsCAFile=certifi.where())
db = client[DATABASE_NAME]

# Collections
users_collection = db['users']
schemes_collection = db['schemes']
applications_collection = db['applications']
edit_requests_collection = db['edit_requests']
digilocker_sessions_collection = db['digilocker_sessions']

# Create indexes
users_collection.create_index('aadhaar', unique=True)
schemes_collection.create_index('id', unique=True)
applications_collection.create_index('aadhaar')
applications_collection.create_index('scheme_id')
edit_requests_collection.create_index('aadhaar')
digilocker_sessions_collection.create_index('session_id', unique=True)

def init_sample_schemes():
    """Initialize sample schemes if database is empty"""
    if schemes_collection.count_documents({}) == 0:
        sample_schemes = [
            # ... (your sample scheme data stays the same)
        ]
        schemes_collection.insert_many(sample_schemes)
        print(f"Initialized {len(sample_schemes)} sample schemes")

# Initialize sample data
init_sample_schemes()
