function splitBackgroundLayers(input: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] as string;
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      layers.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  layers.push(input.slice(start).trim());
  return layers;
}

function extractColorFromStop(stop: string): string {
  const s = stop.trim();
  const funcs = ["rgba(", "rgb(", "hsla(", "hsl("] as const;
  for (const fn of funcs) {
    if (s.startsWith(fn)) {
      let depth = 0;
      for (let i = 0; i < s.length; i += 1) {
        const ch = s[i] as string;
        if (ch === "(") depth += 1;
        else if (ch === ")") {
          depth -= 1;
          if (depth === 0) {
            return s.slice(0, i + 1);
          }
        }
      }
      return s;
    }
  }
  const firstToken = s.split(" ")[0] as string;
  return firstToken;
}

function drawLinearGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: string
): void {
  const inside = layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")"));
  const parts = splitBackgroundLayers(inside);
  const dir = (parts.shift() || "").trim();
  let x0 = 0,
    y0 = 0,
    x1 = width,
    y1 = 0;
  if (dir.endsWith("deg")) {
    const deg = parseFloat(dir);
    const rad = ((90 - deg) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(width, height) / 2;
    x0 = cx - Math.cos(rad) * r;
    y0 = cy - Math.sin(rad) * r;
    x1 = cx + Math.cos(rad) * r;
    y1 = cy + Math.sin(rad) * r;
  } else if (dir.startsWith("to ")) {
    const d = dir.slice(3).trim();
    if (d === "right") {
      x0 = 0;
      y0 = 0;
      x1 = width;
      y1 = 0;
    } else if (d === "left") {
      x0 = width;
      y0 = 0;
      x1 = 0;
      y1 = 0;
    } else if (d === "bottom") {
      x0 = 0;
      y0 = 0;
      x1 = 0;
      y1 = height;
    } else if (d === "top") {
      x0 = 0;
      y0 = height;
      x1 = 0;
      y1 = 0;
    }
  } else {
    parts.unshift(dir);
  }
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  const colorStops = parts;
  const n = Math.max(1, colorStops.length - 1);
  for (let i = 0; i < colorStops.length; i += 1) {
    const color = extractColorFromStop(colorStops[i] as string);
    grad.addColorStop(Math.min(1, Math.max(0, i / n)), color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawRadialGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: string
): void {
  const inside = layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")"));
  const parts = splitBackgroundLayers(inside);
  const first = (parts.shift() || "").trim();
  let cx = width / 2;
  let cy = height / 2;
  if (first.startsWith("circle at")) {
    const pos = first.replace("circle at", "").trim();
    const [px, py] = pos.split(" ");
    const parsePos = (p?: string, full?: number): number => {
      if (!p) return (full || 0) / 2;
      if (p.endsWith("%")) return (parseFloat(p) / 100) * (full || 0);
      if (p === "left") return 0;
      if (p === "right") return full || 0;
      if (p === "top") return 0;
      if (p === "bottom") return full || 0;
      if (p === "center") return (full || 0) / 2;
      return (full || 0) / 2;
    };
    if (px && py) {
      cx = parsePos(px, width);
      cy = parsePos(py, height);
    } else if (px) {
      cx = parsePos(px, width);
      cy = parsePos(px, height);
    }
  } else {
    parts.unshift(first);
  }
  const r = Math.hypot(width, height);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const colorStops = parts;
  const n = Math.max(1, colorStops.length - 1);
  for (let i = 0; i < colorStops.length; i += 1) {
    const color = extractColorFromStop(colorStops[i] as string);
    grad.addColorStop(Math.min(1, Math.max(0, i / n)), color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export function drawCssBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  css: string
): void {
  const layers = splitBackgroundLayers(css).filter(Boolean);
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i] as string;
    if (layer.startsWith("linear-gradient(")) {
      drawLinearGradient(ctx, width, height, layer);
    } else if (layer.startsWith("radial-gradient(")) {
      drawRadialGradient(ctx, width, height, layer);
    } else if (
      layer.startsWith("#") ||
      layer.startsWith("rgb") ||
      layer.startsWith("hsl")
    ) {
      ctx.fillStyle = layer;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
