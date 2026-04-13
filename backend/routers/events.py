import csv
import io
import json
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from dateutil import parser as dateparser

import models, schemas
from database import get_db

router = APIRouter(tags=["events"])

# ------------------------------------------------------------------ #
#  Helpers
# ------------------------------------------------------------------ #

def _resolve_direction(status: str) -> models.DirectionEnum:
    """Map Hikvision attendanceStatus / inOutStatus to our direction."""
    s = (status or "").lower()
    if s in ("checkin", "entry", "in", "вход"):
        return models.DirectionEnum.entry
    if s in ("checkout", "exit", "out", "выход"):
        return models.DirectionEnum.exit
    return models.DirectionEnum.unknown


def _find_student(db: Session, card_no: str, employee_no: str) -> Optional[models.Student]:
    if card_no:
        s = db.query(models.Student).filter(models.Student.card_no == card_no).first()
        if s:
            return s
    if employee_no:
        s = db.query(models.Student).filter(models.Student.employee_no == employee_no).first()
        if s:
            return s
    return None


def _find_turnstile(db: Session, ip: str) -> Optional[models.Turnstile]:
    if not ip:
        return None
    return db.query(models.Turnstile).filter(models.Turnstile.ip_address == ip).first()


# ------------------------------------------------------------------ #
#  Hikvision XML webhook
#  Devices send POST to /webhook/hikvision  (HTTP event notification)
# ------------------------------------------------------------------ #
@router.post("/webhook/hikvision", status_code=200)
async def hikvision_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    raw = body.decode("utf-8", errors="ignore")

    # Parse XML
    card_no = employee_no = person_name = direction_str = ip = dt_str = ""
    try:
        from lxml import etree
        root = etree.fromstring(body)
        ns = {"h": "http://www.hikvision.com/ver20/XMLSchema"}

        def _get(tag):
            el = root.find(f".//{tag}") or root.find(f".//h:{tag}", ns)
            return (el.text or "").strip() if el is not None else ""

        ip = _get("ipAddress")
        dt_str = _get("dateTime")
        card_no = _get("cardNo")
        employee_no = _get("employeeNoString")
        person_name = _get("name")
        attendance = _get("attendanceStatus")
        inout = _get("inOutStatus")
        direction_str = attendance or inout
    except Exception:
        pass

    event_time = datetime.utcnow()
    if dt_str:
        try:
            event_time = dateparser.parse(dt_str)
        except Exception:
            pass

    direction = _resolve_direction(direction_str)
    student = _find_student(db, card_no, employee_no)
    turnstile = _find_turnstile(db, ip)

    ev = models.AccessEvent(
        card_no=card_no or None,
        person_name=person_name or (student.full_name if student else ""),
        direction=direction,
        event_time=event_time,
        student_id=student.id if student else None,
        turnstile_id=turnstile.id if turnstile else None,
        raw_data=raw[:2000],
    )
    db.add(ev)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ #
#  Simple JSON webhook (for testing or custom scripts)
#  POST /webhook/event
# ------------------------------------------------------------------ #
@router.post("/webhook/event", status_code=200)
def json_event(payload: schemas.HikvisionJsonEvent, db: Session = Depends(get_db)):
    card_no = payload.cardNo or ""
    employee_no = payload.employeeNoString or ""
    direction = _resolve_direction(payload.attendanceStatus or payload.inOutStatus or "")
    student = _find_student(db, card_no, employee_no)
    turnstile = _find_turnstile(db, payload.deviceIp or "")

    event_time = datetime.utcnow()
    if payload.dateTime:
        try:
            event_time = dateparser.parse(payload.dateTime)
        except Exception:
            pass

    ev = models.AccessEvent(
        card_no=card_no or None,
        person_name=payload.name or (student.full_name if student else ""),
        direction=direction,
        event_time=event_time,
        student_id=student.id if student else None,
        turnstile_id=turnstile.id if turnstile else None,
        raw_data=json.dumps(payload.model_dump()),
    )
    db.add(ev)
    db.commit()
    return {"ok": True, "event_id": ev.id}


# ------------------------------------------------------------------ #
#  CSV import from iVMS-4200
#  POST /api/upload/csv
# ------------------------------------------------------------------ #
@router.post("/api/upload/csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    text = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    errors = []
    for i, row in enumerate(reader):
        try:
            # Common iVMS-4200 column names (vary by version)
            card_no = (row.get("Card No.") or row.get("CardNo") or row.get("card_no") or "").strip()
            name = (row.get("Name") or row.get("Employee Name") or row.get("name") or "").strip()
            dt_raw = (row.get("Time") or row.get("Date Time") or row.get("event_time") or "").strip()
            direction_raw = (row.get("Status") or row.get("In/Out") or row.get("direction") or "").strip()

            event_time = dateparser.parse(dt_raw) if dt_raw else datetime.utcnow()
            direction = _resolve_direction(direction_raw)
            student = _find_student(db, card_no, "")

            ev = models.AccessEvent(
                card_no=card_no or None,
                person_name=name or (student.full_name if student else ""),
                direction=direction,
                event_time=event_time,
                student_id=student.id if student else None,
                raw_data=json.dumps(dict(row)),
            )
            db.add(ev)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i + 2}: {e}")

    db.commit()
    return {"imported": imported, "errors": errors}


