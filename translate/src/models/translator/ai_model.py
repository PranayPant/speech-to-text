from pydantic import BaseModel
from typing import Literal
from abc import ABC, abstractmethod

from ...types.main import TranslationRecord 

class AIModel(ABC):
  @abstractmethod
  def translate(self, include_sentences: bool, include_transcript: bool, include_srt: bool) -> TranslationRecord:
    pass
  
def get_translator(ai_model: Literal['gpt-4o', 'gemini-2.0-flash-exp']):
  match ai_model:
    case 'gpt-4o':
      return AIModel(model_name='gpt-4o')
    case 'gemini-2.0-flash-exp':
      return AIModel(model_name='gemini-2.0-flash-exp')
    case _:
      raise ValueError(f"Unsupported model: {ai_model}")