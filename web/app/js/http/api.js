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
  const response = await fetch("/api/v1/transcribe", {
    method: "POST",
    body: JSON.stringify({ audio_url: uploadUrl }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Transcription initiation failed: ${response.statusText}`);
  }

  const { transcript_id } = await response.json();
  return transcript_id;
}

export async function getTranscriptDetails(params) {
  const searchParams = new URLSearchParams({
    transcript_id: params.transcriptId,
    include_srt: !!params.includeSRT,
    include_sentences: !!params.includeSentences,
    include_transcript: !!params.includeTranscript,
  });
  const response = await fetch(`/api/v1/transcript?${searchParams}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Fetching transcript details failed: ${response.statusText}`
    );
  }

  const transcriptDetails = await response.json();
  return transcriptDetails;
}

export async function getTranslationDetails(params) {
  const searchParams = new URLSearchParams({
    transcript_id: params.transcriptId,
    include_srt: !!params.includeSRT,
    include_sentences: !!params.includeSentences,
    include_transcript: !!params.includeTranscript,
    ai_model: params.aiModel,
  });
  const response = await fetch(`/api/v1/translate?${searchParams}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  const translationDetails = await response.json();
  return translationDetails;
}

export async function uploadToGoogleDrive({ data, filename }) {
  console.log("Uploading text file to Google Drive...", filename);
  const response = await fetch("/api/v1/drive/upload", {
    method: "POST",
    body: JSON.stringify({ text: data, file_name: filename }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const { file_id } = await response.json();
  return file_id;
}

export async function getFileInfo({ fileId }) {
  console.log("Fetching file info from Google Drive...", fileId);
  const params = new URLSearchParams({ file_id: fileId });
  const response = await fetch(`/api/v1/drive/info?${params}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Fetching file info failed: ${response.statusText}`);
  }

  const fileInfo = await response.json();
  return fileInfo;
}
