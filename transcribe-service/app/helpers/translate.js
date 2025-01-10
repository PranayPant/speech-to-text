import OpenAI from "openai";

import { getTranscription } from "./transcribe.js";
import { generateSRT } from "./srt.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function translateSentences(params) {
  try {
    const { transcriptId, id, model } = params;
    console.log("Translating sentences...", transcriptId);

    const { sentences } = await getTranscription({
      transcriptId,
      includeTranscript: false,
      includeSentences: true,
      includeSRT: false,
    });
    const translationResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "developer",
          content:
            "You are given a stringified JSON array that represents a timestamped Hindi transcript that contains quotations in Sanskrit. Translate the text into English, skipping any quotations in Sanskrit, and return the modified array. Only include the array in the response so that it can be easily parsed by the client.",
        },
        { role: "user", content: JSON.stringify(sentences) },
      ],
    });

    const translatedSentences =
      translationResponse.choices[0].message.content.trim();
    return { transcriptId, sentences: JSON.parse(translatedSentences), id };
  } catch (error) {
    console.error("Error translating transcript:", error);
    throw `Error translating transcript: ${error.message}`;
  }
}

async function translateTranscript(params) {
  try {
    const { transcriptId, id, model } = params;
    console.log("Translating transcript...", transcriptId);

    const { transcript } = await getTranscription({
      transcriptId,
      includeTranscript: true,
      includeSentences: false,
      includeSRT: false,
      model,
    });
    const translationResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "developer",
          content:
            "Translate the given Hindi transcript into English, skipping any quotations in Sanskrit.",
        },
        { role: "user", content: transcript },
      ],
    });

    const translatedTranscript =
      translationResponse.choices[0].message.content.trim();
    return { transcriptId, transcript: translatedTranscript, id };
  } catch (error) {
    console.error("Error translating transcript:", error);
    throw `Error translating transcript: ${error.message}`;
  }
}

export async function getTranslation({
  includeSRT,
  includeTranscript,
  includeSentences,
  transcriptId,
  model = "gpt-4o",
}) {
  try {
    const [transcriptResult, sentencesResult] = await Promise.all([
      includeTranscript && translateTranscript({ transcriptId, model }),
      (includeSentences || includeSRT) &&
        translateSentences({ transcriptId, model }),
    ]);

    const transcript = transcriptResult?.transcript;
    const sentences = sentencesResult?.sentences;
    const srt = sentences && generateSRT(sentences);
    return {
      transcriptId,
      transcript: includeTranscript && transcript,
      sentences: includeSentences && sentences,
      srt: includeSRT && srt,
    };
  } catch (error) {
    console.error("Error fetching translation:", error);
    throw new Error(`Error fetching translation: ${error.message}`);
  }
}
