// netlify/functions/_lib/drive.js
// Minimal Google Drive client using a service account.
// Creates a project folder under JAKES BRAIN/04_Projects and saves a
// kickoff JSON snapshot inside it.
//
// Requires GOOGLE_SERVICE_ACCOUNT_JSON (the full service-account key JSON)
// and the service account must be granted access to the 04_Projects folder.

import { google } from "googleapis";
import { cfg } from "./config.js";

export function driveConfigured() {
  return Boolean(cfg.googleServiceAccountJson);
}

function getDrive() {
  if (!driveConfigured()) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
  }
  let creds;
  try { creds = JSON.parse(cfg.googleServiceAccountJson); }
  catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON."); }

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

export async function createProjectFolder(name) {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [cfg.driveProjectsFolderId],
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  return { id: res.data.id, url: res.data.webViewLink };
}

export async function saveJsonFile(folderId, filename, obj) {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: {
      mimeType: "application/json",
      body: JSON.stringify(obj, null, 2),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  return { id: res.data.id, url: res.data.webViewLink };
}
