export async function uploadBinaryData(binaryData) {
  const formData = new FormData();
  formData.append("blob", new Blob([binaryData]), "audio.mp3");
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });
  const { uploadUrl } = await response.json();

  return uploadUrl;
}

export async function initiateTranscription(uploadUrl) {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: JSON.stringify({ uploadUrl }),
  });
  const { transcriptId } = await response.json();

  return transcriptId;
}

export async function getTranscriptDetails(params) {
  const response = await fetch("/api/transcript", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const transcriptDetails = await response.json();
  return transcriptDetails;
}

export async function postTranslation(params) {
  const response = await fetch("/api/translate", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const { translationId } = await response.json();
  return translationId;
}
