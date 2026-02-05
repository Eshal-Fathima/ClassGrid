import os

from flask import Flask
from flask_cors import CORS

from db import SessionLocal, init_db
from routes.timetable import timetable_bp
from routes.attendance import attendance_bp
from routes.calendar import calendar_bp
from routes.users import users_bp


def create_app():
    app = Flask(__name__)

    # Initialise database and attach session factory
    init_db()
    app.db_session = SessionLocal  # type: ignore[attr-defined]

    CORS(app, origins=os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"))

    # Simple CRUD routes – no auth, no tokens
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(timetable_bp, url_prefix="/api/timetable")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(calendar_bp, url_prefix="/api/calendar")

    @app.teardown_appcontext
    def remove_session(exc=None):
        SessionLocal.remove()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)

