import { generateSRT } from "./srt.js";

const socket = new WebSocket("ws://localhost:8000");

socket.onopen = function (event) {
  console.log("WebSocket connection established:", event);
  showSuccessBanner();
};

socket.onerror = function (error) {
  console.error("WebSocket error:", error);
};
socket.onclose = function (event) {
  console.log("WebSocket connection closed:", event);
  removeSuccessBanner();
};

socket.onmessage = function (message) {
  const { event, data } = JSON.parse(message.data);
  let progressBar = document.getElementById("progress-bar");
  switch (event) {
    case "progress":
      if (!progressBar) {
        progressBar = document.createElement("div");
        progressBar.id = "progress-bar";
        document.body.appendChild(progressBar);
        const closeButton = document.createElement("span");
        closeButton.textContent = "×";
        closeButton.style.position = "absolute";
        closeButton.style.right = "32px";
        closeButton.style.top = "50%";
        closeButton.style.transform = "translateY(-50%)";
        closeButton.style.cursor = "pointer";
        closeButton.style.fontSize = "20px";
        closeButton.style.backgroundColor = "white";
        closeButton.style.color = "black";
        closeButton.style.borderRadius = "50%";
        closeButton.style.padding = "4px 8px";
        closeButton.addEventListener("click", function () {
          document.body.removeChild(progressBar);
        });
        progressBar.appendChild(closeButton);
      }
      progressBar.textContent = data;
      progressBar.style.position = "fixed";
      progressBar.style.top = "0";
      progressBar.style.left = "0";
      progressBar.style.width = "100%";
      progressBar.style.backgroundColor = "#0000FF";
      progressBar.style.color = "white";
      progressBar.style.textAlign = "center";
      progressBar.style.padding = "10px";
      break;
    case "transcriptionComplete":
      if (!progressBar) {
        progressBar = document.createElement("div");
        progressBar.id = "progress-bar";
        document.body.appendChild(progressBar);
      }
      progressBar.style.backgroundColor = "#008000";
      const downloadLinkContent = new Blob([data.text], { type: "text/plain" });
      addDownloadButton(
        progressBar,
        "Download original transcript (Hindi)",
        downloadLinkContent,
        "transcription.txt"
      );
      break;
    case "transcriptionSentences":
      const srtContent = generateSRT(data.sentences);
      addDownloadButton(
        progressBar,
        "Download modified SRT file (Hindi)",
        srtContent,
        "subtitles.en.srt"
      );
      break;
    case "transcriptionSRT":
      const srtFileContent = new Blob([data], { type: "text/plain" });
      addDownloadButton(
        progressBar,
        "Download original SRT file (Hindi)",
        srtFileContent,
        "subtitles.hi.srt"
      );
      break;
    default:
      console.log("Unknown event:", event);
  }
};

export function sendVideoFile(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const arrayBuffer = event.target.result;
    socket.send(arrayBuffer);
    console.log("Video file data sent");
  };
  reader.onerror = function (error) {
    console.error("Error reading video file:", error);
  };
  reader.readAsArrayBuffer(file);
}

function showSuccessBanner() {
  const banner = document.createElement("div");
  banner.id = "success-banner";
  banner.textContent = "WebSocket connection established successfully!";
  banner.style.position = "fixed";
  banner.style.top = "0";
  banner.style.left = "0";
  banner.style.width = "100%";
  banner.style.backgroundColor = "#008000";
  banner.style.color = "white";
  banner.style.textAlign = "center";
  banner.style.padding = "10px";
  const closeButton = document.createElement("span");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.right = "32px";
  closeButton.style.top = "50%";
  closeButton.style.transform = "translateY(-50%)";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "20px";
  closeButton.style.backgroundColor = "white";
  closeButton.style.color = "black";
  closeButton.style.borderRadius = "50%";
  closeButton.style.padding = "4px 8px";
  closeButton.addEventListener("click", function () {
    document.body.removeChild(banner);
  });
  banner.appendChild(closeButton);
  document.body.appendChild(banner);
}

function removeSuccessBanner() {
  const banner = document.getElementById("success-banner");
  document.body.removeChild(banner);
}

function addDownloadButton(container, buttonText, content, filename) {
  const button = document.createElement("button");
  button.textContent = buttonText;
  button.style.marginLeft = "16px";
  button.style.padding = "10px 20px";
  button.style.backgroundColor = "#4CAF50";
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "5px";
  button.style.cursor = "pointer";
  button.addEventListener("click", function () {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
  container.appendChild(button);
}