# ------------------------------------------------------------------ #
#  List events  GET /api/events
# ------------------------------------------------------------------ #
@router.get("/api/events", response_model=List[schemas.EventOut])
def list_events(
    school_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    direction: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.AccessEvent)
        .options(
            joinedload(models.AccessEvent.student).joinedload(models.Student.school),
            joinedload(models.AccessEvent.turnstile),
        )
    )

    if school_id:
        q = q.join(models.Student, isouter=True).filter(
            models.Student.school_id == school_id
        )
    if student_id:
        q = q.filter(models.AccessEvent.student_id == student_id)
    if direction and direction in ("entry", "exit"):
        q = q.filter(models.AccessEvent.direction == direction)
    if date_from:
        q = q.filter(models.AccessEvent.event_time >= dateparser.parse(date_from))
    if date_to:
        q = q.filter(models.AccessEvent.event_time <= dateparser.parse(date_to))

    return q.order_by(models.AccessEvent.event_time.desc()).offset(offset).limit(limit).all()


# ------------------------------------------------------------------ #
#  Stats  GET /api/stats
# ------------------------------------------------------------------ #
@router.get("/api/stats", response_model=schemas.StatsOut)
def get_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    total_schools = db.query(models.School).count()
    total_students = db.query(models.Student).count()

    today_entries = (
        db.query(models.AccessEvent)
        .filter(
            models.AccessEvent.event_time >= today_start,
            models.AccessEvent.event_time <= today_end,
            models.AccessEvent.direction == models.DirectionEnum.entry,
        )
        .count()
    )
    today_exits = (
        db.query(models.AccessEvent)
        .filter(
            models.AccessEvent.event_time >= today_start,
            models.AccessEvent.event_time <= today_end,
            models.AccessEvent.direction == models.DirectionEnum.exit,
        )
        .count()
    )

    schools_data = []
    for school in db.query(models.School).all():
        student_ids = [s.id for s in school.students]
        today_present = 0
        school_entries = 0
        school_exits = 0
        if student_ids:
            school_entries = (
                db.query(models.AccessEvent)
                .filter(
                    models.AccessEvent.student_id.in_(student_ids),
                    models.AccessEvent.event_time >= today_start,
                    models.AccessEvent.direction == models.DirectionEnum.entry,
                )
                .count()
            )
            school_exits = (
                db.query(models.AccessEvent)
                .filter(
                    models.AccessEvent.student_id.in_(student_ids),
                    models.AccessEvent.event_time >= today_start,
                    models.AccessEvent.direction == models.DirectionEnum.exit,
                )
                .count()
            )
            # present = entered today and not yet exited (simplified: unique students entered)
            entered_ids = (
                db.query(models.AccessEvent.student_id)
                .filter(
                    models.AccessEvent.student_id.in_(student_ids),
                    models.AccessEvent.event_time >= today_start,
                    models.AccessEvent.direction == models.DirectionEnum.entry,
                )
                .distinct()
                .all()
            )
            today_present = len(entered_ids)

        schools_data.append(
            schemas.SchoolStats(
                school_id=school.id,
                school_name=school.name,
                total_students=len(school.students),
                today_present=today_present,
                today_entries=school_entries,
                today_exits=school_exits,
            )
        )

    # Daily stats for last 7 days
    from datetime import timedelta
    daily = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        d_start = datetime.combine(d, datetime.min.time())
        d_end = datetime.combine(d, datetime.max.time())
        entries = db.query(models.AccessEvent).filter(
            models.AccessEvent.event_time >= d_start,
            models.AccessEvent.event_time <= d_end,
            models.AccessEvent.direction == models.DirectionEnum.entry,
        ).count()
        exits = db.query(models.AccessEvent).filter(
            models.AccessEvent.event_time >= d_start,
            models.AccessEvent.event_time <= d_end,
            models.AccessEvent.direction == models.DirectionEnum.exit,
        ).count()
        daily.append(schemas.DailyStats(date=str(d), entries=entries, exits=exits))

    return schemas.StatsOut(
        total_schools=total_schools,
        total_students=total_students,
        today_entries=today_entries,
        today_exits=today_exits,
        schools=schools_data,
        daily=daily,
    )
