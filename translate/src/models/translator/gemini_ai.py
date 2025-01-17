import google.generativeai as genai
import json

from ...types import AIModelName, SubtitleRecord, TranscriptRecord, TranslationQuery
from ...api.transcribe import get_transcription

from .base_model import AIModel

class GeminiAI(AIModel):
    def __init__(self):
        self.name = AIModelName.GEMINI_2.value

    async def translate(self, params: TranslationQuery) -> TranscriptRecord:
        transcript_record = await get_transcription(transcript_id=params.transcript_id, include_sentences=True, include_transcript=False, include_srt=False)
        sentences = transcript_record.sentences
        translated_sentences = self.translate_sentences(sentences)
        transcript_record.sentences = translated_sentences
        return transcript_record

    def translate_sentences(self, sentences: list[SubtitleRecord]) -> list[SubtitleRecord]:

        model = genai.GenerativeModel(self.name)
        prompt = """
            You are given a timestamped Hindi transcript in the form of an array representing sentences.
            Translate the Hindi transcript to English, ignoring any Sanskrit quotations.

            Use this as input:
            sentences = """ + str(sentences) + """
            """
        result = model.generate_content(
            prompt, 
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json", 
                response_schema=list[SubtitleRecord]
            )
        )
        result = json.loads(result.text)

        return result
