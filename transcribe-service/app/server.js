import WebSocket, { WebSocketServer } from "ws";
import axios from "axios";
import fs from "fs";
import https from "https";
import http from "http";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const port = process.env.TRANSCRIBE_PORT || 8000;
const server = http.createServer();
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_SIZE,
});

server.listen(port, () => {
  console.log(`WebSocket server is running on ws://localhost:${port}`);
});

wss.on("connection", (ws) => {
  console.log("Client connected");

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
                message: "Uploading file to servers...",
              },
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
              data: {
                id,
                message: "Audio extracted, uploading to AssemblyAI...",
              },
            })
          );

          // Upload the extracted audio to AssemblyAI
          const response = await uploadToAssemblyAI(fs.readFileSync(audioPath));
          const uploadUrl = response.data.upload_url;

          ws.send(
            JSON.stringify({
              event: "progress",
              data: {
                id,
                message: "Audio uploaded, starting transcription...",
              },
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

          ws.send(
            JSON.stringify({
              event: "progress",
              data: {
                id,
                message: "Transcription started, polling for progress...",
                transcriptId,
              },
            })
          );

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
