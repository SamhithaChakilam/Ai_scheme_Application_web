from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import jwt

from digilocker_integration import (
    initiate_digilocker_auth,
    check_digilocker_session,
    fetch_aadhaar_data,
    simulate_digilocker_consent,
    verify_aadhaar_otp
)

from db import (
    users_collection,
    schemes_collection,
    applications_collection,
    edit_requests_collection
)

app = Flask(__name__)

# CORS configuration
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True
)

# Secret key for JWT
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'

# Hardcoded admin credentials
ADMIN_CREDENTIALS = {
    'user_id': 'Samhitha',
    'password': 'Admin@sam'
}

# ---------------- JWT HELPERS ---------------- #

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]

            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])

            lookup_key = data.get('aadhaar', data.get('user_id'))
            current_user = None

            if lookup_key:
                current_user = users_collection.find_one(
                    {'aadhaar': lookup_key},
                    {'_id': 0}
                )

            if not current_user and data.get('user_id') == ADMIN_CREDENTIALS['user_id']:
                current_user = {
                    'user_id': ADMIN_CREDENTIALS['user_id'],
                    'role': 'admin'
                }

            if not current_user:
                return jsonify({'message': 'User not found'}), 404

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except Exception:
            return jsonify({'message': 'Token is invalid or expired'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]

            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])

            lookup_key = data.get('aadhaar', data.get('user_id'))
            current_user = None

            if lookup_key:
                current_user = users_collection.find_one(
                    {'aadhaar': lookup_key},
                    {'_id': 0}
                )

            if not current_user and data.get('user_id') == ADMIN_CREDENTIALS['user_id']:
                current_user = {
                    'user_id': ADMIN_CREDENTIALS['user_id'],
                    'role': 'admin'
                }

            if not current_user or current_user.get('role') != 'admin':
                return jsonify({'message': 'Admin access required'}), 403

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except Exception:
            return jsonify({'message': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

# ---------------- AUTH ROUTES ---------------- #

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}

    aadhaar = data.get('aadhaar')

    if not aadhaar:
        return jsonify({'message': 'Aadhaar number is required'}), 400

    if users_collection.find_one({'aadhaar': aadhaar}):
        return jsonify({'message': 'User already exists with this Aadhaar number'}), 400

    user_data = {
        'aadhaar': aadhaar,
        'name': data.get('name'),
        'email': data.get('email'),
        'phone': data.get('phone'),
        'caste': data.get('caste'),
        'income': data.get('income'),
        'age': data.get('age'),
        'gender': data.get('gender'),
        'state': data.get('state'),
        'district': data.get('district'),
        'documents': data.get('documents', {}),
        'role': 'user',
        'frozen': True,
        'created_at': datetime.now().isoformat()
    }

    users_collection.insert_one(user_data)

    token = jwt.encode({
        'aadhaar': aadhaar,
        'exp': datetime.utcnow() + timedelta(days=30)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    user_data.pop('_id', None)

    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': user_data
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    aadhaar = data.get('aadhaar')

    user = users_collection.find_one({'aadhaar': aadhaar}, {'_id': 0})

    if not aadhaar or not user:
        return jsonify({'message': 'Invalid Aadhaar number'}), 401

    token = jwt.encode({
        'aadhaar': aadhaar,
        'exp': datetime.utcnow() + timedelta(days=30)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user
    }), 200


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    password = data.get('password')

    if user_id == ADMIN_CREDENTIALS['user_id'] and password == ADMIN_CREDENTIALS['password']:
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(days=30)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'message': 'Admin login successful',
            'token': token
        }), 200

    return jsonify({'message': 'Invalid admin credentials'}), 401

# ---------------- USER ROUTES ---------------- #

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify(current_user), 200

# ---------------- SCHEMES ROUTES ---------------- #

@app.route('/api/schemes', methods=['GET'])
def get_all_schemes():
    all_schemes = list(schemes_collection.find({}, {'_id': 0}))
    return jsonify(all_schemes), 200


@app.route('/api/schemes/<scheme_id>', methods=['GET'])
def get_scheme_details(scheme_id):
    scheme = schemes_collection.find_one({'id': scheme_id}, {'_id': 0})

    if not scheme:
        return jsonify({'message': 'Scheme not found'}), 404

    return jsonify(scheme), 200


@app.route('/api/schemes/eligible', methods=['POST'])
@token_required
def check_eligible_schemes(current_user):
    def dummy_eligibility_checker(user, scheme):
        criteria = scheme.get('eligibility_criteria', {})
        income_limit = criteria.get('max_income', None)
        min_age = criteria.get('min_age', None)
        max_age = criteria.get('max_age', None)

        user_income = int(user.get('income', 0) or 0)
        user_age = int(user.get('age', 0) or 0)

        if income_limit is not None and user_income > int(income_limit):
            return False, 0.8, "Income exceeds limit"
        if min_age is not None and user_age < int(min_age):
            return False, 0.7, "Age below minimum"
        if max_age is not None and user_age > int(max_age):
            return False, 0.7, "Age above limit"

        return True, 0.95, "Eligible based on given criteria"

    all_schemes = list(schemes_collection.find({}, {'_id': 0}))
    eligible_schemes = []

    for scheme in all_schemes:
        is_eligible, confidence, reason = dummy_eligibility_checker(current_user, scheme)

        if is_eligible:
            eligible_schemes.append({
                **scheme,
                'eligibility_confidence': confidence,
                'eligibility_reason': reason
            })

    return jsonify({
        'total_schemes': len(all_schemes),
        'eligible_count': len(eligible_schemes),
        'eligible_schemes': eligible_schemes
    }), 200

# ---------------- USER APPLICATIONS ---------------- #

@app.route('/api/applications', methods=['GET'])
@token_required
def get_user_applications(current_user):
    aadhaar = current_user.get('aadhaar')
    if not aadhaar:
        return jsonify({'message': 'User Aadhaar missing'}), 400

    apps = list(applications_collection.find({'aadhaar': aadhaar}, {'_id': 0}))
    return jsonify(apps), 200


@app.route('/api/applications', methods=['POST'])
@token_required
def create_application(current_user):
    data = request.get_json() or {}
    aadhaar = current_user.get('aadhaar')

    application = {
        'aadhaar': aadhaar,
        'scheme_id': data.get('scheme_id'),
        'status': 'pending',
        'created_at': datetime.utcnow().isoformat()
    }

    applications_collection.insert_one(application)
    application.pop('_id', None)

    return jsonify({
        'message': 'Application created successfully',
        'application': application
    }), 201

# ---------------- USER EDIT REQUESTS ---------------- #

@app.route('/api/edit-request', methods=['POST'])
@token_required
def create_edit_request(current_user):
    """
    User submits a request to edit their profile or application.
    """
    data = request.get_json() or {}
    request_data = {
        'aadhaar': current_user.get('aadhaar'),
        'requested_changes': data.get('changes'),
        'status': 'pending',
        'created_at': datetime.utcnow().isoformat()
    }

    edit_requests_collection.insert_one(request_data)
    request_data.pop('_id', None)

    return jsonify({
        'message': 'Edit request submitted successfully',
        'request': request_data
    }), 201

# ---------------- ADMIN ROUTES ---------------- #

@app.route('/api/admin/applications', methods=['GET'])
@admin_required
def admin_all_applications(current_user):
    all_apps = list(applications_collection.find({}, {'_id': 0}))
    return jsonify(all_apps), 200


@app.route('/api/admin/edit-requests', methods=['GET'])
@admin_required
def admin_edit_requests(current_user):
    all_requests = list(edit_requests_collection.find({}, {'_id': 0}))
    return jsonify(all_requests), 200


@app.route('/api/admin/schemes', methods=['GET'])
@admin_required
def admin_all_schemes(current_user):
    all_schemes = list(schemes_collection.find({}, {'_id': 0}))
    return jsonify(all_schemes), 200

# ---------------- MAIN ---------------- #

if __name__ == '__main__':
    app.run(debug=True, port=5000)
