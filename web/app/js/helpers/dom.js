export function getVideoCard(id) {
  return document.querySelector(`div.video-card[data-card-id="${id}"]`);
}

export function getAppBanner() {
  return document.querySelector("div#app-banner");
}

export function getProgressBar(id) {
  const videoCard = getVideoCard(id);
  let progressBar = videoCard.querySelector("div.banner");

  if (!progressBar) {
    progressBar = document.createElement("div");
    progressBar.classList.add("banner");
    videoCard.appendChild(progressBar);
    const closeButton = document.createElement("span");
    closeButton.classList.add("close-button");
    closeButton.addEventListener("click", function () {
      videoCard.removeChild(progressBar);
    });
    progressBar.appendChild(closeButton);
  }

  return progressBar;
}

export function getDownloadButton({ buttonText, content, filename }) {
  const button = document.createElement("button");
  button.textContent = buttonText;
  button.setAttribute("data-type", "download");
  button.classList.add("secondary-dark");
  button.addEventListener("click", function () {
    downloadContent({ content, filename });
  });
  return button;
}

export function downloadContent({ content, filename }) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function makeToastForVideoCard({
  id,
  message,
  status,
  duration = 3000,
}) {
  makeToast({
    parentSelector: `div.video-card[data-card-id="${id}"]`,
    message,
    status,
    duration,
  });
}

export function makeToast({
  parentSelector = "body",
  message,
  status,
  linkMessage,
  linkHref,
  duration = 3000,
}) {
  const parentDiv = document.querySelector(parentSelector);
  const existingToast = parentDiv.querySelector("div.toast");
  const toastDiv = existingToast ?? document.createElement("div");
  toastDiv.classList.add("toast");
  toastDiv.setAttribute("data-status", status);
  toastDiv.textContent = message;
  if (linkMessage) {
    const link = document.createElement("link");
    link.textContent = linkMessage;
    link.classList.add("link");
    link.href = linkHref;
    link.rel = "noopener noreferrer";
  }
  if (!existingToast) parentDiv.appendChild(toastDiv);
  setTimeout(() => {
    parentDiv.removeChild(toastDiv);
  }, duration);
}
