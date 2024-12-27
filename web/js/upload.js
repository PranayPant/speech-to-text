import { sendTranscribeRequest, sendTranslateRequest } from "./websocket.js";
import { nanoid } from "./nanoid.js";

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
    const id = nanoid();
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
    transcribeButton.id = `transcribe-${id}`;
    transcribeButton.className = "primary-action";
    transcribeButton.textContent = "Transcribe";
    transcribeButton.addEventListener("click", function () {
      console.log("transcribeButton clicked", id);
      sendTranscribeRequest(file, id);
    });

    const translateButton = document.createElement("button");
    translateButton.id = `translate-${id}`;
    translateButton.disabled = true;
    translateButton.className = "primary-action";
    translateButton.textContent = "Translate";
    translateButton.addEventListener("click", function () {
      sendTranslateRequest(
        document
          .getElementById(`transcribe-${id}`)
          .getAttribute("data-transcript-id"),
        id
      );
    });

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";

    buttonGroup.appendChild(transcribeButton);
    buttonGroup.appendChild(translateButton);

    videoCard.appendChild(buttonGroup);
    videoCard.appendChild(deleteIcon);

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
