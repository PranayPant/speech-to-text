import google.generativeai as genai

from .base_model import AIModel
from ...types.main import AIModelName, SubtitleRecord, TranscriptRecord
from ...api.transcribe import get_transcription


class GeminiAI(AIModel):
    def __init__(self):
        self.name = AIModelName.GEMINI_2

    async def translate(self, transcript_id: str, include_sentences: bool, include_transcript: bool, include_srt: bool) -> TranscriptRecord:
        transcript_record = await get_transcription(transcript_id=transcript_id, include_sentences=True, include_transcript=False, include_srt=False)
        sentences = transcript_record.sentences
        translated_sentences = self.translate_sentences(sentences)
        transcript_record.sentences = translated_sentences
        return transcript_record

    def translate_sentences(self, sentences: list[SubtitleRecord]) -> list[SubtitleRecord]:

        model = genai.GenerativeModel(self.name)
        prompt = """
            You are given a timestamped Hindi transcript in the form of an array.
            Translate the Hindi transcript to English, ignoring any Sanskrit quotations.

            Use this JSON schema:

            SubtitleRecord = {'text': str, 'start': int, 'end': int}
            Return: list[SubtitleRecord]
            """
        result = model.generate_content(prompt)
        print(result)
        return result
