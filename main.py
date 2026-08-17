from fastapi import FastAPI
from pydantic import BaseModel
from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
    get_transportation_recommendation,
    get_recommended_place,
)
class TripRequest(BaseModel):
    destination:    str
    days:           int
    budget:         float
    travel_style:   str
app = FastAPI()
@app.get("/")
def home():
    return {"message" : "Hurray to KelanaAI"}
@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(
        request.budget, request.days
    )
    category = get_trip_category(
        request.budget
    )
    transportation = get_transportation_recommendation(category)
    places = get_recommended_place(request.destination)
    return {
        "destination"                   : request.destination,
        "budget"                        : request.budget,
        "travel_style"                  : request.travel_style,
        "daily_budget"                  : daily_budget,
        "category"                      : category,
        "transportation_recommendation" : transportation,
        "recommended_places"            : places      
    }


