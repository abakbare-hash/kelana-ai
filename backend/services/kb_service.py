import os
import os
import boto3, json
from dotenv import load_dotenv

from services.bedrock_service import get_bedrock_client

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID")
KNOWLEDGE_BASE_MODEL_ARN = os.getenv("KNOWLEDGE_BASE_MODEL_ARN")


def get_bedrock_agent_runtime_client():
    """
    Build and return a boto3 Bedrock Agent Runtime client.

    Bedrock Agent Runtime uses standard AWS SigV4 credentials.
    """
    return boto3.client(
        service_name="bedrock-agent-runtime",
        region_name=AWS_REGION,
    )


def retrieve_and_generate(query: str) -> str:
    """
    Retrieve relevant content from the Bedrock Knowledge Base.

    Managed knowledge bases support Retrieve, not RetrieveAndGenerate.

    Args:
        query: The user's question.

    Returns:
        The retrieved text snippets joined as a single string.

    Raises:
        ValueError: If required environment variables are missing.
        Exception:  Propagated from boto3 / Bedrock on API errors.
    """
    missing_vars = [
        name
        for name, value in {
            "KNOWLEDGE_BASE_ID": KNOWLEDGE_BASE_ID,
        }.items()
        if not value
    ]
    if missing_vars:
        raise ValueError(
            f"{', '.join(missing_vars)} is not set. "
            "Check your .env file."
        )

    client = get_bedrock_agent_runtime_client()

    response = client.retrieve(
        knowledgeBaseId=KNOWLEDGE_BASE_ID,
        retrievalQuery={"text": query},
        retrievalConfiguration={
            "managedSearchConfiguration": {
                "numberOfResults": 10,
            },
        },
    )

    snippets = []
    sources = []
    for result in response.get("retrievalResults", []):
        text = result.get("content", {}).get("text", "").strip()
        if not text:
            continue
        snippets.append(text)

        location = result.get("location", {})
        metadata = result.get("metadata", {})
        document_id = (
            metadata.get("x-amz-bedrock-kb-source-uri")
            or metadata.get("_source_uri")
            or location.get("s3Location", {}).get("uri", "")
        )

        sources.append({
            "document_id": document_id,
            "location":    location,
            "metadata":    metadata,
            "score":       result.get("score"),
        })

    return {
        "text": "\n\n".join(snippets),
        "sources": sources,
    }


def _extract_source_name(location: dict) -> str:
    """
    Pull a human-readable document name from a retrieval result's location.
    Handles S3, web, and other location types; returns just the file name.
    """
    if not location:
        return ""

    loc_type = location.get("type", "")

    # S3 documents
    if loc_type == "S3" or "s3Location" in location:
        uri = location.get("s3Location", {}).get("uri", "")
        return uri.rsplit("/", 1)[-1] if uri else ""

    # Web pages
    if loc_type == "WEB" or "webLocation" in location:
        return location.get("webLocation", {}).get("url", "")

    # Fallback: try any *Location dict with a uri/url
    for value in location.values():
        if isinstance(value, dict):
            uri = value.get("uri") or value.get("url")
            if uri:
                return uri.rsplit("/", 1)[-1]

    return ""

def ask_knowledge_base(question: str) -> dict:
    """
    Answer a question using the managed Knowledge Base.

    Managed KBs only support Retrieve (not RetrieveAndGenerate), so this:
      1. Retrieves relevant document snippets from the KB.
      2. Feeds those snippets to Nova to generate a grounded answer.

    Args:
        question: The user's question.

    Returns:
        A generated answer grounded in the retrieved documents.

    Raises:
        ValueError: If required environment variables are missing.
    """
    # 1. Retrieve relevant snippets from the managed KB
    retrieved = retrieve_and_generate(question)
    context = retrieved["text"]
    sources = retrieved["sources"]

    if not context.strip():
        return {
            "text": "I couldn't find anything relevant in the knowledge base for that question.",
            "sources": [],
        }

    # 2. Ask Nova to answer using only the retrieved context
    client   = get_bedrock_client()
    model_id = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")

    prompt = (
        "You are a helpful travel assistant. Answer the user's question using ONLY the "
        "context below, which was retrieved from a trusted knowledge base. If the context "
        "does not contain the answer, say you don't have that information. "
        "Give a complete, well-structured answer.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )

    body = json.dumps({
        "messages": [
            {"role": "user", "content": [{"text": prompt}]}
        ],
        "inferenceConfig": {
            "maxTokens": 3000,
            "temperature": 0.5,
        },
    })

    response = client.invoke_model(
        modelId     = model_id,
        body        = body,
        contentType = "application/json",
        accept      = "application/json",
    )

    result = json.loads(response["body"].read())
    answer = result["output"]["message"]["content"][0]["text"]

    return {"text": answer, "sources": sources}
