import { getDownloadButton, getVideoCard } from "../helpers/dom.js";
import {
  uploadBinaryData,
  initiateTranscription,
  getTranscriptDetails,
  postTranslation,
} from "./api.js";

async function pollTranscript(transcriptId) {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const { status, srt } = await getTranscriptDetails({
          transcriptId,
          includeSRT: true,
        });
        console.log("Transcript status:", status);
        if (status === "completed") {
          console.log("Transcript completed");
          resolve({ srt });
          clearInterval(intervalId);
        }
      } catch (error) {
        clearInterval(intervalId);
        reject(error.message);
      }
    };

    const intervalId = setInterval(checkStatus, 5000);
  });
}

export async function handleTranscription(mediaFile, cardId) {
  const videoCard = getVideoCard(cardId);
  const transcribeButton = videoCard.querySelector("button#transcribe");
  const translateButton = videoCard.querySelector("button#translate");
  const buttonGroup = videoCard.querySelector("div.button-group");

  const bannerContainer = videoCard.querySelector("div#banner-container");
  let banner = bannerContainer.querySelector("div.banner");

  if (!banner) {
    banner = document.createElement("div");
    banner.classList.add("banner", "flex-container");
    bannerContainer.appendChild(banner);
  }

  banner.setAttribute("data-status", "pending");
  banner.textContent = "Uploading media file...";
  transcribeButton.setAttribute("data-loading", "");
  transcribeButton.disabled = true;

  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const dataBuffer = event.target.result;
      const mimeType = mediaFile.type;
      console.log("Transcribe request sent for media card", cardId);
      const uploadUrl = await uploadBinaryData(dataBuffer, mimeType);
      banner.textContent = "Processing media file...";
      const transcriptId = await initiateTranscription(uploadUrl);
      videoCard.setAttribute("data-transcript-id", transcriptId);
      banner.textContent = "Generating transcript...";
      const { srt } = await pollTranscript(transcriptId);
      banner.textContent = "Transcript generated!";
      banner.setAttribute("data-status", "success");
      transcribeButton.removeAttribute("data-loading");
      translateButton.disabled = false;
      const downloadHindiSubtitlesBtn = getDownloadButton({
        buttonText: "Hindi Subtitles",
        content: srt,
        filename: "subtitles.hi.srt",
      });
      buttonGroup.appendChild(downloadHindiSubtitlesBtn);
    } catch (error) {
      console.error("Error during transcription process:", error.message);
      banner.textContent = "Error generating transcript.";
      banner.setAttribute("data-status", "error");
      transcribeButton.removeAttribute("data-loading");
      transcribeButton.disabled = false;
    }
  };

  reader.onerror = function (error) {
    console.error("Error reading video file:", error);
  };
  reader.readAsArrayBuffer(mediaFile);
}

export async function handleTranslation(cardId) {
  const videoCard = getVideoCard(cardId);

  const transcriptId = videoCard.getAttribute("data-transcript-id");

  if (!transcriptId) {
    throw new Error("Transcript ID not found for media card");
  }

  const translateButton = videoCard.querySelector("button#translate");
  const buttonGroup = videoCard.querySelector("div.button-group");

  const bannerContainer = videoCard.querySelector("div#banner-container");
  let banner = bannerContainer.querySelector("div.banner");

  if (!banner) {
    banner = document.createElement("div");
    banner.classList.add("banner", "flex-container");
    bannerContainer.appendChild(banner);
  }

  banner.setAttribute("data-status", "pending");
  banner.textContent = "Translating transcript...";
  translateButton.setAttribute("data-loading", "");
  translateButton.disabled = true;

  try {
    console.log("Translate request sent for media card", cardId);
    const { srt } = await postTranslation({ transcriptId, includeSRT: true });
    banner.textContent = "Translation complete!";
    banner.setAttribute("data-status", "success");
    translateButton.removeAttribute("data-loading");
    const downloadHindiSubtitlesBtn = getDownloadButton({
      buttonText: "English Subtitles",
      content: srt,
      filename: "subtitles.en.srt",
    });
    buttonGroup.appendChild(downloadHindiSubtitlesBtn);
  } catch (error) {
    console.error("Error translating transcript:", error.message);
    banner.textContent = "Error translating transcript.";
    banner.setAttribute("data-status", "error");
    translateButton.removeAttribute("data-loading");
    translateButton.disabled = false;
  }
}
