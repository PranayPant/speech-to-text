"""
This module provides functions to fetch and process transcriptions from AssemblyAI.
"""

import os
import asyncio
import aiohttp
from pydantic import BaseModel

class PostTranscriptRequest(BaseModel):
    """
    The parameters for the transcription request.
    """
    audio_url: str


async def create_transcript(params: PostTranscriptRequest) -> str:
    """
    Posts the transcription request to AssemblyAI.

    Args:
        params (PostTranscriptRequest): The parameters for the transcription request.

    Returns:
        str: The ID of the transcription.
    """
    url = "https://api.assemblyai.com/v2/transcript"
    headers = {
        "authorization": os.getenv("ASSEMBLYAI_API_KEY"),
        "content-type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json={"language_code": "hi", **vars(params), }, headers=headers) as response:
            if response.status != 200:
                error_message = await response.text()
                raise Exception(f"Error transcribing audio: {error_message}")
            result = await response.json()
    return result["id"]

async def fetch_assembly_ai_transcript(transcript_id, resource=""):
    """
    Fetches the transcript from AssemblyAI.

    Args:
        transcript_id (str): The ID of the transcript.
        resource (str): The resource to fetch (default is "").

    Returns:
        dict: The JSON response from the API.
    """
    url = f"https://api.assemblyai.com/v2/transcript/{transcript_id}{resource}"
    headers = {
        "authorization": os.getenv("ASSEMBLYAI_API_KEY"),
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if resource == "/srt":
                result = await response.text()
            else:
                result = await response.json()
    return result

async def get_transcription(transcript_id, include_transcript, include_sentences, include_srt):
    """
    Gets the transcription, sentences, and SRT from AssemblyAI.

    Args:
        transcript_id (str): The ID of the transcript.
        include_transcript (bool): Whether to include the transcript.
        include_sentences (bool): Whether to include the sentences.
        include_srt (bool): Whether to include the SRT.

    Returns:
        dict: A dictionary containing the status, transcript, sentences, and SRT.
    """
    tasks = []
    srt_response_index = 0
    transcript_response_index = 0
    sentences_response_index = 0

    if include_transcript:
        tasks.append(fetch_assembly_ai_transcript(transcript_id))
        srt_response_index += 1
        sentences_response_index += 1
    if include_sentences:
        tasks.append(fetch_assembly_ai_transcript(transcript_id, resource="/sentences"))
        srt_response_index += 1
    if include_srt:
        tasks.append(fetch_assembly_ai_transcript(transcript_id, resource="/srt"))
          
    results = await asyncio.gather(*tasks)
    transcript_response = results[transcript_response_index] if include_transcript else None
    sentences_response = results[sentences_response_index] if include_sentences else None
    srt_response = results[srt_response_index] if include_srt else None

    if transcript_response and transcript_response.get("status") == "error":
        raise ValueError("Transcription failed")

    return {
        "status": transcript_response.get("status") if transcript_response else None,
        "transcript": transcript_response.get("text") if transcript_response else None,
        "sentences": [
            {"text": sentence["text"], "start": sentence["start"], "end": sentence["end"]}
            for sentence in sentences_response.get("sentences", [])
        ] if sentences_response else None,
        "srt": srt_response if srt_response else None,
    }
