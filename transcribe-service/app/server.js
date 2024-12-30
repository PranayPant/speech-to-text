import { WebSocketServer } from "ws";
import axios from "axios";
import http from "http";
import OpenAI from "openai";

import { uploadExtractedAudio } from "./upload.js";
import { getTranscription, transcribeAudio } from "./transcribe.js";
import { MAX_PAYLOAD_SIZE } from "./constants.js";
import { translateSentences } from "./translate.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const port = process.env.TRANSCRIBE_PORT || 8000;
const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  switch (req.url) {
    case "/upload": {
      let data = [];
      req.on("data", (chunk) => {
        data.push(chunk);
      });
      req.on("end", async () => {
        try {
          const binaryData = Buffer.concat(data);
          const uploadUrl = await uploadExtractedAudio(binaryData);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ uploadUrl }));
        } catch (error) {
          console.error("Error during upload:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }
    case "/transcribe": {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", async () => {
        const parsedData = JSON.parse(data);
        const { uploadUrl } = parsedData;
        try {
          const transcriptId = await transcribeAudio({
            audio_url: uploadUrl,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ transcriptId }));
        } catch (error) {
          console.error("Error during transcription:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }
    case "/transcript": {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", async () => {
        const parsedData = JSON.parse(data);
        const {
          transcriptId,
          includeSRT,
          includeTranscript,
          includeSentences,
        } = parsedData;
        try {
          const transcript = await getTranscription({
            transcriptId,
            includeTranscript,
            includeSentences,
            includeSRT,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(transcript));
        } catch (error) {
          console.error("Error fetching transcript:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }
    case "/test": {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data + "\n");
      });
      break;
    }
    default: {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      break;
    }
  }
});

const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_SIZE,
});

server.listen(port, "0.0.0.0", () => {
  console.log(`WebSocket server is running on port ${port}`);
});

wss.on("connection", (ws, req) => {
  console.log("Client connected");
  console.log("Headers", req.headers);

  ws.on("message", async (message, isBinary) => {
    try {
      let event, data, id;

      if (isBinary) {
        event = "upload";
        id = message.slice(0, 21).toString();
        data = message.slice(21);
      } else {
        ({ event, data } = JSON.parse(message));
      }

      switch (event) {
        case "upload":
          ws.send(
            JSON.stringify({
              event: "progress",
              data: {
                id,
                message:
                  "Extracting audio and uploading media file for processing...",
              },
            })
          );

          const uploadUrl = await uploadExtractedAudio(data);

          ws.send(
            JSON.stringify({
              event: "progress",
              data: {
                id,
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
              data: {
                id,
                transcriptId,
                message: "Transcription process started.",
              },
            })
          );
          break;

        case "pollTranscription":
          const { transcriptId: checkTranscriptId, id } = data;
          console.log("Checking transcription status...", checkTranscriptId);
          await getTranscriptionProgress(checkTranscriptId, ws, id);
          break;

        case "translate":
          const { sentences } = translateSentences(data);
          const srt = generateSRT(sentences);
          ws.send(
            JSON.stringify({
              event: "translationSuccess",
              data: {
                id: data.id,
                transcriptId: data.transcriptId,
                sentences,
                srt,
              },
            })
          );
          break;
        default:
          ws.send(
            JSON.stringify({
              event: "error",
              data: `Unknown event: ${event}`,
            })
          );
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(JSON.stringify({ event: "error", data: error.message }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

async function getTranscriptionProgress(transcriptId, ws, id) {
  try {
    const { status } = getTranscription({
      transcriptId,
      includeTranscript: true,
      includeSentences: false,
      includeSRT: false,
    });

    ws.send(
      JSON.stringify({
        event: "progress",
        data: {
          id,
          message: `Transcription status: ${status}`,
          transcriptId,
        },
      })
    );

    if (status === "failed") {
      ws.send(
        JSON.stringify({
          event: "transcriptionFailed",
          data: {
            transcriptId,
            text: "Transcription failed",
            id,
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
          data: {
            transcriptId,
            text,
            sentences,
            srt,
            id,
          },
        })
      );
    }
  } catch (error) {
    console.error("Error polling transcription progress:", error);
    ws.send(
      JSON.stringify({
        event: "error",
        data: `Error polling transcription progress: ${error.message}`,
      })
    );
  }
}
