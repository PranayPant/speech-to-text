from .openai import OpenAITranslator
from .gemini_ai import GeminiTranslator
from .base_model import AIModel

from ...types import AIModelName
  
def get_translator(ai_model: AIModelName | None) -> AIModel:
  match ai_model:
    case AIModelName.OPENAI:
      return OpenAITranslator()
    case 'gemini-2.0-flash-exp':
      return GeminiTranslator()
    case _:
      print(f'No model found, using default model {AIModelName.GEMINI.value}')
      return GeminiTranslator()