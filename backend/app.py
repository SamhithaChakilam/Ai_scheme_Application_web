# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import jwt
import os
import json
from uuid import uuid4

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

# ---------- App Setup ----------
app = Flask(__name__, static_folder="static", template_folder="templates")

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key-in-production")

VERCEL_ORIGIN = "https://ai-scheme-application-web.vercel.app"
LOCAL_ORIGIN = "http://localhost:3000"

CORS(
    app,
    resources={r"/api/*": {"origins": [VERCEL_ORIGIN, LOCAL_ORIGIN]}},
    supports_credentials=True
)

ADMIN_CREDENTIALS = {
    "user_id": "Samhitha",
    "password": "Admin@sam"
}

# ---------- Helpers ----------
def clean_doc(doc):
    if not doc:
        return doc
    d = dict(doc)
    d.pop("_id", None)
    return d

def _decode_jwt(token):
    return jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])

# ---------- Decorators ----------
def token_required(f):
    @wraps(f)
    def decorated(*a, **kw):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        try:
            data = _decode_jwt(token)
        except:
            return jsonify({"message": "Invalid token"}), 401

        lookup = data.get("aadhaar") or data.get("user_id")
        current_user = None

        if lookup:
            current_user = users_collection.find_one({"aadhaar": lookup}, {"_id": 0})

        if not current_user and data.get("user_id") == ADMIN_CREDENTIALS["user_id"]:
            current_user = {"user_id": ADMIN_CREDENTIALS["user_id"], "role": "admin"}

        if not current_user:
            return jsonify({"message": "User not found"}), 404

        return f(current_user, *a, **kw)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*a, **kw):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"message": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        try:
            data = _decode_jwt(token)
        except:
            return jsonify({"message": "Invalid token"}), 401

        if data.get("user_id") != ADMIN_CREDENTIALS["user_id"]:
            return jsonify({"message": "Admin access required"}), 403

        return f({"user_id": ADMIN_CREDENTIALS["user_id"], "role": "admin"}, *a, **kw)

    return decorated

# ---------- Root ----------
@app.route("/")
def home():
    return jsonify({"status": "Backend running"}), 200

# ---------- Auth ----------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    aadhaar = data.get("aadhaar")

    if not aadhaar:
        return jsonify({"message": "Aadhaar required"}), 400

    if users_collection.find_one({"aadhaar": aadhaar}):
        return jsonify({"message": "User exists"}), 400

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
        {"aadhaar": aadhaar, "exp": datetime.utcnow() + timedelta(days=30)},
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({"message": "User registered", "token": token, "user": clean_doc(user_data)}), 201


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

    return jsonify({"message": "Login OK", "token": token, "user": user}), 200


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    if (
        data.get("user_id") == ADMIN_CREDENTIALS["user_id"]
        and data.get("password") == ADMIN_CREDENTIALS["password"]
    ):
        token = jwt.encode(
            {"user_id": ADMIN_CREDENTIALS["user_id"], "exp": datetime.utcnow() + timedelta(days=30)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        return jsonify({"message": "Admin OK", "token": token}), 200

    return jsonify({"message": "Invalid admin credentials"}), 401

# ---------- Schemes GET ----------
@app.route("/api/schemes", methods=["GET"])
def get_schemes():
    schemes = [clean_doc(s) for s in schemes_collection.find({}, {"_id": 0})]
    return jsonify(schemes), 200

# ---------- ADMIN: Create Scheme ----------
@app.route("/api/admin/schemes", methods=["POST"])
@admin_required
def create_scheme(current_user):
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    category = data.get("category", "").strip()

    if not name or not description or not category:
        return jsonify({"message": "name, description, category required"}), 400

    # benefits
    benefits = data.get("benefits")
    if isinstance(benefits, str) and benefits.isdigit():
        benefits = int(benefits)

    # eligibility
    eligibility = data.get("eligibility_criteria", {})
    if isinstance(eligibility, str):
        try:
            eligibility = json.loads(eligibility)
        except:
            eligibility = {}

    # convert numbers
    for k, v in list(eligibility.items()):
        if isinstance(v, str) and v.isdigit():
            eligibility[k] = int(v)

    # documents
    docs = data.get("documents_required", [])
    if isinstance(docs, str):
        docs = [d.strip() for d in docs.split(",") if d.strip()]

    scheme_doc = {
        "id": str(uuid4()),
        "name": name,
        "description": description,
        "category": category,
        "benefits": benefits,
        "eligibility_criteria": eligibility,
        "documents_required": docs,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    try:
        schemes_collection.insert_one(scheme_doc)
        return jsonify({"message": "Scheme created", "scheme": clean_doc(scheme_doc)}), 201
    except Exception as e:
        print("Error:", e)
        return jsonify({"message": "Failed to create scheme", "error": str(e)}), 500


# ---------- ADMIN: Update Scheme ----------
@app.route("/api/admin/schemes/<scheme_id>", methods=["PUT"])
@admin_required
def update_scheme(current_user, scheme_id):
    data = request.get_json() or {}
    update = {}

    for key in ["name", "description", "category", "benefits"]:
        if key in data:
            update[key] = data[key]

    if "eligibility_criteria" in data:
        try:
            e = data["eligibility_criteria"]
            if isinstance(e, str):
                e = json.loads(e)
            for k, v in list(e.items()):
                if isinstance(v, str) and v.isdigit():
                    e[k] = int(v)
            update["eligibility_criteria"] = e
        except:
            update["eligibility_criteria"] = {}

    if "documents_required" in data:
        docs = data["documents_required"]
        if isinstance(docs, str):
            docs = [x.strip() for x in docs.split(",") if x.strip()]
        update["documents_required"] = docs

    update["updated_at"] = datetime.utcnow().isoformat()

    result = schemes_collection.update_one({"id": scheme_id}, {"$set": update})

    if result.matched_count == 0:
        return jsonify({"message": "Scheme not found"}), 404

    scheme = schemes_collection.find_one({"id": scheme_id}, {"_id": 0})
    return jsonify({"message": "Scheme updated", "scheme": clean_doc(scheme)}), 200

# ---------- ADMIN: Delete Scheme ----------
@app.route("/api/admin/schemes/<scheme_id>", methods=["DELETE"])
@admin_required
def delete_scheme(current_user, scheme_id):
    res = schemes_collection.delete_one({"id": scheme_id})
    if res.deleted_count == 0:
        return jsonify({"message": "Scheme not found"}), 404
    return jsonify({"message": "Scheme deleted"}), 200

# ---------- END ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
