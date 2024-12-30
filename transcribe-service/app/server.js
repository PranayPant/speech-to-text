import WebSocket, { WebSocketServer } from "ws";
import axios from "axios";
import fs from "fs";
import url from "url";
import https from "https";
import http from "http";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";

import { uploadExtractedAudio } from "./upload.js";
import { transcribeAudio } from "./transcribe.js";

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
        const binaryData = Buffer.concat(data);
        const uploadUrl = await uploadExtractedAudio(binaryData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ uploadUrl }));
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
          const transcriptId = await transcribeAudio(uploadUrl);
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
    case "/test": {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
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
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_SIZE,
});

server.listen(port, () => {
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

      if (event === "upload") {
        try {
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
          const transcriptId = await transcribeAudio(uploadUrl);

          // Poll for transcription progress
          pollTranscriptionProgress(transcriptId, ws, id);
        } catch (error) {
          console.error("Error processing message:", error);
          ws.send(JSON.stringify({ event: "error", data: error.message }));
        }
      } else if (event === "translate") {
        try {
          const { transcriptId, id } = data;
          console.log("Translating transcript...", transcriptId);

          const sentencesResponse = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
            {
              headers: {
                authorization: process.env.ASSEMBLYAI_API_KEY,
              },
            }
          );
          const sentences = sentencesResponse.data.sentences.map(
            ({ text, start, end }) => ({
              text,
              start,
              end,
            })
          );
          const translationResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "developer",
                content:
                  "You are given a stringified JSON array that represents a timestamped Hindi transcript that contains quotations in Sanskrit. Translate the text into English, skipping any quotations in Sanskrit, and return the modified array. Only include the array in the response so that it can be easily parsed by the client.",
              },
              { role: "user", content: JSON.stringify(sentences) },
            ],
          });
          const chatGPTResponse =
            translationResponse.choices[0].message.content.trim();
          ws.send(
            JSON.stringify({
              event: "translationSuccess",
              data: {
                transcriptId,
                sentences: JSON.parse(chatGPTResponse),
                id,
              },
            })
          );
        } catch (error) {
          console.error("Error translating transcript:", error);
          ws.send(JSON.stringify({ event: "error", data: error.message }));
        }
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

async function pollTranscriptionProgress(transcriptId, ws, id) {
  const interval = setInterval(async () => {
    try {
      const response = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: process.env.ASSEMBLYAI_API_KEY,
          },
        }
      );

      const status = response.data.status;
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

      if (status === "completed" || status === "failed") {
        clearInterval(interval);
        ws.send(
          JSON.stringify({
            event:
              status === "completed"
                ? "transcriptionComplete"
                : "transcriptionFailed",
            data: {
              transcriptId,
              text: response.data.text,
              id,
            },
          })
        );

        if (status === "completed") {
          const [sentencesResponse, srtResponse] = await Promise.all([
            axios.get(
              `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
              {
                headers: {
                  authorization: process.env.ASSEMBLYAI_API_KEY,
                },
              }
            ),
            axios.get(
              `https://api.assemblyai.com/v2/transcript/${transcriptId}/srt`,
              {
                headers: {
                  authorization: process.env.ASSEMBLYAI_API_KEY,
                },
              }
            ),
          ]);

          const sentences = sentencesResponse.data.sentences.map(
            ({ text, start, end }) => ({
              text,
              start,
              end,
            })
          );

          ws.send(
            JSON.stringify({
              event: "transcriptionSentences",
              data: {
                transcriptId,
                sentences,
                id,
              },
            })
          );

          ws.send(
            JSON.stringify({
              event: "transcriptionSRT",
              data: {
                transcriptId,
                srtContent: srtResponse.data,
                id,
              },
            })
          );
        }
      }
    } catch (error) {
      console.error("Error polling transcription progress:", error);
      ws.send(JSON.stringify({ event: "error", data: error.message }));
      clearInterval(interval);
    }
  }, 5000); // Poll every 5 seconds
}
