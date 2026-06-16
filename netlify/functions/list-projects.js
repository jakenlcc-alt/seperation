// netlify/functions/list-projects.js
import { ok, bad } from "./_lib/config.js";
import { listBoards } from "./_lib/monday.js";

export async function handler() {
  try {
    const boards = await listBoards(150);
    const projects = boards.map((b) => ({ id: b.id, name: b.name, url: b.url }));
    return ok({ projects });
  } catch (e) {
    return bad("Could not list Monday boards: " + e.message, 502);
  }
}
