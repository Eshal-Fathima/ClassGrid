from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.orm import Session

from models import User

users_bp = Blueprint("users", __name__)


def _get_db() -> Session:
    return current_app.db_session  # type: ignore[attr-defined]


@users_bp.post("/")
def create_user():
    """
    Create a simple user profile.
    Body:
    {
      "name": "Student Name",
      "email": "optional@example.com",
      "semester": "Sem 5 CSE"
    }
    """
    db = _get_db()
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip() or None
    semester = (data.get("semester") or "").strip() or None

    if not name:
        return jsonify({"message": "Name is required"}), 400

    user = User(name=name, email=email, semester=semester)
    db.add(user)
    db.commit()

    return jsonify({"userId": user.id, "name": user.name, "email": user.email, "semester": user.semester})

