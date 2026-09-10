# dsh-chat-focus

A dsh web conversation plugin that folds the **runtime activity** preceding each text reply (tool calls, thinking, retries, …) into expandable boxes, renders text replies as **chat bubbles**, and exposes a configurable settings panel. Distributed as an independent repository with **zero host source changes** (a bundle patch layer disables the host `ui-chat` bubble row; the chat layer registers into the host `ui-conversation` engine and session shell).

> **0.4.0 (2026-09-09):** **translucent bubbles** (whole-layer backdrop opacity + frosted glass) and the **bubble skin maker** (turn your own image / GIF / APNG / PNG sequence / video into a bubble backdrop — static art gets nine-slice, animated art renders as one layer, a stepped sprite, or a muted video layer), plus a settings page rebuilt as a **left tab rail with a pinned preview**. Design docs: docs/design/ (2026-09-09 bubble-skin increment set).
>
> **0.3.0 (2026-09-03):** migrated to the host **0.1.2-alpha.5** contract via route B — the fork is now a chat-layer plugin riding the host `ui-conversation` engine and session shell, replacing the host `ui-chat` bubble row. All fork-specific features (fold boxes / grouping / bubble skins / settings) are back. Migration record: docs/experience/migration-20260903-host-0.1.2-alpha.5-route-B.md.

[中文 README](./README.md)

## Features

- **Folded runtime activity**: consecutive runtime nodes before each text reply (tool-call, thinking, retry, context, command, compaction, …) collapse into an expandable box; **thinking (think) blocks fold into the same box** — no separate row
- **Keep the most recent N replies expanded**: `focusKeepVisible` means "replies kept expanded N" — the runtime runs of the most recent N reply bubbles render expanded; older runs fold. Live (streaming, no reply yet) activity stays visible
- **Three fold strategies** (selectable in settings): Expand recent N replies (keep-recent) / Threshold fold (fold once entries exceed N) / Fold all (always)
- **Chat bubbles**: assistant replies render as left-side bubbles (DeepSeek fish logo + HH:MM clock, calendar-aware); the default look mirrors the host user bubble (DeepSeek theme blue, 22px radius); user messages keep the host bubble
- **Fold summary** (toggling keeps the summary row in place; following the tail re-pins to the latest): category counts (tools / thinking / other) plus a deduped tool-name list (up to 5); open/closed state persists per run in localStorage (invalidated automatically when the strategy changes); long runs scroll inside the box (the outer flow stays untouched)
- **Deep customization** (Settings → Chat Display):
  - Assistant and user bubbles each expose 16 symmetric knobs: background, border, radius, max width, background image, background fit, **backdrop opacity**, **frosted glass**, text color, font family, font size, padding
  - **Translucent bubbles**: a backdrop-opacity slider (0–100%) fades the whole layer (color/image/gradient) while text stays opaque; frosted-glass presets blur whatever sits behind the bubble
  - Font presets that exist on both Windows and macOS and differ visibly from the theme default: Follow theme / KaiTi / SimSun / SimHei / Microsoft YaHei (≈ default) / Georgia (serif) / Consolas (mono)
  - Font-size presets: 12 / 14 / 16 / 18 / 20 / 24px (16px is the theme default)
  - Background image supports **local upload + crop dialog** (drag/resize frame, canvas export; uploads auto-compressed ≤1200px, ≤2MB); values are wrapped in `url()` automatically so images always render
  - Gradient editor: enable gradient background (start/end colors + angle); mutually exclusive with the background image (uploading an image turns the gradient off)
  - 6 built-in color templates: Default / Sky / Mint / Gradient / Dark / Texture
  - Per-side **Reset**; controls owned by an active skin are disabled with an explanation
