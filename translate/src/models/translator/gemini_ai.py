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
            generation_config=genai.GenerationConfig(max_output_tokens=8192),
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
        self, transcript_id: str, split_sentences_at: int | None
    ) -> TranslatedTranscriptRecord:

        transcript_query = TranscriptQuery(
            transcript_id=transcript_id,
            include_sentences=True,
            include_transcript=True,
            include_srt=False,
        )
        transcript_record = await get_transcription(transcript_query)

        chat_history = [
            {
                "parts": "You use single quotes to denote a quotation instead of a backslash followed by double quotes.",
                "role": "user",
            },
        ]

        ai_chat = self.model.start_chat(history=chat_history)  # type: ignore

        start_time = time.time()
        translated_transcript = ai_chat.send_message(
            f"Read over the Hindi transcript and create an English translation that sounds natural and flowing to native English speakers, outputting only the response text: {transcript_record.transcript}"
        )
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"Translation execution time: {execution_time:.2f} seconds")

        with open("./data/translated_transcript.txt", "w") as file:
            file.write(translated_transcript.text)

        # polished_transcript = ai_chat.send_message(
        #     f"Now polish the translated transcript so it sounds more natural to English speakers, outputting only the response text."
        # )

        translated_sentences = ai_chat.send_message(
            "You are given an array of sentences from the Hindi transcript that contain text, start, and end times. Using the sentences from the previously translated transcript, figure out the best way to translate each hindi sentence into English. Output only the response as a json array in the form [ {start_time, end_time, original_hindi_sentence, english_translation} ]." + f"Use the following as input: {transcript_record.sentences}"
        )
        translated_sentences_stripped = translated_sentences.text.strip(
            "```json\n"
        ).strip("\n```")

        with open("./data/translated_sentences.json", "w") as file:
            file.write(translated_sentences_stripped)

        sentences_json = json.loads(translated_sentences_stripped)
        translated_sentences = [
            SubtitleRecord(
                text=sentence[0],
                start=sentence[1],
                end=sentence[2],
                length=len(sentence[0]),
            )
            for sentence in sentences_json
        ]
        split_sentences = self._split_long_sentences(
            sentences=translated_sentences,
            max_length=split_sentences_at or self.DEFAULT_SPLIT_LENGTH,
        )
        srt = self._generate_srt(split_sentences)
        translated_transcript_record = TranslatedTranscriptRecord(
            transcript=translated_transcript.text,
            # polished_transcript=polished_transcript.text,
            sentences=split_sentences,
            srt=srt,
            ai_model=AIModelName.GEMINI,
        )

        return translated_transcript_record
