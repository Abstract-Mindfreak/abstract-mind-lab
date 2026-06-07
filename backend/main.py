import sys
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.connection import engine, init_db
from database.models import Song, ChatSession, SessionSongLink
from api.routes.music_blocks import router as music_blocks_router

app = FastAPI(title="Abstract Mind Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(music_blocks_router)

class SongResponse(BaseModel):
    id: str
    title: str
    audio_url: Optional[str]
    video_url: Optional[str]
    image_url: Optional[str]
    created_at: str
    source_url: Optional[str]
    play_count: int
    favorite_count: int
    sound_prompt: Optional[str]
    phase_transition_logic: Optional[str]
    raw_data: dict

class SessionResponse(BaseModel):
    id: str
    title: Optional[str]
    user_id: Optional[str]
    project_id: Optional[str]
    created_at: str
    captured_at: str
    full_payload: dict

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/api/songs", response_model=List[SongResponse])
async def get_songs(limit: int = 100, offset: int = 0):
    with Session(engine) as session:
        songs = session.exec(select(Song).offset(offset).limit(limit)).all()
        return [
            SongResponse(
                id=str(song.id),
                title=song.title,
                audio_url=song.audio_url,
                video_url=song.video_url,
                image_url=song.image_url,
                created_at=song.created_at.isoformat(),
                source_url=song.source_url,
                play_count=song.play_count,
                favorite_count=song.favorite_count,
                sound_prompt=song.sound_prompt,
                phase_transition_logic=song.phase_transition_logic,
                raw_data=song.raw_data,
            )
            for song in songs
        ]

@app.get("/api/songs/{song_id}", response_model=SongResponse)
async def get_song(song_id: str):
    with Session(engine) as session:
        song = session.get(Song, song_id)
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        return SongResponse(
            id=str(song.id),
            title=song.title,
            audio_url=song.audio_url,
            video_url=song.video_url,
            image_url=song.image_url,
            created_at=song.created_at.isoformat(),
            source_url=song.source_url,
            play_count=song.play_count,
            favorite_count=song.favorite_count,
            sound_prompt=song.sound_prompt,
            phase_transition_logic=song.phase_transition_logic,
            raw_data=song.raw_data,
        )

@app.get("/api/sessions", response_model=List[SessionResponse])
async def get_sessions(limit: int = 100, offset: int = 0):
    with Session(engine) as session:
        sessions = session.exec(select(ChatSession).offset(offset).limit(limit)).all()
        return [
            SessionResponse(
                id=str(session.id),
                title=session.title,
                user_id=str(session.user_id) if session.user_id else None,
                project_id=str(session.project_id) if session.project_id else None,
                created_at=session.created_at.isoformat(),
                captured_at=session.captured_at.isoformat(),
                full_payload=session.full_payload,
            )
            for session in sessions
        ]

@app.get("/api/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    with Session(engine) as session:
        chat_session = session.get(ChatSession, session_id)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Session not found")
        return SessionResponse(
            id=str(chat_session.id),
            title=chat_session.title,
            user_id=str(chat_session.user_id) if chat_session.user_id else None,
            project_id=str(chat_session.project_id) if chat_session.project_id else None,
            created_at=chat_session.created_at.isoformat(),
            captured_at=chat_session.captured_at.isoformat(),
            full_payload=chat_session.full_payload,
        )

@app.get("/api/sessions/{session_id}/songs", response_model=List[SongResponse])
async def get_session_songs(session_id: str):
    with Session(engine) as session:
        chat_session = session.get(ChatSession, session_id)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        links = session.exec(
            select(SessionSongLink).where(SessionSongLink.session_id == chat_session.id)
        ).all()
        
        song_ids = [link.song_id for link in links]
        if not song_ids:
            return []
        
        songs = session.exec(select(Song).where(Song.id.in_(song_ids))).all()
        return [
            SongResponse(
                id=str(song.id),
                title=song.title,
                audio_url=song.audio_url,
                video_url=song.video_url,
                image_url=song.image_url,
                created_at=song.created_at.isoformat(),
                source_url=song.source_url,
                play_count=song.play_count,
                favorite_count=song.favorite_count,
                sound_prompt=song.sound_prompt,
                phase_transition_logic=song.phase_transition_logic,
                raw_data=song.raw_data,
            )
            for song in songs
        ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8005)
