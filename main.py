from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
    get_transportation_recommendation,
    get_recommended_place,
)
from models.trip import Trip
from database import SessionLocal, init_db

class TripRequest(BaseModel):
    destination:    str
    days:           int
    budget:         float
    travel_style:   str

app = FastAPI()
init_db()

@app.get("/")
def home():
    return {"message" : "Hurray to KelanaAI"}

@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category     = get_trip_category(request.budget)

    trip = Trip(
        destination  = request.destination,
        days         = request.days,
        budget       = request.budget,
        category     = category,
        daily_budget = daily_budget,
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

@app.post("/api/v1/transportations")
def get_transportation(request: TripRequest):
    category       = get_trip_category(request.budget)
    transportation = get_transportation_recommendation(category)
    return {"transportation_recommendation" : transportation}

@app.post("/api/v1/recommendations")
def get_recommendations(request: TripRequest):
    places = get_recommended_place(request.destination)
    return {"recommended_places" : places}
