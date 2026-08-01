"""SQLAlchemy models + engine for Prism."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./prism.db")

# SQLite needs check_same_thread=False for FastAPI + background tasks.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    uid: Column = Column(String, primary_key=True)
    email: Column = Column(String, nullable=True)
    display_name: Column = Column(String, nullable=True)
    created_at: Column = Column(DateTime, default=_utcnow)


class AnalysisSession(Base):
    __tablename__ = "sessions"
    id: Column = Column(String, primary_key=True)
    user_id: Column = Column(String, ForeignKey("users.uid"), nullable=True)
    created_at: Column = Column(DateTime, default=_utcnow)
    stage: Column = Column(Integer, default=0)
    stage_name: Column = Column(String, default="")
    complete: Column = Column(Boolean, default=False)

    files = relationship("UploadedFile", cascade="all, delete-orphan", backref="session")
    matrix = relationship("MatrixRow", cascade="all, delete-orphan", backref="session")
    questions = relationship("FollowUpQuestion", cascade="all, delete-orphan", backref="session")
    report = relationship("Report", uselist=False, cascade="all, delete-orphan", backref="session")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id: Column = Column(String, primary_key=True)
    session_id: Column = Column(String, ForeignKey("sessions.id"))
    filename: Column = Column(String)
    detected_type: Column = Column(String)  # DetectedType string
    status: Column = Column(String, default="validated")  # FileStatus string
    confidence: Column = Column(Float, default=0.9)
    storage_path: Column = Column(String)


class MatrixRow(Base):
    __tablename__ = "matrix_rows"
    id: Column = Column(String, primary_key=True)
    session_id: Column = Column(String, ForeignKey("sessions.id"))
    metric: Column = Column(String)
    documents_json: Column = Column(JSON)  # {pitch_deck: {...}|null, mis: ..., ...}
    status: Column = Column(String)
    materiality: Column = Column(String)
    ai_reasoning: Column = Column(String)


class FollowUpQuestion(Base):
    __tablename__ = "follow_up_questions"
    id: Column = Column(String, primary_key=True)
    session_id: Column = Column(String, ForeignKey("sessions.id"))
    question: Column = Column(String)
    related_metric: Column = Column(String)
    severity: Column = Column(String)


class Report(Base):
    __tablename__ = "reports"
    session_id: Column = Column(String, ForeignKey("sessions.id"), primary_key=True)
    readiness_score: Column = Column(Integer, default=0)
    document_completeness_pct: Column = Column(Integer, default=0)
    top_red_flags_json: Column = Column(JSON, default=list)
    top_strengths_json: Column = Column(JSON, default=list)
    report_pdf_path: Column = Column(String, nullable=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    return SessionLocal()
