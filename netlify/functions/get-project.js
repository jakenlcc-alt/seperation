// netlify/functions/get-project.js
import { ok, bad } from "./_lib/config.js";
import { getBoard } from "./_lib/monday.js";
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
  const id = event.queryStringParameters?.id;
  if (!id) return bad("Missing board id.");

  try {
    const board = await getBoard(id);
    if (!board) return bad("Board not found.", 404);

    const meta = parseMeta(board.description);
    const item = board.items_page?.items?.[0];
    const data = { project: board.name };
    const binders = {};

    if (meta?.map && item) {
      // invert columnId -> fieldKey
      const byCol = {};
      for (const [k, colId] of Object.entries(meta.map)) byCol[colId] = k;
      const fieldByKey = Object.fromEntries(ALL_TEXT_FIELDS.map((f) => [f.key, f]));
      const binderKeys = new Set(BINDER_ITEMS.map((b) => b.key));

      for (const cv of item.column_values || []) {
        const key = byCol[cv.id];
        if (!key) continue;
        if (binderKeys.has(key)) {
          let checked = false;
          try { checked = JSON.parse(cv.value || "{}").checked === "true"; } catch {}
          binders[key] = checked;
        } else if (fieldByKey[key]) {
          data[key] = cv.text || "";
        }
      }
    }

    return ok({
      id, data, binders,
      board_url: board.url,
      mapped: Boolean(meta?.map),
    });
  } catch (e) {
    return bad("Could not load project: " + e.message, 502);
  }
}
