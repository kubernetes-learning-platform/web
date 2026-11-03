# Copilot instructions: web

This repo is the Next.js (App Router) frontend of kubernetes-learning-platform, an AI tutor with a live Kubernetes lab. It's a pure client of `api`: there are no API routes here. It uses React Flow + elkjs for the topology canvas, xterm.js for the terminal, Monaco for the config inspector, Zustand for state, and protobuf-es for messages. The full design is in the `docs` repo (ARCHITECTURE.md §4.4, FEATURES.md).

## When reviewing, focus on
- **The canvas draws only real cluster state.** Nodes, pods, services and edges come only from `TopologySnapshot` / `TopologyDiff`. Flag code that adds, removes or changes graph entities based on chat text or agent messages.
- **The agent only moves the camera.** `ViewIntent` (`focus`, `highlight`, `annotate`, `show_config`) changes the view state, never the topology.
- **Revisions.** Apply diffs in revision order. Ignore stale ones, and on a gap reconnect with `Resync{afterSeq}`. No silent desync.
- **Replay uses the same reducers.** Replay is just a different message source (the events endpoint instead of the socket). Flag replay-only rendering paths.
- **Control.** The terminal and the editable inspector (`ApplyManifest`) are only active while this user holds control. Otherwise they're read-only.
- **Types.** Use the generated types from `@kubernetes-learning-platform/contracts`. Never hand-write message types.
- **Networking.** Only same-origin `/api` and `/ws` through the reverse proxy. No hardcoded hosts, no secrets in client code or `NEXT_PUBLIC_*` variables.
- **React.** Effects clean up their sockets, terminals and subscriptions, and large lists and graphs avoid needless re-renders.
- **Accessibility.** Interactive elements are reachable by keyboard and have labels.

## Project-wide rules
- PR titles are Conventional Commits (`feat: short description`), one line, at most 72 characters, no trailing period.
- Files are UTF-8 with LF line endings.

## Don't
- Don't comment on formatting that Prettier, ESLint or `.editorconfig` handles.
- Keep reviews short. Skip praise and summaries of the diff.
