import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

import { uploadAudioToAssemblyAI } from "./api.js";

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

export async function uploadExtractedAudio(data) {
  try {
    const filePath = "./uploaded_video.mp4";
    fs.writeFileSync(filePath, data);

    // Extract audio from the uploaded video
    const audioPath = "./extracted_audio.mp3";
    await extractAudio(filePath, audioPath);
    const response = await uploadAudioToAssemblyAI(fs.readFileSync(audioPath));
    return response.data.upload_url;
  } catch (error) {
    console.error("Error during upload and extraction process:", error);
    throw `Error during upload and extraction process: ${error.message}`;
  }
}
