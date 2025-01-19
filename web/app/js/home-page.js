import {
  getFileInfo,
  getTranslationDetails,
  initiateTranscription,
  uploadToGoogleDrive,
} from "./http/api.js";
import {
  fileIdToGoogleDriveLink,
  filenameToSubtitleFilename,
  processGoogleDriveLink,
} from "./utils/google-drive.js";
import { pollTranscript } from "./helpers/transcript.js";
import { makeToast } from "./helpers/dom.js";

const input = document.querySelector("input#google-drive-link");

const transcribeButton = document.querySelector("button#transcribe");
transcribeButton.addEventListener("click", handleTranscribeEvent);

const translateButton = document.querySelector("button#translate");
translateButton.addEventListener("click", handleTranslateEvent);
translateButton.disabled = true;

const modelSelect = document.querySelector("select#ai-model");

async function handleTranscribeEvent() {
  try {
    translateButton.disabled = true;
    transcribeButton.disabled = true;
    transcribeButton.setAttribute("data-loading", true);
    transcribeButton.textContent = "Transcribing...";
    const googleDriveLink = input.value;
    const { audioUrl, fileId } = processGoogleDriveLink(googleDriveLink);
    getFileInfo({ fileId }).then(({ name }) => {
      transcribeButton.setAttribute("data-file-name", name);
    });
    const transcriptId = await initiateTranscription(audioUrl);
    translateButton.setAttribute("data-transcript-id", transcriptId);

    const { srt } = await pollTranscript(transcriptId);
    transcribeButton.disabled = false;
    translateButton.disabled = false;
    transcribeButton.removeAttribute("data-loading");
    transcribeButton.textContent = "Transcribe";
    makeToast({
      message: "Transcription completed!",
      status: "success",
    });
    const hindiSubtitleFilename = filenameToSubtitleFilename({
      filename: transcribeButton.getAttribute("data-file-name"),
      languageCode: "hi",
    });
    const subtitleFileId = await uploadToGoogleDrive({
      data: srt,
      filename: hindiSubtitleFilename,
    });
    makeToast({
      message: "Subtitles (Hindi) generated and uploaded to Google Drive!",
      status: "success",
      linkHref: fileIdToGoogleDriveLink(subtitleFileId),
      linkMessage: "View on Google Drive",
      isCloseable: true,
    });
  } catch (error) {
    transcribeButton.disabled = false;
    translateButton.disabled = false;
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
    modelSelect.disabled = true;
    transcribeButton.disabled = true;
    translateButton.disabled = true;
    translateButton.setAttribute("data-loading", true);
    translateButton.textContent = "Translating...";
    const { srt } = await getTranslationDetails({
      transcriptId,
      includeSRT: true,
      aiModel: modelSelect.value,
    });
    makeToast({
      message: "Translation completed!",
      status: "success",
    });

    const englishSubtitleFilename = filenameToSubtitleFilename({
      filename: transcribeButton.getAttribute("data-file-name"),
      languageCode: "en",
      aiModel: modelSelect.value,
    });

    const subtitleFileId = await uploadToGoogleDrive({
      data: srt,
      filename: englishSubtitleFilename,
    });
    makeToast({
      message: "Subtitles (English) generated and uploaded to Google Drive!",
      status: "success",
      linkHref: fileIdToGoogleDriveLink(subtitleFileId),
      linkMessage: "View on Google Drive",
      isCloseable: true,
    });
  } catch (error) {
    makeToast({
      message: `Error: ${error.message}`,
      status: "error",
    });
  } finally {
    modelSelect.disabled = false;
    transcribeButton.disabled = false;
    translateButton.disabled = false;
    translateButton.removeAttribute("data-loading");
    translateButton.textContent = "Translate";
  }
}
