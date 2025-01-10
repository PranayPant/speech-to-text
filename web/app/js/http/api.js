export async function uploadBinaryData(binaryData, mimeType) {
  console.log("Uploading media file...", mimeType);
  const blob = new Blob([binaryData], { type: mimeType });
  const response = await fetch("/api/upload", {
    method: "POST",
    body: blob,
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
    throw new Error(
      `Fetching transcript details failed: ${response.statusText}`
    );
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

  const translationDetails = await response.json();
  return translationDetails;
}

export async function uploadToGoogleDrive({ data, filename }) {
  console.log("Uploading text file to Google Drive...", filename);
  const response = await fetch("/api/drive/upload/text", {
    method: "POST",
    body: JSON.stringify({ data, filename }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const { fileId } = await response.json();
  return fileId;
}

export async function getFileInfo({ fileId }) {
  console.log("Fetching file info from Google Drive...", fileId);
  const response = await fetch("/api/drive/get/file", {
    method: "POST",
    body: JSON.stringify({ fileId }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetching file info failed: ${response.statusText}`);
  }

  const fileInfo = await response.json();
  return fileInfo;
}
