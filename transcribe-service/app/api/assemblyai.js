import axios from "axios";

import { MAX_PAYLOAD_SIZE } from "../constants.js";

export async function fetchAssemblyAITranscript({
  transcriptId,
  resource = "",
}) {
  try {
    const response = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}${resource}`,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      }
    );
    return response;
  } catch (error) {
    const errorMessage = `Error fetching AssemblyAI transcript for ${transcriptId}${resource}: ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function uploadAudioToAssemblyAI(binaryData) {
  try {
    console.log("Uploading audio to AssemblyAI...");
    const startTime = Date.now();
    const response = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      binaryData,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          "content-type": "application/octet-stream",
        },
        maxBodyLength: MAX_PAYLOAD_SIZE,
      }
    );
    const endTime = Date.now();
    const uploadTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(
      `Audio uploaded to AssemblyAI in ${uploadTimeInSeconds} seconds`
    );
    return response;
  } catch (error) {
    console.error("Error uploading audio to AssemblyAI:", process.env.ASSEMBLYAI_API_KEY, error.message);
    throw `Error uploading audio to AssemblyAI: ${error.message}`;
  }
}

export async function postTranscription(params) {
  try {
    const transcriptResponse = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      { ...params, language_code: "hi" },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },
      }
    );
    return transcriptResponse.data.id;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw `Error transcribing audio: ${error.message}`;
  }
}
