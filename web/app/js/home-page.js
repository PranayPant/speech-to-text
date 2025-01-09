import { initiateTranscription, postTranslation } from "./http/api.js";
import { processGoogleDriveLink } from "./utils/google-drive.js";
import { pollTranscript } from "./helpers/transcript.js";
import { makeToast, getDownloadButton } from "./helpers/dom.js";

const input = document.querySelector("input#google-drive-link");

const transcribeButton = document.querySelector("button#transcribe");
transcribeButton.addEventListener("click", handleTranscribeEvent);

const translateButton = document.querySelector("button#translate");
translateButton.addEventListener("click", handleTranslateEvent);

const buttonGroup = document.querySelector("div.button-group");

async function handleTranscribeEvent() {
  try {
    transcribeButton.disabled = true;
    transcribeButton.setAttribute("data-loading", true);
    transcribeButton.textContent = "Transcribing...";
    const googleDriveLink = input.value;
    const { audioUrl } = processGoogleDriveLink(googleDriveLink);
    const transcriptId = await initiateTranscription(audioUrl);
    const { srt } = await pollTranscript(transcriptId);
    translateButton.setAttribute("data-transcript-id", transcriptId);
    transcribeButton.disabled = false;
    transcribeButton.removeAttribute("data-loading");
    transcribeButton.textContent = "Transcribe";
    makeToast({
      message: "Transcription completed!",
      status: "success",
    });
    const downloadHindiSubtitlesBtn = getDownloadButton({
      buttonText: "Hindi Subtitles",
      content: srt,
      filename: "subtitles.hi.srt",
    });

    buttonGroup.appendChild(downloadHindiSubtitlesBtn);
  } catch (error) {
    transcribeButton.disabled = false;
    transcribeButton.removeAttribute("data-loading");
    transcribeButton.textContent = "Transcribe";
    makeToast({
      message: `Error: ${error.message}`,
      status: "error",
    });
  }
}

async function handleTranslateEvent() {
  try {
    const transcriptId = translateButton.getAttribute("data-transcript-id");
    if (!transcriptId) {
      makeToast({
        message: "Transcription not found. Please transcribe first.",
        status: "error",
      });
      return;
    }
    translateButton.disabled = true;
    translateButton.setAttribute("data-loading", true);
    translateButton.textContent = "Translating...";
    const { srt } = await postTranslation({ transcriptId, includeSRT: true });
    translateButton.disabled = false;
    translateButton.removeAttribute("data-loading");
    translateButton.textContent = "Translate";
    makeToast({
      message: "Translation completed!",
      status: "success",
    });
    const downloadEnglishSubtitlesBtn = getDownloadButton({
      buttonText: "English Subtitles",
      content: srt,
      filename: "subtitles.en.srt",
    });

    buttonGroup.appendChild(downloadEnglishSubtitlesBtn);
  } catch (error) {
    translateButton.disabled = false;
    translateButton.removeAttribute("data-loading");
    translateButton.textContent = "Translate";
    makeToast({
      message: `Error: ${error.message}`,
      status: "error",
    });
  }
}
