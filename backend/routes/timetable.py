from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.orm import Session

from models import Subject, Timetable

timetable_bp = Blueprint("timetable", __name__)


def _get_db() -> Session:
    return current_app.db_session  # type: ignore[attr-defined]


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


@timetable_bp.get("/")
def get_timetable():
    """
    Query params:
      userId: integer
    """
    db = _get_db()
    try:
        user_id = int(request.args.get("userId", ""))
    except ValueError:
        return jsonify({"message": "userId is required"}), 400

    entries = (
        db.query(Timetable)
        .filter(Timetable.user_id == user_id)
        .join(Subject, Subject.id == Timetable.subject_id)
        .order_by(Timetable.day, Timetable.period)
        .all()
    )

    result = []
    for e in entries:
        result.append(
            {
                "id": e.id,
                "day": e.day,
                "period": e.period,
                "subjectId": e.subject_id,
                "subjectName": e.subject.subject_name if hasattr(e, "subject") else None,
            }
        )
    return jsonify(result)


@timetable_bp.post("/")
def save_timetable():
    """
    Body:
    {
      "userId": number,
      "cells": [
        { "dayIndex": 0-5, "period": 1-10, "subjectName": "DBMS" }
      ]
    }
    """
    db = _get_db()
    data = request.get_json() or {}

    try:
        user_id = int(data.get("userId"))
    except Exception:
        return jsonify({"message": "userId is required"}), 400

    cells = data.get("cells") or []
    if not isinstance(cells, list):
        return jsonify({"message": "Invalid payload"}), 400

    existing_subjects = {
        s.subject_name.lower(): s for s in db.query(Subject).filter_by(user_id=user_id).all()
    }

    db.query(Timetable).filter_by(user_id=user_id).delete()

    for cell in cells:
        try:
            day_index = int(cell.get("dayIndex"))
            period = int(cell.get("period"))
        except (TypeError, ValueError):
            continue

        if day_index < 0 or day_index >= len(DAY_NAMES):
            continue

        subject_name = (cell.get("subjectName") or "").strip()
        if not subject_name:
            continue

        key = subject_name.lower()
        subject = existing_subjects.get(key)
        if not subject:
            subject = Subject(user_id=user_id, subject_name=subject_name, total_hours=0)
            db.add(subject)
            db.flush()
            existing_subjects[key] = subject

        entry = Timetable(
            user_id=user_id,
            day=DAY_NAMES[day_index],
            period=period,
            subject_id=subject.id,
        )
        db.add(entry)

    db.commit()
    return jsonify({"message": "Timetable saved"})

