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

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const { uploadUrl } = await response.json();
  return uploadUrl;
}

export async function initiateTranscription(uploadUrl) {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: JSON.stringify({ uploadUrl }),
  });

  if (!response.ok) {
    throw new Error(`Transcription initiation failed: ${response.statusText}`);
  }

  const { transcriptId } = await response.json();
  return transcriptId;
}

export async function getTranscriptDetails(params) {
  const response = await fetch("/api/transcript", {
    method: "POST",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Fetching transcript details failed: ${response.statusText}`);
  }

  const transcriptDetails = await response.json();
  return transcriptDetails;
}

export async function postTranslation(params) {
  const response = await fetch("/api/translate", {
    method: "POST",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  const { translationId } = await response.json();
  return translationId;
}
