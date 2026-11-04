# web

> **The Next.js frontend:** the live topology canvas, scenarios, terminal, optional helper chat, config inspector and session replay.

Part of [**kubernetes-learning-platform**](https://github.com/kubernetes-learning-platform/docs), an AI tutor with a live Kubernetes lab. Start at the [docs hub](https://github.com/kubernetes-learning-platform/docs) for the big picture.

**Owner:** Person 3 · **Status:** planned layout, scaffolding lands in M1.

---

## 🗺️ Routes

`web` has no API routes. It's a pure client of `api`, through the same reverse proxy. The deployed app runs on the Hetzner box and is only served over the WireGuard mesh: the demo laptop opens it at the Hetzner box's mesh address, over HTTPS from Caddy's internal CA.

| Route | Screen |
|---|---|
| `/login` | Sign in (the form depends on the auth choice, still **OPEN**) |
| `/` | Scenario list with your progress, blank cluster start, resume the active session |
| `/session/[id]` | The lab: topology canvas, terminal, scenario panel, helper chat, config inspector |
| `/session/[id]/replay` | The same lab, fed from the event log instead of the socket |

## 👀 Three rules the UI is built on

1. **The learner drives.** The terminal and the editable inspector are yours by default, and read-only with a **Stop** button only while the helper is acting (`HelperState{acting}`). Everything except the chat works with no LLM.
2. **The canvas draws only real cluster state.** Nodes, pods, services and ingresses come from `TopologySnapshot` / `TopologyDiff`, which the harness builds from Kubernetes watches. Never from what the helper says.
3. **The helper only moves the camera.** Its `ViewIntent` messages (`focus`, `highlight`, `annotate`, `show_config`) change where you look, not what exists.

Replay runs the exact same reducers. It's just a different message source.

**When the helper asks a question.** `AgentQuestion` shows a question card with the options the helper wrote and a free-text box. It sends `AgentAnswer`, and a normal chat message counts as the answer too. Your terminal stays usable while it waits.

**While a session is queued.** `SessionStatus{queued, position}` shows your place in line until the sandbox is ready.

**When the sandbox link drops.** The sandboxes live on another machine across the mesh. If `api` sends `SessionStatus{reconnecting}`, show a banner and keep the canvas on its last state. The next `TopologySnapshot` replaces it once the link is back.

## 🧩 Modules

| Module | Role |
|---|---|
| `lib/socket.ts` | WebSocket client: protobuf-es encode/decode, reconnect + `Resync{afterSeq}` |
| `lib/api.ts` | REST client |
| `state/` | Zustand stores: `topologyReducer` (applies snapshots and diffs by revision), `viewReducer` (intents → camera), scenario, chat, helper state |
| `components/` | `TopologyCanvas` (React Flow + elkjs), `ScenarioPanel` (goal, checks, hints, Next, reset, Start over), `ChatPanel`, `QuestionCard`, `Terminal` (xterm.js), `ConfigInspector` (Monaco), `Timeline`, `QueuedScreen` |

## 📁 Layout

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
├── Dockerfile               # Next.js standalone output
└── .github/workflows/ci.yml
```

## 🛠️ Local development

No real sandbox needed. Run Postgres and api from `platform`'s dev Compose with the **fake sandbox**. It drives the socket with a scripted cluster, so the canvas, scenario panel, chat and terminal can be built before any real sandbox exists.

The message types come from `@kubernetes-learning-platform/contracts` on GitHub Packages. Installing it needs a personal access token with `read:packages`. See [contracts → Installing the packages](https://github.com/kubernetes-learning-platform/contracts#-installing-the-packages).

**Ships:** the `web` container image (multi-arch) → GHCR. It runs in Docker Compose on the Hetzner box. Use HTTPS-only browser APIs (clipboard, `crypto.randomUUID`) freely: the mesh is served over HTTPS for exactly that reason.

## 📚 More

- [ARCHITECTURE §4 Services](https://github.com/kubernetes-learning-platform/docs/blob/main/ARCHITECTURE.md#4-services-and-their-entry-points) (web modules)
- [FEATURES](https://github.com/kubernetes-learning-platform/docs/blob/main/FEATURES.md): what each screen should do, and why

## 📄 License

[MIT](LICENSE)
