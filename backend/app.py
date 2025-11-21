# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import jwt
import os

# Local imports (make sure these modules exist in your backend folder)
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

# ---------- App & Config ----------
app = Flask(__name__, static_folder="static", template_folder="templates")

# Load secret key from environment; replace in production with a secure random string
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key-in-production")

# Allowed origins: include your Vercel frontend and localhost for development
VERCEL_ORIGIN = "https://ai-scheme-application-web.vercel.app"
LOCAL_ORIGIN = "http://localhost:3000"

CORS(
    app,
    resources={r"/api/*": {"origins": [VERCEL_ORIGIN, LOCAL_ORIGIN]}},
    supports_credentials=True
)

# Hardcoded admin credentials (consider moving to env or DB in production)
ADMIN_CREDENTIALS = {
    "user_id": "Samhitha",
    "password": "Admin@sam"
}

# ---------- Helpers ----------
def clean_doc(doc):
    """Remove MongoDB internal fields before returning to client."""
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc

def _decode_jwt_token(token):
    """Decode JWT token and return payload or raise appropriate error."""
    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidTokenError:
        raise

# ---------- Auth decorators ----------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token is missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1].strip()

        try:
            data = _decode_jwt_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired"}), 401
        except Exception:
            return jsonify({"message": "Token is invalid"}), 401

        lookup_key = data.get("aadhaar") or data.get("user_id")
        current_user = None

        if lookup_key:
            current_user = users_collection.find_one({"aadhaar": lookup_key}, {"_id": 0})

        # If token is admin token, create admin user object
        if not current_user and data.get("user_id") == ADMIN_CREDENTIALS["user_id"]:
            current_user = {"user_id": ADMIN_CREDENTIALS["user_id"], "role": "admin"}

        if not current_user:
            return jsonify({"message": "User not found"}), 404

        return f(current_user, *args, **kwargs)

    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token is missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1].strip()

        try:
            data = _decode_jwt_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired"}), 401
        except Exception:
            return jsonify({"message": "Token is invalid"}), 401

        lookup_key = data.get("aadhaar") or data.get("user_id")
        current_user = None

        if lookup_key:
            current_user = users_collection.find_one({"aadhaar": lookup_key}, {"_id": 0})

        if not current_user and data.get("user_id") == ADMIN_CREDENTIALS["user_id"]:
            current_user = {"user_id": ADMIN_CREDENTIALS["user_id"], "role": "admin"}

        if not current_user or current_user.get("role") != "admin":
            return jsonify({"message": "Admin access required"}), 403

        return f(current_user, *args, **kwargs)

    return decorated

# ---------- Routes ----------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Backend is running. Use /api/* endpoints."}), 200

