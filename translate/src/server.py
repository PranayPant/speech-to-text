from fastapi import FastAPI, APIRouter, Response
from fastapi.middleware.cors import CORSMiddleware

from api.main import get_transcription

app = FastAPI()
router = APIRouter(redirect_slashes=False)


# Add your routes to the router
@router.get("/api/v1/translate")
async def translate(transcript_id: str, ai_model: str = None, include_transcript: bool = False, include_srt: bool = False, include_sentences: bool = False):
    """
    Take a transcript ID and return the transcript, sentences, and SRT file.
    """
    transcript_details = await get_transcription(transcript_id, include_transcript, include_sentences, include_srt)
    return transcript_details

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
