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
  return fileLink;
}

export function filenameToSubtitleFilename({ filename, languageCode = "hi", aiModel }) {
  const nameWithoutExtension =
    filename?.substring(0, filename?.lastIndexOf(".")) || "subtitles";
  return `${nameWithoutExtension}${aiModel ? `.${aiModel}` : ''}.${languageCode}.srt`;
}
