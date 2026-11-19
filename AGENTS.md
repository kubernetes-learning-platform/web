# AGENTS.md: web

Instructions for AI coding agents working in this repository. `CLAUDE.md` is a symlink to this file, so Claude Code reads the same instructions.

## What this repo is

The Next.js (App Router) frontend of kubernetes-learning-platform, a live Kubernetes lab with an optional AI helper. It is a pure client of `api`: one REST client and one WebSocket, no API routes and no business logic.

| Route | Screen |
|---|---|
| `/login` | Sign in with a name (name only for now) |
| `/` | Scenario list with progress, blank cluster start, resume the active session |
| `/session/[id]` | The lab: topology canvas, terminal, scenario panel, helper chat, config inspector |
| `/session/[id]/replay` | The same lab, fed from the event log instead of the socket |

Stack: Next.js 16 (App Router, TypeScript, Cache Components), React Flow + elkjs for the canvas, xterm.js for the terminal, Monaco for the inspector, Zustand for state, protobuf-es for messages, Biome for lint and format. MUI for components and theming, with `@mui/material-nextjs`. No Tailwind.

- **Owners:** Person 2 and Person 3, who split `api` and `web` by feature.
- **Status:** scaffolded (web#1). One page renders; there are no tests yet.
- **Design:** `README.md` here, and ARCHITECTURE §4.4 and FEATURES in the `docs` repo. Where they disagree, the `docs` repo wins.

## Layout

```
web/
├── src/
│   ├── app/            # login/, page.tsx, session/[id]/, session/[id]/replay/
│   ├── components/     # topology/, chat/, terminal/, inspector/, timeline/, session/
│   ├── lib/            # api.ts, socket.ts
│   └── state/          # session and scenario stores, topology + view reducers
├── next.config.ts      # standalone output, Cache Components, Partial Prefetching
├── package.json        # npm; @biomejs/biome pinned to the $schema version, contracts pinned exactly
├── .npmrc              # the @kubernetes-learning-platform scope from GitHub Packages
├── biome.json          # copy from platform/lint, like .editorconfig; .lint-sync records the commit
├── Dockerfile          # Next.js standalone server on node:24-alpine, port 3000
└── .github/workflows/  # ci.yml: platform's node-ci; contracts-bump.yml, lint-sync.yml: the update bot
```

Scripts, when there are any, go in `scripts/`.

## Build and check

npm with Node 24. There are no tests yet. Before saying a change is done, run what CI runs:

- `npm ci`
- `npm exec -- biome ci .` (lint and format; `npm run lint` and `npm run format` locally)
- `npm run build`, then `npm run typecheck`
- `../platform/lint/sync.sh --check .`, with `platform` at the commit in `.lint-sync`

`npm run dev` serves the app on `http://localhost:3000`. CI (`.github/workflows/ci.yml`) reports `ci / Node checks` (required in the `main` ruleset) on PRs. The image is built and pushed only on merges to `main` (platform#19, not set up yet). There is no `start` script, because `next start` doesn't support standalone output: run the image, or `node .next/standalone/server.js` after copying `.next/static` into `.next/standalone/.next/`. When `public/` exists, add it to the Dockerfile's runtime stage. Use Biome, not ESLint or Prettier. Local development needs no real sandbox: run Postgres and Caddy from `platform`'s dev Compose and api with the fake sandbox, and open `http://localhost:8080`, where Caddy serves `web` and `api` on one origin. `npm ci` needs `GITHUB_PACKAGES_TOKEN`, because GitHub Packages wants a token even for public packages: `gh auth refresh --hostname github.com --scopes read:packages` once, then `export GITHUB_PACKAGES_TOKEN="$(gh auth token)"`. `.npmrc` reads it for the `@kubernetes-learning-platform` scope only. CI passes its `GITHUB_TOKEN`, so every workflow job that installs grants `packages: read`, and the image build takes it as the `github-packages-token` build secret.

**Lint configs.** `.editorconfig`, `biome.json` and `.lint-sync` are copies from `platform/lint/`. Don't edit them here; change `platform/lint/` instead, and CI fails a hand edit. Settings for this repo only go in a nested `biome.json` with `"extends": "//"`. They were made with `lint/sync.sh --node`, replacing the `biome.json` that `create-next-app` writes. Pin `@biomejs/biome` to the exact version in `biome.json`'s `$schema` (2.6.4). Biome turns on its Next.js and React rules from `package.json` by itself, and skips everything in `.gitignore`.

## Code rules

- **The canvas draws only real cluster state.** Graph entities come only from `TopologySnapshot` / `TopologyDiff`, never from chat text or helper messages.
- **The helper only moves the camera.** `ViewIntent` (`focus`, `highlight`, `annotate`, `show_config`) changes view state, never topology.
- **Revisions.** Apply diffs in revision order, ignore stale ones, and on a gap resync with `Resync{afterSeq}`.
- **Link drops.** On `SessionStatus{reconnecting}`, show a banner and hold the canvas on its last state until the next `TopologySnapshot` replaces it.
- **Replay uses the same reducers.** Replay is only a different message source. No replay-only rendering paths.
- **The learner drives.** The terminal and the editable inspector are writable by default, and read-only with a Stop button only during `HelperState{acting}`. Everything except the chat works with no LLM.
- **Helper questions.** `AgentQuestion` shows the helper's options plus free text, and doesn't block the terminal.
- **Queue.** `SessionStatus{queued, position}` shows the place in line, never an error.
- **Types.** Use the generated types from `@kubernetes-learning-platform/contracts`. Never hand-write message types.
- **Networking.** Only same-origin `/api` and `/ws`. No hardcoded hosts, no secrets in client code or `NEXT_PUBLIC_*` variables. The app is always served over HTTPS, so HTTPS-only browser APIs are fine.
- **Data.** Pages that talk to `api` are client components, and the Next server never calls `api`.
- **React.** Effects clean up their sockets, terminals and subscriptions. Large lists and graphs avoid needless re-renders.
- **Accessibility.** Interactive elements are reachable by keyboard and have labels.

## Releases and dependencies

- A merge to `main` publishes the `web` image to GHCR, tagged with the commit SHA. A manual deploy picks which one runs.
- New `contracts` versions arrive as bot commits, `build(deps): bump contracts to X.Y.Z`, from `.github/workflows/contracts-bump.yml`, which calls `platform`'s update bot on `repository_dispatch`. The bot runs `platform`'s `node-ci` on the commit before it pushes to `main`. If that fails, it opens a PR here instead; fix the code in that PR.
- New lint configs arrive the same way, as `chore: sync lint configs` from `.github/workflows/lint-sync.yml` after a change to `platform/lint/`. If the new rules break the build, the bot opens a PR instead; fix the code in that PR.
- `@kubernetes-learning-platform/contracts` is pinned to an exact version in `package.json`, without `^` or `~`, so the bot can find and bump it. See `platform`'s README, Update bot.

## Commits, branches and PRs

- **Always ask the user before creating a branch, committing or pushing.** Show the commit message when you ask.
- **Commits:** Conventional Commits only, one line: `type: short description`, lowercase, no trailing period. No body. No `Co-Authored-By` or any other attribution.
- **Types:** `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `style`. Add `!` for a breaking change.
- **Branches:** use the name in the `Branch:` line of the issue being worked on. Don't make one up. `gh issue develop <number> --name <branch> --checkout` creates it linked to the issue.
- **Where changes land:** every change goes through a PR from the issue's branch. README, `AGENTS.md` and other doc updates go in the PR of the feature they describe, not in separate commits. When a change in another repo makes this repo's docs wrong, fix them in a small `docs:` PR here. Only the `docs` repo commits straight to `main`.
- **PRs:** the title follows the commit format, at most 72 characters; it becomes the squash commit on `main`. The description is one or two plain sentences, plus `Closes #<number>`. Merging needs one approval from someone other than the author, and the branch must be up to date with `main`. Filip is requested as reviewer on every PR (`.github/CODEOWNERS`), and the author is assigned automatically. Only Filip merges.
- **Public repo:** everything committed is public at once. Never commit secrets, real `.env` files or personal data; push protection only catches known token formats.

## Keep docs in sync

When a change touches this repo's design, layout, commands or conventions, update `AGENTS.md`, `README.md` and `.github/copilot-instructions.md` in the same change. If it changes a design fact, update ARCHITECTURE §4.4 in the `docs` repo too, and mention it to the user.

## Writing style

Plain, professional wording in docs and comments. No emoji, no marketing tone. Files are UTF-8 with LF line endings, following `.editorconfig`.
