from openai import OpenAI
import json

from ...types import AIModelName, SubtitleRecord

from .base_model import AIModel

class OpenAITranslator(AIModel):

  def __init__(self, ai_model: AIModelName):
    super().__init__(ai_model)
    self.model = OpenAI()

  def _translate_sentences(self, sentences: list[SubtitleRecord]) -> list[SubtitleRecord]:
    
    hindi_sentences = [sentence.model_dump_json() for sentence in sentences]

    translation_response = self.model.chat.completions.create(
      model=self.model_name,
      messages=[
        {
          "role": "developer",
          "content": "Given an array that represents a timestamped Hindi transcript, return a modified array with the text translated to English. Return the modified array as json object under the field result.",
        },
        {"role": "user", "content": str(hindi_sentences)},
      ],
      response_format={"type": "json_object"}
    )

    translated_sentences_str = (translation_response.choices[0].message.content or "").strip()

    translated_sentences = json.loads(translated_sentences_str).get('result')

    result = [SubtitleRecord(**sentence,length=len(sentence['text'])) for sentence in translated_sentences]

    return result
    
  def _translate_transcript(self, transcript: str) -> str:

    translation_response = self.model.chat.completions.create(
      model=self.model_name,
      messages=[
        {
          "role": "developer",
          "content": "Translate the given Hindi transcript into English, skipping any quotations in Sanskrit.",
        },
        {"role": "user", "content": transcript},
      ],
    )

    translated_transcript = (translation_response.choices[0].message.content or "").strip()

    return translated_transcript