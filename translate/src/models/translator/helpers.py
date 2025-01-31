import asyncio

from .openai import OpenAITranslator
from .gemini_ai import GeminiTranslator
from .base_model import AIModel

from ...types import AIModelName, CreateTranslationRequest, FileUpdateRequest
from ...api.google_drive import update_file_google_drive, upload_to_google_drive


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

    translator = get_translator(
        ai_model=AIModelName(params.ai_model) if params.ai_model else AIModelName.GEMINI
    )

    loop = asyncio.get_running_loop()
    translated_transcript = await loop.run_in_executor(
        None,
        lambda: translator.translate_v2(
            transcript_id=transcript_id, split_sentences_at=split_sentences_at
        ),
    )
    # translated_transcript = await translator.translate_v2(
    #     transcript_id=transcript_id, split_sentences_at=split_sentences_at
    # )
    srt = translated_transcript.srt
    if srt_file_id and srt:
        update_file_google_drive(
            FileUpdateRequest(file_name=srt_file_name, text=srt, file_id=srt_file_id)
        )