- **Bubble skin maker** (Settings → Chat Display → Skins):
  - Five-step wizard with a pinned three-length live preview (short / medium / long)
  - **Parameter-only skins**: the source step can skip media entirely and package just the style
  - Sources: PNG / JPG / WebP / GIF / APNG / SVG; multiple PNGs become a frame sequence; MP4 / WebM videos
  - **Geometry step**: **background fit** (cover / contain / stretch) + **focal point** (with cover, drag the frame over the part that must stay visible; the bubble always keeps that point in view) + radius + content padding
  - GIF / APNG → native animation kept, one-layer rendering (radius clip + cover/stretch)
  - Video → two routes: **bake frames into a sprite sheet** (default; small, no decode cost, `steps()` animation at runtime) or **use the file directly** (muted looping `<video>` layer that keeps the original quality and length and only decodes while the bubble is on screen)
  - PNG sequences → frames baked into a **horizontal sprite sheet** (frame width / rate / count, with progress and cancel)
  - **A skin is the existing bubble editor packaged**: the Look & text step edits the same controls the settings page uses (colour / gradient / border / opacity / glass / overlay / text colour / font / size), and applying a skin writes them into that side's settings together with the artwork id — everything stays editable afterwards. The skin itself only owns the artwork and its geometry (nine-slice / radius / padding)
  - Library: 3 built-ins + your own; apply / rename / delete. Assets live in `~/.dsh/chat-focus/skins/` and are served through the host's authenticated `/api` route (with `Range` support, so video can seek and loop), so they survive site-data clearing and work across browsers on the same machine
- **Settings page: left tab rail + pinned preview** — Basics / Folding / Bubble look / Skins / Advanced. On wide layouts the rail sits left, the form scrolls in the middle, and the live preview stays pinned on the right; on narrow layouts the rail turns horizontal and the preview can be collapsed
  - **Bubble look** reuses one editor behind an assistant/user segmented switch and can **copy to the other side** in a single atomic write
  - **Advanced** holds the bulk reset, the skin-library status, and the asset location
- **Render error boundary**: a crashed row shows an error card instead of blanking the whole conversation; refresh recovers

## Screenshots

| Conversation: folded runtime activity + chat bubbles | Settings: split panel with pinned live preview |
| --- | --- |
| ![Conversation](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/conversation.png) | ![Settings](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/settings.png) |

## Settings guide

Open **Settings** (top-right) → **Chat Display**. The page is a **left tab rail plus a pinned preview**: five tabs (Basics / Folding / Bubble look / Skins / Advanced), a scrolling form in the middle, and the live preview always visible on the right. On narrow layouts the rail turns horizontal and the preview collapses behind a header button.

### Basics

- **Plugin switch**: off restores the original message order (no folding, no bubbles)
- **Chat bubbles**: text replies render as bubbles; off restores the host rendering
- **Bubble density**: Standard / Compact (both sides)

### Folding

- **Fold strategy**: recent N replies / threshold / fold all
- **Replies kept expanded N**, **fold boxes start expanded**, **fold summary**, **reasoning into fold**

### Bubble look (assistant / user segmented switch, symmetric)

- **Side being edited**: assistant / user segmented switch; **Copy to the other side** writes every setting from this side (skin included) onto the other in one atomic write
- **Style source**: bubble skin (see below) / color template (Default / Sky / Mint / Gradient / Dark / Texture)
- **Backdrop**: background color, **backdrop opacity** (0–100%, whole layer), **frosted glass** (off/light/medium/strong), background image (upload & crop, or URL), fit, crop alignment, gradient, readability overlay
- **Text**: color, font family, font size, padding
- **Geometry**: corner radius, max width, border color
- **Reset** clears every custom value for that side
- **Skin takeover**: with a skin applied, background/radius/border controls are disabled with an explanation — the artwork defines the shape. Text color stays adjustable (used when the skin does not set one).

### Skins

