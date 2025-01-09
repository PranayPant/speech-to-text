import { getTranscriptDetails } from "../http/api.js";

export async function pollTranscript(transcriptId, interval = 5000) {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const { status, srt } = await getTranscriptDetails({
          transcriptId,
          includeSRT: true,
        });
        console.log("Transcript status:", status);
        if (status === "completed") {
          console.log("Transcript completed");
          resolve({ srt });
          clearInterval(intervalId);
        }
      } catch (error) {
        clearInterval(intervalId);
        reject(error.message);
      }
    };

    const intervalId = setInterval(checkStatus, interval);
  });
}
