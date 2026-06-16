// netlify/functions/create-project.js
import { ok, bad, readBody, cfg } from "./_lib/config.js";
import {
  createBoard, createGroup, createColumn, createItem,
  updateBoardDescription, columnTypeFor,
} from "./_lib/monday.js";
import { createProjectFolder, saveJsonFile, driveConfigured } from "./_lib/drive.js";
import { ALL_TEXT_FIELDS, BINDER_ITEMS } from "../../public/js/schema.js";

// Description marker so we can recover the field->column mapping on edit.
const MARK_OPEN = "[kickoff-app]";
const MARK_CLOSE = "[/kickoff-app]";

export async function handler(event) {
  if (event.httpMethod !== "POST") return bad("Use POST", 405);
  const { data = {}, binders = {} } = readBody(event);
  const projectName = (data.project || "").trim();
  if (!projectName) return bad("Project name is required.");

  const result = { project: projectName };
  const warnings = [];

  // 1) Google Drive folder + kickoff snapshot (best-effort)
  if (driveConfigured()) {
    try {
      const folder = await createProjectFolder(projectName);
      result.folder_id = folder.id;
      result.folder_url = folder.url;
      await saveJsonFile(folder.id, `${projectName} - kickoff.json`, {
        project: projectName, data, binders, created_at: new Date().toISOString(),
      });
    } catch (e) {
      warnings.push("Drive: " + e.message);
    }
  } else {
    warnings.push("Drive not configured (GOOGLE_SERVICE_ACCOUNT_JSON missing).");
  }

  // 2) Monday board
  try {
    const boardId = await createBoard(projectName, cfg.mondayWorkspaceId);
    result.board_id = boardId;

    // Columns for every text field + checkbox columns for binder needs.
    const mapping = {};
    for (const f of ALL_TEXT_FIELDS) {
      if (f.key === "project") continue; // project name is the item name
      mapping[f.key] = await createColumn(boardId, f.label, columnTypeFor(f));
    }
    for (const b of BINDER_ITEMS) {
      mapping[b.key] = await createColumn(boardId, b.label, "checkbox");
    }

    const groupId = await createGroup(boardId, "Project Info");

    // Build column values for the single kickoff item.
    const cols = {};
    for (const f of ALL_TEXT_FIELDS) {
      const colId = mapping[f.key];
      if (!colId) continue;
      const v = data[f.key];
      if (v === undefined || v === null || v === "") continue;
      if (f.type === "textarea") cols[colId] = { text: String(v) };
      else if (f.type === "date") cols[colId] = { date: String(v) };
      else cols[colId] = String(v);
    }
    for (const b of BINDER_ITEMS) {
      cols[mapping[b.key]] = { checked: binders[b.key] ? "true" : "false" };
    }

    const itemId = await createItem(boardId, groupId, projectName, cols);
    result.item_id = itemId;

    // Persist mapping in the board description for later edits.
    const meta = JSON.stringify({ version: 1, itemId, map: mapping });
    const desc = `Project kickoff board for ${projectName}.\n${MARK_OPEN}${meta}${MARK_CLOSE}`;
    await updateBoardDescription(boardId, desc);

    result.board_url = `https://view.monday.com/boards/${boardId}`;
  } catch (e) {
    // Monday is the core deliverable — surface this as an error.
    return bad(
      "Monday board creation failed: " + e.message +
      (warnings.length ? " | " + warnings.join(" | ") : ""),
      502
    );
  }

  if (warnings.length) result.warnings = warnings;
  return ok(result);
}

export { MARK_OPEN, MARK_CLOSE };
