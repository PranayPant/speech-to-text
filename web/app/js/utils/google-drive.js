const GOOGLE_DRIVE_LINK_REGEX =
  /https:\/\/drive.google.com\/file\/d\/([a-zA-Z0-9-_]+)\//;

function googleDriveLinkToAssemblyAIAudioURL(fileId) {
  return `https://drive.google.com/u/0/uc?id=${fileId}&export=download`;
}

export function processGoogleDriveLink(link) {
  const match = link.match(GOOGLE_DRIVE_LINK_REGEX);
  if (match) {
    const fileId = match[1];
    const audioUrl = googleDriveLinkToAssemblyAIAudioURL(fileId);
    return { fileId, audioUrl };
  }
  return null;
}

export function fileIdToGoogleDriveLink(fileId) {
  // not accessible from non-localhost webpage
  const fileLink = `https://drive.google.com/file/d/${fileId}/view`;
  const srtFolderLink =
    "https://drive.google.com/drive/folders/1KpTIqw9D_cdumHBkvBKQS_-acfkc1H71";
  return srtFolderLink;
}

export function filenameToSubtitleFilename({ filename, language_code = "hi" }) {
  const nameWithoutExtension =
    filename?.substring(0, filename?.lastIndexOf(".")) || "subtitles";
  return `${nameWithoutExtension}.${language_code}.srt`;
}
