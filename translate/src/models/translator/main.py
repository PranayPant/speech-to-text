from .gemini_ai import GeminiAI
from .base_model import AIModel

from ...types import AIModelName
  
def get_translator(ai_model: AIModelName | None) -> AIModel:
  match ai_model:
    case 'gpt-4o':
      return AIModel(model_name='gpt-4o')
    case 'gemini-2.0-flash-exp':
      return GeminiAI()
    case _:
      print(f'No model found, using default model {AIModelName.GEMINI_2.value}')
      return GeminiAI()