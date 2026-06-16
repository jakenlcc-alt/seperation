// netlify/functions/_lib/config.js
// Central place for environment configuration + small helpers.
// Set these in Netlify → Site settings → Environment variables.

export const cfg = {
  // ---- Cloudflare Worker that holds the Monday.com token ----
  // The app POSTs { query, variables } (Monday GraphQL) to this URL.
  mondayWorkerUrl: process.env.MONDAY_WORKER_URL || "",
  // Optional shared secret sent as `Authorization: Bearer <key>` to the Worker.
  mondayWorkerKey: process.env.MONDAY_WORKER_KEY || "",
  // Monday workspace new boards are created in (optional; omit for "main").
  mondayWorkspaceId: process.env.MONDAY_WORKSPACE_ID || "",

  // ---- Google Drive ----
  // JSON key for a Google service account with access to the JAKES BRAIN folder.
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
  // The "04_Projects" folder ID inside JAKES BRAIN — new project folders go here.
  driveProjectsFolderId: process.env.DRIVE_PROJECTS_FOLDER_ID || "16w_Y_-ZzsZsiDSnJaSkKjGKtKau09dy6",
};

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function ok(body) { return json(200, body); }
export function bad(msg, code = 400) { return json(code, { error: msg }); }

export function readBody(event) {
  try { return JSON.parse(event.body || "{}"); }
  catch { return {}; }
}
