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


def get_ai_recommendation(destination: str, days: int, budget: float, travel_style: str) -> str:
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
        f"1. A day-by-day itinerary for all {days} days\n"
        f"2. Estimated daily budget breakdown\n"
        f"3. Local food recommendations suited to a '{travel_style}' traveler\n"
        f"4. Transportation recommendations\n\n"
        f"Format the response as Markdown using:\n"
        f"- ## for section headers\n"
        f"- - for bullet points\n\n"
        f"Use this structure:\n"
        f"## Trip Overview\n"
        f"## Day-by-Day Itinerary\n"
        f"### Day 1: [Title]\n"
        f"- [activity]\n"
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

    # trim to 6000 characters to fit column limit without cutting mid-sentence
    if len(text) > 6000:
        text = text[:6000].rsplit(" ", 1)[0] + "..."

    return text
