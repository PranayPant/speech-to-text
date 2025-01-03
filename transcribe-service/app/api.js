import axios from "axios";

import { MAX_PAYLOAD_SIZE } from "./constants.js";

export async function fetchAssemblyAITranscript({
  transcriptId,
  additionalResource = "",
}) {
  try {
    const response = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/${additionalResource}`,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching AssemblyAI transcript:", error);
    throw `Error fetching AssemblyAI transcript: ${error.message}`;
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
          authorization: apiKey,
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
    console.error("Error uploading audio to AssemblyAI:", error);
    throw `Error uploading audio to AssemblyAI: ${error.message}`;
  }
}
