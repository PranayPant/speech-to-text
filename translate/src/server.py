from fastapi import FastAPI, APIRouter, Query
from fastapi.middleware.cors import CORSMiddleware

from typing import Annotated

from .models.translator.main import get_translator

from .types import AIModelName, TranscriptRecord, TranslationQuery, TranscriptQuery

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
async def transcript(transcript_id: str, include_transcript: bool = False, include_srt: bool = False, include_sentences: bool = False):
    """
    Take a transcript ID and return the transcript, sentences, and SRT file.
    """
    transcript_details = await get_transcription(transcript_id=transcript_id, include_transcript=include_transcript, include_sentences=include_sentences, include_srt=include_srt)
    return transcript_details

@router.get("/translate")
def translate(query: Annotated[TranslationQuery, Query()]) -> TranscriptRecord:
    """
    Take a transcript ID and return the translated transcript, sentences, and SRT file.
    """
    # translation_details = await get_translation(transcript_id=transcript_id, include_transcript=include_transcript, include_sentences=include_sentences, include_srt=include_srt, ai_model=ai_model)
    # return translation_details
    translator = get_translator(ai_model = query.ai_model)
    transcript_record = translator.translate(query)
    return transcript_record

@router.post("/drive/upload")
async def upload(request_body: FileUploadRequest):
    """
    Create a text file on google drive with given requets body.
    """
    upload_response = upload_to_google_drive(params=request_body)
    return upload_response

@router.get("/drive/info")
async def upload(file_id: str):
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
