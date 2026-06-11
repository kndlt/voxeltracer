# WebGL2 Upgrade Assessment

*Written 2026-06-11. Verified against gl-react-dom@3.17.2 (locked version) and gl-react-dom@6.0.0 sources.*

## TL;DR

The renderer is locked to WebGL1 by one thing only: **gl-react-dom 3.17.2 hardcodes
`canvas.getContext("webgl")`** and offers no way to request `webgl2`. Everything
downstream — the `EnhancedNode` float-framebuffer Proxy hack, the GLSL ES 1.00
shaders, the float-decode voxel lookup — is a workaround for WebGL1 limitations.

WebGL2 has been universally supported since Safari 15 (Sept 2021); the iOS 12
concerns documented in `EnhancedNode.tsx` and `ScenePacker.ts` are obsolete.

The biggest wins, in order of impact:

1. Delete the `EnhancedNode` Proxy hack (float render targets are core-adjacent in WebGL2).
2. `texelFetch` + integer textures → exact voxel lookups, no float round-trip in the DDA hot loop.
3. `sampler3D` → voxel data addressed natively in 3D instead of hand-packed 1D-in-2D.
4. Uniform Buffer Objects + dynamic loop bounds → stop uploading and iterating 64 shape
   structs when the scene has 2.
5. GLSL ES 3.00 integer/bit ops → a real PRNG instead of `fract(sin(...))`.

Recommended path: **replace gl-react with a small three.js render pass** (three is
already a dependency, used for camera math). Alternative: upgrade to gl-react 6
(May 2026, supports WebGL2) — but it requires React ≥ 18, so it drags the whole
2018 toolchain along anyway.

---

## 1. Where WebGL1 is baked in today

| Site | What it does | WebGL1 constraint it works around |
|---|---|---|
| `gl-react-dom@3.17.2` `src/getContext.js` | Tries `"webgl"`, `"webgl-experimental"`, `"experimental-webgl"` — never `"webgl2"` | — (this is the lock itself) |
| `src/Components/VoxelShader/EnhancedNode.tsx` | Wraps the GL context in a `Proxy` that lies about `UNSIGNED_BYTE`, substituting `HALF_FLOAT_OES`, so gl-react's backbuffer becomes a half-float framebuffer | WebGL1 needs `OES_texture_half_float` + luck to render to float textures; there is no sized-internal-format API |
| `src/Shaders/**/*.glsl` (GLSL ES 1.00) | `varying`, `texture2D`, `gl_FragColor`, constant loop bounds | ES 1.00 has no `texelFetch`, no `sampler3D`, no integer textures, no dynamic loop conditions, no bit ops |
| `src/Shaders/Functions/voxelAt.glsl` | index → 2D texel coord → normalized UV (+0.5 half-pixel, y-flip) → `texture2D` → pick channel → `int(value * 255.0)` | No integer textures, no `texelFetch`; voxel bytes must masquerade as normalized RGBA color |
| `src/Data/Packers/ScenePacker.ts` | Flattens every model's `Uint8Array` into one `width²×4` RGBA texture, carries `byteOffset` per shape | No 3D textures in WebGL1; 2D is the only addressable storage |
| `src/Shaders/Uniforms/shapes.glsl` + `VoxelShader.tsx` | `uniform Shape shapes[64]`, padded with null shapes; gl-react sets each struct field as an individual uniform every frame | No UBOs; uniform arrays must be statically sized and loops over them statically bounded |
| `src/Shaders/Functions/intersectShape.glsl` | `ITERATION_LIMIT = 400` fixed DDA loop; imports `glsl-transpose` | ES 1.00 loops need compile-time bounds; no built-in `transpose()` |
| `src/Shaders/Functions/mod.glsl` | Hand-rolled integer `mod` | ES 1.00 has no `%` / integer `mod` for `int` |
| `src/Shaders/Functions/random.glsl` | `fract(sin(dot(...)) * 43758.5453)` | No `uint`, no bit ops → can't write a proper hash-based PRNG |

## 2. What WebGL2 buys us

### 2.1 Delete the EnhancedNode hack (correctness + maintainability)

In WebGL2, float color attachments are first-class: allocate the backbuffer as a
sized `RGBA16F` texture and enable the single, well-defined `EXT_color_buffer_float`
extension (supported everywhere WebGL2 is). The 60-line Proxy that fakes
`UNSIGNED_BYTE → HALF_FLOAT_OES` disappears, along with its "iOS 12 says it works
but doesn't" lore.

**Note:** this hack doesn't just become unnecessary under WebGL2 — it becomes
*invalid*. WebGL2 rejects `texImage2D` with unsized internal format `RGBA` + type
`HALF_FLOAT`; float textures require sized internal formats (`RGBA16F`). This is
why "just patch getContext to ask for webgl2" is not a viable shortcut (see §3,
Path C).

### 2.2 `texelFetch` + integer textures in the DDA hot loop (correctness + perf)

`voxelAt()` is executed up to 400 times per shape per ray segment, ×3 ray segments
(bounces), ×shadow rays — it is the single hottest function in the renderer. Today
each call does:

