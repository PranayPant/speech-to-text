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
      if (typeof data === "string") {
        progressBar.textContent = data;
        progressBar.style.position = "fixed";
        progressBar.style.top = "0";
        progressBar.style.left = "0";
        progressBar.style.width = "100%";
        progressBar.style.backgroundColor = "#0000FF";
        progressBar.style.color = "white";
        progressBar.style.textAlign = "center";
        progressBar.style.padding = "10px";
      } else if (typeof data === "number") {
        progressBar.style.position = "fixed";
        progressBar.style.top = "0";
        progressBar.style.left = "0";
        progressBar.style.width = "0";
        progressBar.style.height = "5px";
        progressBar.style.backgroundColor = "#0000FF";
        progressBar.style.width = `${data}%`;
      }
      break;
    case "transcriptionComplete":
      if (!progressBar) {
        progressBar = document.createElement("div");
        progressBar.id = "progress-bar";
        document.body.appendChild(progressBar);
      }
      progressBar.style.backgroundColor = "#008000";
      const downloadLink = document.createElement("a");
      downloadLink.style.display = "inline-block";
      downloadLink.style.marginLeft = "16px";
      downloadLink.style.padding = "10px 20px";
      downloadLink.style.backgroundColor = "#4CAF50";
      downloadLink.style.color = "white";
      downloadLink.style.textDecoration = "none";
      downloadLink.style.borderRadius = "5px";
      downloadLink.href = URL.createObjectURL(
        new Blob([data.text], { type: "text/plain" })
      );
      downloadLink.download = "transcription.txt";
      downloadLink.textContent = "Download Transcription";
      progressBar.appendChild(downloadLink);
      downloadLink.addEventListener("click", function () {
        document.body.removeChild(progressBar);
      });
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
