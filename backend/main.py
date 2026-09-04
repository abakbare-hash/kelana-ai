from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from typing import Optional
from pydantic import BaseModel, field_validator
from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
    get_transportation_recommendation,
    get_recommended_place,
)
from services.bedrock_service import get_ai_recommendation
from services.kb_service import ask_knowledge_base
from services.kb_service import retrieve_and_generate
from services.auth_service import register_user, login_user, create_access_token, get_current_user, change_password
from services.chat_service import generate_chat_reply, make_title
from models.trip import Trip
from models.user import User
from models.conversation import Conversation, Message
from database import SessionLocal, init_db

load_dotenv()

class TripRequest(BaseModel):
    destination:    str
    days:           int
    budget:         float
    travel_style:   str

class TripUpdateRequest(BaseModel):
    budget:       Optional[float] = None
    days:         Optional[int]   = None
    travel_style: Optional[str]   = None

class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginRequest(BaseModel):
    email:    str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str

class AskRequest(BaseModel):
    question: str

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = None

class MessageCreateRequest(BaseModel):
    content: str

class ConversationRenameRequest(BaseModel):
    title: str

logger = logging.getLogger(__name__)

app = FastAPI()

# Allow the local dev frontend plus any configured/production origins.
allowed_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^(http://(localhost|127\.0\.0\.1):\d+|https://.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup() -> None:
    """Initialize the database on startup, logging (not crashing) on failure."""
    try:
        init_db()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Database initialization failed at startup: %s", exc)

@app.get("/")
def home():
    return {"message" : "Hurray to KelanaAI"}

@app.get("/health")
def health_check():
    return {"status": "OK"}

# POST endpoint — register a new user
@app.post("/api/v1/auth/register", status_code=201)
def register(request: RegisterRequest):
    db = SessionLocal()
    try:
        user = register_user(
            db       = db,
            name     = request.name,
            email    = request.email,
            password = request.password,
        )
        return {
            "id":         user.id,
            "name":       user.name,
            "email":      user.email,
            "created_at": user.created_at,
            "token":      create_access_token(user.id),
        }
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    finally:
        db.close()

# POST endpoint — log in an existing user
@app.post("/api/v1/auth/login")
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        user = login_user(db=db, email=request.email, password=request.password)
        return {
            "id":    user.id,
            "name":  user.name,
            "email": user.email,
            "token": create_access_token(user.id),
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    finally:
        db.close()

# GET endpoint — current logged-in user's profile
@app.get("/api/v1/auth/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "created_at": user.created_at,
    }

@app.post("/api/v1/ask")
def ask(request: AskRequest):
    try:
        result = ask_knowledge_base(request.question)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge base error: {e}")
    return {
        "question": request.question,
        "answer":   result["text"],
        "source":   result["sources"],
    }

# POST endpoint — change the logged-in user's password
@app.post("/api/v1/auth/change-password")
def change_password_endpoint(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        # re-fetch the user in this session so the change persists
        db_user = db.query(User).filter(User.id == user.id).first()
        change_password(
            db               = db,
            user             = db_user,
            current_password = request.current_password,
            new_password     = request.new_password,
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

@app.post("/api/v1/trips")
def create_trip(request: TripRequest, user: User = Depends(get_current_user)):
    daily_budget   = calculate_daily_budget(request.budget, request.days)
    category       = get_trip_category(request.budget)
    transportation = get_transportation_recommendation(category)
    result         = get_ai_recommendation(
        destination  = request.destination,
        days         = request.days,
        budget       = request.budget,
        travel_style = request.travel_style,
    )
    recommendation = result["text"]
    hero_image     = result["hero_image"]
    country_code   = result.get("country_code")

    trip = Trip(
        user_id           = user.id,
        destination       = request.destination,
        days              = request.days,
        budget            = request.budget,
        travel_style      = request.travel_style,
        category          = category,
        daily_budget      = daily_budget,
        transportation    = transportation,
        ai_recommendation = recommendation,
        hero_image        = hero_image,
        country_code      = country_code,
    )

    db = SessionLocal()
    db.add(trip)
    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.get("/api/v1/trips")
def list_trips(user: User = Depends(get_current_user)):
    db = SessionLocal()
    trips = db.query(Trip).filter(Trip.user_id == user.id).all()
    db.close()
    return trips

def _get_owned_trip(db, trip_id: int, user: User) -> Trip:
    """
    Fetch a trip and enforce ownership.

    Raises 404 if the trip does not exist, or 403 if it belongs to another user.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    if trip.user_id != user.id:
        db.close()
        raise HTTPException(status_code=403, detail="You do not have permission to access this trip")
    return trip

@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)
    db.close()
    return trip

@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripUpdateRequest, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)

    # apply only the fields the user provided
    if request.budget is not None:
        trip.budget = request.budget
    if request.days is not None:
        trip.days = request.days
    if request.travel_style is not None:
        trip.travel_style = request.travel_style

    # recalculate derived fields from the updated values
    trip.daily_budget   = calculate_daily_budget(trip.budget, trip.days)
    trip.category       = get_trip_category(trip.budget)
    trip.transportation = get_transportation_recommendation(trip.category)

    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)
    db.delete(trip)
    db.commit()
    db.close()
    return {"message": f"Trip with id {trip_id} deleted successfully"}

@app.post("/api/v1/trips/{trip_id}/generate")
def generate_recommendation(trip_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    trip = _get_owned_trip(db, trip_id, user)

    result         = get_ai_recommendation(
        destination  = trip.destination,
        days         = trip.days,
        budget       = trip.budget,
        travel_style = trip.category,
    )
    trip.ai_recommendation = result["text"]
    trip.hero_image        = result["hero_image"]
    db.commit()
    db.refresh(trip)
    db.close()

    return {
        "id"                : trip.id,
        "destination"       : trip.destination,
        "ai_recommendation" : trip.ai_recommendation,
    }


# ─── Conversation / Chat endpoints ───────────────────────────────────────────

def _get_owned_conversation(db, conversation_id: int, user: User) -> Conversation:
    """Fetch a conversation, enforcing ownership (404 if missing, 403 if not owner)."""
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if convo is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    if convo.user_id != user.id:
        db.close()
        raise HTTPException(status_code=403, detail="You do not have permission to access this conversation")
    return convo


def _serialize_message(m: Message) -> dict:
    return {
        "id":         m.id,
        "role":       m.role,
        "content":    m.content,
        "created_at": m.created_at,
    }


def _serialize_conversation(c: Conversation, include_messages: bool = False) -> dict:
    data = {
        "id":         c.id,
        "title":      c.title,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }
    if include_messages:
        data["messages"] = [_serialize_message(m) for m in c.messages]
    return data


@app.post("/api/v1/conversations", status_code=201)
def create_conversation(request: ConversationCreateRequest, user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convo = Conversation(user_id=user.id, title=request.title or "New Conversation")
        db.add(convo)
        db.commit()
        db.refresh(convo)
        return _serialize_conversation(convo, include_messages=True)
    finally:
        db.close()


@app.get("/api/v1/conversations")
def list_conversations(user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convos = (
            db.query(Conversation)
            .filter(Conversation.user_id == user.id)
            .order_by(Conversation.updated_at.desc())
            .all()
        )
        return [_serialize_conversation(c) for c in convos]
    finally:
        db.close()


@app.get("/api/v1/conversations/{conversation_id}")
def get_conversation(conversation_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convo = _get_owned_conversation(db, conversation_id, user)
        return _serialize_conversation(convo, include_messages=True)
    finally:
        db.close()


@app.post("/api/v1/conversations/{conversation_id}/messages")
def post_message(conversation_id: int, request: MessageCreateRequest, user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convo = _get_owned_conversation(db, conversation_id, user)

        # 1 & 2. Receive and save the user's message
        user_msg = Message(conversation_id=convo.id, role="user", content=request.content)
        db.add(user_msg)

        # If this is the first message, use it as the conversation title
        if not convo.messages:
            convo.title = make_title(request.content)

        db.commit()
        db.refresh(convo)

        # 3. Load previous messages (full history, ordered) to build context
        history = [{"role": m.role, "content": m.content} for m in convo.messages]

        # 4 & 5. Build the context-aware prompt and call Bedrock
        reply_text = generate_chat_reply(history)

        # 6. Save the AI response
        ai_msg = Message(conversation_id=convo.id, role="assistant", content=reply_text)
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)
        db.refresh(convo)

        # Return the reply along with the updated conversation
        return {
            "conversation_id": convo.id,
            "title":           convo.title,
            "message":         _serialize_message(ai_msg),
            "messages":        [_serialize_message(m) for m in convo.messages],
        }
    finally:
        db.close()


@app.patch("/api/v1/conversations/{conversation_id}")
def rename_conversation(conversation_id: int, request: ConversationRenameRequest, user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convo = _get_owned_conversation(db, conversation_id, user)
        title = request.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        convo.title = title[:255]
        db.commit()
        db.refresh(convo)
        return _serialize_conversation(convo)
    finally:
        db.close()


@app.delete("/api/v1/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convo = _get_owned_conversation(db, conversation_id, user)
        db.delete(convo)
        db.commit()
        return {"message": f"Conversation {conversation_id} deleted successfully"}
    finally:
        db.close()
