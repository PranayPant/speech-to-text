from fastapi import FastAPI, APIRouter, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware

from typing import Annotated

from .models.translator.helpers import get_translator
from .models.translator.gemini_ai import GeminiTranslator

from .types import (
    AIModelName,
    CreateTranslationResponse,
    TranscriptRecord,
    TranslatedTranscriptRecord,
    TranslationQuery,
    TranscriptQuery,
    FileUploadRequest,
    FileUpdateRequest,
)

from .api.transcribe import get_transcription, create_transcript, PostTranscriptRequest
from .api.google_drive import (
    upload_to_google_drive,
    get_file_info,
    update_file_google_drive,
)

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
def translate(
    query: Annotated[TranslationQuery, Query()]
) -> TranslatedTranscriptRecord:
    """
    Take a transcript ID and return the translated transcript, sentences, and SRT file.
    """
    translator = get_translator(
        ai_model=AIModelName(query.ai_model) if query.ai_model else None
    )
    translated_transcript = translator.translate(query)
    return translated_transcript


@router.post("/v2/translate")
def create_translation(
    transcript_id: str,
    background_tasks: BackgroundTasks,
    split_sentences_at: int | None = None,
) -> CreateTranslationResponse:
    """
    Initiate a translation job for a transcript and create a temporary SRT file resource on Goggle Drive.

    Params: transcript_id: AssemblyAI transcript id
            split_sentences_at: how long the translated sentences should be.
    Returns: File ID of the SRT file.
    """

    file_upload_request = FileUploadRequest(
        file_name="temp.txt",
        text="",
        properties={"transcript_id": transcript_id},
    )
    upload_response = upload_to_google_drive(params=file_upload_request)
    srt_file_id = upload_response["file_id"]
    create_translation_response = CreateTranslationResponse(
        srt_file_id=srt_file_id, status="processing"
    )

    gemini_ai = GeminiTranslator(ai_model=AIModelName.GEMINI)
    background_tasks.add_task(gemini_ai.translate_v2, transcript_id, split_sentences_at)

    return create_translation_response


@router.get("/v2/translate")
async def translate_v2(
    transcript_id: str, split_sentences_at: int | None = None
) -> TranslatedTranscriptRecord:
    """
    Take a transcript ID and return the translated transcript, sentences, and SRT file.
    """
    gemini_ai = GeminiTranslator(ai_model=AIModelName.GEMINI)
    translated_transcript = await gemini_ai.translate_v2(
        transcript_id=transcript_id, split_sentences_at=split_sentences_at
    )
    return translated_transcript


@router.post("/drive/upload")
def upload(request_body: FileUploadRequest):
    """
    Create a text file on google drive with given requets body.
    """
    upload_response = upload_to_google_drive(params=request_body)
    return upload_response


@router.patch("/drive/update")
def update(request_body: FileUpdateRequest):
    """
    Create a text file on google drive with given requets body.
    """
    upload_response = update_file_google_drive(params=request_body)
    return upload_response


@router.get("/drive/info")
def info(file_id: str):
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
