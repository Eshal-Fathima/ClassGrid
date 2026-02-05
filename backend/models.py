from sqlalchemy import Column, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    semester = Column(String(100), nullable=True)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_name = Column(String(255), nullable=False)
    total_hours = Column(Integer, nullable=False, default=0)


class Timetable(Base):
    __tablename__ = "timetable"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day = Column(String(20), nullable=False)  # e.g. "Monday"
    period = Column(Integer, nullable=False)  # 1-based index
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(
        Enum("attended", "missed", "holiday", "exam", name="attendance_status"),
        nullable=False,
    )


class AttendanceRule(Base):
    __tablename__ = "attendance_rules"

    # user_id is the primary key; one rule-set per user
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    minimum_percentage = Column(Integer, nullable=False)
    semester_start = Column(Date, nullable=False)
    semester_end = Column(Date, nullable=False)

