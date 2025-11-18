from pymongo import MongoClient
from datetime import datetime
import os

MONGODB_URI = "mongodb+srv://apvss:apvss210@apvss.yz5llg1.mongodb.net/"
DATABASE_NAME = "government_schemes_db"

# Initialize MongoDB client
client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

# Collections
users_collection = db['users']
schemes_collection = db['schemes']
applications_collection = db['applications']
edit_requests_collection = db['edit_requests']
digilocker_sessions_collection = db['digilocker_sessions']

# Create indexes for better performance
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
            {
                'id': 'PM_KISAN',
                'name': 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
                'description': 'Financial assistance of Rs. 6000 per year to farmer families',
                'category': 'Agriculture',
                'benefits': 'Rs. 6000 per year in three equal installments',
                'eligibility_criteria': {
                    'min_age': 18,
                    'max_income': 200000,
                },
                'documents_required': ['Aadhaar Card', 'Land Records', 'Bank Account'],
                'application_start_date': '2024-01-01',
                'application_end_date': '2025-12-31',
                'requires_income_cert': True,
                'requires_caste_cert': False,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'SCHOLARSHIP_SC_ST',
                'name': 'Post Matric Scholarship for SC/ST Students',
                'description': 'Financial assistance for SC/ST students pursuing higher education',
                'category': 'Education',
                'benefits': 'Up to Rs. 50,000 per year for education expenses',
                'eligibility_criteria': {
                    'min_age': 16,
                    'max_age': 35,
                    'caste': ['SC', 'ST'],
                    'max_income': 250000
                },
                'documents_required': ['Aadhaar Card', 'Caste Certificate', 'Income Certificate', 'Admission Proof'],
                'application_start_date': '2024-06-01',
                'application_end_date': '2025-08-31',
                'requires_income_cert': True,
                'requires_caste_cert': True,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'UJJWALA_YOJANA',
                'name': 'Pradhan Mantri Ujjwala Yojana',
                'description': 'Free LPG connections to women from Below Poverty Line (BPL) households',
                'category': 'Welfare',
                'benefits': 'Free LPG connection',
                'eligibility_criteria': {
                    'gender': 'female',
                    'max_income': 100000
                },
                'documents_required': ['Aadhaar Card', 'BPL Card', 'Address Proof'],
                'application_start_date': '2024-01-01',
                'application_end_date': '2025-12-31',
                'requires_income_cert': True,
                'requires_caste_cert': False,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'AYUSHMAN_BHARAT',
                'name': 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana',
                'description': 'Health insurance coverage of Rs. 5 lakh per family per year',
                'category': 'Health',
                'benefits': 'Rs. 5 lakh health insurance coverage',
                'eligibility_criteria': {
                    'max_income': 300000
                },
                'documents_required': ['Aadhaar Card', 'Income Certificate', 'Ration Card'],
                'application_start_date': '2024-01-01',
                'application_end_date': '2025-12-31',
                'requires_income_cert': True,
                'requires_caste_cert': False,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'MUDRA_LOAN',
                'name': 'Pradhan Mantri MUDRA Yojana',
                'description': 'Loans up to Rs. 10 lakh for small businesses',
                'category': 'Business',
                'benefits': 'Loans from Rs. 50,000 to Rs. 10 lakh',
                'eligibility_criteria': {
                    'min_age': 18,
                    'max_income': 500000
                },
                'documents_required': ['Aadhaar Card', 'Business Plan', 'Bank Statements'],
                'application_start_date': '2024-01-01',
                'application_end_date': '2025-12-31',
                'requires_income_cert': False,
                'requires_caste_cert': False,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'WIDOW_PENSION',
                'name': 'Widow Pension Scheme',
                'description': 'Monthly pension for widows',
                'category': 'Social Security',
                'benefits': 'Rs. 1000 per month',
                'eligibility_criteria': {
                    'gender': 'female',
                    'min_age': 40,
                    'max_income': 150000
                },
                'documents_required': ['Aadhaar Card', 'Husband Death Certificate', 'Income Certificate'],
                'application_start_date': '2024-01-01',
                'application_end_date': '2025-12-31',
                'requires_income_cert': True,
                'requires_caste_cert': False,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'OLD_AGE_PENSION',
                'name': 'National Old Age Pension Scheme',
                'description': 'Monthly pension for senior citizens',
                'category': 'Social Security',
                'benefits': 'Rs. 500-2000 per month based on age',
                'eligibility_criteria': {
                    'min_age': 60,
                    'max_income': 200000
                },
                'documents_required': ['Aadhaar Card', 'Age Proof', 'Income Certificate'],
                'application_start_date': '2024-01-01',
                'application_end_date': '2025-12-31',
                'requires_income_cert': True,
                'requires_caste_cert': False,
                'created_at': datetime.now().isoformat()
            }
        ]
        
        schemes_collection.insert_many(sample_schemes)
        print(f"Initialized {len(sample_schemes)} sample schemes")

# Initialize schemes on module load
init_sample_schemes()
