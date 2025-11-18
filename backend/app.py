from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import jwt
import os
from bson.objectid import ObjectId # Import to handle MongoDB ObjectId

# --- IMPORTS FROM OTHER FILES ---
# NOTE: Ensure these files (digilocker_integration.py and db.py) exist and are correct.
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
# --------------------------------

app = Flask(__name__)

# CORS configuration
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True
)

# Secret key for JWT (use env in production)
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "change-this-secret-key-in-production"
)

# Hardcoded admin credentials (move to env for real security)
ADMIN_CREDENTIALS = {
    "user_id": "Samhitha",
    "password": "Admin@sam"
}

# ---------------- ROOT/HEALTH CHECK ---------------- #

# 🌟 FIX: Added a root route to prevent 404 errors on service startup/health checks
@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "running", "message": "API service is operational"}), 200

# ---------------- JWT HELPERS ---------------- #


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            if token.startswith("Bearer "):
                token = token.split(" ")[1]

            data = jwt.decode(
                token,
                app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            # Determine if the user is a regular user (via aadhaar) or admin (via user_id)
            lookup_key = data.get("aadhaar", data.get("user_id"))
            current_user = None

            if "aadhaar" in data and lookup_key:
                # Regular user lookup
                current_user = users_collection.find_one(
                    {"aadhaar": lookup_key},
                    {"_id": 0}
                )

            elif "user_id" in data and lookup_key == ADMIN_CREDENTIALS["user_id"]:
                # Admin user stub
                current_user = {
                    "user_id": ADMIN_CREDENTIALS["user_id"],
                    "role": "admin"
                }

            if not current_user:
                return jsonify({"message": "User not found"}), 404

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired"}), 401
        except Exception as e:
            # General exception catch for invalid token format, signature, etc.
            # print(f"Token decoding error: {e}") # Debugging aid
            return jsonify({"message": "Token is invalid"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @token_required # Ensure token is present and valid first
    def decorated(current_user, *args, **kwargs):
        # Check if the user passed from token_required has the admin role
        if current_user.get("role") != "admin":
            return jsonify({"message": "Admin access required"}), 403

        return f(current_user, *args, **kwargs)

    return decorated

# ---------------- AUTH ROUTES ---------------- #


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    # 🌟 IMPROVEMENT: Use .get() with a default value to avoid KeyError if required keys are missing
    aadhaar = data.get("aadhaar")

    if not aadhaar:
        return jsonify({"message": "Aadhaar number is required"}), 400

    if users_collection.find_one({"aadhaar": aadhaar}):
        return jsonify(
            {"message": "User already exists with this Aadhaar number"}
        ), 400

    # Sanitize and prepare user data
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
        "created_at": datetime.now().isoformat()
    }

    users_collection.insert_one(user_data)

    token_bytes = jwt.encode(
        {
            "aadhaar": aadhaar,
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )
    # 🛑 CRITICAL FIX: Decode the byte string to a regular string for JSON response
    token = token_bytes.decode("utf-8")

    # Remove the internal MongoDB ID before sending to the client
    user_data.pop("_id", None)

    return jsonify(
        {
            "message": "User registered successfully",
            "token": token,
            "user": user_data
        }
    ), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    aadhaar = data.get("aadhaar")

    user = users_collection.find_one({"aadhaar": aadhaar}, {"_id": 0})

    if not aadhaar or not user:
        return jsonify({"message": "Invalid Aadhaar number"}), 401

    token_bytes = jwt.encode(
        {
            "aadhaar": aadhaar,
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )
    # 🛑 CRITICAL FIX: Decode the byte string to a regular string for JSON response
    token = token_bytes.decode("utf-8")

    return jsonify(
        {
            "message": "Login successful",
            "token": token,
            "user": user
        }
    ), 200


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    password = data.get("password")

    if (
        user_id == ADMIN_CREDENTIALS["user_id"]
        and password == ADMIN_CREDENTIALS["password"]
    ):
        token_bytes = jwt.encode(
            {
                "user_id": user_id,
                "exp": datetime.utcnow() + timedelta(days=30)
            },
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        # 🛑 CRITICAL FIX: Decode the byte string to a regular string for JSON response
        token = token_bytes.decode("utf-8")

        return jsonify(
            {
                "message": "Admin login successful",
                "token": token,
                "user": {"user_id": user_id, "role": "admin"}
            }
        ), 200

    return jsonify({"message": "Invalid admin credentials"}), 401

# ---------------- USER ROUTES ---------------- #


@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    return jsonify(current_user), 200


@app.route("/api/profile", methods=["PUT"])
@token_required
def update_profile(current_user):
    # This route is usually used to update non-sensitive or temporary data.
    # Given the 'frozen' flag in register, sensitive data edits should go through the edit-request process.
    data = request.get_json() or {}
    
    # Define fields that a user is allowed to update directly
    allowed_fields = ["email", "phone"] 
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        return jsonify({"message": "No valid fields provided for update"}), 400

    # Use $set to update the allowed fields
    users_collection.update_one(
        {"aadhaar": current_user["aadhaar"]},
        {"$set": update_data}
    )

    # Fetch updated user data to return
    updated_user = users_collection.find_one({"aadhaar": current_user["aadhaar"]}, {"_id": 0})
    
    return jsonify({"message": "Profile updated successfully", "user": updated_user}), 200

# ---------------- SCHEMES ROUTES ---------------- #


@app.route("/api/schemes", methods=["GET"])
def get_all_schemes():
    all_schemes = list(schemes_collection.find({}, {"_id": 0}))
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
    # Dummy eligibility check function:
    def dummy_eligibility_checker(user, scheme):
        criteria = scheme.get("eligibility_criteria", {})
        income_limit = criteria.get("max_income", None)
        min_age = criteria.get("min_age", None)
        max_age = criteria.get("max_age", None)

        # 🌟 IMPROVEMENT: Safely convert to integer for comparison
        try:
            user_income = int(user.get("income", 0) or 0)
            user_age = int(user.get("age", 0) or 0)
        except (ValueError, TypeError):
            # If user data is invalid, assume non-eligibility for safety
            return False, 0.5, "User profile data is invalid (income/age not a number)"

        # Check Income
        if income_limit is not None and user_income > int(income_limit):
            return False, 0.8, "Income exceeds limit"
        
        # Check Age
        if min_age is not None and user_age < int(min_age):
            return False, 0.7, "Age below minimum"
        if max_age is not None and user_age > int(max_age):
            return False, 0.7, "Age above limit"

        # You can add more checks here (e.g., caste, gender, state)
        
        return True, 0.95, "Eligible based on given criteria"

    all_schemes = list(schemes_collection.find({}, {"_id": 0}))
    eligible_schemes = []

    for scheme in all_schemes:
        is_eligible, confidence, reason = dummy_eligibility_checker(
            current_user, scheme
        )

        if is_eligible:
            eligible_schemes.append(
                {
                    **scheme,
                    "eligibility_confidence": confidence,
                    "eligibility_reason": reason
                }
            )

    return jsonify(
        {
            "total_schemes": len(all_schemes),
            "eligible_count": len(eligible_schemes),
            "eligible_schemes": eligible_schemes
        }
    ), 200

# ---------------- USER APPLICATIONS ---------------- #


@app.route("/api/applications", methods=["GET"])
@token_required
def get_user_applications(current_user):
    aadhaar = current_user.get("aadhaar")
    if not aadhaar:
        return jsonify({"message": "User Aadhaar missing"}), 400

    apps = list(
        applications_collection.find(
            {"aadhaar": aadhaar},
            {"_id": 0}
        )
    )
    return jsonify(apps), 200


@app.route("/api/applications", methods=["POST"])
@token_required
def create_application(current_user):
    data = request.get_json() or {}
    aadhaar = current_user.get("aadhaar")
    scheme_id = data.get("scheme_id")

    if not scheme_id:
        return jsonify({"message": "Scheme ID is required"}), 400

    # 🌟 IMPROVEMENT: Check if the application already exists for the scheme
    if applications_collection.find_one({"aadhaar": aadhaar, "scheme_id": scheme_id}):
        return jsonify({"message": "You have already applied for this scheme"}), 400

    application = {
        "aadhaar": aadhaar,
        "scheme_id": scheme_id,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    result = applications_collection.insert_one(application)
    application["id"] = str(result.inserted_id) # Use the MongoDB ObjectId as an ID
    application.pop("_id", None)

    return jsonify(
        {
            "message": "Application created successfully",
            "application": application
        }
    ), 201

# ---------------- USER EDIT REQUESTS ---------------- #


@app.route("/api/edit-request", methods=["GET"])
@token_required
def get_user_edit_requests(current_user):
    aadhaar = current_user.get("aadhaar")
    requests = list(edit_requests_collection.find({"aadhaar": aadhaar}, {"_id": 0}))
    return jsonify(requests), 200


@app.route("/api/edit-request", methods=["POST"])
@token_required
def create_edit_request(current_user):
    data = request.get_json() or {}
    
    # 🌟 IMPROVEMENT: Check if changes dict is empty
    requested_changes = data.get("changes")
    if not requested_changes or not isinstance(requested_changes, dict):
        return jsonify({"message": "Field 'changes' must be a non-empty object"}), 400

    request_data = {
        "aadhaar": current_user.get("aadhaar"),
        "requested_changes": requested_changes,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    result = edit_requests_collection.insert_one(request_data)
    request_data["id"] = str(result.inserted_id)
    request_data.pop("_id", None)

    return jsonify(
        {
            "message": "Edit request submitted successfully",
            "request": request_data
        }
    ), 201

# ---------------- ADMIN ROUTES ---------------- #
# 🌟 IMPROVEMENT: Added full CRUD for Schemes for Admin


@app.route("/api/admin/schemes", methods=["POST"])
@admin_required
def admin_create_scheme(current_user):
    data = request.get_json() or {}
    # Use the scheme 'id' from the body, or generate a temporary one
    scheme_id = data.get("id") or str(ObjectId()) 
    
    if schemes_collection.find_one({"id": scheme_id}):
        return jsonify({"message": f"Scheme with ID {scheme_id} already exists"}), 400
        
    scheme_data = {
        "id": scheme_id,
        "name": data.get("name"),
        "description": data.get("description"),
        "eligibility_criteria": data.get("eligibility_criteria", {}),
        "documents_required": data.get("documents_required", []),
        "created_at": datetime.utcnow().isoformat()
    }
    
    schemes_collection.insert_one(scheme_data)
    scheme_data.pop("_id", None)
    return jsonify({"message": "Scheme created successfully", "scheme": scheme_data}), 201


@app.route("/api/admin/schemes", methods=["GET"])
@admin_required
def admin_all_schemes(current_user):
    all_schemes = list(schemes_collection.find({}, {"_id": 0}))
    return jsonify(all_schemes), 200


@app.route("/api/admin/schemes/<scheme_id>", methods=["PUT"])
@admin_required
def admin_update_scheme(current_user, scheme_id):
    data = request.get_json() or {}
    
    result = schemes_collection.update_one(
        {"id": scheme_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        return jsonify({"message": "Scheme not found"}), 404
    
    updated_scheme = schemes_collection.find_one({"id": scheme_id}, {"_id": 0})
    return jsonify({"message": "Scheme updated successfully", "scheme": updated_scheme}), 200


@app.route("/api/admin/schemes/<scheme_id>", methods=["DELETE"])
@admin_required
def admin_delete_scheme(current_user, scheme_id):
    result = schemes_collection.delete_one({"id": scheme_id})
    
    if result.deleted_count == 0:
        return jsonify({"message": "Scheme not found"}), 404
        
    return jsonify({"message": "Scheme deleted successfully"}), 200

# ---------------- ADMIN APPLICATIONS/EDIT REQUESTS ---------------- #

@app.route("/api/admin/applications", methods=["GET"])
@admin_required
def admin_all_applications(current_user):
    all_apps = list(applications_collection.find({}, {"_id": 0}))
    return jsonify(all_apps), 200


@app.route("/api/admin/applications/<application_id>/status", methods=["PUT"])
@admin_required
def admin_update_application_status(current_user, application_id):
    data = request.get_json() or {}
    new_status = data.get("status")
    
    if not new_status or new_status not in ["approved", "rejected", "pending"]:
        return jsonify({"message": "Invalid status provided"}), 400
        
    # 🌟 IMPROVEMENT: Use ObjectId to find by the internal MongoDB ID if the application_id is the default _id
    try:
        object_id = ObjectId(application_id)
    except Exception:
        return jsonify({"message": "Invalid Application ID format"}), 400

    result = applications_collection.update_one(
        {"_id": object_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.matched_count == 0:
        return jsonify({"message": "Application not found"}), 404
        
    return jsonify({"message": f"Application status updated to {new_status}"}), 200


@app.route("/api/admin/edit-requests", methods=["GET"])
@admin_required
def admin_edit_requests(current_user):
    all_requests = list(edit_requests_collection.find({}, {"_id": 0}))
    return jsonify(all_requests), 200


@app.route("/api/admin/edit-requests/<request_id>/action", methods=["POST"])
@admin_required
def admin_action_edit_request(current_user, request_id):
    data = request.get_json() or {}
    action = data.get("action") # 'approve' or 'reject'
    
    if action not in ["approve", "reject"]:
        return jsonify({"message": "Action must be 'approve' or 'reject'"}), 400
        
    try:
        object_id = ObjectId(request_id)
    except Exception:
        return jsonify({"message": "Invalid Request ID format"}), 400

    edit_request = edit_requests_collection.find_one({"_id": object_id})
    
    if not edit_request:
        return jsonify({"message": "Edit request not found"}), 404
        
    if edit_request.get("status") != "pending":
        return jsonify({"message": f"Request already {edit_request['status']}"}), 400

    new_status = "approved" if action == "approve" else "rejected"
    
    # 1. Update the request status
    edit_requests_collection.update_one(
        {"_id": object_id},
        {"$set": {"status": new_status, "processed_at": datetime.utcnow().isoformat()}}
    )
    
    # 2. If approved, update the user profile
    if action == "approve":
        # Apply the changes to the user's document
        changes_to_apply = edit_request.get("requested_changes", {})
        
        # Unfreeze the user if 'frozen' is in the changes (e.g., if it's the first approval)
        if "frozen" in changes_to_apply:
            changes_to_apply["frozen"] = False
            
        users_collection.update_one(
            {"aadhaar": edit_request["aadhaar"]},
            {"$set": changes_to_apply}
        )
        msg = "Edit request approved and user profile updated."
    else:
        msg = "Edit request rejected."

    return jsonify({"message": msg, "new_status": new_status}), 200

# ---------------- DIGILOCKER ROUTES ---------------- #
# NOTE: The implementation details of these are assumed to be in digilocker_integration.py

@app.route("/api/digilocker/initiate", methods=["POST"])
@token_required
def digilocker_initiate(current_user):
    data = request.get_json() or {}
    aadhaar = current_user["aadhaar"]
    
    # Pass user identifier and the redirect URL prefix to the integration function
    result = initiate_digilocker_auth(aadhaar, data.get("redirect_url")) 
    
    if result.get("success"):
        return jsonify(result), 200
    return jsonify(result), 400


@app.route("/api/digilocker/callback", methods=["POST"]) # Use POST for security/data transfer
def digilocker_callback():
    data = request.get_json() or {}
    
    # Check if a session exists and fetch the authorization code/token
    result = check_digilocker_session(data.get("code"), data.get("state"))
    
    if result.get("success"):
        return jsonify(result), 200
    return jsonify(result), 400


@app.route("/api/digilocker/fetch_data", methods=["GET"])
@token_required
def digilocker_fetch(current_user):
    aadhaar = current_user["aadhaar"]
    
    # Fetch data using the user's stored session/token (managed internally by the integration)
    result = fetch_aadhaar_data(aadhaar) 
    
    if result.get("success"):
        # 🌟 Update user profile with fetched data (e.g., name, DOB)
        users_collection.update_one(
            {"aadhaar": aadhaar},
            {"$set": result.get("user_data_to_store", {}) } 
        )
        return jsonify(result), 200
    return jsonify(result), 400

# ---------------- MAIN ---------------- #


if __name__ == "__main__":
    # Render uses the PORT environment variable to tell you what port to bind to.
    port = int(os.environ.get("PORT", 5000))
    
    # Listen on all public interfaces (0.0.0.0)
    # When deploying with Gunicorn (recommended for production), this block is skipped.
    app.run(debug=False, host="0.0.0.0", port=port)
