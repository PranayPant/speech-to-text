const UPLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB

export async function uploadBinaryDataInChunks(binaryData, mimeType) {
  console.log("Uploading media file in chunks...");

  const startTime = Date.now();

  const blob = new Blob([binaryData], { type: mimeType });
  const totalChunks = Math.ceil(blob.size / UPLOAD_CHUNK_SIZE);

  const blobParts = [];
  for (let i = 0; i < totalChunks; i++) {
    blobParts.push(
      blob.slice(i * UPLOAD_CHUNK_SIZE, (i + 1) * UPLOAD_CHUNK_SIZE)
    );
  }

  console.log(
    "Total file size:",
    (blob.size / (1024 * 1024)).toFixed(2) + " MB",
    "totalChunks:",
    totalChunks
  );

  const uploadPromises = blobParts.map((blobPart, index) => {
    return uploadBinaryData(blobPart, mimeType, {
      isMultiPart: true,
      headers: {
        "x-chunk-index": index,
        "x-total-chunks": totalChunks,
        "x-file-size": blob.size,
        'x-chunk-size': blobPart.size,
        'x-chunk-offset': index * blobPart.size,
        'content-type': mimeType,
        'content-length': blobPart.size,
      },
    });
  });

  const uploadResponses = await Promise.all(uploadPromises);
  const uploadUrl = uploadResponses.find(
    (res) => res.status === "completed"
  )?.uploadUrl;

  // const uploadUrl = await uploadBinaryData(
  //   new Blob(blobParts, { type: mimeType }),
  //   mimeType
  // );

  const endTime = Date.now();
  const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
  console.log("Upload complete", uploadUrl);
  console.log("Time taken:", timeTaken, "seconds");

  return uploadUrl;
}

export async function uploadBinaryData(
  binaryData,
  mimeType,
  { headers = {}, isMultiPart = false }
) {
  const blob = new Blob([binaryData], { type: mimeType });
  console.log("Uploading media file of size", blob.size);

  const response = await fetch(
    `/api/${isMultiPart ? "multipart-upload" : "upload"}`,
    {
      method: "POST",
      body: blob,
      headers: {
        "Content-Type": "application/octet-stream",
        ...headers,
      },
    }
  );

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