```
int index → ivec2 texel pos → float UV + half-pixel offset + y-flip
→ texture2D (filtered sampler path) → channel select via if-chain
→ int(value * 255.0)   // float round-trip of a byte
```

With WebGL2 the packed texture becomes `R8UI` (one voxel byte per texel, no RGBA
channel packing) and the lookup collapses to:

```glsl
uint v = texelFetch(packedTexture, texelPos, 0).r;
```

- **Exact**: no normalized-float encode/decode, no `*255.0` rounding hazard, no
  half-pixel UV arithmetic, no y-flip convention to remember.
- **Faster**: integer fetch path, no filtering, the channel-select branch chain is gone.
- The `componentIndex` machinery and `mod.glsl` are deleted (ES 3.00 has integer `%`).

### 2.3 `sampler3D` — voxel data is 3D; store it in 3D (simplicity + headroom)

`ScenePacker` exists to fake 3D addressing on a 2D texture. WebGL2 3D textures make
the natural representation possible:

- One `R8UI` 3D atlas (models stacked along z, `byteOffset` becomes a z-offset), or
  one 3D texture per model.
- `voxelAt` becomes `texelFetch(voxels, cellIndex + shapeOffset, 0).r` — the
  index-flattening arithmetic (`z*sy*sx + y*sx + x`), the `byteOffset`, and the
  "x, y flipped" comment all vanish.
- Guaranteed minimum 3D texture size is 256³ — exactly MagicaVoxel's maximum model
  size, so the guaranteed floor already fits any single model. (Current 2D scheme
  caps total scene volume at 4096²×4 = 67M voxels; a 2048³-capable device gives
  orders of magnitude more headroom for atlases.)

This is the largest *structural* simplification: `ScenePacker` shrinks to "copy
each model into its atlas slot".

### 2.4 UBO + dynamic shape count (CPU-side perf per frame)

The shader declares `Shape shapes[64]` and `VoxelShader.tsx` pads the array with
null shapes. Consequences today:

- gl-react uploads each struct field of all 64 shapes as individual `uniform*`
  calls **every frame** — and the accumulator re-renders up to `maxTick = 1000`
  frames per camera pose.
- `intersectShapes` AABB-tests all 64 slots per ray segment even for a 1-model scene.

WebGL2 fixes both:

- **UBO**: pack all shapes into one `std140` buffer, upload with a single
  `bufferSubData` — and only when the scene changes, not per frame.
- **Dynamic loop bounds** (ES 3.00): `for (int i = 0; i < shapeCount; ++i)` with a
  plain uniform — the 64-slot padding loop, `nullShapeHash`, and `MAX_SHAPES`
  export all become unnecessary. (A 64-shape *capacity* can stay; we just stop
  paying for unused slots.)

### 2.5 Proper PRNG (image quality)

`fract(sin(...))` hashes are a known source of structured artifacts and precision
collapse in path tracers (visible banding at high sample counts, correlation
between bounces). ES 3.00 `uint` + bit operations enable PCG/xorshift-class
hashes — a drop-in replacement for `random.glsl` that improves convergence
quality at zero runtime cost.

### 2.6 Smaller wins

- `transpose()` is built in → drop the `glsl-transpose` dependency
  (`intersectShape.glsl:29` even has a TODO about its cost).
- Integer `%` → delete `mod.glsl`.
- Dynamic `break` conditions in the DDA loop (no fixed 400-iteration unroll pressure
  on drivers that fully unroll ES 1.00 loops).
- `EXT_disjoint_timer_query_webgl2` → GPU-side timing to actually measure the above.
- **MRT** (multiple render targets) — not needed today, but the prerequisite for
  any future denoiser (emit albedo/normal/first-hit-depth alongside color; an
  SVGF-style filter could cut the 1000-tick convergence budget dramatically).
- sRGB framebuffer support for correct gamma instead of implicit conventions.

### 2.7 What WebGL2 does *not* fix

- Bounce limit, light model, and material TODOs (`plastic`, `attenuation`, `unit`
  params dropped in `MaterialArray`) — orthogonal.
- The 2018 toolchain (TS 3.2, webpack 4, React 16, node <17 pin) — orthogonal, but
  every migration path forces part of it to move (see §4 Phase 0).

## 3. Migration paths

### Path A — upgrade gl-react 3.17 → 6.0

gl-react-dom 6.0.0 (published 2026-05-15) tries `"webgl2"` first in `getContext`
and falls back to WebGL1. Declarative structure (`Node`, `Backbuffer`,
`NearestCopy`) is preserved.

- **Requires React ≥ 18** (peer dep) → React 16 → 18 upgrade, plus whatever the
  API diff between gl-react 3 and 6 is (unverified; three major versions).
- Must verify gl-react 6 allocates float backbuffers correctly under WebGL2; if
  not, an `EnhancedNode`-style override is needed again — under WebGL2 rules
  (sized internal formats) this time.
- Keeps an extra dependency whose maintenance cadence has been irregular.

