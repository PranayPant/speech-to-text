import { uploadExtractedAudio } from "../helpers/upload.js";
import { transcribeAudio } from "../helpers/transcribe.js";
import { getTranscription } from "../helpers/transcribe.js";

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
}
