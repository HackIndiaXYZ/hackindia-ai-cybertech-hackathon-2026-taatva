# TAATVA Obsidian — How to put it online

Two parts go online:

| Part | Where | What it is |
|---|---|---|
| Backend (the scanner) | **Render** | `backend/` folder, built from `backend/Dockerfile` (includes Tesseract and a browser) |
| Frontend (the website) | **Vercel** | `frontend/` folder (Next.js) |

The database and sign-in stay on **Supabase** (already set up).
Secret keys are typed into Render and Vercel. They are **never** in GitHub.

---

## Step 0 — Put the code on GitHub (private), with GitHub Desktop

1. Open **GitHub Desktop** and sign in (File → Options → Accounts).
2. **File → Add local repository…** → choose the `Obsidian` folder → **Add repository**.
3. Click **Publish repository** (top bar).
4. Name: `obsidian-taatva`. **Tick "Keep this code private".** Click **Publish repository**.
5. Check on github.com: the repository shows a **Private** label, and there is **no** `backend/.env` or
   `frontend/.env.local` file (only the `.env.example` files, which have no keys).

---

## Step 1 — Backend on Render

1. Go to **render.com** → sign in with GitHub.
2. Click **+ New** → **Web Service**.
3. Choose **Git Provider → GitHub** → allow Render to see `obsidian-taatva` → click **Connect** next to it.
4. Fill in:
   | Setting | Type exactly |
   |---|---|
   | Name | `obsidian-backend` |
   | Language | **Docker** |
   | Branch | `main` |
   | Region | the one closest to you (e.g. Singapore) |
   | Root Directory | `backend` |
   | Dockerfile Path | `./Dockerfile` (Render shows it as `backend/ ./Dockerfile`) |
   | Instance Type | **Starter** or bigger (Free works for small demos but sleeps after 15 minutes and has little memory) |
5. Open **Environment Variables** → **Add Environment Variable** for each line below:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://seexoapqnhqyqkhhdpsj.supabase.co` |
   | `SUPABASE_ANON_KEY` | your **anon / public** key (Supabase → Project Settings → API Keys) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your **service_role / secret** key (same page). Backend only! |
   | `GEMINI_API_KEY` | your Gemini key (Google AI Studio → Get API key) |
   | `GEMINI_MODEL` | `gemini-3.5-flash` |
   | `GEMINI_BACKUP_MODEL` | `gemini-3.1-flash-lite` |
   | `PRIVATE_MODE` | `false` |
   | `PROMPT_GUARD` | `false` |
   | `FRONTEND_URLS` | your Vercel address from Step 2, e.g. `https://obsidian-taatva.vercel.app` (fill in after Step 2) |
   | `ALLOWED_EMAILS` | leave empty (or a comma list of emails if only those people may scan) |

6. Click **Deploy Web Service**. The first build takes about 5–10 minutes.
7. When it says **Live**, copy the address at the top, e.g. `https://obsidian-backend.onrender.com`.
8. Check it: open `https://obsidian-backend.onrender.com/health` → you should see
   `{"status":"ok","app":"Obsidian","team":"TAATVA"}`.

**Optional — Prompt Guard on Render** (needs a 2 GB instance, e.g. *Standard*):
Settings → **Build & Deploy** → Docker build arguments: add `PROMPT_GUARD_BUILD` = `true`.
Environment: set `PROMPT_GUARD` = `true` and add `HF_TOKEN` = your Hugging Face read token. Redeploy.

---

## Step 2 — Frontend on Vercel

1. Go to **vercel.com** → sign in with GitHub.
2. **Add New… → Project** → find `obsidian-taatva` → **Import**.
3. Fill in:
   | Setting | Type exactly |
   |---|---|
   | Project Name | `obsidian-taatva` |
   | Framework Preset | **Next.js** (chosen automatically) |
   | Root Directory | click **Edit** → choose `frontend` → **Continue** |
   | Build / Output / Install commands | leave as they are |
4. Open **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://seexoapqnhqyqkhhdpsj.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your **anon / public** key (NOT the service_role key) |
   | `NEXT_PUBLIC_API_URL` | your Render address from Step 1, e.g. `https://obsidian-backend.onrender.com` (no `/` at the end) |
5. Click **Deploy**. When it finishes, copy your address, e.g. `https://obsidian-taatva.vercel.app`.

---

## Step 3 — Connect the pieces

1. **Render** → `obsidian-backend` → **Environment** → set `FRONTEND_URLS` to your Vercel address
   (e.g. `https://obsidian-taatva.vercel.app`) → **Save, rebuild and deploy**.
   To keep testing on your own computer too, use: `https://obsidian-taatva.vercel.app,http://localhost:3000`
2. **Supabase** → **Authentication → URL Configuration**:
   - **Site URL**: `https://obsidian-taatva.vercel.app`
   - **Redirect URLs** → **Add URL**: `https://obsidian-taatva.vercel.app/auth/callback`
     (keep `http://localhost:3000/auth/callback` too, for testing on your computer)
3. (Recommended) **Supabase → Authentication → Emails → SMTP Settings**: connect your own email
   service, because Supabase's built-in email only sends a few emails per hour.

---

## Step 4 — Check it works

1. Open your Vercel address → you see **Sign in**.
2. Sign up with a real email → click the link in the email → you land on **Scan**.
3. Scan `test_files/attacked_1_white_text.pdf` → **QUARANTINE 100**, red X-Ray box, no "Copy clean text" button.
4. Open **History** → the scan is there with Approve / Reject.

If something fails: Render → `obsidian-backend` → **Logs**; Vercel → project → **Deployments → (latest) → Logs**.

## Never do this

- Never put `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` or `HF_TOKEN` in Vercel. Only `NEXT_PUBLIC_…` keys go there,
  and those are visible to anyone who opens the website.
- Never commit `backend/.env` or `frontend/.env.local`. The `.gitignore` file already blocks them.
