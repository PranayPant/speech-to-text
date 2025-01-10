import fs from "fs";
import { google } from "googleapis";

import { GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS_FILE_PATH } from "../constants.js";

if (!fs.existsSync(GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS_FILE_PATH)) {
  fs.writeFileSync(
    GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS_FILE_PATH,
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS
  );
}

const auth = new google.auth.GoogleAuth({
  keyFile: GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS_FILE_PATH,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

export async function uploadToGoogleDrive({ data, filename }) {
  fs.writeFileSync(filename, data, { flag: "w" });

  let response;
  try {
    response = await drive.files.create({
      requestBody: {
        name: filename,
        fields: "id",
        parents: [process.env.GOOGLE_DRIVE_SRT_FOLDER_ID],
      },
      media: {
        mimeType: "text/plain",
        body: fs.createReadStream(filename),
      },
    });
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    throw error;
  } finally {
    fs.unlink(filename, (error) => {
      if (error) {
        console.error("Error deleting file:", error);
      }
    });
  }
  return { fileId: response?.data?.id };
}
