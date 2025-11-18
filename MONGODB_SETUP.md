# MongoDB Integration Guide

This application now uses MongoDB Atlas for real-time data storage and synchronization.

## Database Configuration

**MongoDB Connection String:**
\`\`\`
mongodb+srv://apvss:apvss210@apvss.yz5llg1.mongodb.net/
\`\`\`

**Database Name:** `government_schemes_db`

## Collections

The application uses the following MongoDB collections:

### 1. users
- Stores user profiles with Aadhaar-based authentication
- Indexed on: `aadhaar` (unique)
- Fields: aadhaar, name, email, phone, caste, income, age, gender, state, district, documents, role, frozen, created_at

### 2. schemes
- Government welfare schemes catalog
- Indexed on: `id` (unique)
- Fields: id, name, description, category, benefits, eligibility_criteria, documents_required, application_start_date, application_end_date, requires_income_cert, requires_caste_cert, created_at

### 3. applications
- User scheme applications with status tracking
- Indexed on: `aadhaar`, `scheme_id`
- Fields: id, aadhaar, scheme_id, scheme_name, status, submitted_at, application_data, documents_uploaded, use_autofill, updated_at, admin_remarks

### 4. edit_requests
- User profile edit requests for admin approval
- Indexed on: `aadhaar`
- Fields: id, aadhaar, requested_changes, reason, status, created_at, processed_at, processed_by, admin_remarks

### 5. digilocker_sessions
- DigiLocker authentication sessions
- Indexed on: `session_id` (unique)
- Fields: session_id, status, created_at, redirect_url, aadhaar_number, name, dob, gender, state, district, completed_at

## Real-Time Features

All data is stored in MongoDB and synchronized in real-time:

1. **User Registration**: Profiles saved to MongoDB immediately
2. **Scheme Management**: Admin can add/edit/delete schemes, instantly visible to users
3. **Application Tracking**: Status updates reflected in real-time
4. **Edit Requests**: Profile edit requests processed and synced immediately
5. **DigiLocker Integration**: Session data stored and retrieved from MongoDB

## Sample Data

On first run, the application automatically initializes 7 sample government schemes:
- PM-KISAN
- Post Matric Scholarship for SC/ST Students
- Pradhan Mantri Ujjwala Yojana
- Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana
- Pradhan Mantri MUDRA Yojana
- Widow Pension Scheme
- National Old Age Pension Scheme

## Setup Instructions

1. Install MongoDB dependencies:
\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

2. The MongoDB connection is already configured in `backend/db.py`

3. Run the Flask backend:
\`\`\`bash
python run.py
\`\`\`

4. The database will auto-initialize with indexes and sample data

5. Start the frontend:
\`\`\`bash
npm install
npm run dev
\`\`\`

## Admin Access

- **Admin Login URL:** http://localhost:3000/admin/login
- **Credentials:**
  - User ID: `Samhitha`
  - Password: `Admin@sam`

## User Access

- **User Login URL:** http://localhost:3000/login
- Users can register with Aadhaar or DigiLocker authentication
- All eligible schemes shown in real-time after login

## Machine Learning Features

The application uses multiple ML algorithms for eligibility prediction:
- Random Forest Classifier
- Gradient Boosting
- XGBoost
- Deep Learning Neural Network (TensorFlow)
- Ensemble Voting Classifier

All models work in real-time with MongoDB data.

## Notes

- No database installation required - uses MongoDB Atlas cloud
- All data persists across server restarts
- Real-time updates without page refresh (polling every 30 seconds)
- Admin changes immediately visible to users
