import fs from "fs";
import lockfile from "proper-lockfile";

import { uploadExtractedAudio, extractAudio } from "../helpers/upload.js";
import { getTranscription } from "../helpers/transcribe.js";
import { getTranslation } from "../helpers/translate.js";
import { postTranscription, uploadAudioToAssemblyAI } from "../api.js";

let mediaBuffer = [];
let mediaChunksReceived = 0;
const filePath = "./uploaded_video.mp4";
let fileStream = fs.createWriteStream(filePath, { flags: "a" });

export function httpHandler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  let data = [];

  req.on("data", (chunk) => {
    data.push(chunk);
  });
  req.on("end", async () => {
    try {
      switch (req.url) {
        case "/multipart-upload": {
          const startTime = Date.now();
          const chunkIndex = parseInt(req.headers["x-chunk-index"]);
          const totalChunks = parseInt(req.headers["x-total-chunks"]);
          const byteOffset = parseInt(req.headers["x-chunk-offset"]);

          mediaChunksReceived++;
          const isLastChunk = mediaChunksReceived === totalChunks;

          if (mediaBuffer.length === 0) {
            mediaBuffer = new Array(totalChunks);
          }
          const buf = Buffer.concat(data);

          mediaBuffer[chunkIndex] = buf;

          let isFileInUse = true;

          while (isFileInUse) {
            try {
              await lockfile.check(filePath);
              isFileInUse = false;
            } catch (error) {
              console.error("File in use, retrying 100ms:", error.message);
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }

          fileStream = fs.createWriteStream(filePath, {
            flags: "a",
            start: byteOffset,
          });

          const release = await lockfile.lock(filePath);
          console.log(
            "Writing chunk number",
            chunkIndex + 1,
            "/",
            totalChunks,
            "of size",
            (buf.length / (1024 * 1024)).toFixed(2),
            "MB"
          );
          fileStream.write(buf);
          fileStream.end();
          release();

          fileStream.on("error", (error) => {
            console.error("Error writing to file stream:", error.message);
          });

          if (isLastChunk) {
            console.log("Received last chunk");

            // Extract audio from the uploaded video
            const audioPath = "./extracted_audio.mp3";
            await extractAudio(filePath, audioPath);
            const audioBuffer = fs.readFileSync(audioPath);
            console.log(
              "Extracted audio of size:",
              (audioBuffer.length / (1024 * 1024)).toFixed(2),
              "MB"
            );
            const response = await uploadAudioToAssemblyAI(audioBuffer);
            const uploadUrl = response.data.upload_url;

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ uploadUrl, status: "completed" }));
          } else {
            res.writeHead(200, {
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ uploadUrl: null, status: "pending" }));
          }
          const endTime = Date.now();
          console.log(
            `Case "/multipart-upload" executed in ${
              (endTime - startTime) / 1000
            }s`
          );
          break;
        }
        case "/upload": {
          const startTime = Date.now();
          const buffer = Buffer.concat(data);
          console.log(
            "Received binary data of size:",
            (buffer.byteLength / (1024 * 1024)).toFixed(2),
            "MB"
          );
          const uploadUrl = await uploadExtractedAudio(buffer);
          console.log("Upload URL:", uploadUrl);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ uploadUrl }));
          const endTime = Date.now();
          console.log(
            `Case "/upload" executed in ${(endTime - startTime) / 1000}s`
          );
          break;
        }
        case "/transcribe": {
          const startTime = Date.now();
          const parsedData = JSON.parse(data);
          const { uploadUrl } = parsedData;
          const transcriptId = await postTranscription({
            audio_url: uploadUrl,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ transcriptId }));
          const endTime = Date.now();
          console.log(
            `Case "/transcribe" executed in ${(endTime - startTime) / 1000}s`
          );
          break;
        }
        case "/transcript": {
          const startTime = Date.now();
          const parsedData = JSON.parse(data);
          const {
            includeSentences,
            includeSRT,
            includeTranscript,
            transcriptId,
          } = parsedData;
          let srt, sentences;
          console.log("Transcript request received for:", parsedData);
          const { status, transcript } = await getTranscription({
            transcriptId,
            includeTranscript: true,
            includeSentences: false,
            includeSRT: false,
          });
          if (status === "completed") {
            ({ sentences, srt } = await getTranscription({
              transcriptId,
              includeSentences,
              includeSRT,
              includeTranscript: false,
            }));
          }
          console.log("Transcript details:", transcript);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status,
              transcript: includeTranscript && transcript,
              sentences,
              srt,
            })
          );
          const endTime = Date.now();
          console.log(
            `Case "/transcript" executed in ${(endTime - startTime) / 1000}s`
          );
          break;
        }
        case "/translate": {
          const startTime = Date.now();
          console.log("Translate request received");
          const parsedData = JSON.parse(data);
          console.log("Translating transcript with:", parsedData);
          const translationDetails = await getTranslation(parsedData);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(translationDetails));
          const endTime = Date.now();
          console.log(
            `Case "/translate" executed in ${(endTime - startTime) / 1000}s`
          );
          break;
        }
        case "/test": {
          const startTime = Date.now();
          const parsedData = JSON.parse(data);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(parsedData) + "\n");
          const endTime = Date.now();
          console.log(
            `Case "/test" executed in ${(endTime - startTime) / 1000}s`
          );
          break;
        }
        default: {
          const startTime = Date.now();
          console.log("Not Found url", req.url);
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
          const endTime = Date.now();
          console.log(
            `Case "default" executed in ${(endTime - startTime) / 1000}s`
          );
          break;
        }
      }
    } catch (error) {
      console.error("Error during request handling:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}
