from sqlalchemy import Column, BigInteger, Integer, String, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base



class Trip(Base):
    __tablename__ = "trips"

    id                 = Column(Integer,    primary_key=True)
    user_id            = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    destination        = Column(String,     nullable=False)
    days               = Column(Integer,    nullable=False)
    budget             = Column(Float,      nullable=False)
    travel_style       = Column(String,     nullable=True)
    category           = Column(String,     nullable=False)
    daily_budget       = Column(Float,      nullable=False)
    transportation     = Column(String,     nullable=True)
    ai_recommendation  = Column(Text,       nullable=True)
    hero_image         = Column(String,     nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="trips")