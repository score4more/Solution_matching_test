# score4more – Solution Matching beta (click dummy)

Instructions for Claude Code. The user is often NOT a programmer: explain in plain language,
do the technical steps yourself, and only hand things back to the user when this file says so.

## What this project is
- A password-protected click dummy: one static HTML page, no backend.
- Repo: https://github.com/score4more/Solution_matching_test (branch `main`)
- Live: https://score4more.github.io/Solution_matching_test/ (GitHub Pages rebuilds ~1 minute after a push)

## How it works (important)
- The public `index.html` is NOT the click dummy. It is a password screen plus the click dummy
  encrypted with AES-256-GCM. The readable version only exists locally in `source/index.src.html`,
  which is git-ignored.
- `node build.mjs`   encrypts `source/index.src.html` -> `index.html` (asks for the password).
- `node decrypt.mjs` recovers `source/index.src.html` from the current `index.html` (asks for the password).
- `.gitignore` excludes `source/` and `s4m*.html` (raw files from the online Claude chat).
- The click dummy logs usage events to a Google Sheet (`LOG_ENDPOINT`, `logEvent(...)`, `trackView()`
  near the top of the `<script>`). This is intentional. Keep it. Do not log contact details or uploaded files.
  Files coming from the online chat do NOT contain this logging.

## Hard rules
- NEVER commit or push readable (unencrypted) click dummy HTML. Only the encrypted `index.html`.
- NEVER use `git add .` or `git add -A`. Add files by name.
- NEVER force-push or rewrite history unless the project owner explicitly asks.
- NEVER ask for the password in chat, and never write it to a file. The user types it themselves (see below).
- Do not remove or "fix" `LOG_ENDPOINT`.

## Password steps are done by the user, not by you
`build.mjs` and `decrypt.mjs` prompt for the password and need a real terminal. Tell the user:
"Open a terminal in VS Code (Terminal > New Terminal), run `node build.mjs`, and type the password
when asked. Tell me when it says 'Wrote index.html'." Then continue.

## First-time setup (do this when the user is new, step by step)
1. Check `git --version` and `node --version` (Node 18+). If missing, help the user install them.
2. Check the user can push (the owner must have added them as a collaborator). Help with GitHub sign-in.
3. Set git identity for this repo: `git config user.name` and `git config user.email`.
4. The user gets the password from the project owner outside this chat.
5. Ask the user to run `node decrypt.mjs` so `source/index.src.html` holds the current version.

## Workflow: "update the click dummy with this new HTML file"
The user provides a new HTML file from the online Claude chat (it holds the new layout, wording, widgets).
1. `git pull`. If `source/index.src.html` is missing or possibly outdated, ask the user to run `node decrypt.mjs`.
2. Keep a copy of the current `source/index.src.html` as the old version (outside the repo, e.g. temp folder).
3. Use the new file as the base: write it to `source/index.src.html` (new layout, wording, widgets, features).
4. Re-apply the logging from the old version to the new file: the `LOG_ENDPOINT` / `SESSION_ID` / `logEvent` /
   `solName` block, the `trackView()` function (called at the end of `render()`), and the `logEvent(...)` calls
   next to the matching actions: views and persona switches, matches_shown, matches_explore, search, filter,
   bookmark, show_interest_open / show_interest_sent, interest_withdrawn, simulate_response,
   challenge_posted, wizard_publish. Adapt to the new code, and add logging for any new user action.
5. Syntax check: extract the `<script>...</script>` contents to a temp `.js` file and run `node --check` on it. Fix failures.
6. Ask the user to run `node build.mjs` themselves (password step above).
7. Commit and push by file name:
   `git add index.html` (plus `build.mjs`, `decrypt.mjs`, `CLAUDE.md`, `.gitignore` only if they changed),
   `git commit -m "Update click dummy: <short summary>"`, `git push`.
   If the push is rejected: `git pull --rebase`. If `index.html` conflicts (two people changed it), stop and ask
   the user. Never try to merge the encrypted file.
8. Tell the user the live URL, that it takes about a minute, and to open it, enter the password and click
   through the main flows. Remind them that the Sheet should show new rows.

## Notes
- The page is one encrypted blob, so if two people update at once the later push wins. Agree in the team who is updating.
- Changes to the password: user runs `node build.mjs` with the new password and pushes. Old links stay valid for anyone who knows the old password only until the new version is live.
