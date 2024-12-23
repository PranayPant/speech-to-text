import fs from "fs";
import OpenAI from "openai";

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to read SRT file
const readSRTFile = (filePath) => {
  console.log(`Reading SRT file from ${filePath}`);
  return fs.readFileSync(filePath, "utf-8");
};

// Function to translate text using OpenAI
export const translateText = async (text) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You read the given SRT file line by line and translate any Hindi text to English. You do not use text from subsequent blocks to translate the current block.",
      },
      { role: "user", content: text },
    ],
  });
  return response.choices[0].message.content.trim();
};

// Main function to read and translate SRT file
export const translateSRTFile = async (inputFilePath, outputFilePath) => {
  const srtContent = readSRTFile(inputFilePath);
  const translatedContent = await translateText(srtContent);
  fs.writeFileSync(outputFilePath, translatedContent, {
    encoding: "utf-8",
    flag: "w",
  });
  console.log(`Translated SRT file saved to ${outputFilePath}`);
};
