from abc import ABC, abstractmethod
import asyncio
from typing import Optional
from fastapi import HTTPException

from ...api.transcribe import get_transcription

from ...types import (
    AIModelName,
    TranslatedTranscriptRecord,
    TranslationQuery,
    SubtitleRecord,
)


class AIModel(ABC):

    DEFAULT_SPLIT_LENGTH = 80

    def __init__(self, ai_model: AIModelName):
        self.model_name = ai_model.value

    def translate(self, params: TranslationQuery) -> TranslatedTranscriptRecord:
        transcript_query = params.transcript_query()
        # Need to  translate sentences to generate SRT
        if params.include_srt:
            transcript_query.include_sentences = True
        transcript_record = asyncio.run(get_transcription(transcript_query))

        if transcript_record.status == "error":
            raise HTTPException(
                status_code=500,
                detail="There was an error with the original transcript, translation failed.",
            )
        if transcript_record.status and transcript_record.status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Transcript not available, please try again later.",
            )

        split_sentences = None
        if (
            params.include_sentences or params.include_srt
        ) and transcript_record.sentences:
            translated_sentences = self._translate_sentences(
                transcript_record.sentences
            )
            split_sentences = self._split_long_sentences(
                translated_sentences,
                max_length=params.split_sentences_at or AIModel.DEFAULT_SPLIT_LENGTH,
            )

        translated_record = TranslatedTranscriptRecord(
            status=transcript_record.status, ai_model=AIModelName(self.model_name)
        )
        if params.include_sentences:
            translated_record.sentences = split_sentences
        if params.include_transcript and transcript_record.transcript:
            translated_transcript = self._translate_transcript(
                transcript_record.transcript
            )
            translated_record.transcript = translated_transcript
        if params.include_srt:
            translated_record.srt = self._generate_srt(split_sentences or [])

        return translated_record

    async def translate_v2(
        self, transcript_id: str, split_sentences_at: int | None, glossary: str | None
    ) -> TranslatedTranscriptRecord:
        raise NotImplementedError

    @abstractmethod
    def _translate_sentences(
        self, sentences: list[SubtitleRecord]
    ) -> list[SubtitleRecord]:
        raise NotImplementedError

    @abstractmethod
    def _translate_transcript(self, transcript: str) -> str:
        raise NotImplementedError

    def _generate_srt(self, sentences: list[SubtitleRecord]) -> str:
        return "\n".join(
            f"{index + 1}\n{self._format_srt_timestamp(start)} --> {self._format_srt_timestamp(end)}\n{text}\n"
            for index, (start, end, text) in enumerate(
                (sentence.start, sentence.end, sentence.text) for sentence in sentences
            )
        )

    def _format_srt_timestamp(self, ms: int) -> str:
        hours = str(ms // 3600000).zfill(2)
        minutes = str((ms % 3600000) // 60000).zfill(2)
        seconds = str((ms % 60000) // 1000).zfill(2)
        milliseconds = str(ms % 1000).zfill(3)
        return f"{hours}:{minutes}:{seconds},{milliseconds}"

    def _split_long_sentences(
        self, sentences: list[SubtitleRecord], max_length: Optional[int]
    ) -> list[SubtitleRecord]:
        if not max_length:
            for sentence in sentences:
                sentence.length = len(sentence.text)
            return sentences

        new_sentences: list[SubtitleRecord] = []

        for sentence in sentences:
            text, start, end = sentence.text, sentence.start, sentence.end

            # If the sentence is within the max length, keep it as is
            if len(text) <= max_length:
                new_sentences.append(sentence)
            else:
                # Split sentence into smaller parts
                words = text.split(" ")
                parts: list[str] = []
                current_part = ""

                for word in words:
                    if len(current_part) + len(word) + 1 <= max_length:
                        current_part += (" " if current_part else "") + word
                    else:
                        parts.append(current_part)
                        current_part = word

                if current_part:
                    parts.append(current_part)

                # Calculate time for each part
                total_time = end - start
                time_per_char = total_time / len(text)
                char_counts = [len(part) for part in parts]
                time_splits = [round(count * time_per_char) for count in char_counts]

                part_start = start
                for part, time_split, char_count in zip(
                    parts, time_splits, char_counts
                ):
                    part_end = part_start + time_split
                    new_record = SubtitleRecord(
                        text=part, start=part_start, end=part_end, length=char_count
                    )
                    new_sentences.append(new_record)
                    part_start = part_end

        return new_sentences
