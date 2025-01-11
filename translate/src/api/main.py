import asyncio
import aiohttp
import os

async def fetch_assembly_ai_transcript(transcript_id, resource=""):
  url = f"https://api.assemblyai.com/v2/transcript/{transcript_id}{resource}"
  headers = {
    "authorization": os.getenv("ASSEMBLYAI_API_KEY"),
  }
  async with aiohttp.ClientSession() as session:
    async with session.get(url, headers=headers) as response:
      return await response.json()

async def get_transcription(transcript_id, include_transcript, include_sentences, include_srt):
  tasks = []
  if include_transcript:
    tasks.append(fetch_assembly_ai_transcript(transcript_id))
  if include_sentences:
    tasks.append(fetch_assembly_ai_transcript(transcript_id, resource="/sentences"))
  if include_srt:
    tasks.append(fetch_assembly_ai_transcript(transcript_id, resource="/srt"))

  results = await asyncio.gather(*tasks)
  transcript_response = results[0] if include_transcript else None
  sentences_response = results[1] if include_sentences else None
  srt_response = results[2] if include_srt else None

  if transcript_response and transcript_response.get("status") == "error":
    raise Exception("Transcription failed")

  return {
    "status": transcript_response.get("status") if transcript_response else None,
    "transcript": transcript_response.get("text") if transcript_response else None,
    "sentences": [
      {"text": sentence["text"], "start": sentence["start"], "end": sentence["end"]}
      for sentence in sentences_response.get("sentences", [])
    ] if sentences_response else None,
    "srt": srt_response if srt_response else None,
  }