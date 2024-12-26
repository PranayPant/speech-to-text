import { sendVideoFile, sendTranslateRequest } from "./websocket.js";

document
  .getElementById("mediaInput")
  .addEventListener("change", handleVideoUpload);
document
  .getElementById("clearButton")
  .addEventListener("click", clearVideoUploads);

function handleVideoUpload(event) {
  const files = event.target.files;
  const videoContainer = document.getElementById("videoContainer");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const videoElement = document.createElement("video");
    videoElement.controls = true;
    videoElement.src = URL.createObjectURL(file);
    const videoCard = document.createElement("div");
    videoCard.className = "video-card";
    videoCard.appendChild(videoElement);

    const deleteIcon = document.createElement("img");
    deleteIcon.className = "delete-icon";
    deleteIcon.src = "./icons/delete.png";
    deleteIcon.alt = "Delete";

    const transcribeButton = document.createElement("button");
    transcribeButton.className = "primary-action";
    transcribeButton.textContent = "Transcribe";
    transcribeButton.addEventListener("click", function () {
      sendVideoFile(file);
    });

    const translateButton = document.createElement("button");
    transcribeButton.disabled = true;
    translateButton.className = "primary-action";
    translateButton.textContent = "Translate";
    translateButton.addEventListener("click", function () {
      sendVideoFile(file);
    });

    videoCard.appendChild(deleteIcon);
    videoCard.appendChild(transcribeButton);
    videoContainer.appendChild(videoCard);
  }
}

function clearVideoUploads() {
  const mediaInput = document.getElementById("mediaInput");
  const videoContainer = document.getElementById("videoContainer");

  // Clear the file input
  mediaInput.value = "";

  // Remove all video elements from the container
  while (videoContainer.firstChild) {
    videoContainer.removeChild(videoContainer.firstChild);
  }
}
