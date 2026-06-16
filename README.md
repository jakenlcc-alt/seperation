# Project Kickoff

A small web app for capturing new job/project info from the **Kickoff Checklist**,
then:

1. **Creating a Google Drive folder** under `JAKES BRAIN / 04_Projects / <project>`
   and saving a kickoff snapshot there.
2. **Creating a new Monday.com board** ("job project board") for the project with a
   column per checklist field and a checkbox per "Office Binder Need".
3. **Editing an existing Monday project** — pick a board and update its info.

Monday is reached through a **Cloudflare Worker** that holds the Monday API token,
so the token is never exposed to the browser. Google Drive uses a **service account**.
All secret-bearing calls run in **Netlify Functions** (server-side).

## Structure

```
public/                 static frontend (served by Netlify)
  index.html
  css/styles.css
  js/app.js             form UI + API calls
  js/schema.js          single source of truth for kickoff fields
netlify/functions/
  _lib/config.js        env config + helpers
  _lib/monday.js        Monday client (-> Cloudflare Worker)
  _lib/drive.js         Google Drive client (service account)
  create-project.js     Drive folder + Monday board
  list-projects.js      boards for the "edit" picker
  get-project.js        load one board's values
  update-project.js     save edits back to Monday
netlify.toml
```

## Configuration

Set these in **Netlify → Site settings → Environment variables**
(see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `MONDAY_WORKER_URL` | Your Cloudflare Worker endpoint (Monday GraphQL proxy) |
| `MONDAY_WORKER_KEY` | *(optional)* shared secret sent as `Authorization: Bearer` |
| `MONDAY_WORKSPACE_ID` | *(optional)* workspace for new boards |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service-account key JSON |
| `DRIVE_PROJECTS_FOLDER_ID` | `04_Projects` folder id (pre-filled) |

### Cloudflare Worker contract

The app POSTs Monday GraphQL to your Worker:

```
POST <MONDAY_WORKER_URL>
Authorization: Bearer <MONDAY_WORKER_KEY?>
Content-Type: application/json

{ "query": "<graphql>", "variables": { ... } }
```

The Worker should inject the Monday token and forward to
`https://api.monday.com/v2`, returning Monday's raw JSON.
If your Worker uses a different shape, adjust `netlify/functions/_lib/monday.js`.

## Deploy (Netlify)

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import from GitHub** → pick the repo.
3. Build settings are read from `netlify.toml` (publish `public`, functions auto).
4. Add the environment variables above.
5. Deploy.

## Local dev

```bash
npm install
cp .env.example .env   # fill in values
npm run dev            # netlify dev
```