# ---------- AUTH ROUTES ----------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    aadhaar = data.get("aadhaar")
    if not aadhaar:
        return jsonify({"message": "Aadhaar number is required"}), 400

    if users_collection.find_one({"aadhaar": aadhaar}):
        return jsonify({"message": "User already exists with this Aadhaar number"}), 400

    user_data = {
        "aadhaar": aadhaar,
        "name": data.get("name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "caste": data.get("caste"),
        "income": data.get("income"),
        "age": data.get("age"),
        "gender": data.get("gender"),
        "state": data.get("state"),
        "district": data.get("district"),
        "documents": data.get("documents", {}),
        "role": "user",
        "frozen": True,
        "created_at": datetime.utcnow().isoformat()
    }

    users_collection.insert_one(user_data)

    token = jwt.encode(
        {
            "aadhaar": aadhaar,
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    user_out = clean_doc(user_data)

    # PyJWT >= 2.0 returns str; ensure consistent return type
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify({"message": "User registered successfully", "token": token, "user": user_out}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    aadhaar = data.get("aadhaar")
    if not aadhaar:
        return jsonify({"message": "Aadhaar number is required"}), 400

    user = users_collection.find_one({"aadhaar": aadhaar}, {"_id": 0})
    if not user:
        return jsonify({"message": "Invalid Aadhaar number"}), 401

    token = jwt.encode(
        {
            "aadhaar": aadhaar,
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify({"message": "Login successful", "token": token, "user": user}), 200

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    password = data.get("password")

    if user_id == ADMIN_CREDENTIALS["user_id"] and password == ADMIN_CREDENTIALS["password"]:
        token = jwt.encode(
            {
                "user_id": user_id,
                "exp": datetime.utcnow() + timedelta(days=30)
            },
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )

        if isinstance(token, bytes):
            token = token.decode("utf-8")

        return jsonify({"message": "Admin login successful", "token": token}), 200

    return jsonify({"message": "Invalid admin credentials"}), 401

# ---------- USER ROUTES ----------
@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    return jsonify(current_user), 200

# ---------- SCHEMES ----------
@app.route("/api/schemes", methods=["GET"])
def get_all_schemes():
    all_schemes = [clean_doc(s) for s in list(schemes_collection.find({}, {"_id": 0}))]
    return jsonify(all_schemes), 200

@app.route("/api/schemes/<scheme_id>", methods=["GET"])
def get_scheme_details(scheme_id):
    scheme = schemes_collection.find_one({"id": scheme_id}, {"_id": 0})
    if not scheme:
        return jsonify({"message": "Scheme not found"}), 404
    return jsonify(scheme), 200

@app.route("/api/schemes/eligible", methods=["POST"])
@token_required
def check_eligible_schemes(current_user):
    def dummy_eligibility_checker(user, scheme):
        criteria = scheme.get("eligibility_criteria", {})
        income_limit = criteria.get("max_income")
        min_age = criteria.get("min_age")
        max_age = criteria.get("max_age")

        try:
            user_income = int(user.get("income", 0) or 0)
        except Exception:
            user_income = 0
        try:
            user_age = int(user.get("age", 0) or 0)
        except Exception:
            user_age = 0

        if income_limit is not None and user_income > int(income_limit):
            return False, 0.8, "Income exceeds limit"
        if min_age is not None and user_age < int(min_age):
            return False, 0.7, "Age below minimum"
        if max_age is not None and user_age > int(max_age):
            return False, 0.7, "Age above limit"

        return True, 0.95, "Eligible based on given criteria"

    all_schemes = list(schemes_collection.find({}, {"_id": 0}))
    eligible_schemes = []

    for scheme in all_schemes:
        is_eligible, confidence, reason = dummy_eligibility_checker(current_user, scheme)
        if is_eligible:
            eligible_schemes.append({**scheme, "eligibility_confidence": confidence, "eligibility_reason": reason})

    return jsonify({"total_schemes": len(all_schemes), "eligible_count": len(eligible_schemes), "eligible_schemes": eligible_schemes}), 200

# ---------- USER APPLICATIONS ----------
@app.route("/api/applications", methods=["GET"])
@token_required
def get_user_applications(current_user):
    aadhaar = current_user.get("aadhaar")
    if not aadhaar:
        return jsonify({"message": "User Aadhaar missing"}), 400

    apps = [clean_doc(a) for a in list(applications_collection.find({"aadhaar": aadhaar}, {"_id": 0}))]
    return jsonify(apps), 200

@app.route("/api/applications", methods=["POST"])
@token_required
def create_application(current_user):
    data = request.get_json() or {}
    aadhaar = current_user.get("aadhaar")

    application = {
        "aadhaar": aadhaar,
        "scheme_id": data.get("scheme_id"),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    applications_collection.insert_one(application)
    application_out = clean_doc(application)

    return jsonify({"message": "Application created successfully", "application": application_out}), 201

# ---------- EDIT REQUESTS ----------
@app.route("/api/edit-request", methods=["POST"])
@token_required
def create_edit_request(current_user):
    data = request.get_json() or {}
    request_data = {
        "aadhaar": current_user.get("aadhaar"),
        "requested_changes": data.get("changes"),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    edit_requests_collection.insert_one(request_data)
    request_out = clean_doc(request_data)

    return jsonify({"message": "Edit request submitted successfully", "request": request_out}), 201

# ---------- ADMIN ROUTES ----------
@app.route("/api/admin/applications", methods=["GET"])
@admin_required
def admin_all_applications(current_user):
    all_apps = [clean_doc(a) for a in list(applications_collection.find({}, {"_id": 0}))]
    return jsonify(all_apps), 200

@app.route("/api/admin/edit-requests", methods=["GET"])
@admin_required
def admin_edit_requests(current_user):
    all_requests = [clean_doc(r) for r in list(edit_requests_collection.find({}, {"_id": 0}))]
    return jsonify(all_requests), 200

@app.route("/api/admin/schemes", methods=["GET"])
@admin_required
def admin_all_schemes(current_user):
    all_schemes = [clean_doc(s) for s in list(schemes_collection.find({}, {"_id": 0}))]
    return jsonify(all_schemes), 200

# ---------- Optional: serve SPA files if any (not required for Render + Vercel separation) ----------
@app.route("/<path:path>")
def serve_static(path):
    # If you ever decide to bundle front and back, this serves static files from backend/static
    static_dir = app.static_folder or "static"
    if os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return jsonify({"message": "Not found"}), 404

# ---------- Main ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")
    app.run(debug=debug, host="0.0.0.0", port=port)
