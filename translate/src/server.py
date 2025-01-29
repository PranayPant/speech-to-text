from fastapi import FastAPI, APIRouter, Query
from fastapi.middleware.cors import CORSMiddleware

from typing import Annotated

from .models.translator.helpers import get_translator
from .models.translator.gemini_ai import GeminiTranslator

from .types import AIModelName, TranscriptRecord, TranslatedTranscriptRecord, TranslationQuery, TranscriptQuery

from .api.transcribe import get_transcription, create_transcript, PostTranscriptRequest
from .api.google_drive import upload_to_google_drive, get_file_info, FileUploadRequest

app = FastAPI()
router = APIRouter(redirect_slashes=False)

@router.post("/transcribe")
async def transcribe(request_body: PostTranscriptRequest):
    """
    Post a new transcript and return the transcript ID.
    """
    transcript_id = await create_transcript(params=request_body)
    return {"transcript_id": transcript_id}

@router.get("/transcript")
async def transcript(query: Annotated[TranscriptQuery, Query()]) -> TranscriptRecord:
    """
    Take a transcript ID and return the transcript, sentences, and SRT file.
    """
    transcript_details = await get_transcription(query)
    return transcript_details

@router.get("/translate")
def translate(query: Annotated[TranslationQuery, Query()]) -> TranslatedTranscriptRecord:
    """
    Take a transcript ID and return the translated transcript, sentences, and SRT file.
    """
    translator = get_translator(ai_model = AIModelName(query.ai_model) if query.ai_model else None)
    translated_transcript = translator.translate(query)
    return translated_transcript

@router.get("/v2/translate")
async def translate_v2(transcript_id: str, split_sentences_at: int | None = None) -> TranslatedTranscriptRecord:
    """
    Take a transcript ID and return the translated transcript, sentences, and SRT file.
    """
    gemini_ai = GeminiTranslator(ai_model=AIModelName.GEMINI)
    translated_transcript = await gemini_ai.translate_v2(transcript_id=transcript_id, split_sentences_at=split_sentences_at)
    return translated_transcript

@router.post("/drive/upload")
async def upload(request_body: FileUploadRequest):
    """
    Create a text file on google drive with given requets body.
    """
    upload_response = upload_to_google_drive(params=request_body)
    return upload_response

@router.get("/drive/info")
async def info(file_id: str):
    """
    Get file info of file with given file_id.
    """
    info_response = get_file_info(file_id=file_id)
    return info_response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