### Path B — drop gl-react, render the pass with three.js (recommended)

three.js is already a dependency (camera, matrices, OrbitControls). Modern three
(r163+) is WebGL2-only. The gl-react usage here is small and well-understood — one
fullscreen fragment shader with a backbuffer:

- Fullscreen triangle + `RawShaderMaterial` (the existing GLSL ports over).
- Two `RGBA16F` `WebGLRenderTarget`s, ping-pong: read previous accumulation, write
  next (replaces `Uniform.Backbuffer` + `getPreviousColor`).
- A trivial copy/display pass (replaces `NearestCopy`).
- Texture upload from the existing `ndarray`s via `DataTexture` /
  `Data3DTexture` (nearest filtering, as today).

Removes gl-react, gl-react-dom, `EnhancedNode`, and the `@types/react` 16 pin in
one move; the library bundle loses a dependency rather than gaining one. Cost:
~200–300 lines of explicit render-loop code we own, and a three 0.99 → modern
upgrade (self-contained; the three API surface used today is Vector3/Matrix3/
Matrix4/Color/PerspectiveCamera/OrbitControls).

### Path C — patch gl-react-dom's getContext to request "webgl2" (not viable as-is)

Tempting because WebGL2 contexts accept GLSL ES 1.00 shaders and most WebGL1 API
calls. **But it breaks immediately**: `EnhancedNode`'s Proxy makes gl-react call
`texImage2D(..., RGBA, RGBA, HALF_FLOAT, ...)`, which WebGL1 + extension accepts
but WebGL2 rejects (float requires sized internal format `RGBA16F`). Fixing that
means patching gl-react's internal texture allocation — at which point Path A or B
is less work. Useful only as a throwaway spike to measure WebGL2 driver behavior.

## 4. Phased plan (assuming Path B)

**Phase 0 — toolchain unblock.** webpack 4 cannot parse modern syntax
(`?.`/`??`) shipped in current three.js builds, and the node `<17` engine pin
blocks current tooling. Minimum: bump three + transpile it through babel, or
(better) move the build to webpack 5/Vite and unpin node. This phase is shared by
every path and is the bulk of the schedule risk, not WebGL2 itself.
*Estimate: 1–3 days depending on how far we modernize.*

**Phase 1 — own the render pass.** Replace `EnhancedNode`/gl-react with the
three.js fullscreen pass + `RGBA16F` ping-pong targets, keeping shaders GLSL ES
1.00 (a WebGL2 context compiles them fine). Visual output must be pixel-comparable
to today. Delete `EnhancedNode.tsx`.
*Estimate: 2–4 days. Risk: subtle accumulation differences; compare against
`captureAsBlob()` goldens of the sample .vox files.*

**Phase 2 — port shaders to GLSL ES 3.00.** Mechanical: `#version 300 es` (must be
the first line — verify the glslify-loader pipeline prepends correctly),
`varying → in`, `texture2D → texture`, `gl_FragColor → out vec4`. Drop
`glsl-transpose` and `mod.glsl`.
*Estimate: 1 day.*

**Phase 3 — data-path wins.** `R8UI` packed texture + `texelFetch` in `voxelAt`;
UBO for shapes + `shapeCount` uniform with dynamic loop; then `Data3DTexture`
atlas + `sampler3D`, shrinking `ScenePacker`.
*Estimate: 3–5 days. Each step is independently shippable and benchmarkable
(add timer queries first).*

**Phase 4 — quality.** Integer-hash PRNG in `random.glsl`. Optional MRT
groundwork for a future denoiser.
*Estimate: 0.5 day for the PRNG; denoiser is its own project.*

## 5. Risks & compatibility

- **Browser support (2026):** WebGL2 is universal — Chrome 56+ (2017),
  Firefox 51+ (2017), Safari 15+ (2021), all evergreen mobile browsers. The
  iOS 12 / 4096-texture comments in the code predate this. If a WebGL1 fallback
  is deemed necessary for the library, that doubles shader maintenance; recommend
  **not** providing one and documenting WebGL2 as a requirement.
- **glslify + `#version 300 es`:** the directive must be the literal first line of
  the concatenated source; verify the loader chain (raw-loader → glslify-loader)
  and any header gl-react/three prepends.
- **Golden-image safety net:** the library already exposes `captureAsBlob()`;
  capture fixed-tick renders of a handful of `public/vox` scenes before Phase 1
  and diff after each phase. (There are currently no tests covering rendering.)
- **std140 padding:** UBO struct layout (mat3 in std140 pads to 3×vec4) is a
  classic source of silent corruption; lay out the Shape struct explicitly.

## 6. Recommendation

Do Phase 0 + 1 + 2 as one arc (the "get onto WebGL2" milestone, roughly a week),
ship, then take Phase 3 incrementally with timer-query numbers to justify each
step. Choose Path B unless keeping gl-react's declarative API is valued enough to
pay the React 18 + gl-react 6 migration with unknown API diff — the code we'd
write for Path B is code this project already conceptually owns (the Proxy hack
proves gl-react's abstraction was being fought, not used).
