from calendar import monthrange
from datetime import date

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.orm import Session

from models import Attendance, AttendanceRule, Timetable

calendar_bp = Blueprint("calendar", __name__)


def _get_db() -> Session:
    return current_app.db_session  # type: ignore[attr-defined]


@calendar_bp.get("/")
def get_calendar():
    """
    Query params:
      userId: integer
      year, month: optional (defaults to current month)

    Returns a list of days with color and details.
    """
    db = _get_db()
    try:
        user_id = int(request.args.get("userId", ""))
    except ValueError:
        return jsonify({"message": "userId is required"}), 400

    try:
        year = int(request.args.get("year"))
        month = int(request.args.get("month"))
    except Exception:
        today = date.today()
        year, month = today.year, today.month

    first_day = date(year, month, 1)
    days_in_month = monthrange(year, month)[1]

    timetable_entries = db.query(Timetable).filter_by(user_id=user_id).all()
    day_periods = {}
    for e in timetable_entries:
        # Map weekday names to weekday numbers (0=Monday..6=Sunday)
        weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].index(e.day)
        day_periods.setdefault(weekday, 0)
        day_periods[weekday] += 1

    # Use attendance records with status 'exam' to mark exam days (no separate exams table)
    exam_records = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user_id,
            Attendance.date >= first_day,
            Attendance.status == "exam",
        )
        .all()
    )
    exam_days = {r.date for r in exam_records}

    day_status = {}
    for d in range(1, days_in_month + 1):
        current = date(year, month, d)
        weekday = current.weekday()
        periods = day_periods.get(weekday, 0)
        if periods == 0:
            color = "grey"
        elif current in exam_days:
            color = "red"
        else:
            color = "green"
        day_status[current.isoformat()] = {"color": color, "weekday": weekday, "periods": periods}

    # TODO: Refine with subject-wise percentages for yellow vs green; for now mark green by default

    result = []
    for iso, info in day_status.items():
        result.append({"date": iso, **info})

    return jsonify(result)

