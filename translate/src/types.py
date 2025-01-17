from typing import Literal, Optional
from pydantic import BaseModel
from enum import Enum

class SubtitleRecord(BaseModel):
  start: int
  end: int
  text: str
  length: int

class TranscriptRecord(BaseModel):
  status: Optional[Literal['queued', 'processing', 'completed', 'error']] = None
  transcript: Optional[str] = None
  srt: Optional[str] = None
  sentences: Optional[list[SubtitleRecord]] = None

class AIModelName(Enum):
  GTP_4O = 'gpt-4o'
  GEMINI_2 = 'gemini-2.0-flash-exp'

class TranscriptQuery(BaseModel):
  transcript_id: str
  include_transcript: Optional[bool] = False
  include_srt: Optional[bool] = False
  include_sentences: Optional[bool] = False

class TranslationQuery(TranscriptQuery):
  ai_model: Optional[AIModelName] = None
  split_sentences_at: Optional[int] = None

  def transcript_query(self):
    transcript_query = self.model_dump(exclude={'ai_model'})
    return TranscriptQuery(**transcript_query)
