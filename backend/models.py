from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum


class DirectionEnum(str, enum.Enum):
    entry = "entry"
    exit = "exit"
    unknown = "unknown"


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    students = relationship("Student", back_populates="school")
    turnstiles = relationship("Turnstile", back_populates="school")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    card_no = Column(String, unique=True, index=True, nullable=False)
    employee_no = Column(String, unique=True, index=True, nullable=True)
    grade = Column(String, default="")
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    school = relationship("School", back_populates="students")
    events = relationship("AccessEvent", back_populates="student")


class Turnstile(Base):
    __tablename__ = "turnstiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ip_address = Column(String, default="")
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    school = relationship("School", back_populates="turnstiles")
    events = relationship("AccessEvent", back_populates="turnstile")


class AccessEvent(Base):
    __tablename__ = "access_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    turnstile_id = Column(Integer, ForeignKey("turnstiles.id"), nullable=True)
    card_no = Column(String, index=True, nullable=True)
    person_name = Column(String, default="")
    direction = Column(Enum(DirectionEnum), default=DirectionEnum.unknown)
    event_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    raw_data = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="events")
    turnstile = relationship("Turnstile", back_populates="events")
