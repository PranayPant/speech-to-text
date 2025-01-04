import { uploadExtractedAudio } from "../helpers/upload.js";
import { transcribeAudio, getTranscription } from "../helpers/transcribe.js";
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
            event: "transcriptionInProgress",
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
        const {
          transcriptId,
          includeSRT,
          includeSentences,
          includeTranscript,
        } = data;
        console.log("Checking transcription status...");
        const { status, transcript } = await getTranscription({
          transcriptId,
          includeTranscript: true,
          includeSentences: false,
          includeSRT: false,
        });

        if (status === "error") {
          ws.send(
            JSON.stringify({
              event: "transcriptionFailed",
              id,
              data: {
                transcriptId,
                message: "Transcription failed",
              },
            })
          );
        } else if (status === "completed") {
          const { sentences, srt } = await getTranscription({
            transcriptId,
            includeTranscript: false,
            includeSentences,
            includeSRT,
          });

          ws.send(
            JSON.stringify({
              event: "transcriptionComplete",
              id,
              data: {
                transcriptId,
                transcript: includeTranscript ? transcript : null,
                sentences,
                srt,
              },
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              event: "progress",
              id,
              data: {
                transcriptId,
                message: `Transcript status: ${status}`,
              },
            })
          );
        }
        break;
      }
      case "translate": {
        const { sentences, srt, transcript, transcriptId } =
          await getTranslation(data);
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
