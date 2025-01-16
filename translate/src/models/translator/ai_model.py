from abc import ABC, abstractmethod

from translate.src.models.translator.gemini_ai.main import GeminiAI

from ...types.main import TranslationRecord, AIModelName

class AIModel(ABC):
  @abstractmethod
  def translate(self, include_sentences: bool, include_transcript: bool, include_srt: bool) -> TranslationRecord:
    pass
  
def get_translator(ai_model: AIModelName | None) -> AIModel:
  match ai_model:
    case 'gpt-4o':
      return AIModel(model_name='gpt-4o')
    case 'gemini-2.0-flash-exp':
      return AIModel(model_name='gemini-2.0-flash-exp')
    case _:
      print('No model found, using default model {AIModelName.GEMINI_2}')
      return GeminiAI()