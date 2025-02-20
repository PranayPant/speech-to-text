import asyncio

from .openai import OpenAITranslator
from .gemini_ai import GeminiTranslator
from .base_model import AIModel

from ...types import AIModelName, CreateTranslationRequest, FileUpdateRequest
from ...api.google_drive import update_file_google_drive, get_file_content
from ...utils import run_in_thread


def get_translator(ai_model: AIModelName | None) -> AIModel:
    match ai_model:
        case AIModelName.OPENAI:
            return OpenAITranslator(ai_model=ai_model)
        case AIModelName.GEMINI:
            return GeminiTranslator(ai_model=ai_model)
        case _:
            print(f"No model found, using default model {AIModelName.GEMINI.value}")
            return GeminiTranslator(ai_model=AIModelName.GEMINI)


async def create_translation_task(params: CreateTranslationRequest) -> None:

    transcript_id = params.transcript_id
    srt_file_name = params.srt_file_name
    srt_file_id = params.srt_file_id
    split_sentences_at = params.split_sentences_at
    glossary_file_id = params.glossary_file_id

    translator = get_translator(
        ai_model=AIModelName(params.ai_model) if params.ai_model else AIModelName.GEMINI
    )

    glossary_text = None
    if glossary_file_id:
        glossary_text = get_file_content(file_id=glossary_file_id)

    translated_transcript = await translator.translate_v2(
        transcript_id=transcript_id,
        split_sentences_at=split_sentences_at,
        glossary=glossary_text,
    )

    srt = translated_transcript.srt
    if srt_file_id and srt:
        update_file_google_drive(
            FileUpdateRequest(file_name=srt_file_name, text=srt, file_id=srt_file_id)
        )


@run_in_thread
def create_translation_task_sync(params: CreateTranslationRequest) -> None:
    asyncio.run(create_translation_task(params))
