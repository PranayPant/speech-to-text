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

export async function uploadToGoogleDrive() {
  const response = await drive.files.list({
    q: `mimeType='audio/*'`,
  });
  return response;
}
