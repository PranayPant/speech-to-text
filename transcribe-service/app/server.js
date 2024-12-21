import WebSocket, { WebSocketServer } from "ws";
import axios from "axios";
import fs from "fs";
import https from "https";
import http from "http";
import ffmpeg from "fluent-ffmpeg";

const port = process.env.TRANSCRIBE_PORT || 8000;
const server = http.createServer();
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50 MB
const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_SIZE * 1024,
});

server.listen(port, () => {
  console.log(`WebSocket server is running on ws://localhost:${port}`);
});

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    let event, data;
    if (typeof message === "string") {
      ({ event, data } = JSON.parse(message));
    } else {
      event = "upload";
      data = message;
    }

    if (event === "upload") {
      try {
        ws.send(
          JSON.stringify({
            event: "progress",
            data: "Starting audio extraction...",
          })
        );
        const filePath = "../../../data/uploaded_video.mp4";
        fs.writeFileSync(filePath, data);

        // Extract audio from the uploaded video
        const audioPath = "../../../data/extracted_audio.mp3";
        await extractAudio(filePath, audioPath);

        ws.send(
          JSON.stringify({
            event: "progress",
            data: "Audio extracted...",
          })
        );

        // Upload the extracted audio to AssemblyAI
        const response = await uploadToAssemblyAI(fs.readFileSync(audioPath));
        const uploadUrl = response.data.upload_url;

        ws.send(
          JSON.stringify({
            event: "progress",
            data: "File uploaded to servers...",
          })
        );

        // Request transcription from AssemblyAI
        const transcriptResponse = await axios.post(
          "https://api.assemblyai.com/v2/transcript",
          {
            audio_url: uploadUrl,
            language_code: "hi",
          },
          {
            headers: {
              authorization: process.env.ASSEMBLYAI_API_KEY,
              "content-type": "application/json",
            },
          }
        );

        const transcriptId = transcriptResponse.data.id;

        console.log(
          "Transcript Response:",
          transcriptResponse.status,
          transcriptResponse.data.status
        );

        ws.send(
          JSON.stringify({
            event: "progress",
            data: "Transcription started...",
          })
        );

        // Poll for transcription progress
        pollTranscriptionProgress(transcriptId, ws);
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ event: "error", data: error.message }));
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

async function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec("libmp3lame")
      .audioQuality(0) // Highest quality
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

async function uploadToAssemblyAI(binaryData) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  const url = "https://api.assemblyai.com/v2/upload";
  console.log("Uploading audio to AssemblyAI...");
  const startTime = Date.now();

  const response = await axios.post(url, binaryData, {
    headers: {
      authorization: apiKey,
      "content-type": "application/octet-stream",
    },
    maxBodyLength: MAX_PAYLOAD_SIZE,
  });

  const endTime = Date.now();

  const uploadTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`Audio uploaded to AssemblyAI in ${uploadTimeInSeconds} seconds`);
  console.log("Response:", response.status, response.data);

  return response;
}

async function pollTranscriptionProgress(transcriptId, ws) {
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
          data: `Transcription status: ${status}`,
        })
      );

      console.log("Polling Response:", response.status, status);

      if (status === "completed" || status === "failed") {
        clearInterval(interval);
        ws.send(
          JSON.stringify({
            event: "transcriptionComplete",
            data: response.data,
          })
        );
      }
    } catch (error) {
      console.error("Error polling transcription progress:", error);
      ws.send(JSON.stringify({ event: "error", data: error.message }));
      clearInterval(interval);
    }
  }, 5000); // Poll every 5 seconds
}
