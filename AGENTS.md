# Agents.md

## Architecture

An ongoing migration is moving all business logic into `rust/`. Each app under `apps/` is a UI shell — it owns rendering, interaction, and platform-specific concerns, but never owns logic. The UI framework for any given app is a replaceable detail.

### `rust/`

The single source of truth for all non-UI code. Everything platform-agnostic belongs here: no components, no hooks, no framework imports.

### `apps/`

Each app is a frontend that calls into Rust. Logic is never duplicated between apps — only UI is, because each platform may use an entirely different framework and language to build it.

- `web/` — Next.js
- `desktop/` — GPUI

## Web

### React

- Read components before using them. They may already apply classes, which affects what you need to pass and how to override them.

### TypeScript

Function signatures should make the call site readable and let the function evolve without breaking callers. Positional parameters fail both: `formatTime(30, 24)` hides which number is which, and adding, removing, or reordering an argument silently breaks every caller whose types happen to still line up. A single destructured object fixes both at once - each argument names itself at the call site, and the shape can grow without churn. So signatures default to one object parameter:

```tsx
// ❌ meaning depends on order; the shape can't evolve without touching every caller
function formatTime(seconds: number, fps: number) { ... }

// ✅ each argument names itself; fields can be added, reordered, or made optional freely
function formatTime({ seconds, fps }: { seconds: number; fps: number }) { ... }
```

The one real exception is type predicates (`element is VideoElement`) — the language requires a positional subject, so the reasoning above doesn't get to apply.

