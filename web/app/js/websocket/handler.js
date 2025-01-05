import { getVideoCard, getDownloadButton } from "../helpers/dom.js";
import { sendTrancriptProgressRequest } from "./index.js";

export async function handleMessage(message) {
  const { status, event, data, id } = JSON.parse(message.data);

  console.log("Received message:", event, data, id);

  const videoCard = getVideoCard(id);

  const bannerContainer = videoCard.querySelector("div#banner-container");
  let banner = bannerContainer.querySelector("div.banner");
  banner = banner ?? document.createElement("div");

  if (data.message) {
    banner.classList.add("banner", "flex-container");
    banner.setAttribute("data-status", status);
    bannerContainer.appendChild(banner);
    banner.textContent = data.message;
  }

  const transcribeButton = videoCard.querySelector("button#transcribe");
  const translateButton = videoCard.querySelector("button#translate");
  const videoCardButtonGroup = videoCard.querySelector("div.button-group");

  switch (event) {
    case "transcriptionInProgress": {
      transcribeButton.setAttribute("data-loading", "");
      translateButton.disabled = true;
      break;
    }
    case "transcriptionQueued": {
      videoCard.setAttribute("data-transcript-id", data.transcriptId);
      setTimeout(() => {
        sendTrancriptProgressRequest(data.transcriptId, id);
      }, 5000);
      break;
    }
    case "transcriptionSuccess": {
      transcribeButton.removeAttribute("data-loading");
      transcribeButton.disabled = true;
      translateButton.disabled = false;
      const downloadLinkContent = new Blob([data.srt], { type: "text/plain" });
      const downloadTranscriptButton = getDownloadButton({
        buttonText: "Download subtitles (Hindi)",
        content: downloadLinkContent,
        filename: "subtitles.hi.srt",
      });
      videoCardButtonGroup.appendChild(downloadTranscriptButton);
      break;
    }
    case "translationInProgress": {
      translateButton.setAttribute("data-loading", "");
      translateButton.disabled = true;
      break;
    }
    case "translationSuccess": {
      translateButton.removeAttribute("data-loading");
      const downloadLinkContent = new Blob([data.srt], { type: "text/plain" });
      const downloadTranscriptButton = getDownloadButton({
        buttonText: "Download subtitles (English)",
        content: downloadLinkContent,
        filename: "subtitles.en.srt",
      });
      videoCardButtonGroup.appendChild(downloadTranscriptButton);
      break;
    }
    case "error": {
      banner.classList.add("error");
      translateButton.removeAttribute("data-loading");
      translateButton.disabled = false;
      transcribeButton.removeAttribute("data-loading");
      transcribeButton.disabled = false;
      break;
    }
    default: {
      console.log("Unknown event:", event);
      translateButton.removeAttribute("data-loading");
      translateButton.disabled = false;
      transcribeButton.removeAttribute("data-loading");
      transcribeButton.disabled = false;
      throw new Error(`Unknown event: ${event}`);
    }
  }
}
