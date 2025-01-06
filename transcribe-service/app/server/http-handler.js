import { uploadExtractedAudio } from "../helpers/upload.js";
import { getTranscription } from "../helpers/transcribe.js";
import { getTranslation } from "../helpers/translate.js";
import { postTranscription } from "../api.js";

export function httpHandler(req, res) {
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
          const transcriptId = await postTranscription({
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
        const { includeSentences, includeSRT, includeTranscript } = parsedData;
        let srt, sentences;
        console.log("Transcript request received for:", parsedData);
        try {
          const { status, transcript } = await getTranscription({
            includeTranscript: true,
            includeSentences: false,
            includeSRT: false,
          });
          if (status === "completed") {
            ({ sentences, srt } = await getTranscription({
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
        } catch (error) {
          console.error("Error fetching transcript:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }
    case "/translate": {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", async () => {
        const parsedData = JSON.parse(data);
        try {
          const translationDetails = await getTranslation(parsedData);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(translationDetails));
        } catch (error) {
          console.error("Error during translation:", error);
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
      console.log("Not Found url", req.url);
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      break;
    }
  }
}
