from fastapi import FastAPI, APIRouter, Response
from fastapi.middleware.cors import CORSMiddleware

from .api.transcribe import get_transcription
from .api.translation import get_translation

app = FastAPI()
router = APIRouter(redirect_slashes=False)


# Add your routes to the router
@router.get("/api/v1/transcribe")
async def transcribe(transcript_id: str, include_transcript: bool = False, include_srt: bool = False, include_sentences: bool = False):
    """
    Take a transcript ID and return the transcript, sentences, and SRT file.
    """
    transcript_details = await get_transcription(transcript_id=transcript_id, include_transcript=include_transcript, include_sentences=include_sentences, include_srt=include_srt)
    return transcript_details

@router.get("/api/v1/translate")
async def translate(transcript_id: str, ai_model: str = None, include_transcript: bool = False, include_srt: bool = False, include_sentences: bool = False):
    """
    Take a transcript ID and return the translated transcript, sentences, and SRT file.
    """
    translation_details = await get_translation(transcript_id=transcript_id, include_transcript=include_transcript, include_sentences=include_sentences, include_srt=include_srt)
    return translation_details

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
