# dsh-chat-focus

A dsh web conversation plugin that folds the **runtime activity** preceding each text reply (tool calls, thinking, retries, …) into expandable boxes, renders text replies as **chat bubbles**, and exposes a configurable settings panel. Distributed as an independent repository with **zero host source changes** (a bundle patch layer replaces the host `ui-conversation` row).

Implementation: a fork of the host `@deepseek-ai/dsh-client-ui-conversation` (rc.5 baseline) with a reworked chat domain (grouping engine / bubbles / fold boxes) and an extended settings schema.

[中文 README](./README.md)

## Features

- **Folded runtime activity**: consecutive runtime nodes before each text reply (tool-call, thinking, retry, context, command, compaction, …) collapse into an expandable box; **thinking (think) blocks fold into the same box** — no separate row
- **Keep the most recent N replies expanded**: `focusKeepVisible` means "replies kept expanded N" — the runtime runs of the most recent N reply bubbles render expanded; older runs fold. Live (streaming, no reply yet) activity stays visible
- **Three fold strategies** (selectable in settings): Expand recent N replies (keep-recent) / Threshold fold (fold once entries exceed N) / Fold all (always)
- **Chat bubbles**: assistant replies render as left-side bubbles (DeepSeek fish logo + HH:MM clock, calendar-aware); the default look mirrors the host user bubble (DeepSeek theme blue, 22px radius); user messages keep the host bubble
- **Fold summary**: category counts (tools / thinking / other) plus a deduped tool-name list (up to 5); open/closed state persists per run in localStorage (invalidated automatically when the strategy changes); long runs render **windowed** (virtual list, constant render cost)
- **Deep customization** (Settings → Chat Display → Appearance):
  - Assistant and user bubbles each expose 14 symmetric knobs: background, border, radius, max width, background image, background fit (cover/contain/stretch), text color, font family, font size, padding (any CSS value)
  - Font presets that exist on both Windows and macOS and differ visibly from the theme default: Follow theme / KaiTi / SimSun / SimHei / Microsoft YaHei (≈ default) / Georgia (serif) / Consolas (mono)
  - Font-size presets: 12 / 14 / 16 / 18 / 20 / 24px (16px is the theme default)
  - Background image supports **local upload + crop dialog** (drag/resize frame, canvas export; uploads auto-compressed ≤1200px, ≤2MB); values are wrapped in `url()` automatically so images always render
  - Gradient editor: enable gradient background (start/end colors + angle); mutually exclusive with the background image (uploading an image turns the gradient off)
  - 6 built-in templates: Default / Sky / Mint / Gradient / Dark / Texture
  - The assistant/user bubble editors are collapsible, with a per-side **Reset** button
- **Split settings panel**: grouped controls scroll on top, the live preview (fold box + assistant bubble + user bubble) stays **pinned at the bottom** — visible from any scroll position
- **Render error boundary**: a crashed row shows an error card instead of blanking the whole conversation; refresh recovers

## Screenshots

| Conversation: folded runtime activity + chat bubbles | Settings: split panel with pinned live preview |
| --- | --- |
| ![Conversation](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/conversation.png) | ![Settings](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/settings.png) |

## Settings guide

Open **Settings** (top-right) → **Chat Display**. The panel is split vertically: grouped controls scroll on top, the live preview stays pinned at the bottom.

### Basics

- **Plugin switch**: off restores the original message order (no folding, no bubbles)
- **Chat bubbles**: text replies render as bubbles; off restores the host rendering

### Folding

- **Recent N replies expanded**: the runtime runs of the most recent N replies render expanded; older runs fold (live streaming activity stays visible)
- **Fold boxes start expanded**
- **Fold strategy**: Expand recent N (default) / Threshold (fold once entries exceed N) / Fold all
- **Reasoning into fold**: text-less thinking steps join the runtime run instead of a separate row

### Appearance

