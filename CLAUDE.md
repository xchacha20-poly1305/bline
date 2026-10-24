# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

bline is a Claude Code mod (a plugin built on the mods API's function hooks, not shell hooks). It redraws the hint line under the prompt: model name with family emoji/color and a `⚡` in fast mode, reasoning effort in brackets, the engine's own hint line in the middle, and a context-window bar with the percentage on the right. Mods API docs: https://code.claude.com/docs/en/plugins/mods/api.md

## Commands

There is no package.json or build step; the engine compiles `hooks/register.tsx` itself.

- `claude plugin validate .` — reads the manifest, the state contract and the hooks module the way the engine does, and lists the hooks, `$` calls and state keys it found.
- `claude plugin test .` — runs `tests/*.test.tsx` against the engine's test kit (`claude-code/testing`).
- `claude --plugin-dir .` — starts a session with the working copy loaded; it hot-reloads on edits. If `bline@anrong-plugins` is also installed, disable it first so two copies don't both hook `PromptHint`.
- Type-check: `tsconfig.json` extends `./.claude-plugin/types/tsconfig.json`, which the engine writes (with the API declarations) only once it has loaded the folder, e.g. via `--plugin-dir`. Then `npx -p typescript tsc -p .`. The `.claude-plugin/types/` folder is generated: don't commit it.

## Architecture

All behavior is in `hooks/register.tsx`; `hooks/hooks.json` names it as the one module.

- **Drawing**: one `ui.render` hook on `{ component: 'PromptHint' }`. It calls `next(e)` to get the engine's own hint line and places it between its own left and right parts. The engine refuses a tree where its node sits under a Box that sizes it (`width`, etc.), so the outer Box sets only `flexDirection` and a sibling `<Box flexGrow={1} />` pushes the bar right. The test kit does not catch this rule; only a real session does.
- **State**: `effort` and `context` live in `$.state` as atoms under the plugin name `bline`, written from events and read while drawing (a read subscribes the drawing, so a write redraws it). `types/index.d.ts` is the state contract; it must be self-contained (no imports), which is why it declares its own `ContextFill` instead of importing `SessionContextUsage`. Renaming the plugin means renaming the `plugin:` key in the atoms, the contract and the test together.
- **Where each value comes from**:
  - model: `$.session.model()`, read at draw time; a leading `claude-` is dropped.
  - fast mode: the `fastMode` setting (what `/fast` saves), read at draw time. There is no fast-mode flag in the API, so with `fastModePerSessionOptIn` the mark can be wrong.
  - effort: `effortLevel` setting at `session.start`, then the effort of each main-loop `turn.step` (`agentId === undefined`), and after `/effort` via `command.run`. `turn.step` is a streaming event: its hook must be `async function*` and `return yield* next(e)`.
  - context: `$.session.usage()` at start, then `session.measure`.
- **Tables to edit for look**: `MODEL_FAMILIES` (substring → color + emoji, first match wins), `EFFORT_COLORS` / `RAINBOW_EFFORTS`, `FILL_COLORS` and `NEARLY_FULL_PERCENT` (shared by the red fill and the `🈵` mark), `BAR_CELLS`.

## Publishing

Users install from the separate marketplace repo `xchacha20-poly1305/agent-plugins` (`claude plugin install bline@anrong-plugins`), whose entry points at this repo's git URL; this repo has no `marketplace.json` of its own. Bump `version` in `.claude-plugin/plugin.json` for each published change.
