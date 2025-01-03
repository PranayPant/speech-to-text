import axios from "axios";

import { fetchAssemblyAITranscript } from "./api.js";

export async function transcribeAudio(params) {
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

export async function getTranscription({
  transcriptId,
  includeTranscript,
  includeSentences,
  includeSRT,
}) {
  try {
    const [transcriptResponse, sentencesResponse, srtResponse] =
      await Promise.all([
        includeTranscript && fetchAssemblyAITranscript({ transcriptId }),
        includeSentences &&
          fetchAssemblyAITranscript({ transcriptId, resource: "sentences" }),
        includeSRT &&
          fetchAssemblyAITranscript({ transcriptId, resource: "srt" }),
      ]);
    return {
      status: transcriptResponse?.data?.status,
      text: transcriptResponse?.data?.text,
      sentences: sentencesResponse?.data?.sentences?.map(
        ({ text, start, end }) => ({
          text,
          start,
          end,
        })
      ),
      srt: srtResponse?.data,
    };
  } catch (error) {
    console.error("Error fetching transcription:", error);
    throw `Error fetching transcription: ${error.message}`;
  }
}

export async function getTranscriptionProgress(transcriptId, ws, id) {
  try {
    const { status } = getTranscription({
      transcriptId,
      includeTranscript: true,
      includeSentences: false,
      includeSRT: false,
    });

    ws.send(
      JSON.stringify({
        event: "transcriptionInProgress",
        id,
        data: {
          message: `Transcription status: ${status}`,
          transcriptId,
        },
      })
    );

    if (status === "failed") {
      ws.send(
        JSON.stringify({
          event: "transcriptionFailed",
          id,
          data: {
            transcriptId,
            text: "Transcription failed",
          },
        })
      );
    } else if (status === "completed") {
      const { text, sentences, srt } = getTranscription({
        transcriptId,
        includeTranscript: true,
        includeSentences: false,
        includeSRT: false,
      });

      ws.send(
        JSON.stringify({
          event: "transcriptionComplete",
          id,
          data: {
            transcriptId,
            text,
            sentences,
            srt,
          },
        })
      );
    }
  } catch (error) {
    console.error("Error polling transcription progress:", error);
    ws.send(
      JSON.stringify({
        event: "error",
        id,
        data: `Error polling transcription progress: ${error.message}`,
      })
    );
  }
}
