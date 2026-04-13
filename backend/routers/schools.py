from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("/", response_model=List[schemas.SchoolOut])
def list_schools(db: Session = Depends(get_db)):
    return db.query(models.School).order_by(models.School.name).all()


@router.post("/", response_model=schemas.SchoolOut)
def create_school(data: schemas.SchoolCreate, db: Session = Depends(get_db)):
    school = models.School(**data.model_dump())
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


@router.delete("/{school_id}")
def delete_school(school_id: int, db: Session = Depends(get_db)):
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    db.delete(school)
    db.commit()
    return {"ok": True}
