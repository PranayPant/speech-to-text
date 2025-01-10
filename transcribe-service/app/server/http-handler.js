import { uploadExtractedAudio } from "../helpers/upload.js";
import { getTranscription } from "../helpers/transcribe.js";
import { getTranslation } from "../helpers/translate.js";
import { postTranscription } from "../api/assemblyai.js";
import { getFileInfo, uploadToGoogleDrive, setPermission } from "../api/google-drive.js";

export function httpHandler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  switch (req.url) {
    case "/drive/get/file": {
      let jsonString = "";
      req.on("data", (chunk) => {
        jsonString += chunk;
      });
      req.on("end", async () => {
        const parsedData = JSON.parse(jsonString);
        const { fileId } = parsedData;
        try {
          const response = await getFileInfo({ fileId });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error("Error fetching file info from google drive:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }

    case "/drive/upload/text": {
      let jsonString = "";
      req.on("data", (chunk) => {
        jsonString += chunk;
      });
      req.on("end", async () => {
        const parsedData = JSON.parse(jsonString);
        const { data, filename } = parsedData;
        try {
          const response = await uploadToGoogleDrive({ data, filename });
          await setPermission({ fileId: response.fileId });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error("Error creating text file on google drive:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }
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
        const {
          includeSentences,
          includeSRT,
          includeTranscript,
          transcriptId,
        } = parsedData;
        let srt, sentences;
        console.log("Transcript request received for:", parsedData);
        try {
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
        } catch (error) {
          console.error("Error fetching transcript:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      break;
    }
    case "/translate": {
      console.log("Translate request received");
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", async () => {
        const parsedData = JSON.parse(data);
        try {
          console.log("Translating transcript with:", parsedData);
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
