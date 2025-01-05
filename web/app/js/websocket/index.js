import { getAppBanner, getVideoCard } from "../helpers/dom.js";
import { handleMessage } from "./handler.js";

const host = window.location.host;
const protocol = window.location.hostname === "localhost" ? "ws" : "wss";
const socket = new WebSocket(`${protocol}://${host}/ws/`);

socket.onopen = function (event) {
  console.log("WebSocket connection established:", event);
  const banner = getAppBanner();
  banner.textContent = "WebSocket connection established successfully!";
  banner.classList.add("success");
};

socket.onerror = function (error) {
  console.error("WebSocket error:", error);
};
socket.onclose = function (event) {
  console.log("WebSocket connection closed:", event);
  const banner = getAppBanner();
  banner.textContent = "WebSocket connection closed, please refresh the page.";
  banner.classList.add("error");
};

socket.onmessage = function (message) {
  try {
    handleMessage(message);
  } catch (error) {
    console.error("Error processing websocket message:", error.message);
  }
};

export function sendTranscribeRequest(file, id) {
  const videoCard = getVideoCard(id);
  const transcribeButton = videoCard.querySelector("button#transcribe");
  transcribeButton.setAttribute("data-loading", "true");
  const reader = new FileReader();
  reader.onload = function (event) {
    const dataBuffer = event.target.result;
    const idBuffer = new Blob([id], { type: "text/plain" });
    const arrayBuffer = new Blob([idBuffer, dataBuffer]);
    socket.send(arrayBuffer);
    console.log("Transcribe request sent for media card", id);
  };
  reader.onerror = function (error) {
    console.error("Error reading video file:", error);
  };
  reader.readAsArrayBuffer(file);
}

export function sendTranslateRequest(transcriptId, id) {
  const videoCard = getVideoCard(id);
  const translateButton = videoCard.querySelector("button#translate");
  translateButton.setAttribute("data-loading", "true");
  socket.send(
    JSON.stringify({
      event: "translate",
      id,
      data: {
        transcriptId,
        includeTranscript: false,
        includeSentences: false,
        includeSRT: true,
      },
    })
  );
}
export function sendTrancriptProgressRequest(transcriptId, id) {
  socket.send(
    JSON.stringify({
      event: "pollTranscription",
      id,
      data: {
        transcriptId,
        includeTranscript: false,
        includeSentences: false,
        includeSRT: true,
      },
    })
  );
}
