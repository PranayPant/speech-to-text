from openai import AsyncOpenAI
import logging
import time
import json
from aiologger import Logger

from .transcribe import get_transcription
from ..helpers.srt import generate_srt

client = AsyncOpenAI()
logger = Logger.with_default_handlers(level=logging.INFO)

async def translate_sentences(transcript_id: str, ai_model: str):
  start_time = time.time()
  try:
    await logger.info(f"Translating using model {ai_model}... {transcript_id}")

    transcription = await get_transcription(
      transcript_id=transcript_id,
      include_transcript=False,
      include_sentences=True,
      include_srt=False
    )

    sentences = transcription['sentences']
    stringified_sentences = str(sentences)
    await logger.info(f"Translating sentences...")  

    translation_response = await client.chat.completions.create(
      model=ai_model,
      messages=[
        {
          "role": "developer",
          "content": "Given an array that represents a timestamped Hindi transcript, return a modified array with the text translated to English. Return the modified array as json object under the field result.",
        },
        {"role": "user", "content": stringified_sentences},
      ],
      response_format={"type": "json_object"}
    )

    translated_sentences_str = translation_response.choices[0].message.content.strip()

    await logger.info(f"Translated sentences: {translated_sentences_str}")

    translated_sentences = json.loads(translated_sentences_str).get('result')

    return {'transcript_id': transcript_id, 'sentences': translated_sentences}
  except Exception as error:
    await logger.error(f"Error translating transcript: {error}")
    raise Exception(f"Error translating transcript: {error}")
  finally:
    end_time = time.time()
    await logger.info(f"translate_sentences took {end_time - start_time:.2f} seconds")

async def translate_transcript(transcript_id: str, ai_model: str):
  start_time = time.time()
  try:
    await logger.info(f"Translating transcript... {transcript_id}")
    transcription = await get_transcription(
      transcript_id=transcript_id,
      include_transcript=True,
      include_sentences=False,
      include_srt=False,
    )
    transcript = transcription['transcript']
    
    translation_response = await client.chat.completions.create(
      model=ai_model,
      messages=[
        {
          "role": "developer",
          "content": "Translate the given Hindi transcript into English, skipping any quotations in Sanskrit.",
        },
        {"role": "user", "content": transcript},
      ],
    )

    translated_transcript = translation_response.choices[0].message.content.strip()
    return {'transcript_id': transcript_id, 'transcript': json.loads(translated_transcript)}
  except Exception as error:
    await logger.error(f"Error translating transcript: {error}")
    raise Exception(f"Error translating transcript: {error}")
  finally:
    end_time = time.time()
    await logger.info(f"translate_transcript took {end_time - start_time:.2f} seconds")

async def get_translation(include_srt: bool, 
                          include_transcript: bool, 
                          include_sentences: bool, 
                          transcript_id: str, 
                          ai_model: str):
  start_time = time.time()
  try:
    import asyncio
    
    tasks = []
    transcript_response_index = 0
    sentences_response_index = 0

    if(include_transcript):
      tasks.append(translate_transcript(transcript_id=transcript_id, ai_model=ai_model))
      sentences_response_index += 1
    if(include_sentences or include_srt):
      tasks.append(translate_sentences(transcript_id=transcript_id, ai_model=ai_model))
    
    results = await asyncio.gather(*tasks)

    transcript_response = results[transcript_response_index] if include_transcript else None
    sentences_response = results[sentences_response_index] if include_sentences or include_srt else None

    await logger.info(f'get_translation: {transcript_response}, {sentences_response}, {sentences_response_index}')

    transcript = transcript_response['transcript'] if transcript_response else None
    sentences = sentences_response['sentences'] if sentences_response else None
    srt = generate_srt(sentences) if sentences and include_srt else None

    return {
      'transcript_id': transcript_id,
      'transcript': transcript if include_transcript else None,
      'sentences': sentences if include_sentences else None,
      'srt': srt if include_srt else None,
    }
  
  except Exception as error:
    await logger.error(f"Error fetching translation: {error}")
    raise Exception(f"Error fetching translation: {error}")
  finally:
    end_time = time.time()
    await logger.info(f"get_translation took {end_time - start_time:.2f} seconds")
