import { TEXT_GROUPS, BINDER_ITEMS, BINDER_GROUP_TITLE } from "./schema.js";

const API = "/.netlify/functions";

/* ---------- rendering ---------- */

function fieldInput(field, value = "") {
  const v = value ?? "";
  if (field.type === "textarea") {
    return `<textarea id="${field.key}" name="${field.key}">${escapeHtml(v)}</textarea>`;
  }
  const type = field.type === "date" ? "date" : "text";
  return `<input type="${type}" id="${field.key}" name="${field.key}" value="${escapeAttr(v)}" />`;
}

function renderGroups(container, data = {}, binders = {}) {
  let html = "";
  for (const group of TEXT_GROUPS) {
    html += `<div class="group"><h2>${group.title}</h2>`;
    for (const f of group.fields) {
      html += `
        <div class="field">
          <label for="${f.key}">${f.label}${f.required ? ' <span class="req">*</span>' : ""}</label>
          ${fieldInput(f, data[f.key])}
        </div>`;
    }
    html += `</div>`;
  }
  // binder checklist
  html += `<div class="group"><h2>${BINDER_GROUP_TITLE}</h2><div class="binder-grid">`;
  for (const item of BINDER_ITEMS) {
    const checked = binders[item.key] ? "checked" : "";
    html += `
      <label class="check">
        <input type="checkbox" name="binder__${item.key}" ${checked}/>
        <span>${item.label}</span>
      </label>`;
  }
  html += `</div></div>`;
  container.innerHTML = html;
}

/* ---------- form data ---------- */

function collectForm(form) {
  const fd = new FormData(form);
  const data = {};
  const binders = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("binder__")) binders[k.replace("binder__", "")] = true;
    else data[k] = v;
  }
  // ensure unchecked binders are recorded as false
  for (const item of BINDER_ITEMS) {
    if (!(item.key in binders)) binders[item.key] = false;
  }
  return { data, binders };
}

/* ---------- helpers ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

let toastTimer;
function toast(msg, kind = "") {
  const el = document.getElementById("toast");
  el.innerHTML = msg;
  el.className = "toast " + kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  if (kind !== "err") toastTimer = setTimeout(() => (el.hidden = true), 6000);
}

async function apiPost(path, body) {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function apiGet(path) {
  const res = await fetch(`${API}/${path}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/* ---------- tabs ---------- */

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "edit") loadProjectList();
  });
});

/* ---------- NEW project ---------- */

renderGroups(document.getElementById("form-fields"));

document.getElementById("kickoff-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("create-btn");
  const { data, binders } = collectForm(e.target);
  if (!data.project || !data.project.trim()) {
    toast("Project name is required.", "err");
    return;
  }
  btn.disabled = true;
  toast("Creating project… (Drive folder + Monday board)");
  try {
    const r = await apiPost("create-project", { data, binders });
    const links = [];
    if (r.board_url) links.push(`<a href="${r.board_url}" target="_blank">Open Monday board</a>`);
    if (r.folder_url) links.push(`<a href="${r.folder_url}" target="_blank">Open Drive folder</a>`);
    toast(`✅ Created <b>${escapeHtml(data.project)}</b>. ${links.join(" · ")}`, "ok");
    e.target.reset();
  } catch (err) {
    toast("❌ " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
});

/* ---------- EDIT existing ---------- */

async function loadProjectList() {
  const picker = document.getElementById("project-picker");
  try {
    const r = await apiGet("list-projects");
    const cur = picker.value;
    picker.innerHTML = `<option value="">— Select an existing project —</option>`;
    (r.projects || []).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      picker.appendChild(opt);
    });
    picker.value = cur;
  } catch (err) {
    toast("Couldn't load projects: " + err.message, "err");
  }
}

document.getElementById("reload-projects").addEventListener("click", loadProjectList);

document.getElementById("project-picker").addEventListener("change", async (e) => {
  const id = e.target.value;
  const form = document.getElementById("edit-form");
  if (!id) { form.hidden = true; return; }
  toast("Loading project…");
  try {
    const r = await apiGet(`get-project?id=${encodeURIComponent(id)}`);
    renderGroups(document.getElementById("edit-fields"), r.data || {}, r.binders || {});
    form.dataset.projectId = id;
    form.hidden = false;
    document.getElementById("edit-hint").textContent = r.board_url ? "" : "";
    toast("Loaded.", "ok");
  } catch (err) {
    toast("❌ " + err.message, "err");
  }
});

document.getElementById("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("save-btn");
  const id = e.target.dataset.projectId;
  const { data, binders } = collectForm(e.target);
  btn.disabled = true;
  toast("Saving changes…");
  try {
    await apiPost("update-project", { id, data, binders });
    toast("✅ Saved changes to Monday.", "ok");
  } catch (err) {
    toast("❌ " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
});
