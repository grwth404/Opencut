# Effects & WebGL Renderer

## How to add a new effect

1. Create a new file in `apps/web/src/lib/effects/definitions/` (e.g. `brightness.ts`)
2. Export an `EffectDefinition` — see `blur.ts` as a reference
3. Register it in `apps/web/src/lib/effects/definitions/index.ts`

An effect definition has:
- `type` — unique string identifier
- `name` — display name
- `keywords` — for search
- `params` — user-facing controls (sliders, toggles, etc.)
- `renderer` — always `webgl`

All effects use WebGL. Even simple single-value effects like brightness or contrast are trivial shaders — there's no reason to leave the GPU pipeline for them.

## Single-pass vs multi-pass

The `webgl` renderer supports a `passes` array. Single-pass effects (e.g. color grading) just have one entry. Multi-pass is needed when an effect has to process its own output — blur (H then V), bloom (extract → blur → composite), glow, etc.

```typescript
renderer: {
  type: "webgl",
  passes: [
    { fragmentShader: myShader, uniforms: ({ effectParams }) => ({ ... }) },
  ],
}
```

### Dynamic pass counts with `buildPasses`

Some effects need a variable number of passes depending on their parameters (e.g. blur needs more iterations at high intensity to keep quality). For these, add a `buildPasses` function to the renderer:

```typescript
renderer: {
  type: "webgl",
  passes: [ /* static fallback — used if buildPasses is absent */ ],
  buildPasses: ({ effectParams, width, height }) => {
    // return ResolvedEffectPass[] with pre-computed uniforms
  },
}
```

When `buildPasses` is present, all rendering paths use it instead of the static `passes` array. The static array is kept as a structural reference and fallback for effects that don't need dynamic pass counts.

### Resolving passes — always use `resolveEffectPasses`

All code that consumes effect passes should go through the helper, never access `definition.renderer.passes` directly:

```typescript
import { resolveEffectPasses } from "@/lib/effects";

const passes = resolveEffectPasses({ definition, effectParams, width, height });
```

This handles the `buildPasses` vs static `passes` dispatch automatically.

### Pipeline

Linear effect chains (blur, color grading, bloom) go through `applyMultiPassEffect` in `apps/web/src/services/renderer/webgl-utils.ts`. Non-linear GPU pipelines that need branching or multi-texture passes (like JFA for signed distance fields) get their own orchestrator in `services/renderer/` and share the WebGL context via `webgl-context.ts`.

## Writing fragment shaders

Effect-specific shaders live in `apps/web/src/lib/effects/definitions/`. General-purpose GPU algorithm shaders (like JFA) live in `apps/web/src/lib/shaders/`. Domain-specific shaders that consume a general algorithm (like the mask feather smoothstep) live with their domain (e.g. `lib/masks/shaders/`). The shared vertex shader (`effect.vert.glsl`) maps clip space to UV coordinates — don't replace it unless you have a specific reason.

Available uniforms (automatically injected, no need to pass them manually):
- `u_texture` — the input texture (sampler2D)
- `u_resolution` — canvas size in pixels (vec2)

Any additional uniforms come from the `uniforms()` function in the pass definition.

**Sampling density and step scaling**

A fixed kernel (e.g. ±30 samples) can only cover ±30 texels at step=1. When the target sigma grows beyond ~10, the kernel can't cover enough of the Gaussian curve and the result degrades into a box filter.

The fix is a `u_step` uniform that spaces samples further apart. With step=4 the same 61-sample kernel covers ±120 texels. Bilinear texture filtering smooths the gaps between samples. For very large sigma, combine step scaling with **multi-iteration stacking** (multiple H+V pass pairs via `buildPasses`) — each iteration compounds the blur, and the effective sigma = per-pass sigma × √iterations.

Keep the step size moderate (≤4) to avoid visible banding. If you need more blur than step=4 allows in a single iteration, add iterations instead of increasing the step further.

```glsl
// u_step scales the distance between samples
float pos = float(i) * u_step;
float weight = exp(-(pos * pos) / (2.0 * u_sigma * u_sigma));
color += texture2D(u_texture, v_texCoord + texelSize * u_direction * pos) * weight;
```

Do **not** use large step sizes (>6) in a single pass — it creates visible banding regardless of bilinear interpolation. Use multiple iterations instead.

## Y-flip and coordinate systems

Source textures (uploaded from canvas) are Y-flipped via `UNPACK_FLIP_Y_WEBGL`. Intermediate FBO textures (rendered by WebGL between passes) are not. In practice this cancels out correctly as long as you use the shared vertex shader — it maps clip space Y consistently so both texture types sample correctly.

If you write a custom vertex shader or do manual coordinate math, be aware that canvas and WebGL have opposite Y origins (canvas: top-left, WebGL: bottom-left). Getting this wrong produces an upside-down result with no obvious error.
