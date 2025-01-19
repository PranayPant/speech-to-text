from .openai import OpenAITranslator
from .gemini_ai import GeminiTranslator
from .base_model import AIModel

from ...types import AIModelName
  
def get_translator(ai_model: AIModelName | None) -> AIModel:
  match ai_model:
    case AIModelName.OPENAI:
      return OpenAITranslator(ai_model=ai_model)
    case AIModelName.GEMINI:
      return GeminiTranslator(ai_model=ai_model)
    case _:
      print(f'No model found, using default model {AIModelName.GEMINI.value}')
      return GeminiTranslator(ai_model=AIModelName.GEMINI)