from abc import ABC, abstractmethod

from ...types.main import TranscriptRecord

class AIModel(ABC):
  @abstractmethod
  def translate(self, include_sentences: bool, include_transcript: bool, include_srt: bool) -> TranscriptRecord:
    pass