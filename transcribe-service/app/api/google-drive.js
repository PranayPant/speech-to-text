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
    console.log("Uploaded file to Google Drive:", response?.data?.id);
  } catch (error) {
    console.log("Error uploading file to Google Drive:", error.message);
    throw error;
  } finally {
    fs.unlink(filename, (error) => {
      if (error) {
        console.log("Error deleting file:", error.message);
      }
    });
  }
  return { fileId: response?.data?.id };
}

export async function getFileInfo({ fileId }) {
  let response;
  try {
    response = await drive.files.get({
      fileId,
      fields: "name,webViewLink",
    });
  } catch (error) {
    console.log("Error getting file info from Google Drive:", error.message);
    throw error;
  }
  return {
    name: response?.data?.name,
    webViewLink: response?.data?.webViewLink,
  };
}

export async function setPermission({ fileId }) {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (error) {
    console.log("Failed to set permission on file:", fileId, error.message);
  }
}
