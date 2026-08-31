from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from typing import Optional
from pydantic import BaseModel, field_validator
from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
    get_transportation_recommendation,
    get_recommended_place,
)
from services.bedrock_service import get_ai_recommendation
from services.auth_service import register_user, login_user, create_access_token, get_current_user, change_password
from models.trip import Trip
from models.user import User
from database import SessionLocal, init_db

load_dotenv()

class TripRequest(BaseModel):
    destination:    str
    days:           int
    budget:         float
    travel_style:   str

class TripUpdateRequest(BaseModel):
    budget:       Optional[float] = None
    days:         Optional[int]   = None
    travel_style: Optional[str]   = None

class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginRequest(BaseModel):
    email:    str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

@app.get("/")
def home():
    return {"message" : "Hurray to KelanaAI"}

# POST endpoint — register a new user
@app.post("/api/v1/auth/register", status_code=201)
def register(request: RegisterRequest):
    db = SessionLocal()
    try:
        user = register_user(
            db       = db,
            name     = request.name,
            email    = request.email,
            password = request.password,
        )
        return {
            "id":         user.id,
            "name":       user.name,
            "email":      user.email,
            "created_at": user.created_at,
            "token":      create_access_token(user.id),
        }
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    finally:
        db.close()

# POST endpoint — log in an existing user
@app.post("/api/v1/auth/login")
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        user = login_user(db=db, email=request.email, password=request.password)
        return {
            "id":    user.id,
            "name":  user.name,
            "email": user.email,
            "token": create_access_token(user.id),
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    finally:
        db.close()

# GET endpoint — current logged-in user's profile
@app.get("/api/v1/auth/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "created_at": user.created_at,
    }

# POST endpoint — change the logged-in user's password
@app.post("/api/v1/auth/change-password")
def change_password_endpoint(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        # re-fetch the user in this session so the change persists
        db_user = db.query(User).filter(User.id == user.id).first()
        change_password(
            db               = db,
            user             = db_user,
            current_password = request.current_password,
            new_password     = request.new_password,
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

@app.post("/api/v1/trips")
def create_trip(request: TripRequest, user: User = Depends(get_current_user)):
    daily_budget   = calculate_daily_budget(request.budget, request.days)
    category       = get_trip_category(request.budget)
    transportation = get_transportation_recommendation(category)
    result         = get_ai_recommendation(
        destination  = request.destination,
        days         = request.days,
        budget       = request.budget,
        travel_style = request.travel_style,
    )
    recommendation = result["text"]
    hero_image     = result["hero_image"]
    country_code   = result.get("country_code")

    trip = Trip(
        user_id           = user.id,
        destination       = request.destination,
        days              = request.days,
        budget            = request.budget,
        travel_style      = request.travel_style,
        category          = category,
        daily_budget      = daily_budget,
        transportation    = transportation,
        ai_recommendation = recommendation,
        hero_image        = hero_image,
        country_code      = country_code,
    )

    db = SessionLocal()
    db.add(trip)
    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.get("/api/v1/trips")
def list_trips(user: User = Depends(get_current_user)):
    db = SessionLocal()
    trips = db.query(Trip).filter(Trip.user_id == user.id).all()
    db.close()
    return trips

def _get_owned_trip(db, trip_id: int, user: User) -> Trip:
    """
    Fetch a trip and enforce ownership.

    Raises 404 if the trip does not exist, or 403 if it belongs to another user.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    if trip.user_id != user.id:
        db.close()
        raise HTTPException(status_code=403, detail="You do not have permission to access this trip")
    return trip

@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)
    db.close()
    return trip

@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripUpdateRequest, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)

    # apply only the fields the user provided
    if request.budget is not None:
        trip.budget = request.budget
    if request.days is not None:
        trip.days = request.days
    if request.travel_style is not None:
        trip.travel_style = request.travel_style

    # recalculate derived fields from the updated values
    trip.daily_budget   = calculate_daily_budget(trip.budget, trip.days)
    trip.category       = get_trip_category(trip.budget)
    trip.transportation = get_transportation_recommendation(trip.category)

    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)
    db.delete(trip)
    db.commit()
    db.close()
    return {"message": f"Trip with id {trip_id} deleted successfully"}

@app.post("/api/v1/trips/{trip_id}/generate")
def generate_recommendation(trip_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)

    result         = get_ai_recommendation(
        destination  = trip.destination,
        days         = trip.days,
        budget       = trip.budget,
        travel_style = trip.category,
    )
    trip.ai_recommendation = result["text"]
    trip.hero_image        = result["hero_image"]
    db.commit()
    db.refresh(trip)
    db.close()

    return {
        "id"                : trip.id,
        "destination"       : trip.destination,
        "ai_recommendation" : trip.ai_recommendation,
    }

