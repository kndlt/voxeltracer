// Presents the latest accumulation texture to the canvas. Sampling goes
// through interpolated UVs so a reduced-resolution accumulation (dynamic
// resolution scaling) upscales to the full canvas.

@group(0) @binding(0) var src: texture_2d<f32>;

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VsOut {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VsOut;
  out.pos = vec4f(pos[vi], 0.0, 1.0);
  // NDC y=+1 is the top of the canvas, which is accumulation row 0
  out.uv = vec2f(pos[vi].x * 0.5 + 0.5, 0.5 - pos[vi].y * 0.5);
  return out;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  let size = vec2i(textureDimensions(src));
  let q = clamp(vec2i(in.uv * vec2f(size)), vec2i(0), size - 1);
  return vec4f(textureLoad(src, q, 0).rgb, 1.0);
}
