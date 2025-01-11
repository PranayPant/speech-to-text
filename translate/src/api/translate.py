import openai
import os
from transcribe import get_transcription
from translate.src.helpers.srt import generate_srt

openai.api_key = os.getenv("OPENAI_API_KEY")

async def translate_sentences(params):
  try:
    transcript_id, id, model = params['transcriptId'], params['id'], params['model']
    print("Translating sentences...", transcript_id)

    transcription = await get_transcription({
      'transcriptId': transcript_id,
      'includeTranscript': False,
      'includeSentences': True,
      'includeSRT': False,
    })
    sentences = transcription['sentences']
    
    translation_response = await openai.ChatCompletion.create(
      model=model,
      messages=[
        {
          "role": "system",
          "content": (
            "You are given a stringified JSON array that represents a timestamped Hindi transcript "
            "that contains quotations in Sanskrit. Translate the text into English, skipping any quotations "
            "in Sanskrit, and return the modified array. Only include the array in the response so that it "
            "can be easily parsed by the client."
          ),
        },
        {"role": "user", "content": str(sentences)},
      ],
    )

    translated_sentences = translation_response.choices[0].message['content'].strip()
    return {'transcriptId': transcript_id, 'sentences': eval(translated_sentences), 'id': id}
  except Exception as error:
    print("Error translating transcript:", error)
    raise Exception(f"Error translating transcript: {error}")

async def translate_transcript(params):
  try:
    transcript_id, id, model = params['transcriptId'], params['id'], params['model']
    print("Translating transcript...", transcript_id)

    transcription = await get_transcription({
      'transcriptId': transcript_id,
      'includeTranscript': True,
      'includeSentences': False,
      'includeSRT': False,
      'model': model,
    })
    transcript = transcription['transcript']
    
    translation_response = await openai.ChatCompletion.create(
      model=model,
      messages=[
        {
          "role": "system",
          "content": "Translate the given Hindi transcript into English, skipping any quotations in Sanskrit.",
        },
        {"role": "user", "content": transcript},
      ],
    )

    translated_transcript = translation_response.choices[0].message['content'].trim()
    return {'transcriptId': transcript_id, 'transcript': translated_transcript, 'id': id}
  except Exception as error:
    print("Error translating transcript:", error)
    raise Exception(f"Error translating transcript: {error}")

async def get_translation(include_srt, include_transcript, include_sentences, transcript_id, model="gpt-4o"):
  try:
    import asyncio
    transcript_result, sentences_result = await asyncio.gather(
      include_transcript and translate_transcript({'transcriptId': transcript_id, 'model': model}),
      (include_sentences or include_srt) and translate_sentences({'transcriptId': transcript_id, 'model': model}),
    )

    transcript = transcript_result.get('transcript') if transcript_result else None
    sentences = sentences_result.get('sentences') if sentences_result else None
    srt = generate_srt(sentences) if sentences else None
    return {
      'transcriptId': transcript_id,
      'transcript': transcript if include_transcript else None,
      'sentences': sentences if include_sentences else None,
      'srt': srt if include_srt else None,
    }
  except Exception as error:
    print("Error fetching translation:", error)
    raise Exception(f"Error fetching translation: {error}")
