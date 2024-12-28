// Function to convert milliseconds to SRT timestamp format
function formatTimestamp(ms) {
  const hours = Math.floor(ms / 3600000)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((ms % 3600000) / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const milliseconds = (ms % 1000).toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

// Function to generate SRT content from an array of subtitle objects
export function generateSRT(data, split = true) {
  const subtitles = split ? splitSentences(data) : data;
  return subtitles
    .map(({ start, end, text }, index) => {
      const startTime = formatTimestamp(start);
      const endTime = formatTimestamp(end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
    })
    .join("\n");
}

function splitSentences(sentences, maxLength = 80) {
  const newSentences = [];

  sentences.forEach((sentence) => {
    const { text, start, end } = sentence;

    // If the sentence is within the max length, keep it as is
    if (text.length <= maxLength) {
      newSentences.push(sentence);
    } else {
      // Split sentence into smaller parts
      const words = text.split(" ");
      const parts = [];
      let currentPart = "";

      words.forEach((word) => {
        if (currentPart.length + word.length + 1 <= maxLength) {
          currentPart += (currentPart.length ? " " : "") + word;
        } else {
          parts.push(currentPart);
          currentPart = word;
        }
      });

      if (currentPart) parts.push(currentPart);

      // Calculate time for each part
      const totalTime = end - start;
      const timePerChar = totalTime / text.length;
      const charCounts = parts.map((part) => part.length);
      const timeSplits = charCounts.map((count) =>
        Math.ceil(count * timePerChar)
      );

      let partStart = start;
      parts.forEach((part, index) => {
        const partEnd = partStart + timeSplits[index];
        newSentences.push({ text: part, start: partStart, end: partEnd });
        partStart = partEnd;
      });
    }
  });

  return newSentences;
}
