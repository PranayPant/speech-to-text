import google.generativeai as genai
import json

from ...types import AIModelName, SubtitleRecord

from .base_model import AIModel

class GeminiTranslator(AIModel):

    model_name = AIModelName.GEMINI.value
    model = genai.GenerativeModel(model_name)

    def translate_sentences(self, sentences: list[SubtitleRecord]) -> list[SubtitleRecord]:
        
        hindi_sentences = [sentence.text for sentence in sentences]

        prompt = """
            You are given a stringified array of sentences from a Hindi transcript, mixed with some quotations in Sanskrit.
            Translate the text from Hindi to English, ignoring any quotations in Sanskrit, and return the modified array.

            Use this as input:
            sentences = """ + str(hindi_sentences) + """
            """
        response = GeminiTranslator.model.generate_content(
            contents=prompt, 
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json", 
                response_schema=list[str]
            )
        )
        translated_texts = json.loads(response.text)
        result = [SubtitleRecord(
            **sentence.model_dump(include={'start', 'end'}), 
            text=translated_text, 
            length=len(translated_text)) for sentence, translated_text in zip(sentences, translated_texts)
        ]

        return result
    
    def translate_transcript(self, transcript: str) -> str:

        prompt = """
            You are given a Hindi transcript.
            Translate the Hindi transcript to English, ignoring any Sanskrit quotations.
            Return only the translated transcript in the response.

            Use this as input:
            sentences = """ + transcript + """
            """
        result = GeminiTranslator.model.generate_content(prompt)

        return result.text
