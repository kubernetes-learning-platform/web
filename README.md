# web

> **The Next.js frontend:** the live topology canvas, scenarios, terminal, optional helper chat, config inspector and session replay.

Part of [kubernetes-learning-platform](https://github.com/kubernetes-learning-platform/docs), a live Kubernetes lab with an optional AI helper. The [docs repository](https://github.com/kubernetes-learning-platform/docs) describes the overall system.

**Owner:** Person 3 · **Status:** scaffolded. One page renders and CI checks it; there are no tests yet.

---

## Overview

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/web-dark.svg">
  <img src="assets/web-light.svg" width="100%" alt="On the left, socket.ts receives messages from api and feeds two stores: topology, which holds what exists, and view, which holds where you look. On the right, the lab screen: a topology canvas showing nodes cp, w1 and w2 with their pods and a service, a terminal, the scenario panel with its checks, the helper chat, and the config inspector with an Apply button.">
</picture>

`web` is the browser application. It has no backend of its own: all data comes from `api`, through a REST client and a single WebSocket.

The main screen is the lab at `/session/[id]`:

| Pane | Content |
|---|---|
| **Topology canvas** | A live diagram of the cluster: nodes, pods, services and ingresses |
| **Terminal** | A shell in the sandbox |
| **Scenario** | The current step's goal, check results, hints, **Reset** and **Next** |
| **Helper chat** | The optional AI helper and its question card |
| **Config inspector** | The YAML of the selected resource, editable, with **Apply** |

### Data flow

1. `lib/socket.ts` maintains the WebSocket to `api` and decodes each binary Protobuf message.
2. Cluster messages update the **topology** store, which starts from a full snapshot and applies numbered diffs in order.
3. View messages from the helper update the **view** store, which controls the camera, highlights and annotations.
4. The canvas renders the topology store through the view store.

As a result, elements on the canvas originate only from actual cluster state, and the helper can only direct attention to them. Replay uses the same stores and rendering code, with the saved event log as the message source.

## Routes

`web` has no API routes. It's a pure client of `api`, through the same reverse proxy. The deployed app runs on the course VM and is only served over Tailscale: the demo laptop opens it at our own domain, which points at the VM's Tailscale address, over HTTPS with a real certificate.

| Route | Screen |
|---|---|
| `/login` | Sign in (the form depends on the auth choice, still **OPEN**) |
| `/` | Scenario list with your progress, blank cluster start, resume the active session |
| `/session/[id]` | The lab: topology canvas, terminal, scenario panel, helper chat, config inspector |
| `/session/[id]/replay` | The same lab, fed from the event log instead of the socket |

## UI principles

1. **The learner drives.** The terminal and the editable inspector are yours by default, and read-only with a **Stop** button only while the helper is acting (`HelperState{acting}`). Everything except the chat works with no LLM.
2. **The canvas draws only real cluster state.** Nodes, pods, services and ingresses come from `TopologySnapshot` / `TopologyDiff`, which the harness builds from Kubernetes watches. Never from what the helper says.
3. **The helper only moves the camera.** Its `ViewIntent` messages (`focus`, `highlight`, `annotate`, `show_config`) change where you look, not what exists.

Replay runs the exact same reducers. It's just a different message source.

**When the helper asks a question.** `AgentQuestion` shows a question card with the options the helper wrote and a free-text box. It sends `AgentAnswer`, and a normal chat message counts as the answer too. Your terminal stays usable while it waits.

**While a session is queued.** `SessionStatus{queued, position}` shows your place in line until the sandbox is ready.

**When the sandbox link drops.** The link between `api` and `envmgr` drops when `envmgr` restarts. If `api` sends `SessionStatus{reconnecting}`, show a banner and keep the canvas on its last state. The next `TopologySnapshot` replaces it once the link is back.

## Modules

| Module | Role |
|---|---|
| `lib/socket.ts` | WebSocket client: protobuf-es encode/decode, reconnect + `Resync{afterSeq}` |
| `lib/api.ts` | REST client |
| `state/` | Zustand stores: `topologyReducer` (applies snapshots and diffs by revision), `viewReducer` (intents → camera), scenario, chat, helper state |
| `components/` | `TopologyCanvas` (React Flow + elkjs), `ScenarioPanel` (goal, checks, hints, Next, reset, Start over), `ChatPanel`, `QuestionCard`, `Terminal` (xterm.js), `ConfigInspector` (Monaco), `Timeline`, `QueuedScreen` |

## Layout

```
web/
├── src/
│   ├── app/                 # login/, page.tsx, session/[id]/, session/[id]/replay/
│   ├── components/
│   │   ├── topology/        # canvas, node cards, pod chips, edges, elkjs layout
│   │   ├── chat/            # chat panel, question card
│   │   ├── terminal/        # xterm.js
│   │   ├── inspector/       # Monaco
│   │   ├── timeline/
│   │   └── session/         # scenario panel, queued screen
│   ├── lib/                 # api.ts, socket.ts
│   └── state/               # session and scenario stores, topology + view reducers
├── next.config.ts           # standalone output, Cache Components, Partial Prefetching
├── .npmrc                   # the @kubernetes-learning-platform scope from GitHub Packages
├── Dockerfile               # Next.js standalone server on node:24-alpine, port 3000
└── .github/workflows/       # ci.yml, contracts-bump.yml, lint-sync.yml
```

## Packages

`@kubernetes-learning-platform/contracts` comes from GitHub Packages, which needs a token even to read a public package. `.npmrc` sends the `@kubernetes-learning-platform` scope there and reads the token from `GITHUB_PACKAGES_TOKEN`; everything else comes from the npm registry. Once, give the GitHub CLI the `read:packages` scope, then export the token before `npm ci`:

```bash
gh auth refresh --hostname github.com --scopes read:packages
```

```bash
export GITHUB_PACKAGES_TOKEN="$(gh auth token)"
```

A classic personal access token with `read:packages` works too. CI passes its own `GITHUB_TOKEN`, and the image build takes the token as a build secret:

```bash
docker build --secret id=github-packages-token,env=GITHUB_PACKAGES_TOKEN --tag web .
```

The version is pinned exactly in `package.json`, without `^` or `~`, so the update bot can bump it.

## Local development

Set `GITHUB_PACKAGES_TOKEN` first (see [Packages](#packages)). `npm ci`, then `npm run dev` serves the app on `http://localhost:3000`. `npm run lint`, `npm run build` and `npm run typecheck` run the same checks as CI, and the `docker build` command under [Packages](#packages) builds the image. Styling: no Tailwind, and a component library isn't chosen yet. There are no tests yet.

No real sandbox needed. Run Postgres from `platform`'s dev Compose and api with the **fake sandbox**. It drives the socket with a scripted cluster, so the canvas, scenario panel, chat and terminal can be built before any real sandbox exists.

**Ships:** the `web` container image (multi-arch) → GHCR. It runs in the stack on the course VM. A merge to `main` publishes an image tagged with the commit SHA, and a manual deploy picks which one runs. Use HTTPS-only browser APIs (clipboard, `crypto.randomUUID`) freely: the app is always served over HTTPS.

## Further reading

- [ARCHITECTURE §4 Services](https://github.com/kubernetes-learning-platform/docs/blob/main/ARCHITECTURE.md#4-services-and-their-entry-points) (web modules)
- [FEATURES](https://github.com/kubernetes-learning-platform/docs/blob/main/FEATURES.md): what each screen should do, and why

## License

[MIT](LICENSE)
