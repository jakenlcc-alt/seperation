// netlify/functions/_lib/monday.js
// Thin Monday.com client that talks to your Cloudflare Worker.
//
// Contract (matches the deployed `monday-token-keeper` worker):
//   POST <MONDAY_WORKER_URL>            (the worker ignores the path)
//   headers: { Content-Type: application/json }
//   body:    { "query": "<graphql>", "variables": { ... } }
//   -> the Worker injects env.MONDAY_TOKEN and forwards JSON bodies to
//      https://api.monday.com/v2 (and multipart bodies to /v2/file),
//      returning Monday's raw JSON response.
//
// If your Worker uses a different shape, this is the ONE file to adjust.

import { cfg } from "./config.js";

export async function mondayGraphQL(query, variables = {}) {
  if (!cfg.mondayWorkerUrl) {
    throw new Error("MONDAY_WORKER_URL is not configured yet.");
  }
  const endpoint = cfg.mondayWorkerUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json" };
  // The proxy holds the Monday token itself; an optional shared secret can
  // be sent if you later add auth to the Worker.
  if (cfg.mondayWorkerKey) headers["Authorization"] = `Bearer ${cfg.mondayWorkerKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new Error(`Worker returned non-JSON (${res.status}): ${text.slice(0, 300)}`); }

  if (!res.ok) throw new Error(`Worker error ${res.status}: ${text.slice(0, 300)}`);
  if (payload.errors?.length) {
    throw new Error("Monday API: " + payload.errors.map((e) => e.message).join("; "));
  }
  return payload.data;
}

/* ---------- high level operations ---------- */

// Maps our schema field types -> Monday column types.
export function columnTypeFor(field) {
  if (field.type === "textarea") return "long_text";
  if (field.type === "date") return "date";
  return "text";
}

export async function createBoard(name, workspaceId) {
  // Only include workspace_id when provided — Monday rejects a null value.
  const q = workspaceId
    ? `mutation ($name: String!, $ws: ID!) {
         create_board(board_name: $name, board_kind: public, workspace_id: $ws) { id }
       }`
    : `mutation ($name: String!) {
         create_board(board_name: $name, board_kind: public) { id }
       }`;
  const vars = workspaceId ? { name, ws: workspaceId } : { name };
  const data = await mondayGraphQL(q, vars);
  return data.create_board.id;
}

export async function createGroup(boardId, title) {
  const q = `
    mutation ($board: ID!, $title: String!) {
      create_group(board_id: $board, group_name: $title) { id }
    }`;
  const data = await mondayGraphQL(q, { board: boardId, title });
  return data.create_group.id;
}

export async function createColumn(boardId, title, columnType) {
  const q = `
    mutation ($board: ID!, $title: String!, $type: ColumnType!) {
      create_column(board_id: $board, title: $title, column_type: $type) { id }
    }`;
  const data = await mondayGraphQL(q, { board: boardId, title, type: columnType });
  return data.create_column.id;
}

export async function createItem(boardId, groupId, itemName, columnValues) {
  const q = `
    mutation ($board: ID!, $group: String, $name: String!, $cols: JSON) {
      create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols) { id }
    }`;
  const data = await mondayGraphQL(q, {
    board: boardId, group: groupId || null, name: itemName,
    cols: JSON.stringify(columnValues || {}),
  });
  return data.create_item.id;
}

export async function updateBoardDescription(boardId, description) {
  const q = `
    mutation ($board: ID!, $desc: String!) {
      update_board(board_id: $board, board_attribute: description, new_value: $desc)
    }`;
  return mondayGraphQL(q, { board: boardId, desc: description });
}

export async function changeColumnValues(boardId, itemId, columnValues) {
  const q = `
    mutation ($board: ID!, $item: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $board, item_id: $item, column_values: $cols) { id }
    }`;
  return mondayGraphQL(q, {
    board: boardId, item: itemId, cols: JSON.stringify(columnValues),
  });
}

// Read a board's description + its first item's column values.
export async function getBoard(boardId) {
  const q = `
    query ($board: [ID!]) {
      boards(ids: $board) {
        id
        name
        description
        url
        items_page(limit: 1) {
          items { id name column_values { id text value } }
        }
      }
    }`;
  const data = await mondayGraphQL(q, { board: [boardId] });
  return data.boards?.[0] || null;
}

// List boards (for the "edit existing" picker).
export async function listBoards(limit = 100) {
  const q = `
    query ($limit: Int!) {
      boards(limit: $limit, order_by: created_at, state: active) { id name url }
    }`;
  const data = await mondayGraphQL(q, { limit });
  return data.boards || [];
}

/* ---------- column value encoding ---------- */

// Build a Monday column_values object from our field map + binder map,
// given a {fieldKey|binderKey -> columnId} mapping.
export function encodeColumnValues(mapping, data, binders, textFields, binderItems) {
  const cols = {};
  for (const f of textFields) {
    const colId = mapping[f.key];
    if (!colId) continue;
    const v = data[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "textarea") cols[colId] = { text: String(v) };
    else if (f.type === "date") cols[colId] = { date: String(v) };
    else cols[colId] = String(v);
  }
  for (const b of binderItems) {
    const colId = mapping[b.key];
    if (!colId) continue;
    cols[colId] = { checked: binders[b.key] ? "true" : "false" };
  }
  return cols;
}
