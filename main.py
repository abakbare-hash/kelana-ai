destination     = input("Destination : ")
country         = input("Country : ")
days            = int(input("Days : "))
budget          = float(input("Budget : "))
currency        = input("Currency : ")
travel_month    = input("Travel Month : ")

# Reuse them anywhere
def print_trip_summary(destination, country, days, budget, currency, travel_month):
 print("========================================")
 print("KelanaAI")
 print("========================================")
 print(f"Destination    : {destination}")
 print(f"Country        : {country}")
 print(f"Days           : {days}")
 print(f"Budget         : {budget}")
 print(f"Currency       : {currency}")
 print(f"Travel Month   : {travel_month}")

# Call it with any trip
print_trip_summary(destination, country, days, budget, currency, travel_month)