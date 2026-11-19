# Copilot instructions: web

This repo is the Next.js (App Router) frontend of kubernetes-learning-platform, a live Kubernetes lab with an optional AI helper. It's a pure client of `api`: there are no API routes here. It uses React Flow + elkjs for the topology canvas, xterm.js for the terminal, Monaco for the config inspector, Zustand for state, and protobuf-es for messages. The full design is in the `docs` repo (ARCHITECTURE.md §4.4, FEATURES.md).

## When reviewing, focus on
- **The canvas draws only real cluster state.** Nodes, pods, services and edges come only from `TopologySnapshot` / `TopologyDiff`. Flag code that adds, removes or changes graph entities based on chat text or agent messages.
- **The helper only moves the camera.** `ViewIntent` (`focus`, `highlight`, `annotate`, `show_config`) changes the view state, never the topology.
- **Revisions.** Apply diffs in revision order. Ignore stale ones, and on a gap reconnect with `Resync{afterSeq}`. No silent desync.
- **Sandbox link drops.** On `SessionStatus{reconnecting}`, show it and hold the canvas on its last state; the next `TopologySnapshot` replaces it. Don't clear the graph or fake a state in between.
- **Replay uses the same reducers.** Replay is just a different message source (the events endpoint instead of the socket). Flag replay-only rendering paths.
- **The learner drives.** The terminal and the editable inspector (`ApplyManifest`) are writable by default, and read-only with a Stop button only during `HelperState{acting}`. Everything except the chat must work with no LLM.
- **Helper questions.** `AgentQuestion` shows the helper's own options plus free text, and doesn't block the terminal.
- **Queue.** `SessionStatus{queued, position}` shows the place in line, never an error.
- **Types.** Use the generated types from `@kubernetes-learning-platform/contracts`. Never hand-write message types.
- **Networking.** Only same-origin `/api` and `/ws` through the reverse proxy. No hardcoded hosts, no secrets in client code or `NEXT_PUBLIC_*` variables.
- **React.** Effects clean up their sockets, terminals and subscriptions, and large lists and graphs avoid needless re-renders.
- **Accessibility.** Interactive elements are reachable by keyboard and have labels.

## Project-wide rules
- PR titles are Conventional Commits (`feat: short description`), one line, at most 72 characters, no trailing period.
- Files are UTF-8 with LF line endings.
- CI on PRs runs `platform`'s `node-ci` (lint copies, `biome ci`, build, `tsc --noEmit`). The image is built and pushed only on merges to `main`. There are no tests yet.
- `contracts-bump.yml` and `lint-sync.yml` run `platform`'s update bot on `repository_dispatch`, never on PRs. Flag a `@kubernetes-learning-platform/contracts` dependency that isn't an exact version, because the bot can't bump it. Every workflow job that installs packages grants `packages: read` and passes `GITHUB_PACKAGES_TOKEN`.
- No Tailwind. Flag a PR that adds it.

## Don't
- Don't comment on formatting or lint issues that Biome or `.editorconfig` handles.
- Don't suggest changes to the lint copies (`.editorconfig`, `biome.json`, `.lint-sync`). They come from `platform/lint/`, and a hand edit fails CI.
- Keep reviews short. Skip praise and summaries of the diff.
