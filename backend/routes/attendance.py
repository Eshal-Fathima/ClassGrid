from collections import defaultdict
from datetime import date

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.orm import Session

from models import Attendance, AttendanceRule, Subject, Timetable

attendance_bp = Blueprint("attendance", __name__)


def _get_db() -> Session:
    return current_app.db_session  # type: ignore[attr-defined]


@attendance_bp.post("/rules")
def save_rules():
    """
    Body:
    {
      "userId": number,
      "minimumPercentage": number,
      "semesterStart": "YYYY-MM-DD",
      "semesterEnd": "YYYY-MM-DD"
    }
    """
    db = _get_db()
    data = request.get_json() or {}

    try:
        user_id = int(data.get("userId"))
        minimum_percentage = int(data.get("minimumPercentage"))
        semester_start = date.fromisoformat(data.get("semesterStart"))
        semester_end = date.fromisoformat(data.get("semesterEnd"))
    except Exception:
        return jsonify({"message": "Invalid rule data"}), 400

    if not (0 < minimum_percentage <= 100):
        return jsonify({"message": "Minimum percentage must be between 0 and 100"}), 400

    rules = db.query(AttendanceRule).filter_by(user_id=user_id).first()
    if not rules:
        rules = AttendanceRule(
            user_id=user_id,
            minimum_percentage=minimum_percentage,
            semester_start=semester_start,
            semester_end=semester_end,
        )
        db.add(rules)
    else:
        rules.minimum_percentage = minimum_percentage
        rules.semester_start = semester_start
        rules.semester_end = semester_end

    db.commit()
    return jsonify({"message": "Rules saved"})


@attendance_bp.get("/rules")
def get_rules():
    db = _get_db()
    try:
        user_id = int(request.args.get("userId", ""))
    except ValueError:
        return jsonify({"message": "userId is required"}), 400

    rules = db.query(AttendanceRule).filter_by(user_id=user_id).first()
    if not rules:
        return jsonify(None)
    return jsonify(
        {
            "minimumPercentage": rules.minimum_percentage,
            "semesterStart": rules.semester_start.isoformat(),
            "semesterEnd": rules.semester_end.isoformat(),
        }
    )


@attendance_bp.post("/mark")
def mark_attendance():
    """
    Body:
    {
      "userId": number,
      "date": "YYYY-MM-DD",
      "subjectId": number,
      "status": "attended" | "missed" | "holiday" | "exam"
    }
    """
    db = _get_db()
    data = request.get_json() or {}

    try:
        user_id = int(data.get("userId"))
        subject_id = int(data.get("subjectId"))
        class_date = date.fromisoformat(data.get("date"))
    except Exception:
        return jsonify({"message": "Invalid data"}), 400

    status = data.get("status")
    if status not in ("attended", "missed", "holiday", "exam"):
        return jsonify({"message": "Invalid status"}), 400

    record = (
        db.query(Attendance)
        .filter_by(user_id=user_id, subject_id=subject_id, date=class_date)
        .first()
    )
    if not record:
        record = Attendance(
            user_id=user_id,
            subject_id=subject_id,
            date=class_date,
            status=status,
        )
        db.add(record)
    else:
        record.status = status

    db.commit()
    return jsonify({"message": "Attendance updated"})


@attendance_bp.get("/summary")
def attendance_summary():
    """
    Query params:
      userId: integer

    Returns subject-wise summary with safe-to-miss calculations.
    """
    db = _get_db()
    try:
        user_id = int(request.args.get("userId", ""))
    except ValueError:
        return jsonify({"message": "userId is required"}), 400

    rules = db.query(AttendanceRule).filter_by(user_id=user_id).first()
    min_pct = rules.minimum_percentage if rules else 75

    timetable_entries = db.query(Timetable).filter_by(user_id=user_id).all()
    records = db.query(Attendance).filter_by(user_id=user_id).all()

    totals = defaultdict(lambda: {"total": 0, "attended": 0, "missed": 0})

    for e in timetable_entries:
        totals[e.subject_id]["total"] += 1

    for r in records:
        if r.status in ("holiday", "exam"):
            continue
        totals[r.subject_id]["attended" if r.status == "attended" else "missed"] += 1

    result = []
    subjects = {s.id: s for s in db.query(Subject).filter_by(user_id=user_id).all()}

    for subject_id, agg in totals.items():
        total = agg["total"]
        attended = agg["attended"]
        missed = agg["missed"]
        effective_total = attended + missed
        pct = (attended / effective_total * 100.0) if effective_total > 0 else 0.0

        safe_to_miss = 0
        while effective_total + safe_to_miss > 0:
            if attended / (effective_total + safe_to_miss) * 100.0 >= min_pct:
                safe_to_miss += 1
            else:
                break

        subj = subjects.get(subject_id)
        result.append(
            {
                "subjectId": subject_id,
                "subjectName": subj.subject_name if subj else "Unknown",
                "totalHours": total,
                "attendedHours": attended,
                "missedHours": missed,
                "percentage": round(pct, 2),
                "safeToMissHours": max(0, safe_to_miss - 1),
            }
        )

    return jsonify(result)

