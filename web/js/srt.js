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
export function generateSRT(subtitles) {
  return subtitles
    .map((subtitle, index) => {
      const startTime = formatTimestamp(subtitle.startTimeInMilliSeconds);
      const endTime = formatTimestamp(subtitle.endTimeInMilliSeconds);
      return `${index + 1}\n${startTime} --> ${endTime}\n${
        subtitle.subtitleContent
      }\n`;
    })
    .join("\n");
}
