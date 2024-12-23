import express from "express";
import fs from "fs";
import path from "path";
import { translateText, translateSRTFile } from "./translate.js";

const app = express();
const port = 8001;

app.use(express.json());

app.post("/translate", async (req, res) => {
  try {
    const { srtContent } = req.body;

    if (!srtContent) {
      return res.status(400).send("Invalid request payload");
    }

    const translatedContent = await translateText(srtContent);

    const outputPath = path.join("/data", `translated_en_${Date.now()}.srt`);
    fs.writeFileSync(outputPath, translatedContent);

    res.send(translatedContent);
  } catch (error) {
    console.error(error.message);
    console.error(error.response.data);
    res.status(500).send("Error translating SRT file");
  }
});
app.post("/translateFile", async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).send("Invalid request payload");
    }

    const inputPath = path.join("/data", fileName);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).send("File not found");
    }

    const outputPath = path.join("/data", `translated_${fileName}`);

    const translatedContent = await translateSRTFile(inputPath, outputPath);

    res.send(translatedContent);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Error translating SRT file");
  }
});
app.post("/translateSRTBlocks", async (req, res) => {
    try {
        const { fileName } = req.body;

        if (!fileName) {
            return res.status(400).send("Invalid request payload");
        }

        const inputPath = path.join("/data", fileName);
        if (!fs.existsSync(inputPath)) {
            return res.status(404).send("File not found");
        }

        const srtContent = fs.readFileSync(inputPath, "utf-8");
        const blocks = srtContent.split("\n\n");

        const translatedBlocks = await Promise.all(
            blocks.map(async (block) => {
                const lines = block.split("\n");
                if (lines.length > 2) {
                    const subtitleText = lines.slice(2).join(" ");
                    const translatedText = await translateText(subtitleText);
                    return `${lines[0]}\n${lines[1]}\n${translatedText}`;
                }
                return block;
            })
        );

        const translatedContent = translatedBlocks.join("\n\n");
        const outputPath = path.join("/data", `translated_blocks_${fileName}`);
        fs.writeFileSync(outputPath, translatedContent);

        res.send(translatedContent);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error translating SRT file blocks");
    }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
