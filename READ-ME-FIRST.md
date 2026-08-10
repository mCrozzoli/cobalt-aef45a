# Getting this onto your iPhone

You have three pages — training log, daily log, food playbook — plus a small home screen
that links them. This folder is a complete, self-contained website. It needs no server-side
anything, no database, no accounts.

**Important:** Dropbox and Google Drive will *not* work for this. Dropbox stopped rendering
HTML from shared links in 2016, and Google Drive dropped web hosting in 2016 too. Both will
download the file instead of opening it. Anyone who tells you otherwise is quoting a
pre-2016 tutorial.

---

## Option A — GitHub Pages (recommended, ~7 minutes, free, permanent)

This gives you a real URL, which means you can add it to your home screen and it opens
full-screen like a real app. It also works with no signal once loaded, because I've included
a service worker that caches everything on your phone.

1. Go to **github.com** and sign up if you don't have an account. Free.
2. Click **+** (top right) → **New repository**.
   - Name it something anonymous like `notes-m` — the name is visible, the content is what matters.
   - Choose **Public**. (Private repos can't use free GitHub Pages.)
   - Click **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Drag in **every file in this folder**: `index.html`, `training-log.html`, `daily-log.html`,
   `food-playbook.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`.
   Click **Commit changes**.
5. Go to **Settings** → **Pages** (left sidebar). Under *Branch*, pick **main** and **/ (root)**.
   Click **Save**.
6. Wait 1–2 minutes, then reload that page. It will show your URL:
   `https://<your-username>.github.io/notes-m/`
7. Open that URL **in Safari on your iPhone**. Tap the **Share** button (square with an arrow
   pointing up) → scroll down → **Add to Home Screen** → **Add**.

You now have a Fitness icon on your home screen. It opens full-screen with no browser bars,
and works in a basement with no signal.

### A note on privacy
A public repo means the URL is technically reachable by anyone who guesses it — but it is not
listed anywhere, not linked from anywhere, and won't be indexed by Google for a page nobody
links to. The content is a workout plan and some recipes. If that still bothers you, use
Option B instead, which never leaves your phone.

### When I send you an updated page
Go to the repo, click the old file, click the pencil icon, delete the contents, paste the new
ones — or simply re-upload and overwrite. Then open `sw.js` and change `fitness-v1` to
`fitness-v2`; that's what tells your phone to fetch the new version instead of the cached one.

---

## Option B — no accounts, entirely on your phone

Slower to open, but nothing ever leaves your device.

1. Save the three HTML files to your iPhone: open each one from the Claude chat, tap
   **Share** → **Save to Files** → *On My iPhone*.
2. To open one: Files app → tap the file. It renders in a preview.
3. To make it one tap: open the **Shortcuts** app → **+** → add the action **Get File**
   (point it at `training-log.html`) → add **Quick Look**. Name the shortcut *Training*.
   Then tap the share icon inside Shortcuts → **Add to Home Screen**.

The limitation: iOS Quick Look sometimes restricts JavaScript, so the rest timer and the
logging buttons may or may not work depending on your iOS version. The pages will always be
*readable*. Option A has no such limitation.

---

## Option C — the no-setup fallback

Open the Fitness conversation in the Claude app and tap the file each time. Works today,
zero setup, most friction.

---

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Home screen — links the three pages and shows what needs doing next |
| `training-log.html` | The gym page — Day A/B/C, demos, set logging, rest timer, rehab block |
| `daily-log.html` | Food log, weekly check-in, weight & waist charts |
| `food-playbook.html` | Reference — targets, the four slots, ten fast meals, shopping |
| `coach.js` | Works out what to change next, and builds the markdown export |
| `coach-ui.js` | Draws the "what to do next" panel |
| `store-training.js` | Saves your sessions on this device |
| `store-daily.js` | Saves food logs and check-ins on this device |
| `manifest.webmanifest` | Makes it installable as an app |
| `sw.js` | Offline caching |
| `robots.txt` | Keeps search engines out |
| `icon-192.png`, `icon-512.png` | The home screen icon |

## What it does once installed

**It saves your data.** Sets, food, check-ins and measurements are stored in Safari on your
phone. Nothing is transmitted anywhere. Half-finished sessions survive closing the tab.

**It shows last time's numbers** under every exercise, so you always know what to beat.

**It tells you what to change.** The home screen works out when a lift is ready for more
weight, when the deload week is due, when the eight-week injury review has arrived, when the
programme needs rewriting, and when your weight trend has been flat long enough to act on.

**It exports a markdown file** for Claude. Training log → *How to run it* tab → *Export log
as .md*. Send that file into the Fitness chat and you get a rewritten programme based on
what you actually lifted.

**Back it up occasionally.** Clearing Safari's website data deletes everything. There is an
Export backup (.json) button for that.

Everything is self-contained. The exercise images are embedded directly in the HTML,
which is why `training-log.html` is around 1.5 MB — that's deliberate, so it works offline.