- **Make a skin**: a five-step wizard (Source → Prepare → Slice & geometry → Look & text → Save & apply) with a pinned three-length live preview
  - Sources: PNG / JPG / WebP / GIF / APNG / SVG; multiple PNGs become a frame sequence; MP4 / WebM videos
  - Static images: nine-slice using the same interaction as the backdrop cropper (movable center frame + per-edge drag + numeric inputs + “Estimate from artwork”); artwork is normalized to ≤256px so slice numbers stay display-sized
  - GIF / APNG: native animation kept, drawn as one layer (radius + cover/stretch)
  - Video: bake frames into a sprite sheet (default) or use the file directly as a muted looping layer
  - PNG sequences: frames are baked into a horizontal sprite sheet (frame width / rate / count, with progress and cancel)
- **Library**: 3 built-ins (Soft blue / Glass / Night) plus your own skins; apply to assistant / user / both, rename or delete custom ones
- Skin assets live in `~/.dsh/chat-focus/skins/` (`index.json` + `<id>.bin`) and are served by the host through the authenticated `/api/chat-focus/skin-asset` route with immutable versioned caching and `Range` support (so video skins can seek and loop). Without a host `connection` service the library reports unavailable while inline background images keep working.

### Advanced

- **Skin library status**: connected or not, how many self-made skins, the failure reason, and a retry button
- **Skin asset location**: `~/.dsh/chat-focus/skins/`
- **Reset all settings**: clears every bubble-look, skin, and folding customisation in one atomic write (confirmed first)

## Install

Always use the host's official plugin command, `dsh plugin --profile <name> <pnpm args...>` (pnpm forwarding + automatic reconciliation of dependencies that declare `dsh.bundle` into `dsh.profile.bundles`). This project ships no wrapper scripts and needs none.

From npm (recommended):

```sh
dsh plugin --profile web add dsh-chat-focus
```

Local development (official command against the local checkout):

```sh
pnpm run bundle                                                  # build lib/client.js first
dsh plugin --profile web add "link:E:\dsh-chat-focus"            # official command, auto bundle layer
# restart dsh web
```

The bundle's patch layer (`cordis.patch.yml`) is applied by the loader automatically: the host `ui-conversation` row is disabled and the `chat-focus` row mounts the fork; all other host plugins (ui-tool, ui-plan, ui-commands, …) keep registering into the fork's identically-named slots.

**Note: restart dsh after installing.**

## Uninstall

The official command only:

```sh
dsh plugin --profile web remove dsh-chat-focus   # removes the dependency + bundle layer; the host ui-conversation row restores after restart
```

Two optional MANUAL cleanups afterwards (both inert leftovers; your call):

```powershell
# 1) node_modules directory link left ONLY by `link:` installs (the loader never reads it):
Remove-Item C:\Users\super\.dsh\profiles\web\node_modules\dsh-chat-focus -Force -Recurse

# 2) the focus* customization fields under settings.yaml's ui-chat: namespace (the host
#    schema ignores unknown keys; KEEP them to restore your bubble customization after a reinstall)
```

Custom skin assets (`~/.dsh/chat-focus/`) are independent of the plugin and survive uninstall; delete the directory when you no longer need them.

Browser-side localStorage `dsh.chat-focus.fold.*` keys (unreachable by any server-side tool): in the dsh tab's console run
`Object.keys(localStorage).filter(k=>k.startsWith('dsh.chat-focus.')).forEach(k=>localStorage.removeItem(k))`, or clear site data for the dsh origin. Session records are untouched — the plugin only renders UI.

## Coexistence with dsh-web-ui-all (skins)

Known conflict: **after switching a skin, the host fails to boot** with `failed to parse overlay .../cordis.patch.yml: YAMLException: end of the stream or a document separator is expected`.

Cause: the profile boot patch template ships with a bare `[]` placeholder; the skin manager (`dsh-client-ui-skin-center`) appends its rows after it — a YAML flow sequence cannot be followed by top-level rows, so parsing fails. The skin manager works fine on any placeholder-free patch file (unrelated to dsh-chat-focus; any profile hits it).

Fix (one-time, idempotent; **does not modify third-party code**, unaffected by web-ui-all upgrades):

