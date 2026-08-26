from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pydantic import BaseModel
from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
    get_transportation_recommendation,
    get_recommended_place,
)
from services.bedrock_service import get_ai_recommendation
from models.trip import Trip
from database import SessionLocal, init_db

class TripRequest(BaseModel):
    destination:    str
    days:           int
    budget:         float
    travel_style:   str

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

@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
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

    trip = Trip(
        destination       = request.destination,
        days              = request.days,
        budget            = request.budget,
        category          = category,
        daily_budget      = daily_budget,
        transportation    = transportation,
        ai_recommendation = recommendation,
        hero_image        = hero_image,
    )

    db = SessionLocal()
    db.add(trip)
    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.get("/api/v1/trips")
def list_trips():
    db = SessionLocal()
    trips = db.query(Trip).all()
    db.close()
    return trips

@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    db.close()
    if trip is None:
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    return trip

@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripRequest):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    daily_budget   = calculate_daily_budget(request.budget, request.days)
    category       = get_trip_category(request.budget)
    transportation = get_transportation_recommendation(category)

    trip.destination    = request.destination
    trip.days           = request.days
    trip.budget         = request.budget
    trip.daily_budget   = daily_budget
    trip.category       = category
    trip.transportation = transportation

    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    db.delete(trip)
    db.commit()
    db.close()
    return {"message": f"Trip with id {trip_id} deleted successfully"}

@app.post("/api/v1/trips/{trip_id}/generate")
def generate_recommendation(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

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

