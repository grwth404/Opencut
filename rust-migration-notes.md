# Rust Migration Notes

## DefinitionRegistry is a TS pattern; in Rust it's a static match

In TS, `MasksRegistry`, `EffectsRegistry`, and similar registries are runtime maps that erase per-key type information through their `get()` return type. Helpers like `MaskDefinitionForRegistration = { [T in MaskType]: MaskDefinition<T> }[MaskType]` preserve useful type information on the registration side, but not on retrieval.

In Rust, mask definitions should be a `match mask { Mask::Rectangle(m) => RECTANGLE_DEF, ... }` or a `static const` table indexed by `MaskType`. Per-variant typing is preserved by exhaustive matching, so the registry class disappears entirely.

Do not try to fully type-thread the TS registry. The current shape is good enough for TS, and the awkwardness goes away for free in Rust.

## Mask interaction state moves into the Interaction enum

Today, `use-mask-handles.ts` holds drag state, pending-segment state, capture state, and active-handle state in refs/useState. These are all transient interaction state.

In Rust, this should live as one variant on `EditorState.interaction`. After the builtin/freeform split, that likely means `BuiltinMaskHandleSession` and `FreeformMaskHandleSession`, or one mask handle session with a `MaskHandleSessionKind` discriminator.

The `dragStateRef`, `pendingSegmentInsertRef`, and `captureRef` mutual-exclusion juggling disappears. The TS hook becomes event binding plus pixel-to-logical translation, calling into WASM for state transitions.

## MaskBody and MaskStroke map naturally to Rust enums

The `MaskBody` and `MaskStroke` discriminated unions map directly to Rust enums:

```rust
enum MaskBody {
    FillPath,
    DrawOpaque,
    DrawWithFeather { fast_path: Option<MaskPathBuilder> },
}

enum MaskStroke {
    StrokeFromPath,
    RenderStroke,
}
```

This TS cleanup is still worth keeping before the port. It makes renderer behavior explicit today, and the compositor will be enum-matched in Rust anyway.
