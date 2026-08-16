# dsh-chat-focus

A dsh web conversation plugin that folds the **runtime activity** preceding each text reply (tool calls, thinking, retries, …) into expandable boxes, renders text replies as **chat bubbles**, and exposes a configurable settings panel. Distributed as an independent repository with **zero host source changes** (a bundle patch layer replaces the host `ui-conversation` row).

Implementation: a fork of the host `@deepseek-ai/dsh-client-ui-conversation` (rc.5 baseline) with a reworked chat domain (grouping engine / bubbles / fold boxes) and an extended settings schema.

[中文 README](./README.md)

## Features

- **Folded runtime activity**: consecutive runtime nodes before each text reply (tool-call, thinking, retry, context, command, compaction, …) collapse into an expandable box; **thinking (think) blocks fold into the same box** — no separate row
- **Keep the most recent N replies expanded**: `focusKeepVisible` means "replies kept expanded N" — the runtime runs of the most recent N reply bubbles render expanded; older runs fold. Live (streaming, no reply yet) activity stays visible
- **Chat bubbles**: assistant replies render as left-side bubbles (DeepSeek fish logo + HH:MM clock, calendar-aware); the default look mirrors the host user bubble (DeepSeek theme blue, 22px radius); user messages keep the host bubble
- **Fold summary**: category counts (tools / thinking / other) plus a deduped tool-name list (up to 5); open/closed state persists per run in localStorage (invalidated automatically when the strategy changes)
- **Deep customization** (Settings → Chat Display → Appearance):
  - Assistant bubble, 9 knobs: background, border, radius, max width, background image, text color, font family, font size, padding (any CSS value)
  - User bubble, 3 knobs: background, text color, font family
  - 6 built-in templates: Default / Sky / Mint / Gradient / Dark / Texture
  - Live preview: fold box + assistant bubble + user bubble

## Install

The host ships an official plugin command, `dsh plugin --profile <name> <pnpm args...>` (pnpm forwarding + automatic reconciliation of dependencies that declare `dsh.bundle` into `dsh.profile.bundles`).

One-click script (recommended — backup and verification included):

```sh
node scripts/install.mjs          # default web profile
node scripts/install.mjs --profile web --plugin-path E:\dsh-chat-focus
```

Equivalent manual steps:

```sh
pnpm run bundle                                                  # build lib/client.js first
dsh plugin --profile web add "link:E:\dsh-chat-focus"            # install + auto bundle layer
# restart dsh web
```

The bundle's patch layer (`cordis.patch.yml`) is applied by the loader automatically: the host `ui-conversation` row is disabled and the `chat-focus` row mounts the fork; all other host plugins (ui-tool, ui-plan, ui-commands, …) keep registering into the fork's identically-named slots.

## Uninstall

```sh
node scripts/uninstall.mjs                 # keep harmless settings leftovers
node scripts/uninstall.mjs --clean-settings  # also remove focus* fields from settings.yaml
```

Equivalent manual step: `dsh plugin --profile web remove dsh-chat-focus` + restart.

Once the bundle layer is gone, the host `ui-conversation` row restores automatically (patch-layer semantics: a layer that is not applied leaves the host row). Harmless leftovers: `focus*` fields under the `ui-conversation` namespace in the settings file (the host schema ignores unknown keys; `--clean-settings` removes them) and `dsh.chat-focus.fold.*` localStorage keys (browser-side). Session records are untouched — the plugin only renders UI.

## Configuration

Settings fields (namespace `ui-conversation`, extended schema; already allowed by the host api-proxy allowlist):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| focusEnabled | boolean | true | Master switch; off restores the original message order |
| focusBubbles | boolean | true | Chat bubble chrome |
| focusKeepVisible | number(0-10) | 1 | Replies kept expanded N |
| focusDefaultOpen | boolean | false | Fold boxes start expanded |
| focusSummary | boolean | true | Fold summary (counts + tool names) |
| focusStrategy | keep-recent/threshold/always | keep-recent | Fold strategy (v0.1 implements keep-recent only; other options disabled) |
| focusBubbleStyle | default/compact | default | Bubble density |
| focusReasoning | boolean | true | Text-less thinking steps join the runtime run |
| focusBubbleBg / Border / Radius / MaxWidth / BgImage | string | '' | Assistant bubble custom chrome (bg / border / radius / max width / bg image) |
| focusBubbleTextColor / Font / FontSize / Padding | string | '' | Assistant bubble text custom (color / font / size / padding) |
| focusBubblePreset | string | '' | Bubble template id |
| focusUserBubbleBg / TextColor / Font | string | '' | User bubble custom (bg / text color / font) |

## Build

```sh
pnpm install         # host repo (rc.5 baseline) as cross-repo workspace members for @deepseek-ai/* deps
pnpm run typecheck   # tsc --noEmit (type contracts from host lib/types artifacts)
pnpm run bundle      # tsdown: lib/index.js (node half) + lib/client.js (browser bundle)
pnpm run test:engine # grouping engine behavior checks (tsx)
```

> Dev note: `pnpm-workspace.yaml` lists `../deepseek-harness/packages/*/*` and `../deepseek-harness/vendor/*` as workspace members (exact rc.5 contract). If pnpm does not materialize node_modules across parent directories, run `node scripts/setup-junctions.mjs` to link build deps by hand. **Never** run pnpm commands here that could rewrite the host node_modules.

## Version pairing (upstream adaptation)

| Host version | Fork version | Notes |
|--------------|--------------|-------|
| rc.5 (2026-08-16 baseline) | 0.1.0 | current baseline |

When the host upgrades:
1. Walk `docs/design/ui-design-20260816-dsh-chat-focus-模块1-基底复制域.md` §2.3 slot-contract table (21 slots + `conversation` service + node data model);
2. Update `tsconfig.json` paths (lib/types entries may move);
3. `pnpm run typecheck && pnpm run bundle`, then run a host test:gui smoke;
4. Update this table.

The host is pre-release (contracts may drift). If adaptation cost exceeds maintenance capacity, the alternative design (view-add-on, zero-surgery plugin row) is documented in `docs/design/solution-design-20260816-dsh-chat-focus-备选方案-视图附加型.md`.

## Known limitations (v0.1)

- `focusStrategy` `threshold`/`always` not implemented (disabled in settings; historical values degrade to keep-recent)
- The settings preview uses built-in sample data (the section seat is root-scoped; v0.2 will add a real-session channel via inject)
- Fold-box content renders as a plain list (inner scroll container; window virtualization + row-height calibration are v0.2 work)
- The user bubble is host-rendered; background/text color/font are customizable via CSS-variable inheritance, while host-fixed values (radius, font size) are not adjustable yet

## License

MIT. Forked from `@deepseek-ai/dsh-client-ui-conversation` (MIT), upstream copyright retained.
