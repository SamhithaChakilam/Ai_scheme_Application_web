# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import jwt
import os
import uuid
from bson import ObjectId

# Local imports
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

# ------------------------------------------------------------------------------------------------------
# APP CONFIG
# ------------------------------------------------------------------------------------------------------

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key-in-production")

VERCEL_ORIGIN = "https://ai-scheme-application-web.vercel.app"
LOCAL_ORIGIN = "http://localhost:3000"

CORS(app, resources={r"/api/*": {"origins": [VERCEL_ORIGIN, LOCAL_ORIGIN]}}, supports_credentials=True)

ADMIN_CREDENTIALS = {
    "user_id": "Samhitha",
    "password": "Admin@sam"
}

# ------------------------------------------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------------------------------------------

def clean_doc(doc):
    if not doc:
        return doc
    d = dict(doc)
    d.pop("_id", None)
    return d


def decode_token(token):
    return jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])


# ------------------------------------------------------------------------------------------------------
# AUTH DECORATORS
# ------------------------------------------------------------------------------------------------------

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]

        try:
            data = decode_token(token)
        except Exception:
            return jsonify({"message": "Invalid or expired token"}), 401

        lookup = data.get("aadhaar") or data.get("user_id")
        user = users_collection.find_one({"aadhaar": lookup}, {"_id": 0})

        if not user and lookup == ADMIN_CREDENTIALS["user_id"]:
            user = {"role": "admin", "user_id": lookup}

        if not user:
            return jsonify({"message": "User not found"}), 404

        return f(user, *args, **kwargs)

    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]

        try:
            data = decode_token(token)
        except:
            return jsonify({"message": "Invalid token"}), 401

        if data.get("user_id") != ADMIN_CREDENTIALS["user_id"]:
            return jsonify({"message": "Admin access required"}), 403

        return f({"role": "admin", "user_id": data["user_id"]}, *args, **kwargs)

    return wrapper


# ------------------------------------------------------------------------------------------------------
# AUTO-MIGRATE OLD SCHEMES → GIVE THEM UUID ids
# ------------------------------------------------------------------------------------------------------

def migrate_scheme_ids():
    all_schemes = list(schemes_collection.find({}))
    for s in all_schemes:
        if "id" not in s or not s["id"]:
            new_id = str(uuid.uuid4())
            schemes_collection.update_one({"_id": s["_id"]}, {"$set": {"id": new_id}})
            print(f"[MIGRATION] Added UUID id={new_id} to scheme {s['_id']}")

migrate_scheme_ids()


# ------------------------------------------------------------------------------------------------------
# ROUTES - GENERAL
# ------------------------------------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "backend running"}), 200