- **Bubble template**: Default / Sky / Mint / Gradient / Dark / Texture — one click, still fine-tunable
- **Gradient**: enable → start/end colors (color wheel + text) + angle (15° steps); overrides the background image (uploading an image turns it off)
- **Assistant / User bubble** (collapsible titles, 14 symmetric knobs):
  - Background, border: color wheel + text input
  - Radius, max width: preset dropdowns (10/14/18/22px; 480/600/720/840px) or custom
  - Background image: **Upload** → crop dialog (drag/scale handles + grid, ≤1200px export) → confirm; or paste a URL; **Clear** removes it
  - Fit: cover / contain / stretch
  - Text color: color wheel + text input
  - Font: preset dropdown (Follow theme / KaiTi / SimSun / SimHei / Microsoft YaHei / Georgia / Consolas)
  - Font size: 12/14/16/18/20/24px (16px is the default — picking it changes nothing visually)
  - Padding: 6x10 / 10x14 / 14x18px or custom
  - **Reset**: clears all custom values for that side
- **Live preview**: fold box + assistant bubble + user bubble samples, updated instantly on every change

## Install

The host ships an official plugin command, `dsh plugin --profile <name> <pnpm args...>` (pnpm forwarding + automatic reconciliation of dependencies that declare `dsh.bundle` into `dsh.profile.bundles`).

From npm (recommended):

```sh
dsh plugin --profile web add dsh-chat-focus
```

Local development (one-click script — backup and verification included):

```sh
node scripts/install.mjs          # default web profile
node scripts/install.mjs --profile web --plugin-path E:\dsh-chat-focus
```

Equivalent manual steps (local):

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
| focusStrategy | keep-recent/threshold/always | keep-recent | Fold strategy (expand recent N / threshold fold / fold all) |
| focusBubbleStyle | default/compact | default | Bubble density |
| focusReasoning | boolean | true | Text-less thinking steps join the runtime run |
| focusBubbleBg / Border / Radius / MaxWidth / BgImage / BgSize | string | '' / cover | Assistant bubble custom chrome (bg / border / radius / max width / bg image / fit) |
| focusBubbleTextColor / Font / FontSize / Padding | string | '' | Assistant bubble text custom (color / font / size / padding) |
| focusBubbleGradientFrom / GradientTo / GradientAngle | string | '' / '' / '135' | Assistant bubble gradient (start/end colors, angle) |
| focusBubblePreset | string | '' | Bubble template id |
| focusUserBubble* (Bg / Border / Radius / MaxWidth / BgImage / BgSize / TextColor / Font / FontSize / Padding / Gradient* / Preset) | string | '' / cover | User bubble custom (14 symmetric knobs) |

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
| rc.5 (2026-08-16 baseline) | 0.2.0 | current baseline (v0.2: full fold strategies, bg upload/crop/fit, fold-box virtualization) |

When the host upgrades:
1. Walk `docs/design/ui-design-20260816-dsh-chat-focus-模块1-基底复制域.md` §2.3 slot-contract table (21 slots + `conversation` service + node data model);
2. Update `tsconfig.json` paths (lib/types entries may move);
3. `pnpm run typecheck && pnpm run bundle`, then run a host test:gui smoke;
4. Update this table.

The host is pre-release (contracts may drift). If adaptation cost exceeds maintenance capacity, the alternative design (view-add-on, zero-surgery plugin row) is documented in `docs/design/solution-design-20260816-dsh-chat-focus-备选方案-视图附加型.md`.

## Known limitations (v0.2)

- The settings preview uses built-in sample data (the section seat is root-scoped; real-session preview is deferred per feedback)
- Fold-box virtualization uses an estimated row height (fixed 56px spacing); measured row-height calibration is v0.3 work
- Font presets rely on system fonts: KaiTi/SimSun/SimHei ship with Windows and macOS but may be missing on Linux (falls back to the system default)

## License

MIT. Forked from `@deepseek-ai/dsh-client-ui-conversation` (MIT), upstream copyright retained.
