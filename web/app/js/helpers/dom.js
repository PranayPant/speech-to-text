export function getVideoCard(id) {
  return document.querySelector(`div.video-card[data-card-id="${id}"]`);
}

export function getAppBanner() {
  return document.querySelector("div#app-banner");
}

export function getProgressBar(id, event) {
  const videoCard = getVideoCard(id);
  let progressBar = videoCard.querySelector("div.banner");

  if (!progressBar) {
    progressBar = document.createElement("div");
    progressBar.id = "progress-bar";
    progressBar.classList.add("progress-bar");
    progressBar.setAttribute("data-message-id", id);
    videoCard.appendChild(progressBar);
    const closeButton = document.createElement("span");
    closeButton.classList.add("close-button");
    closeButton.addEventListener("click", function () {
      videoCard.removeChild(progressBar);
    });
    progressBar.appendChild(closeButton);
  }
  progressBar.setAttribute("data-event", event);

  return progressBar;
}

export function getDownloadButton(buttonText, content, filename) {
  const button = document.createElement("button");
  button.textContent = buttonText;
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
  return button;
}
