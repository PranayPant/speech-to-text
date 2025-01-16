from typing import Literal
from pydantic import BaseModel
from enum import Enum



class SubtitleRecord(BaseModel):
  start: int
  end: int
  text: str

class TranscriptRecord(BaseModel):
  status: Literal['queued', 'processing', 'completed', 'error'] | None 
  transcript: str | None
  srt: str | None
  sentences: list[SubtitleRecord] | None

class AIModelName(Enum):
  GTP_4O = 'gpt-4o'
  GEMINI_2 = 'gemini-2.0-flash-exp'