```sh
node scripts/patch-skin-center.mjs          # default web profile
node scripts/patch-skin-center.mjs --profile web
```

The script removes the `[]` placeholder from the profile patch file (automatic `.bak` backup). **Restart dsh web afterwards** — skin switching then writes valid YAML and the skin feature works normally.

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
pnpm install         # host repo (0.1.2-alpha.5 baseline) as cross-repo workspace members for @deepseek-ai/* deps
pnpm run typecheck   # tsc --noEmit (type contracts from host lib/types artifacts)
pnpm run bundle      # tsdown: lib/index.js (node half) + lib/client.js (browser bundle)
pnpm test            # grouping engine + skin geometry/sniffing/validation + host asset store (tsx, no vitest)
```

> Dev note: `pnpm-workspace.yaml` lists `../deepseek-harness/packages/*/*` and `../deepseek-harness/vendor/*` as workspace members (exact 0.1.2-alpha.5 contract). If pnpm does not materialize node_modules across parent directories, run `node scripts/setup-junctions.mjs` to link build deps by hand. **Never** run pnpm commands here that could rewrite the host node_modules.

## Version pairing (upstream adaptation)

| Host version | Fork version | Notes |
|--------------|--------------|-------|
| 0.1.2-alpha.5 | 0.4.0 | Translucent bubbles + bubble skin maker + left-rail settings page (host contract unchanged; purely additive) |
| rc.5 (2026-08-16 baseline) | 0.2.0 | v0.2 baseline (full fold strategies, bg upload/crop/fit, fold-box virtualization) |
| 0.1.2-alpha.5 (2026-09-02) | 0.3.0 | Route-B migration: the host removed `dsh-client-runtime`; the fork is now a chat layer (riding the `ui-conversation` engine row, replacing the `ui-chat` bubble row). Engine symbols moved to the `dsh-client-store` seed word, event predicates to `dsh-session/surface`, and the fold box dropped its estimated-row-height virtualizer |
| 0.1.1-rc.2 | 0.2.5 | Adapt to the attachment plugin split (`ImageGallery` etc. no longer exported from the platform module table): user bubbles moved onto the SAME `ChatBubble` pipeline as assistant replies; message images / composer attachments now flow through the `conversation.message.images` / `conversation.input.attachments` slots; ported the `referenceLabels` projection and the new reference-chip styling |

When the host upgrades:
1. Walk `docs/design/ui-design-20260816-dsh-chat-focus-模块1-基底复制域.md` §2.3 slot-contract table (21 slots + `conversation` service + node data model);
2. Update `tsconfig.json` paths (lib/types entries may move);
3. `pnpm run typecheck && pnpm run bundle`, then run a host test:gui smoke;
4. Update this table.

The host is pre-release (contracts may drift). If adaptation cost exceeds maintenance capacity, the alternative design (view-add-on, zero-surgery plugin row) is documented in `docs/design/solution-design-20260816-dsh-chat-focus-备选方案-视图附加型.md`.

## Known limitations (v0.4)

- The settings preview uses built-in sample data (the section seat is root-scoped; real-session preview is deferred per feedback)
- Font presets rely on system fonts: KaiTi/SimSun/SimHei ship with Windows and macOS but may be missing on Linux (falls back to the system default)
- Nine-slice applies to static images only: GIF/APNG, sprite sheets, and video render as one layer (radius + cover/stretch), because browsers do not animate `border-image`
- The sprite route bakes frames at creation time; the runtime never decodes video. Sprite animation stretches with the bubble, so pick artwork close to a typical bubble aspect
- The “use the video directly” route spends one video decoder per visible bubble (it pauses off-screen); many video bubbles in a long conversation will visibly cost GPU/memory, so reserve it for a few bubbles
- Skins are shared across browsers on the same machine but do not travel with the settings file; copy `~/.dsh/chat-focus/` to move them

## License

MIT. Forked from `@deepseek-ai/dsh-client-ui-conversation` (MIT), upstream copyright retained.
