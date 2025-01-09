import { fetchAssemblyAITranscript } from "../api/assemblyai.js";

export async function getTranscription({
  transcriptId,
  includeTranscript,
  includeSentences,
  includeSRT,
}) {
  const [transcriptResponse, sentencesResponse, srtResponse] =
    await Promise.all([
      includeTranscript && fetchAssemblyAITranscript({ transcriptId }),
      includeSentences &&
        fetchAssemblyAITranscript({ transcriptId, resource: "/sentences" }),
      includeSRT &&
        fetchAssemblyAITranscript({ transcriptId, resource: "/srt" }),
    ]);
  return {
    status: transcriptResponse?.data?.status,
    transcript: transcriptResponse?.data?.text,
    sentences: sentencesResponse?.data?.sentences?.map(
      ({ text, start, end }) => ({
        text,
        start,
        end,
      })
    ),
    srt: srtResponse?.data,
  };
}

export async function getTranscriptionProgress(transcriptId, ws, id) {
  const { status } = getTranscription({
    transcriptId,
    includeTranscript: true,
    includeSentences: false,
    includeSRT: false,
  });

  ws.send(
    JSON.stringify({
      event: "transcriptionInProgress",
      id,
      data: {
        message: `Transcription status: ${status}`,
        transcriptId,
      },
    })
  );

  if (status === "failed") {
    ws.send(
      JSON.stringify({
        event: "transcriptionFailed",
        id,
        data: {
          transcriptId,
          text: "Transcription failed",
        },
      })
    );
  } else if (status === "completed") {
    const { text, sentences, srt } = getTranscription({
      transcriptId,
      includeTranscript: true,
      includeSentences: false,
      includeSRT: false,
    });

    ws.send(
      JSON.stringify({
        event: "transcriptionComplete",
        id,
        data: {
          transcriptId,
          text,
          sentences,
          srt,
        },
      })
    );
  }
}
