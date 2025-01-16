from typing import Literal
from pydantic import BaseModel

class SubtitleRecord(BaseModel):
  start: int
  end: int
  text: str

class TranslationRecord(BaseModel):
  status: Literal['queued', 'processing', 'completed', 'error'] | None 
  transcript: str | None
  srt: str | None
  sentences: list[SubtitleRecord] | None