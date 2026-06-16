// netlify/functions/update-project.js
import { ok, bad, readBody } from "./_lib/config.js";
import { getBoard, changeColumnValues, encodeColumnValues } from "./_lib/monday.js";
import { ALL_TEXT_FIELDS, BINDER_ITEMS } from "../../public/js/schema.js";
import { MARK_OPEN, MARK_CLOSE } from "./create-project.js";

function parseMeta(description) {
  if (!description) return null;
  const i = description.indexOf(MARK_OPEN);
  const j = description.indexOf(MARK_CLOSE);
  if (i === -1 || j === -1) return null;
  try { return JSON.parse(description.slice(i + MARK_OPEN.length, j)); }
  catch { return null; }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return bad("Use POST", 405);
  const { id, data = {}, binders = {} } = readBody(event);
  if (!id) return bad("Missing board id.");

  try {
    const board = await getBoard(id);
    if (!board) return bad("Board not found.", 404);

    const meta = parseMeta(board.description);
    if (!meta?.map || !meta?.itemId) {
      return bad(
        "This board wasn't created by the app (no field mapping found), so it can't be edited automatically.",
        409
      );
    }

    const cols = encodeColumnValues(
      meta.map, data, binders, ALL_TEXT_FIELDS, BINDER_ITEMS
    );
    await changeColumnValues(id, meta.itemId, cols);

    return ok({ id, item_id: meta.itemId, updated: Object.keys(cols).length });
  } catch (e) {
    return bad("Could not update project: " + e.message, 502);
  }
}
