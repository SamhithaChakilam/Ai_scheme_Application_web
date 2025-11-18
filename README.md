<<<<<<< HEAD
# AI Government Scheme Eligibility Finder

A comprehensive full-stack application that helps Indian citizens discover and apply for government welfare schemes they qualify for using AI-powered eligibility matching.

## Features

### For Citizens
- **One Aadhaar, One Account**: Register once with your Aadhaar number and all required documents
- **AI-Powered Matching**: Machine learning algorithm analyzes your profile against all available schemes
- **Frozen Profile System**: Your information is locked after registration to prevent fraud
- **Real-time Eligibility**: Instantly see which schemes you qualify for with confidence scores
- **Application Tracking**: Submit applications and track their status in real-time
- **Edit Requests**: Request profile changes through admin approval system

### For Administrators
- **Edit Request Management**: Review and approve/reject profile change requests
- **Application Monitoring**: Track all user applications across schemes
- **Dashboard Analytics**: View statistics on requests, approvals, and rejections

## Tech Stack

### Backend
- **Flask**: Python web framework
- **Flask-CORS**: Cross-origin resource sharing
- **PyJWT**: JWT token authentication
- **scikit-learn**: Machine learning for eligibility prediction
- **NumPy**: Numerical computing

### Frontend
- **Next.js 16**: React framework with App Router
- **React 19**: Latest React features
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **Radix UI**: Headless UI primitives

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Install Python dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

3. Run the Flask server:
\`\`\`bash
python run.py
\`\`\`

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Install dependencies (in root directory):
\`\`\`bash
npm install
\`\`\`

2. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

The frontend will run on `http://localhost:3000`

## Usage

### Demo Credentials
- **Admin Account**: Use Aadhaar number `admin123`
- **User Account**: Register with any 12-digit number

### User Flow
1. **Register**: Provide Aadhaar, personal details, caste, income, and location
2. **Dashboard**: View all schemes you're eligible for with AI confidence scores
3. **Browse Schemes**: Explore all available schemes with search and filters
4. **Apply**: Click "Apply Now" on eligible schemes
5. **Track**: Monitor application status from submission to approval
6. **Edit Profile**: Request profile changes through admin approval

### Admin Flow
1. **Login**: Use admin credentials
2. **Review Requests**: View all pending edit requests
3. **Approve/Reject**: Process requests with one click
4. **Monitor**: Track all processed requests

## Sample Schemes Included

- PM-KISAN (Agriculture)
- Post Matric Scholarship for SC/ST Students (Education)
- Pradhan Mantri Ujjwala Yojana (Welfare)
- Ayushman Bharat (Health)
- Pradhan Mantri MUDRA Yojana (Business)
- Widow Pension Scheme (Social Security)
- National Old Age Pension Scheme (Social Security)

## Machine Learning Features

The eligibility checker uses:
- **Random Forest Classifier**: Trained model for eligibility prediction
- **Feature Engineering**: Age, income brackets, caste codes, gender encoding
- **Confidence Scores**: ML-based probability scores for each scheme match
- **Rule-based Validation**: Hard constraints checked before ML prediction

## Security Features

- JWT token-based authentication
- Frozen profile system prevents unauthorized edits
- Admin approval required for profile changes
- Role-based access control

## Architecture

### In-Memory Storage
As requested, the application uses in-memory dictionaries instead of a database:
- User data stored in Python dict
- Applications stored in Python dict
- Edit requests stored in Python dict
- Schemes loaded from Python list

### API Endpoints

**Authentication**
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile

**Schemes**
- `GET /api/schemes` - Get all schemes
- `POST /api/schemes/eligible` - Check eligible schemes
- `GET /api/schemes/:id` - Get scheme details

**Applications**
- `POST /api/applications` - Submit application
- `GET /api/applications` - Get user applications
- `GET /api/applications/:id` - Get application details

**Admin**
- `GET /api/admin/edit-requests` - Get all edit requests
- `PUT /api/admin/edit-request/:id` - Approve/reject request
- `POST /api/edit-request` - Submit edit request

## Future Enhancements

- SMS/Email notifications for application status
- Document upload and OCR verification
- Multi-language support (Hindi, regional languages)
- State-specific scheme integration
- Real-time chat support
- Mobile app version
- Advanced ML models with more training data
- Integration with government databases

## Contributing

This is a demo application. For production use, consider:
- Adding persistent database (PostgreSQL/MongoDB)
- Implementing file upload for documents
- Adding proper authentication (OAuth/Aadhaar API)
- Implementing caching (Redis)
- Adding monitoring and logging
- Setting up proper environment configuration

## License

MIT License - See LICENSE file for details
=======
# Ai_scheme_Application_portal
>>>>>>> 19db6d598942e8a809b3a4f1cbebef917d853baa
