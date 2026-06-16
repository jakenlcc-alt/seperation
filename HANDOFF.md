# HANDOFF — Project Kickoff app

**You are continuing an existing project in a fresh session.** This packet
contains the complete, working codebase plus everything you need to finish.
Read this fully before acting.

---

## 0. FIRST ACTION (do this immediately)

This session should be bound to the repo **`jakenlcc-alt/project-info`** (public).
The previous session was accidentally bound to a different repo (`seperation`),
which is why that repo had the code and `project-info` was empty. The code is in
THIS zip. So:

1. Make sure these files are in the working tree (unzip into the repo root).
2. Commit everything and push to **`main`**:
   ```
   git add -A
   git commit -m "Import Project Kickoff app"
   git push -u origin main
   ```
3. Confirm `main` is the repo's default branch (GitHub → Settings → General).

Do NOT commit any secrets (see §6). This doc and `.env.example` are safe; never
commit a real worker URL, token, or service-account JSON.

---

## 1. WHAT THE APP IS

A web app for capturing **new job/project info** from the company "Kickoff
Checklist," then:

1. **Creating a Google Drive folder** under `JAKES BRAIN / 04_Projects / <project>`
   and saving a kickoff JSON snapshot there.
2. **Creating a new Monday.com board** ("job project board") for the project,
   with a column per checklist field and a checkbox per "Office Binder Need."
3. **Editing an existing Monday project** — pick a board and update its values.

It is plain HTML/CSS/JS (no build step) + **Netlify Functions** for the
secret-bearing server-side calls.

---

## 2. STRUCTURE

```
public/                 static frontend (Netlify publish dir)
  index.html
  css/styles.css
  js/app.js             form UI + API calls
  js/schema.js          SINGLE SOURCE OF TRUTH for kickoff fields
netlify/functions/
  _lib/config.js        env config + helpers
  _lib/monday.js        Monday client -> Cloudflare worker
  _lib/drive.js         Google Drive client (service account, lazy-loaded)
  create-project.js     Drive folder + Monday board
  list-projects.js      boards for the "edit" picker
  get-project.js        load one board's values
  update-project.js     save edits back to Monday
netlify.toml
package.json
```

---

## 3. THE KICKOFF DATA POINTS (in `public/js/schema.js`)

- **Overview:** Project, Builder, Builder POC info
- **Time Schedule:** Estimated Start date, Estimated Duration
- **Invoicing:** Invoicing
- **Resources:** Material ordering, What supplier(s), Material quotes,
  Equipment needs, Manpower
- **Hand-off meeting:** Who, Date
- **Additional Office Binder Needs** (checkboxes): Statement of Values, Job cost
  sheet, New Job information sheet, Estimate, Contract, Architecture drawings,
  Shop Drawings, Takeoff, Submittals, Submittal approval, Scope, Road Map,
  Spec Sheet, Other - Binders -, Safety Plan Binder

On board creation: each text field becomes a Monday column, each binder need a
checkbox column, and a field→column mapping is stored in the board description
between `[kickoff-app]...[/kickoff-app]` markers so edits can find the columns.

---

## 4. MONDAY INTEGRATION (Cloudflare worker)

The app never holds the Monday token. It POSTs to a Cloudflare worker named
**`monday-token-keeper`** which injects the token (`env.MONDAY_TOKEN`) and
forwards to Monday.

Worker contract (confirmed from its source):
- `POST <worker-url>` with `{ "query": "...", "variables": {...} }` (JSON)
  → forwarded to `https://api.monday.com/v2`, returns raw Monday JSON.
- `POST <worker-url>` with multipart → forwarded to `/v2/file`.
- The worker **ignores the path**, so post to the **base URL** (NOT `/graphql`).
- Currently **no auth** on the worker (open proxy).

`_lib/monday.js` already matches this. Set the worker URL via the Netlify env
var `MONDAY_WORKER_URL` (the user has the URL — ask them; do not hardcode it in
this public repo). Code posts to the base URL as-is.

---

## 5. GOOGLE DRIVE INTEGRATION

- `_lib/drive.js` uses `googleapis` with a **service account**.
- It is **lazy-loaded** and `googleapis` is marked `external_node_modules` in
  `netlify.toml`, so a no-build / drag-and-drop deploy still runs the Monday
  flow; Drive simply stays disabled until configured.
- To enable Drive: set Netlify env `GOOGLE_SERVICE_ACCOUNT_JSON` (full key JSON)
  and share the `04_Projects` folder with the service account email.
- `04_Projects` folder id is already defaulted in config:
  `16w_Y_-ZzsZsiDSnJaSkKjGKtKau09dy6` (env `DRIVE_PROJECTS_FOLDER_ID`).

Setting up the service account (Google Cloud): create/pick a project → enable
the Drive API → create a service account → create a JSON key → share the
`04_Projects` Drive folder with the service account's email (Editor).

---

## 6. SECURITY (important — repo is PUBLIC)

- **Never commit** the worker URL, Monday token, or service-account JSON. They
  belong only in Netlify environment variables.
- The `monday-token-keeper` worker is an **open proxy** (no auth). Recommend
  adding an `Authorization: Bearer <secret>` check to it; `_lib/monday.js`
  already sends `MONDAY_WORKER_KEY` if set.
- A Monday API token is sitting in plaintext in a Google Drive file
  (`monday-proxy-worker.js`, the old Metal Trim proxy). Recommend rotating that
  token in Monday (Admin → API) and deleting those copies.

---

## 7. DEPLOY (Netlify)

1. Push this repo to GitHub (`project-info`, branch `main`).
2. Netlify → Add new site → Import from GitHub → pick `jakenlcc-alt/project-info`,
   branch `main`. Build settings come from `netlify.toml`
   (publish `public`, functions `netlify/functions`).
3. Add env var `MONDAY_WORKER_URL` (worker base URL from the user).
4. Deploy → open the site → "New Project" with a test name → it should create a
   Monday board with all the kickoff columns. (Drive folder is skipped until
   `GOOGLE_SERVICE_ACCOUNT_JSON` is set — that's expected.)

If `create-project` errors, read the Netlify function log for `create-project`.

---

## 8. STATUS CHECKLIST

- [x] App scaffolded (frontend + 4 functions + shared schema)
- [x] Monday client wired to the `monday-token-keeper` worker (base URL, JSON)
- [x] `create_board` omits `workspace_id` when unset (Monday rejects null)
- [x] Google Drive made optional/lazy so zip/drag deploys work for Monday
- [ ] Push this code to `project-info` main  ← DO FIRST
- [ ] Netlify site imported + `MONDAY_WORKER_URL` set
- [ ] Live smoke test of "New Project" (creates a Monday board)
- [ ] Google service account set up → Drive folder creation enabled
- [ ] (Recommended) add auth to the worker; rotate the exposed Monday token

---

## 9. NOTES / DECISIONS

- The user prefers concise, plain-language answers (not very technical).
- Develop on `main` for this repo (it's the deploy branch).
- Google Drive `JAKES BRAIN` folder id: `13e04Is_llu8_bqNqUuR30JFw9v76JllE`;
  `04_Projects` id: `16w_Y_-ZzsZsiDSnJaSkKjGKtKau09dy6` (one subfolder per job).
