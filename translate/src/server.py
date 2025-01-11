from fastapi import FastAPI, APIRouter, Response
from fastapi.middleware.cors import CORSMiddleware

from api.main import get_transcription

app = FastAPI()
router = APIRouter(redirect_slashes=False)


# Add your routes to the router
@router.get("/api/v1/translate")
def write_subs(ai_model: str, transcript_id: str, include_transcript: bool, include_srt: bool, include_sentences: bool):
    """
    Take a transcript ID and return the transcript, sentences, and SRT file.
    """
    transcript_details = get_transcription(transcript_id, include_transcript, include_sentences, include_srt)
    return Response(content=transcript_details, media_type="application/json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
