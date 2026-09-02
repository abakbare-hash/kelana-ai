import os
import json

from services.bedrock_service import get_bedrock_client

SYSTEM_PREAMBLE = (
    "You are KelanaAI, a friendly and knowledgeable travel planning assistant. "
    "You help users plan trips, suggest itineraries, recommend destinations, food, "
    "and activities. Keep answers helpful, well-structured, and conversational. "
    "Use the earlier conversation for context so your replies stay consistent."
)


def generate_chat_reply(history: list[dict]) -> str:
    """
    Generate a context-aware assistant reply from the full conversation history.

    Args:
        history: Ordered list of prior messages, e.g.
                 [{"role": "user", "content": "Plan a family trip to Japan."},
                  {"role": "assistant", "content": "Here is a 5-day itinerary..."},
                  {"role": "user", "content": "What should we do on Day 2?"}]
                 The last message must be from the user.

    Returns:
        The assistant's reply text.
    """
    client   = get_bedrock_client()
    model_id = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")

    # Build the Nova messages array from the conversation history.
    # Nova doesn't take a separate system role in this API shape, so we prepend
    # the preamble to the first user turn to keep the assistant on-task.
    messages = []
    preamble_injected = False
    for msg in history:
        role = msg["role"]
        text = msg["content"]
        if role == "user" and not preamble_injected:
            text = f"{SYSTEM_PREAMBLE}\n\n{text}"
            preamble_injected = True
        messages.append({"role": role, "content": [{"text": text}]})

    body = json.dumps({
        "messages": messages,
        "inferenceConfig": {
            "maxTokens": 3000,
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
    return result["output"]["message"]["content"][0]["text"]


def make_title(first_message: str) -> str:
    """
    Generate a short conversation title from the first user message.

    Uses the AI to extract the destination and number of days when present,
    producing titles like "Japan - 5 Days" or "Tokyo Family Trip".
    Falls back to a truncated version of the message on any failure.
    """
    try:
        client   = get_bedrock_client()
        model_id = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")

        prompt = (
            "Create a very short chat title (max 6 words) for a travel conversation "
            "based on the user's first message. If a destination and number of days "
            "are mentioned, format it as '<Destination> - <N> Days' "
            "(e.g. 'Japan - 5 Days'). If only a destination is mentioned, use that. "
            "Return ONLY the title text, no quotes, no punctuation at the end.\n\n"
            f"Message: {first_message}\n\n"
            "Title:"
        )

        body = json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 30, "temperature": 0.2},
        })

        response = client.invoke_model(
            modelId     = model_id,
            body        = body,
            contentType = "application/json",
            accept      = "application/json",
        )
        result = json.loads(response["body"].read())
        title = result["output"]["message"]["content"][0]["text"].strip().strip('"')
        if title:
            return title[:60]
    except Exception:
        pass

    # fallback: truncated first message
    text = first_message.strip().replace("\n", " ")
    if len(text) > 50:
        text = text[:50].rsplit(" ", 1)[0] + "..."
    return text or "New Conversation"
