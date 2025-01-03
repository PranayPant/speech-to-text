import { uploadExtractedAudio } from "../helpers/upload.js";
import {
  transcribeAudio,
  getTranscriptionProgress,
} from "../helpers/transcribe.js";
import { getTranslation } from "../helpers/translate.js";

export async function wsHandler(ws, message, isBinary) {
  let event, data, id;

  try {
    if (isBinary) {
      event = "transcribe";
      id = message.slice(0, 21).toString();
      data = message.slice(21);
    } else {
      ({ event, data } = JSON.parse(message));
    }

    switch (event) {
      case "transcribe": {
        ws.send(
          JSON.stringify({
            event: "transcriptionInProgress",
            id,
            data: {
              message:
                "Extracting audio and uploading media file for processing...",
            },
          })
        );

        const uploadUrl = await uploadExtractedAudio(data);

        ws.send(
          JSON.stringify({
            event: "transcriptionInProgress",
            id,
            data: {
              message: "Audio uploaded, starting transcription process...",
            },
          })
        );

        // Request transcription from AssemblyAI
        const transcriptId = await transcribeAudio({
          audio_url: uploadUrl,
        });

        ws.send(
          JSON.stringify({
            event: "transcriptionQueued",
            id,
            data: {
              transcriptId,
              message: "Transcription process has started.",
            },
          })
        );
        break;
      }
      case "pollTranscription": {
        console.log("Checking transcription status...", data.transcriptId);
        await getTranscriptionProgress(data.transcriptId, ws, id);
        break;
      }
      case "translate": {
        const { sentences, srt, transcript, transcriptId } = await getTranslation(data);
        ws.send(
          JSON.stringify({
            event: "translationSuccess",
            id,
            data: {
              transcriptId,
              sentences,
              srt,
              transcript,
            },
          })
        );
        break;
      }
      default: {
        ws.send(
          JSON.stringify({
            event: "error",
            data: { message: `Unknown event: ${event}` },
            id,
          })
        );
        break;
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
    ws.send(
      JSON.stringify({ id, event: "error", data: { message: error.message } })
    );
  }
}
