import os
import boto3
import json
from dotenv import load_dotenv

load_dotenv()

def get_bedrock_client():
    """Configure and return a Bedrock runtime client using env variables."""
    bearer_token = os.getenv("AWS_BEARER_TOKEN_BEDROCK")
    region       = os.getenv("AWS_REGION", "ap-southeast-2")

    if not bearer_token:
        raise ValueError("AWS_BEARER_TOKEN_BEDROCK is not set in .env")

    client = boto3.client(
        service_name    = "bedrock-runtime",
        region_name     = region,
        aws_access_key_id     = "token",       # placeholder required by boto3
        aws_secret_access_key = bearer_token,  # bearer token as secret
    )
    return client


def get_ai_recommendation(destination: str, days: int, budget: float, travel_style: str) -> dict:
    """Call AWS Bedrock to generate a travel itinerary."""
    client   = get_bedrock_client()
    model_id = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")

    prompt = (
        f"You are an experienced travel planner who specializes in personalized trips.\n\n"
        f"Plan a {days}-day itinerary for {destination}.\n"
        f"Budget: USD {budget}\n"
        f"Travel Style: {travel_style}\n\n"
        f"IMPORTANT: This trip is specifically designed for a '{travel_style}' traveler. "
        f"You MUST tailor every recommendation to strictly match this travel style:\n"
        f"- If the style is 'Family': focus on family-friendly attractions, kid-safe activities, "
        f"comfortable accommodations, and avoid nightlife, bars, extreme sports, or adult-only venues.\n"
        f"- If the style is 'Backpacker': focus on budget hostels, street food, public transport, "
        f"and off-the-beaten-path experiences. Avoid luxury hotels or expensive restaurants.\n"
        f"- If the style is 'Luxury': focus on 5-star hotels, fine dining, private tours, and "
        f"premium experiences. Avoid budget options.\n"
        f"- If the style is 'Adventure': focus on outdoor activities, hiking, extreme sports, and "
        f"nature experiences. Avoid passive sightseeing.\n"
        f"- For any other style, interpret it carefully and tailor all recommendations accordingly.\n\n"
        f"Please provide a detailed travel plan that includes:\n"
        f"1. A structured day-by-day itinerary for all {days} days. "
        f"Each day MUST be broken into three time blocks:\n"
        f"   - **Morning** (2-3 activity recommendations suited to a '{travel_style}' traveler)\n"
        f"   - **Afternoon** (recommendations focused on cultural sites and local experiences "
        f"appropriate for '{travel_style}')\n"
        f"   - **Evening** (recommendations for dinner spots and evening activities such as "
        f"native concerts, dance shows, art exhibitions, or nightlife — "
        f"always filtered to be appropriate for '{travel_style}' travelers)\n"
        f"2. Estimated daily budget breakdown\n"
        f"3. Local food recommendations suited to a '{travel_style}' traveler\n"
        f"4. Transportation recommendations\n\n"
        f"IMPORTANT: The very first line of your response MUST be exactly in this format:\n"
        f"LANDMARK: [one most iconic landmark, building, or natural site name in {destination}]\n"
        f"For example: LANDMARK: Eiffel Tower or LANDMARK: Mount Fuji or LANDMARK: Tanah Lot Temple\n"
        f"Only the landmark name — no extra words, no punctuation after the name.\n\n"
        f"Then continue with the itinerary using this structure:\n"
        f"## Trip Overview\n"
        f"## Day-by-Day Itinerary\n"
        f"### Day 1: [Title]\n"
        f"#### Morning\n"
        f"- [activity 1]\n"
        f"- [activity 2]\n"
        f"- [activity 3]\n"
        f"#### Afternoon\n"
        f"- [cultural site or local experience]\n"
        f"#### Evening\n"
        f"- [dinner spot or evening activity]\n"
        f"## Estimated Daily Budget\n"
        f"- [budget item]: USD [amount]\n"
        f"## Local Food Recommendations\n"
        f"- [food item]\n"
        f"## Transportation Recommendations\n"
        f"- [transport option]\n"
    )

    body = json.dumps({
        "messages": [
            {
                "role":    "user",
                "content": [{"text": prompt}],
            }
        ],
        "inferenceConfig": {
            "maxTokens": 2048,
            "temperature": 0.7,
        },
    })

    response = client.invoke_model(
        modelId     = model_id,
        body        = body,
        contentType = "application/json",
        accept      = "application/json",
    )

    result = json.loads(response["body"].read())

    # extract text from Nova response structure
    text = result["output"]["message"]["content"][0]["text"]

    # extract landmark from first line if present
    lines = text.strip().splitlines()
    if lines and lines[0].startswith("LANDMARK:"):
        landmark = lines[0].replace("LANDMARK:", "").strip()
        text = "\n".join(lines[1:]).strip()
    else:
        landmark = destination

    # Fetch hero image from Wikipedia (high quality, free, destination-relevant)
    hero_image = _get_wikipedia_image(landmark, destination)

    # trim to 6000 characters to fit column limit without cutting mid-sentence
    if len(text) > 6000:
        text = text[:6000].rsplit(" ", 1)[0] + "..."

    return {"text": text, "hero_image": hero_image}


def _get_wikipedia_image(landmark: str, fallback: str) -> str:
    """Fetch a high-quality image from Wikipedia for the given landmark."""
    import urllib.request
    import urllib.parse

    for query in [landmark, fallback]:
        title = urllib.parse.quote(query.replace(" ", "_"))
        url = (
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "KelanaAI/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                if "originalimage" in data:
                    return data["originalimage"]["source"]
                if "thumbnail" in data:
                    return data["thumbnail"]["source"]
        except Exception:
            continue

    # ultimate fallback
    return f"https://loremflickr.com/1600/900/{landmark.replace(' ', '+')}"
