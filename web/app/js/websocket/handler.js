import {
  getProgressBar,
  getVideoCard,
  getDownloadButton,
} from "../helpers/dom.js";

export async function handleMessage(message) {
  const { event, data, id } = JSON.parse(message.data);

  const videoCard = getVideoCard(id);

  const bannerContainer = videoCard.querySelector("div#banner-container");
  const banner = document.createElement("div");
  if (data.message) {
    banner.className = "banner";
    banner.setAttribute("data-event", event);
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
    case "transcriptionSuccess": {
      videoCard.setAttribute("data-transcript-id", data.transcriptId);
      transcribeButton.removeAttribute("data-loading");
      translateButton.disabled = false;
      const downloadLinkContent = new Blob([data.text], { type: "text/plain" });
      const downloadTranscriptButton = getDownloadButton(
        id,
        "Download original transcript (Hindi)",
        downloadLinkContent,
        "transcript.hi.txt"
      );
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
      translateButton.disabled = false;
      const downloadLinkContent = new Blob([data.text], { type: "text/plain" });
      const downloadTranscriptButton = getDownloadButton(
        id,
        "Download translated transcript (English)",
        downloadLinkContent,
        "transcript.en.txt"
      );
      videoCardButtonGroup.appendChild(downloadTranscriptButton);
      break;
    }
    case "error": {
      banner.classList.add("error");
      break;
    }
    default: {
      console.log("Unknown event:", event);
      throw new Error(`Unknown event: ${event}`);
    }
  }
}
