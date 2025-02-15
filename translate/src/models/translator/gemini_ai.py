import google.generativeai as genai
import json

from ...types import (
    AIModelName,
    SubtitleRecord,
    TranscriptQuery,
    TranslatedTranscriptRecord,
)
from ...api.transcribe import get_transcription

from .base_model import AIModel
import time


class GeminiTranslator(AIModel):

    def __init__(self, ai_model: AIModelName):
        super().__init__(ai_model)
        self.model = genai.GenerativeModel(
            ai_model.value,
            # generation_config=genai.GenerationConfig(max_output_tokens=8192),
        )

    def _translate_sentences(
        self, sentences: list[SubtitleRecord]
    ) -> list[SubtitleRecord]:

        hindi_sentences = [sentence.text for sentence in sentences]

        prompt = (
            """
            You are given a stringified array of sentences from a Hindi transcript, mixed with some quotations in Sanskrit.
            Translate the text from Hindi to English, ignoring any quotations in Sanskrit, and return the modified array.

            Use this as input:
            sentences = """
            + str(hindi_sentences)
            + """
            """
        )
        response = self.model.generate_content(
            contents=prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json", response_schema=list[str]
            ),
        )
        translated_texts = json.loads(response.text)
        result = [
            SubtitleRecord(
                **sentence.model_dump(include={"start", "end"}),
                text=translated_text,
                length=len(translated_text),
            )
            for sentence, translated_text in zip(sentences, translated_texts)
        ]

        return result

    def _translate_transcript(self, transcript: str) -> str:

        prompt = (
            """
            Translate the given Hindi transcript into English.
            Return only the translated transcript in the response.

            Use this as input:
            hindi_transcript = """
            + transcript
            + """
            """
        )
        result = self.model.generate_content(prompt)

        return result.text

    async def translate_v2(
        self,
        transcript_id: str,
        split_sentences_at: int | None,
        glossary: str | None = None,
    ) -> TranslatedTranscriptRecord:

        transcript_query = TranscriptQuery(
            transcript_id=transcript_id,
            include_sentences=True,
            include_transcript=True,
            include_srt=False,
        )
        transcript_record = await get_transcription(transcript_query)

        if not transcript_record.sentences:
            raise ValueError(
                "Transcript does not contain sentence information. Please use a different model."
            )
        if not transcript_record.transcript:
            raise ValueError("Transcript not found. Please use a different model.")

        with open("./data/hindi_sentences.json", "w", encoding="utf-8") as file:
            sentences_json = [
                json.loads(sentence.model_dump_json())
                for sentence in transcript_record.sentences
            ]

            json.dump(sentences_json, file, ensure_ascii=False, indent=4)

        hindi_sentences = [sentence.text for sentence in transcript_record.sentences]

        start_time = time.time()

        prompt = (
            """
            Read over the given Hindi transcript and create an English translation that sounds natural and flowing to native English speakers.
            Return only the translated transcript in the response.

            Use this as input:
            hindi_transcript = """
            + transcript_record.transcript
            + """
            """
        )
        translated_transcript = self.model.generate_content(prompt).text
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"Translation execution time: {execution_time:.2f} seconds")

        with open("./data/translated_transcript.txt", "w") as file:
            file.write(translated_transcript)

        start_time = time.time()

        prompt = (
            """
            You are given an array of sentences from a Hindi transcript, 
            an English translation of that transcript, 
            and a glossary containing custom translations for specific Hindi words.

            Read over the English transcript to get an idea of how the sentences should be translated.

            Consulting the English transcript and the glossary, translate each Hindi sentence into contemporary English.

            Return only the translated sentences as an array in the response.

            Use the following as input:
            
            translated_transcript = """
            + translated_transcript
            + """ 

            hindi_sentences = """
            + str(hindi_sentences)
            + """

            glossary = """
            + (glossary or '""')
            + """

            """
        )
        translated_texts = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json", response_schema=list[str]
            ),
        ).text
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"Sentence translation execution time: {execution_time:.2f} seconds")

        with open("./data/translated_sentences.json", "w") as file:
            file.write(translated_texts)

        translated_texts_json = json.loads(translated_texts)
        translated_sentences = [
            SubtitleRecord(
                **sentence.model_dump(include={"start", "end"}),
                text=translated_text,
                length=len(translated_text),
            )
            for sentence, translated_text in zip(
                transcript_record.sentences, translated_texts_json
            )
        ]
        split_sentences = self._split_long_sentences(
            sentences=translated_sentences,
            max_length=split_sentences_at or self.DEFAULT_SPLIT_LENGTH,
        )
        srt = self._generate_srt(split_sentences)
        translated_transcript_record = TranslatedTranscriptRecord(
            transcript=translated_transcript,
            sentences=split_sentences,
            srt=srt,
            ai_model=AIModelName.GEMINI,
        )

        return translated_transcript_record
