# VConnect

Find skilled local professionals while supporting fair, transparent, community-driven work.

VConnect is a cooperative marketplace for local services. Workers are co-op members:
they keep 92% of every job, and the remaining 8% is shown openly and funds training and
community programs. Customers get verified professionals, explainable matching, and a
price estimate before they commit.

Built as an MVP with FastAPI, SQLite and vanilla JavaScript — no build step, no framework.

---

## Running it

Requires Python 3.10+.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

On macOS or Linux use `.venv/bin/python` in place of `.venv\Scripts\python.exe`.

Then open **http://127.0.0.1:8001**.

One process serves both the API and the frontend, so there is no separate frontend
command. The database ships seeded, so there are workers and bookings to show
immediately.

> Avoid `--reload` on Windows: the file watcher has been seen hanging mid-restart and
> leaving orphaned processes holding port 8001. Restart manually instead.

If the port is stuck:

```powershell
Get-NetTCPConnection -LocalPort 8001 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## Features

**Accounts** — Email and password signup for customers and workers, with role-aware
navigation and route guards. Worker signup captures category, skills, experience, rate
and bio, and creates the co-op membership in the same step.

**Google sign-in** *(optional)* — Hidden unless configured; see below.

**Services and matching** — Browse and filter co-op members by category, availability
and search. Ranking is a readable weighted score rather than a black box: skill fit,
distance, rating, availability, price and a VTrust score, each with a fixed weight in
[`recommendations.py`](recommendations.py).

**Location-aware results** — Asks for the browser's location, then sorts professionals
by real haversine distance and centres the map on the user. Demo profiles are seeded in
New Delhi, so when a real location is known the whole cluster is shifted to sit around
the user, preserving relative distances. The UI says so rather than implying the workers
are genuinely nearby.

**Price estimator** — `POST /api/estimate-price` reads a plain-language description
("my kitchen sink is leaking") and returns a price band, a matched job type and a
confidence score. Every rule lives in a readable dictionary in [`main.py`](main.py), and
the response carries its own reasoning, so a quote can always be interrogated.
Confidence drops when a second category matches equally well.

**Privacy-safe chat** — A WebSocket room per booking lets a customer and worker talk
without exchanging phone numbers. The server strips anything resembling a phone number
or email address *before* storing or relaying it, so the guarantee holds server-side
rather than being a UI promise. Threads persist across reloads.

**Bookings** — Request, accept, decline, complete or cancel, with a status tracker.
Emergency requests carry a priority flag and a 35% callout uplift in estimates.

**Group bookings and community help** — Neighbours can pool a request (3–4 households
save 5%, 5+ save 10%) or offer non-commercial help to each other.

**Worker tools** — Dashboard, assigned jobs, availability toggle, and an earnings
breakdown showing the 92/8 split per completed job.

**Multilingual** — Google Translate widget covering English, Hindi, Telugu, Tamil,
Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi and Urdu.

**Social proof** — Periodic sample-activity toasts, labelled as sample data.

---

## Enabling Google sign-in

Create an OAuth client ID (Web application) in the
[Google Cloud Console](https://console.cloud.google.com) with `http://127.0.0.1:8001`
as an authorised JavaScript origin, then:

```powershell
$env:GOOGLE_CLIENT_ID = "your-id.apps.googleusercontent.com"
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

```bash
export GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
```

The variable lasts only for that shell session. While it is unset the button stays
hidden and email/password sign-in works normally.

The server verifies the ID token against Google and checks the audience, issuer and
`email_verified` claims before trusting it. Accounts created this way are stored with a
non-hashable password sentinel, so they cannot be reached through the password form.

---

## Project layout

| File | Purpose |
| --- | --- |
| [`main.py`](main.py) | FastAPI app: routes, SQLite schema and migrations, auth, estimator, chat |
| [`recommendations.py`](recommendations.py) | Transparent worker ranking and VTrust scoring |
| [`app.js`](app.js) | Single-page frontend: hash router, views, WebSocket client |
| [`style.css`](style.css) | Design tokens and all component styles |
| [`index.html`](index.html) | Shell page and third-party script tags |
| `vconnect.db` | SQLite database, seeded with demo data |

`app.js` is plain ES2020 with no bundler. The bootstrap call sits at the very end of the
file on purpose — the router touches module state declared with `let` above it, so
booting earlier throws a temporal-dead-zone error and renders a blank page.

---

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/services` | Service categories |
| `GET` | `/workers` | Filter by `category`, `available`, `search` |
| `GET` | `/workers/recommended` | Top three ranked matches |
| `GET` | `/workers/{id}` | Profile with reviews |
| `PUT` | `/workers/{id}/availability` | Toggle availability |
| `POST` | `/auth/signup`, `/auth/login`, `/auth/logout` | Email and password auth |
| `GET` | `/auth/config` | Whether Google sign-in is enabled |
| `POST` | `/auth/google` | Verify a Google ID token |
| `GET` | `/auth/me` | Current session user |
| `GET`, `POST` | `/bookings` | List and create |
| `PUT` | `/bookings/{id}/status` | Update status |
| `POST` | `/api/estimate-price` | Price band with reasoning |
| `WS` | `/ws/chat/{room}` | Chat socket |
| `GET` | `/chat/{room}/history` | Stored messages |
| `POST` | `/service-suggestion` | Map a description to a category |
| `GET` | `/admin/summary` | Co-op totals |

Interactive docs are at `/docs` while the server is running.

---

## Known limitations

This is a demo MVP, and some things are deliberately simple:

- **Passwords use a hardcoded shared salt** ([`main.py`](main.py)). Fine for a demo, not
  for real accounts — move to per-user salts before anyone signs up in earnest.
- **CORS is fully open** (`allow_origins=["*"]`), which suits local development only.
- **Chat rooms are not access-controlled.** Anyone who knows a room name can join it.
- **Distances are synthetic.** Demo workers are seeded around one point and shifted to
  the user; they are not real locations.
- **Social proof toasts are sample data**, labelled as such in the UI.
