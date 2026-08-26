def calculate_daily_budget(budget, days):
 return budget/days

def get_trip_category(budget):
 if budget < 1000:
   return "Backpacker"
 elif budget <= 3000:
   return "Standard"
 else:
   return "Luxury"

def get_travel_season(travel_month):
 if travel_month == "December":
   return "Peak Season"
 elif travel_month == "June":
   return "Holiday Season"
 else:
   return "Regular Season"

def get_transportation_recommendation(category):
  if category == "Backpacker":
    return "Bus"
  elif category == "Standard":
    return "Train"
  else:
    return "Flight"
  
def get_recommended_place (destination):
  recommendations = {
    "Japan": ["Tokyo Tower", "Shibuya", "Mount Fuji"],
    "Bali": ["Ubud", "Kuta Beach", "Tanah Lot"],
    "Singapore": ["Marina Bay Sands", "Garden by The Bay", "Santosa"],
  }
  places = recommendations.get(destination, ["City Center", "Local Market", "Popular Landmark"])
  return [f"- {place}" for place in places]