# ------------------------------------------------------------------------------------------------------
# USER AUTH
# ------------------------------------------------------------------------------------------------------

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    aadhaar = data.get("aadhaar")

    if not aadhaar:
        return jsonify({"message": "Aadhaar required"}), 400

    if users_collection.find_one({"aadhaar": aadhaar}):
        return jsonify({"message": "User exists"}), 400

    user = {
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
        "documents": {},
        "role": "user",
        "created_at": datetime.utcnow().isoformat()
    }

    users_collection.insert_one(user)

    token = jwt.encode(
        {"aadhaar": aadhaar, "exp": datetime.utcnow() + timedelta(days=30)},
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({"message": "Registered", "token": token, "user": clean_doc(user)}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    aadhaar = data.get("aadhaar")

    user = users_collection.find_one({"aadhaar": aadhaar}, {"_id": 0})
    if not user:
        return jsonify({"message": "Invalid Aadhaar"}), 401

    token = jwt.encode(
        {"aadhaar": aadhaar, "exp": datetime.utcnow() + timedelta(days=30)},
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({"message": "Login successful", "token": token, "user": user}), 200


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    if (
        data.get("user_id") == ADMIN_CREDENTIALS["user_id"] and
        data.get("password") == ADMIN_CREDENTIALS["password"]
    ):
        token = jwt.encode(
            {"user_id": data["user_id"], "exp": datetime.utcnow() + timedelta(days=30)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        return jsonify({"message": "Admin login successful", "token": token}), 200

    return jsonify({"message": "Invalid credentials"}), 401


# ------------------------------------------------------------------------------------------------------
# SCHEMES
# ------------------------------------------------------------------------------------------------------

@app.route("/api/schemes", methods=["GET"])
def all_schemes():
    schemes = [clean_doc(s) for s in schemes_collection.find({}, {"_id": 0})]
    return jsonify(schemes), 200


@app.route("/api/schemes/<sid>", methods=["GET"])
def get_scheme(sid):
    # Try UUID id
    scheme = schemes_collection.find_one({"id": sid}, {"_id": 0})
    if scheme:
        return jsonify(scheme), 200

    # Try old ObjectId
    try:
        scheme = schemes_collection.find_one({"_id": ObjectId(sid)}, {"_id": 0})
        if scheme:
            return jsonify(scheme), 200
    except:
        pass

    return jsonify({"message": "Scheme not found"}), 404


# ------------------------------------------------------------------------------------------------------
# ELIGIBILITY LOGIC
# ------------------------------------------------------------------------------------------------------

def check_eligibility(user, scheme):
    c = scheme.get("eligibility_criteria", {})

    u_income = int(user.get("income", 0) or 0)
    u_age = int(user.get("age", 0) or 0)
    u_caste = user.get("caste")
    u_gender = user.get("gender")

    if "max_income" in c and u_income > c["max_income"]:
        return False, 0.3, "Income exceeds limit"

    if "min_income" in c and u_income < c["min_income"]:
        return False, 0.4, "Income below minimum"

    if "min_age" in c and u_age < c["min_age"]:
        return False, 0.5, "Below minimum age"

    if "max_age" in c and u_age > c["max_age"]:
        return False, 0.5, "Above maximum age"

    if "allowed_caste" in c and u_caste not in c["allowed_caste"]:
        return False, 0.4, "Caste not eligible"

    if "gender" in c and c["gender"] != u_gender:
        return False, 0.4, "Gender not eligible"

    return True, 0.95, "Eligible"


@app.route("/api/schemes/eligible", methods=["POST"])
@token_required
def eligible(user):
    all_s = list(schemes_collection.find({}, {"_id": 0}))
    eligible_list = []

    for s in all_s:
        ok, conf, reason = check_eligibility(user, s)
        if ok:
            eligible_list.append({**s, "eligibility_confidence": conf, "eligibility_reason": reason})

    return jsonify({
        "total_schemes": len(all_s),
        "eligible_count": len(eligible_list),
        "eligible_schemes": eligible_list
    }), 200


# ------------------------------------------------------------------------------------------------------
# USER APPLICATIONS
# ------------------------------------------------------------------------------------------------------

@app.route("/api/applications", methods=["POST"])
@token_required
def submit_application(user):
    data = request.get_json() or {}

    app_entry = {
        "aadhaar": user["aadhaar"],
        "scheme_id": data.get("scheme_id"),
        "status": "submitted",
        "submitted_at": datetime.utcnow().isoformat()
    }

    applications_collection.insert_one(app_entry)
    return jsonify({"message": "Application submitted", "application": clean_doc(app_entry)}), 201


@app.route("/api/applications", methods=["GET"])
@token_required
def user_applications(user):
    apps = [clean_doc(a) for a in applications_collection.find({"aadhaar": user["aadhaar"]}, {"_id": 0})]
    return jsonify(apps), 200


# ------------------------------------------------------------------------------------------------------
# ADMIN SCHEME MANAGEMENT
# ------------------------------------------------------------------------------------------------------

@app.route("/api/admin/schemes", methods=["POST"])
@admin_required
def admin_create_scheme(admin):
    data = request.get_json() or {}

    scheme = {
        "id": str(uuid.uuid4()),
        "name": data.get("name"),
        "description": data.get("description"),
        "category": data.get("category"),
        "benefits": data.get("benefits"),
        "eligibility_criteria": data.get("eligibility_criteria", {}),
        "documents_required": data.get("documents_required", [])
    }

    schemes_collection.insert_one(scheme)
    return jsonify({"message": "Scheme created", "scheme": clean_doc(scheme)}), 201


@app.route("/api/admin/schemes/<sid>", methods=["PUT"])
@admin_required
def admin_update_scheme(admin, sid):
    data = request.get_json() or {}

    update = {
        "name": data.get("name"),
        "description": data.get("description"),
        "category": data.get("category"),
        "benefits": data.get("benefits"),
        "eligibility_criteria": data.get("eligibility_criteria", {}),
        "documents_required": data.get("documents_required", [])
    }

    schemes_collection.update_one({"id": sid}, {"$set": update})
    return jsonify({"message": "Scheme updated"}), 200


@app.route("/api/admin/schemes/<sid>", methods=["DELETE"])
@admin_required
def admin_delete_scheme(admin, sid):
    schemes_collection.delete_one({"id": sid})
    return jsonify({"message": "Scheme deleted"}), 200


@app.route("/api/admin/applications", methods=["GET"])
@admin_required
def admin_all_applications(admin):
    apps = [clean_doc(a) for a in applications_collection.find({}, {"_id": 0})]
    return jsonify(apps), 200


@app.route("/api/admin/edit-requests", methods=["GET"])
@admin_required
def admin_all_requests(admin):
    req = [clean_doc(r) for r in edit_requests_collection.find({}, {"_id": 0})]
    return jsonify(req), 200


# ------------------------------------------------------------------------------------------------------
# STATIC FALLBACK
# ------------------------------------------------------------------------------------------------------

@app.route("/<path:path>")
def serve_static(path):
    static_dir = app.static_folder or "static"
    if os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return jsonify({"message": "Not found"}), 404


# ------------------------------------------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug, host="0.0.0.0", port=port)
