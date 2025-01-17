from abc import ABC, abstractmethod

from ...types import TranscriptRecord, TranslationQuery

class AIModel(ABC):
  @abstractmethod
  def translate(self, params: TranslationQuery) -> TranscriptRecord:
    pass