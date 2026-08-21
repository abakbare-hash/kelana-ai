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
        f"You are an experienced travel planner. "
        f"Plan a {days}-day itinerary for {destination}. "
        f"Budget: USD {budget} "
        f"Travel Style: {travel_style}\n\n"
        f"Please provide a detailed travel plan that includes:\n"
        f"1. A day-by-day itinerary for all {days} days\n"
        f"2. Estimated daily budget breakdown\n"
        f"3. Local food recommendations\n"
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
            "maxTokens": 1024,
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
    return result["output"]["message"]["content"][0]["text"]
