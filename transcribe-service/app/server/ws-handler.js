import { uploadExtractedAudio } from "../helpers/upload.js";
import { getTranscription } from "../helpers/transcribe.js";
import { getTranslation } from "../helpers/translate.js";
import { postTranscription } from "../api.js";

export async function wsHandler(ws, message, isBinary) {
  let event, data, id;

  try {
    if (isBinary) {
      event = "transcribe";
      id = message.slice(0, 21).toString();
      data = message.slice(21);
    } else {
      ({ event, data, id } = JSON.parse(message));
    }

    switch (event) {
      case "transcribe": {
        ws.send(
          JSON.stringify({
            event: "transcriptionInProgress",
            status: "pending",
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
            status: "pending",
            id,
            data: {
              message: "Audio uploaded, starting transcription process...",
            },
          })
        );

        // Request transcription from AssemblyAI
        const transcriptId = await postTranscription({
          audio_url: uploadUrl,
        });

        ws.send(
          JSON.stringify({
            event: "transcriptionQueued",
            status: "pending",
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
        console.log("Checking transcription status...", transcriptId);
        const { status, transcript } = await getTranscription({
          transcriptId,
          includeTranscript: true,
          includeSentences: false,
          includeSRT: false,
        });

        if (status === "error") {
          console.log("Transcription failed:", transcriptId);
          ws.send(
            JSON.stringify({
              event: "error",
              status: "error",
              id,
              data: {
                transcriptId,
                message: "Transcription failed",
              },
            })
          );
        } else if (status === "completed") {
          console.log("Transcription complete:", transcriptId);
          const { sentences, srt } = await getTranscription({
            transcriptId,
            includeTranscript: false,
            includeSentences,
            includeSRT,
          });

          ws.send(
            JSON.stringify({
              event: "transcriptionSuccess",
              status: "success",
              id,
              data: {
                transcriptId,
                transcript: includeTranscript ? transcript : null,
                sentences,
                srt,
                message: "Transcription complete.",
              },
            })
          );
        } else {
          console.log(
            "Transcription in progress with status",
            status,
            transcriptId
          );
          ws.send(
            JSON.stringify({
              event: "transcriptionQueued",
              status: "pending",
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
        ws.send(
          JSON.stringify({
            event: "translationInProgress",
            status: "pending",
            id,
            data: {
              message: "Translating transcript...",
            },
          })
        );
        const { sentences, srt, transcript, transcriptId } =
          await getTranslation(data);
        ws.send(
          JSON.stringify({
            event: "translationSuccess",
            status: "success",
            id,
            data: {
              transcriptId,
              sentences: data.includeSentences ? sentences : null,
              srt: data.includeSRT ? srt : null,
              transcript: data.includeTranscript ? transcript : null,
              message: "Translation complete.",
            },
          })
        );
        break;
      }
      default: {
        ws.send(
          JSON.stringify({
            event: "error",
            status: "error",
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
      JSON.stringify({
        id,
        event: "error",
        status: "error",
        data: { message: error.message },
      })
    );
  }
}
