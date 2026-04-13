from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/turnstiles", tags=["turnstiles"])


@router.get("/", response_model=List[schemas.TurnstileOut])
def list_turnstiles(db: Session = Depends(get_db)):
    return db.query(models.Turnstile).all()


@router.post("/", response_model=schemas.TurnstileOut)
def create_turnstile(data: schemas.TurnstileCreate, db: Session = Depends(get_db)):
    t = models.Turnstile(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{turnstile_id}")
def delete_turnstile(turnstile_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Turnstile).filter(models.Turnstile.id == turnstile_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Turnstile not found")
    db.delete(t)
    db.commit()
    return {"ok": True}
