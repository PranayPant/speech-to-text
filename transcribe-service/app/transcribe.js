export async function transcribeAudio() {
  try {
    const transcriptResponse = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: uploadUrl,
        language_code: "hi",
      },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },
      }
    );
    return transcriptResponse.data.id;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}
