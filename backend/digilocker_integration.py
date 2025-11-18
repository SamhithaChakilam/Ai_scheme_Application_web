import requests
import json
from datetime import datetime
import secrets
from db import digilocker_sessions_collection

# DigiLocker Sandbox Configuration
DIGILOCKER_CONFIG = {
    'sandbox_url': 'https://dg-sandbox.setu.co',
    'api_key': 'your-sandbox-api-key',
    'api_secret': 'your-sandbox-api-secret',
    'redirect_url': 'http://localhost:3000/auth/digilocker/callback'
}

def initiate_digilocker_auth():
    """
    Initiate DigiLocker authentication flow
    Returns a session ID and DigiLocker URL for user consent
    """
    try:
        # Generate unique session ID
        session_id = secrets.token_urlsafe(32)
        
        session_data = {
            'session_id': session_id,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'redirect_url': DIGILOCKER_CONFIG['redirect_url']
        }
        
        digilocker_sessions_collection.insert_one(session_data)
        
        # Return session details and consent URL
        return {
            'success': True,
            'session_id': session_id,
            'consent_url': f"https://digilocker-sandbox.com/consent?session={session_id}",
            'message': 'DigiLocker authentication initiated'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Error initiating DigiLocker auth: {str(e)}'
        }

def check_digilocker_session(session_id):
    """
    Check the status of a DigiLocker session
    """
    session = digilocker_sessions_collection.find_one(
        {'session_id': session_id},
        {'_id': 0}
    )
    
    if not session:
        return {
            'success': False,
            'message': 'Invalid session ID'
        }
    
    return {
        'success': True,
        'session': session
    }

def fetch_aadhaar_data(session_id):
    """
    Fetch Aadhaar data after successful DigiLocker consent
    In sandbox mode, this returns mock data
    In production, this would call the actual DigiLocker API
    """
    try:
        session = digilocker_sessions_collection.find_one(
            {'session_id': session_id},
            {'_id': 0}
        )
        
        if not session:
            return {
                'success': False,
                'message': 'Invalid session ID'
            }
        
        if session['status'] != 'completed':
            return {
                'success': False,
                'message': 'Session not completed. User consent required.'
            }
        
        # Mock Aadhaar data for sandbox
        aadhaar_data = {
            'aadhaar_number': session.get('aadhaar_number', '123456789012'),
            'name': session.get('name', 'John Doe'),
            'dob': session.get('dob', '01/01/1990'),
            'gender': session.get('gender', 'Male'),
            'address': session.get('address', {
                'house': '123',
                'street': 'Main Street',
                'landmark': 'Near Park',
                'locality': 'Sector 1',
                'vtc': 'Sample City',
                'district': session.get('district', 'Sample District'),
                'state': session.get('state', 'Sample State'),
                'pincode': '110001'
            }),
            'photo': session.get('photo', ''),
            'verified': True
        }
        
        return {
            'success': True,
            'data': aadhaar_data
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Error fetching Aadhaar data: {str(e)}'
        }

def simulate_digilocker_consent(session_id, aadhaar_number, name, dob, gender, state, district):
    """
    Simulate DigiLocker user consent (for sandbox testing)
    In production, this would be handled by DigiLocker's consent page
    """
    session = digilocker_sessions_collection.find_one({'session_id': session_id})
    
    if not session:
        return {
            'success': False,
            'message': 'Invalid session ID'
        }
    
    # Update session with user data
    digilocker_sessions_collection.update_one(
        {'session_id': session_id},
        {'$set': {
            'status': 'completed',
            'aadhaar_number': aadhaar_number,
            'name': name,
            'dob': dob,
            'gender': gender,
            'state': state,
            'district': district,
            'completed_at': datetime.now().isoformat()
        }}
    )
    
    return {
        'success': True,
        'message': 'Consent completed successfully',
        'session_id': session_id
    }

def verify_aadhaar_otp(aadhaar_number, otp):
    """
    Verify Aadhaar OTP (sandbox simulation)
    In production, this would validate against actual DigiLocker/UIDAI
    """
    # For sandbox, accept any 6-digit OTP
    if len(otp) == 6 and otp.isdigit():
        return {
            'success': True,
            'verified': True,
            'message': 'OTP verified successfully'
        }
    else:
        return {
            'success': False,
            'verified': False,
            'message': 'Invalid OTP'
        }
