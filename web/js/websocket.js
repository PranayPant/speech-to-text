let socket = new WebSocket("ws://localhost:8000");

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
  banner.textContent = "WebSocket connection established successfully!";
  banner.style.position = "fixed";
  banner.style.top = "0";
  banner.style.left = "0";
  banner.style.width = "100%";
  banner.style.backgroundColor = "#008000";
  banner.style.color = "white";
  banner.style.textAlign = "center";
  banner.style.padding = "10px";
  document.body.appendChild(banner);

  setTimeout(() => {
    document.body.removeChild(banner);
  }, 3000);
}

function tryToConnect() {
  if (socket.readyState !== WebSocket.OPEN) {
    const banner = document.createElement("div");
    banner.textContent = "Trying to connect...";
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.width = "100%";
    banner.style.backgroundColor = "#FFA500";
    banner.style.color = "white";
    banner.style.textAlign = "center";
    banner.style.padding = "10px";
    document.body.appendChild(banner);

    setTimeout(() => {
      socket = new WebSocket("ws://localhost:8000");
      socket.onopen = function (event) {
        console.log("WebSocket connection established:", event);
        document.body.removeChild(banner);
        showSuccessBanner();
      };
      socket.onmessage = function ({ data: { event, data } }) {
        if (event === "progress") {
          if (typeof data === "string") {
            const banner = document.createElement("div");
            banner.textContent = data;
            banner.style.position = "fixed";
            banner.style.top = "0";
            banner.style.left = "0";
            banner.style.width = "100%";
            banner.style.backgroundColor = "#0000FF";
            banner.style.color = "white";
            banner.style.textAlign = "center";
            banner.style.padding = "10px";
            document.body.appendChild(banner);

            setTimeout(() => {
              document.body.removeChild(banner);
            }, 3000);
          } else if (typeof data === "number") {
            let progressBar = document.getElementById("progress-bar");
            if (!progressBar) {
              progressBar = document.createElement("div");
              progressBar.id = "progress-bar";
              progressBar.style.position = "fixed";
              progressBar.style.top = "0";
              progressBar.style.left = "0";
              progressBar.style.width = "0";
              progressBar.style.height = "5px";
              progressBar.style.backgroundColor = "#0000FF";
              document.body.appendChild(progressBar);
            }
            progressBar.style.width = `${data}%`;
          }
        }
      };
      socket.onerror = function (error) {
        console.error("WebSocket error:", error);
      };
      socket.onclose = function (event) {
        console.log("WebSocket connection closed:", event);
        tryToConnect();
      };
    }, 1000);
  }
}

tryToConnect();
