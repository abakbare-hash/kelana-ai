from fastapi import FastAPI
from pydantic import BaseModel
from services.trip_service import (
    calculate_daily_budget,
    get_trip_category
)
class TripRequest(BaseModel):
    destination: str
    days: int
    budget: float
app = FastAPI()
@app.get("/")
def home():
    return{
        "message": "Welcome to KelanaAI"
    }
@app.post("/api/v1/trips")    
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)
    return {
        "destination" : request.destination,
        "budget" : request.budget,
        "daily_budget" : daily_budget,
        "category" : category,
    }