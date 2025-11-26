# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import jwt
import os
import uuid

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

# ---------- App & Config ----------
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key-in-production")

VERCEL_ORIGIN = "https://ai-scheme-application-web.vercel.app"
LOCAL_ORIGIN = "http://localhost:3000"

CORS(
    app,
    resources={r"/api/*": {"origins": [VERCEL_ORIGIN, LOCAL_ORIGIN]}},
    supports_credentials=True
)

# ---------- Admin Credentials ----------
ADMIN_CREDENTIALS = {
    "user_id": "Samhitha",
    "password": "Admin@sam"
}

# ---------- Utility ----------
def clean_doc(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc

def _decode_jwt_token(token):
    payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
    return payload

# ---------- Auth Decorators ----------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]

        try:
            data = _decode_jwt_token(token)
        except Exception:
            return jsonify({"message": "Token is invalid or expired"}), 401

        lookup_key = data.get("aadhaar") or data.get("user_id")
        user = users_collection.find_one({"aadhaar": lookup_key}, {"_id": 0})

        if not user and data.get("user_id") == ADMIN_CREDENTIALS["user_id"]:
            user = {"user_id": ADMIN_CREDENTIALS["user_id"], "role": "admin"}

        if not user:
            return jsonify({"message": "User not found"}), 404

        return f(user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]

        try:
            data = _decode_jwt_token(token)
        except Exception:
            return jsonify({"message": "Token invalid"}), 401

        if data.get("user_id") != ADMIN_CREDENTIALS["user_id"]:
            return jsonify({"message": "Admin access required"}), 403

        return f({"role": "admin", "user_id": ADMIN_CREDENTIALS["user_id"]}, *args, **kwargs)

    return decorated


# ---------- Auto Migration: Ensure every scheme has UUID ----------
def migrate_schemes():
    all_schemes = list(schemes_collection.find({}))
    for s in all_schemes:
        if "id" not in s or not s["id"]:
            new_id = str(uuid.uuid4())
            schemes_collection.update_one(
                {"_id": s["_id"]},
                {"$set": {"id": new_id}}
            )
            print(f"[MIGRATION] Added id={new_id} to scheme with _id={s['_id']}")


migrate_schemes()


# ---------- Routes ----------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Backend running"}), 200


# ---------- USER AUTH ----------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    aadhaar = data.get("aadhaar")
    if not aadhaar:
        return jsonify({"message": "Aadhaar required"}), 400

    if users_collection.find_one({"aadhaar": aadhaar}):
        return jsonify({"message": "User already exists"}), 400

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
        app.config["SECRET_KEY"], algorithm="HS256"
    )

    return jsonify({"message": "Login success", "token": token, "user": user}), 200


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    if data.get("user_id") == ADMIN_CREDENTIALS["user_id"] and data.get("password") == ADMIN_CREDENTIALS["password"]:
        token = jwt.encode(
            {"user_id": data["user_id"], "exp": datetime.utcnow() + timedelta(days=30)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        return jsonify({"message": "Admin login success", "token": token}), 200

    return jsonify({"message": "Invalid admin credentials"}), 401


# ---------- SCHEMES ----------
@app.route("/api/schemes", methods=["GET"])
def get_all_schemes():
    schemes = [clean_doc(s) for s in schemes_collection.find({}, {"_id": 0})]
    return jsonify(schemes), 200


@app.route("/api/schemes/<scheme_id>", methods=["GET"])
def get_scheme(scheme_id):
    scheme = schemes_collection.find_one({"id": scheme_id}, {"_id": 0})

    if not scheme:
        # Try fallback: _id match (old format)
        try:
            scheme = schemes_collection.find_one({"_id": ObjectId(scheme_id)}, {"_id": 0})
        except:
            pass

    if not scheme:
        return jsonify({"message": "Scheme not found"}), 404

    return jsonify(scheme), 200


# ---------- ELIGIBILITY ----------
def evaluate_eligibility(user, scheme):
    c = scheme.get("eligibility_criteria", {})

    income = int(user.get("income", 0) or 0)
    age = int(user.get("age", 0) or 0)
    caste = user.get("caste")
    gender = user.get("gender")

    # Income
    if "max_income" in c and income > c["max_income"]:
        return False, 0.3, "Income exceeds limit"

    if "min_income" in c and income < c["min_income"]:
        return False, 0.4, "Income too low"

    # Age
    if "min_age" in c and age < c["min_age"]:
        return False, 0.5, "Below minimum age"

    if "max_age" in c and age > c["max_age"]:
        return False, 0.5, "Above maximum age"

    # Caste
    if "allowed_caste" in c and caste not in c["allowed_caste"]:
        return False, 0.4, "Caste not eligible"

    # Gender
    if "gender" in c and gender != c["gender"]:
        return False, 0.4, "Gender not eligible"

    return True, 0.95, "Eligible"


@app.route("/api/schemes/eligible", methods=["POST"])
@token_required
def eligible_schemes(user):
    all_s = list(schemes_collection.find({}, {"_id": 0}))
    eligible = []

    for s in all_s:
        ok, conf, reason = evaluate_eligibility(user, s)
        if ok:
            eligible.append({**s, "eligibility_confidence": conf, "eligibility_reason": reason})

    return jsonify({
        "total_schemes": len(all_s),
        "eligible_count": len(eligible),
        "eligible_schemes": eligible
    }), 200


# ---------- USER APPLICATIONS ----------
@app.route("/api/applications", methods=["POST"])
@token_required
def create_application(user):
    data = request.get_json() or {}

    application = {
        "aadhaar": user.get("aadhaar"),
        "scheme_id": data.get("scheme_id"),
        "status": "submitted",
        "submitted_at": datetime.utcnow().isoformat()
    }

    applications_collection.insert_one(application)
    return jsonify({"message": "Application submitted", "application": clean_doc(application)}), 201


@app.route("/api/applications", methods=["GET"])
@token_required
def get_user_apps(user):
    apps = list(applications_collection.find({"aadhaar": user.get("aadhaar")}, {"_id": 0}))
    return jsonify(apps), 200


# ---------- ADMIN ROUTES ----------
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


@app.route("/api/admin/schemes/<id>", methods=["PUT"])
@admin_required
def admin_update_scheme(admin, id):
    data = request.get_json() or {}

    update = {
        "name": data.get("name"),
        "description": data.get("description"),
        "category": data.get("category"),
        "benefits": data.get("benefits"),
        "eligibility_criteria": data.get("eligibility_criteria", {}),
        "documents_required": data.get("documents_required", [])
    }

    schemes_collection.update_one({"id": id}, {"$set": update})
    return jsonify({"message": "Scheme updated"}), 200


@app.route("/api/admin/schemes/<id>", methods=["DELETE"])
@admin_required
def admin_delete_scheme(admin, id):
    schemes_collection.delete_one({"id": id})
    return jsonify({"message": "Scheme deleted"}), 200


@app.route("/api/admin/applications", methods=["GET"])
@admin_required
def admin_all_apps(admin):
    apps = list(applications_collection.find({}, {"_id": 0}))
    return jsonify(apps), 200


@app.route("/api/admin/edit-requests", methods=["GET"])
@admin_required
def admin_all_requests(admin):
    reqs = list(edit_requests_collection.find({}, {"_id": 0}))
    return jsonify(reqs), 200


# ---------- Static fallback ----------
@app.route("/<path:path>")
def serve_static(path):
    static_dir = app.static_folder or "static"
    if os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return jsonify({"message": "Not found"}), 404


# ---------- MAIN ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug, host="0.0.0.0", port=port)
