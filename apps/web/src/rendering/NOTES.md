# Notes

## `Transform` is misplaced

`Transform` is currently defined in `apps/web/src/rendering/index.ts`. It's
exported from the rendering domain because rendering happens to be one of its
consumers — but every other domain that touches scene geometry consumes it too
(`@/timeline`, `@/preview`, `@/animation/values`, `@/text`, etc.). It's not
"of" rendering any more than `Vector2` would be "of" math.

`Transform` is closer to a primitive than a domain concept. It's infrastructure:
a small value type with no behavior, no dependencies, no domain-specific
invariants. Anything that wants to position something on a 2D canvas needs it.

The codebase should be refactored so it's defined lower-level, rather than
sitting in a domain. Candidate homes:

- `apps/web/src/primitives/transform.ts` (new dir for these value types)
- `apps/web/src/geometry/transform.ts` if `Vector2` and friends end up there
- `apps/web/src/rendering/transform.ts` is acceptable only if `@/rendering`
becomes a primitives folder rather than a domain (it's borderline today —
it also exports `BlendMode`, which has the same problem).

Side effect of fixing this: `@/rendering/animation-values.ts` (which exists
only because `Transform` lives next to it) can move into `@/animation/values.ts`
alongside the other resolve-at-time helpers, since `Transform` would no longer
pull in a domain dependency.