import fs from "fs";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";

async function uploadToAssemblyAI(binaryData) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  const url = "https://api.assemblyai.com/v2/upload";
  console.log("Uploading audio to AssemblyAI...");
  const startTime = Date.now();

  const response = await axios.post(url, binaryData, {
    headers: {
      authorization: apiKey,
      "content-type": "application/octet-stream",
    },
    maxBodyLength: MAX_PAYLOAD_SIZE,
  });

  const endTime = Date.now();

  const uploadTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`Audio uploaded to AssemblyAI in ${uploadTimeInSeconds} seconds`);
  console.log("Response:", response.status, response.data);

  return response;
}

async function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec("libmp3lame")
      .audioQuality(0) // Highest quality
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

export async function uploadExtractedAudio() {
try {
    const filePath = "./uploaded_video.mp4";
    fs.writeFileSync(filePath, data);

    // Extract audio from the uploaded video
    const audioPath = "./extracted_audio.mp3";
    await extractAudio(filePath, audioPath);
    const response = await uploadToAssemblyAI(fs.readFileSync(audioPath));
    return response.data.upload_url;
} catch (error) {
    console.error("Error during upload and extraction process:", error);
    throw error;
}
}
