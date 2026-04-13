from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from models import DirectionEnum


# --- School ---
class SchoolCreate(BaseModel):
    name: str
    address: str = ""


class SchoolOut(BaseModel):
    id: int
    name: str
    address: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Student ---
class StudentCreate(BaseModel):
    full_name: str
    card_no: str
    employee_no: Optional[str] = None
    grade: str = ""
    school_id: int


class StudentOut(BaseModel):
    id: int
    full_name: str
    card_no: str
    employee_no: Optional[str]
    grade: str
    school_id: int
    school: Optional[SchoolOut] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Turnstile ---
class TurnstileCreate(BaseModel):
    name: str
    ip_address: str = ""
    school_id: int


class TurnstileOut(BaseModel):
    id: int
    name: str
    ip_address: str
    school_id: int

    model_config = {"from_attributes": True}


# --- Access Event ---
class EventOut(BaseModel):
    id: int
    card_no: Optional[str]
    person_name: str
    direction: DirectionEnum
    event_time: datetime
    student: Optional[StudentOut] = None
    turnstile: Optional[TurnstileOut] = None

    model_config = {"from_attributes": True}


# --- Stats ---
class DailyStats(BaseModel):
    date: str
    entries: int
    exits: int


class SchoolStats(BaseModel):
    school_id: int
    school_name: str
    total_students: int
    today_present: int
    today_entries: int
    today_exits: int


class StatsOut(BaseModel):
    total_schools: int
    total_students: int
    today_entries: int
    today_exits: int
    schools: List[SchoolStats]
    daily: List[DailyStats]


# --- Hikvision JSON webhook ---
class HikvisionJsonEvent(BaseModel):
    cardNo: Optional[str] = None
    employeeNoString: Optional[str] = None
    name: Optional[str] = None
    attendanceStatus: Optional[str] = None  # "checkIn" / "checkOut"
    inOutStatus: Optional[str] = None       # "entry" / "exit"
    deviceIp: Optional[str] = None
    dateTime: Optional[str] = None
