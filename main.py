days            = int(input("Days : "))
budget          = float(input("Budget : "))
travel_month    = input("Travel Month : ")

# Reuse them anywhere
def print_trip_summary(days, budget, travel_month):
 print("========================================")
 print("KelanaAI")
 print("========================================")
 print(f"Destination    : Japan")
 print(f"Days           : {days}")
 print(f"Budget         : {budget} USD")
 print(f"Travel Month   : {travel_month}")

from services.trip_service import (
    calculate_daily_budget, 
    get_trip_category, 
    get_travel_season,
)

daily = calculate_daily_budget(budget,days)
category = get_trip_category(budget)

# Call it with any trip
print_trip_summary(days, budget, travel_month)


print(f"Daily Budget   : {daily} USD/day")
print(f"Category       : {category}")


season = get_travel_season(travel_month)
print(f"Season         : {season}")

recommended_place = ["Tokyo Tower", "Shibuya", "Mount Fuji"]

# Loop through the list
print()
print(f"Recommended Place :")
for place in recommended_place:
    print(f" - {place}")
