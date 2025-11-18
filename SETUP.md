# Setup Instructions

## Quick Start

Follow these steps to get the AI Government Scheme Eligibility Finder running on your local machine.

## Step 1: Clone or Download

If you downloaded the ZIP file from v0, extract it to your desired location.

## Step 2: Backend Setup

### Install Python Dependencies

\`\`\`bash
# Navigate to backend directory
cd backend

# Install required packages
pip install Flask==3.0.0
pip install flask-cors==4.0.0
pip install PyJWT==2.8.0
pip install numpy==1.24.3
pip install scikit-learn==1.3.0
\`\`\`

Or use requirements.txt:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### Run Flask Server

\`\`\`bash
python run.py
\`\`\`

You should see:
\`\`\`
🚀 Flask Backend Running on http://localhost:5000
📊 In-memory storage enabled (no database)
🤖 ML Eligibility Checker initialized
\`\`\`

**Keep this terminal window open!**

## Step 3: Frontend Setup

Open a **new terminal window** and navigate to the project root directory.

### Install Node Dependencies

\`\`\`bash
npm install
\`\`\`

This will install all required packages including:
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Radix UI primitives

### Run Development Server

\`\`\`bash
npm run dev
\`\`\`

You should see:
\`\`\`
▲ Next.js 16.x.x
- Local:        http://localhost:3000
\`\`\`

## Step 4: Access the Application

Open your browser and navigate to:
\`\`\`
http://localhost:3000
\`\`\`

## Testing the Application

### Create a User Account

1. Click "Get Started" or "Register Now"
2. Fill in the registration form:
   - Aadhaar: Any 12-digit number (e.g., `123456789012`)
   - Name: Your name
   - Email: your@email.com
   - Phone: 10-digit number
   - Age: Your age
   - Gender: Select gender
   - Caste: Select category
   - Income: Annual income in rupees
   - State: Your state
   - District: Your district

3. Click "Create Account"

### Explore Features

After registration, you'll be redirected to the dashboard where you can:
- View eligible schemes
- Browse all schemes
- Apply for schemes
- Track applications
- Request profile edits

### Access Admin Panel

1. Logout from your user account
2. Login with admin credentials:
   - Aadhaar: `admin123`
3. Navigate to "Admin Panel" from the header
4. Review and process edit requests

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'flask'`
**Solution**: Install Flask and dependencies
\`\`\`bash
pip install -r backend/requirements.txt
\`\`\`

**Problem**: Port 5000 already in use
**Solution**: Change the port in `backend/run.py`:
\`\`\`python
app.run(debug=True, port=5001, host='0.0.0.0')
\`\`\`

Then update the frontend API calls to use `http://localhost:5001`

### Frontend Issues

**Problem**: `npm install` fails
**Solution**: Clear npm cache and retry
\`\`\`bash
npm cache clean --force
npm install
\`\`\`

**Problem**: Port 3000 already in use
**Solution**: Run on different port
\`\`\`bash
npm run dev -- -p 3001
\`\`\`

**Problem**: "Failed to fetch" errors
**Solution**: Ensure Flask backend is running on port 5000

### CORS Issues

**Problem**: CORS policy errors in browser console
**Solution**: Verify flask-cors is installed and enabled in `backend/app.py`

## Environment Variables

For production deployment, set these environment variables:

### Backend
\`\`\`bash
SECRET_KEY=your-secret-key-here
FLASK_ENV=production
\`\`\`

### Frontend
\`\`\`bash
NEXT_PUBLIC_API_URL=http://localhost:5000
\`\`\`

## Production Deployment

### Backend (Flask)

Deploy to platforms like:
- Heroku
- Railway
- AWS Elastic Beanstalk
- Google Cloud Run

### Frontend (Next.js)

Deploy to Vercel (recommended):
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
\`\`\`

Or use:
- Netlify
- AWS Amplify
- Cloudflare Pages

## Notes

- This demo uses in-memory storage - all data is lost when servers restart
- For production, implement persistent database (PostgreSQL, MongoDB)
- Add proper authentication and authorization
- Implement file upload for document verification
- Add input validation and sanitization
- Set up monitoring and logging
- Configure proper CORS for production domains

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review error messages in terminal/browser console
3. Ensure all dependencies are correctly installed
4. Verify both backend and frontend servers are running

Happy coding!
