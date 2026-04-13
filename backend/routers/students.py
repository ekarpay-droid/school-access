from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/", response_model=List[schemas.StudentOut])
def list_students(
    school_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Student).options(joinedload(models.Student.school))
    if school_id:
        q = q.filter(models.Student.school_id == school_id)
    if search:
        q = q.filter(models.Student.full_name.ilike(f"%{search}%"))
    return q.order_by(models.Student.full_name).all()


@router.post("/", response_model=schemas.StudentOut)
def create_student(data: schemas.StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Student).filter(models.Student.card_no == data.card_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student with this card number already exists")
    student = models.Student(**data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return db.query(models.Student).options(joinedload(models.Student.school)).filter(models.Student.id == student.id).first()


@router.put("/{student_id}", response_model=schemas.StudentOut)
def update_student(student_id: int, data: schemas.StudentCreate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for k, v in data.model_dump().items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"ok": True}
