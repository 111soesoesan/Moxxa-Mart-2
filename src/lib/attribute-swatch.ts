/** Heuristic: treat this attribute axis as a color dimension (swatches + tooltips). */
export function isColorAttributeAxis(axis: string): boolean {
  const n = axis.trim().toLowerCase();
  return /color|colour|farbe|couleur|色|カラー/.test(n);
}

const NAMED_SWATCHES: Record<string, string> = {
  black: "#171717",
  charcoal: "#36454f",
  graphite: "#41424c",
  gray: "#6b7280",
  grey: "#6b7280",
  silver: "#c0c0c0",
  white: "#f5f5f5",
  offwhite: "#f5f5f0",
  "off white": "#f5f5f0",
  cream: "#fffdd0",
  beige: "#d4c4a8",
  tan: "#d2b48c",
  brown: "#78350f",
  red: "#b91c1c",
  burgundy: "#7f1d1d",
  maroon: "#450a0a",
  orange: "#ea580c",
  coral: "#fb7185",
  peach: "#fdba74",
  yellow: "#eab308",
  gold: "#ca8a04",
  olive: "#556b2f",
  green: "#15803d",
  mint: "#6ee7b7",
  teal: "#0d9488",
  turquoise: "#2dd4bf",
  blue: "#2563eb",
  navy: "#1e3a5f",
  "navy blue": "#1e293b",
  indigo: "#4338ca",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  pink: "#db2777",
  rose: "#f43f5e",
  magenta: "#c026d3",
};

function expandShortHex(hex: string): string {
  const h = hex.slice(1);
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  return hex.toLowerCase();
}

function hashHue(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue} 42% 52%)`;
}

/**
 * Map a variation attribute value (vendor-defined label or hex) to a CSS color for swatch fill.
 */
export function swatchColorFromAttributeValue(raw: string): string {
  const v = raw.trim();
  if (!v) return "#9ca3af";

  const hex6 = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex6) return `#${hex6[1].toLowerCase()}`;

  const hex3 = /^#([0-9a-f]{3})$/i.exec(v);
  if (hex3) return expandShortHex(`#${hex3[1]}`);

  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`;

  const key = v.toLowerCase().replace(/\s+/g, " ").trim();
  if (NAMED_SWATCHES[key]) return NAMED_SWATCHES[key];

  const compact = key.replace(/[\s_-]/g, "");
  for (const [name, color] of Object.entries(NAMED_SWATCHES)) {
    if (name.replace(/\s/g, "") === compact) return color;
  }

  return hashHue(key);
}

/** True if the resolved swatch is very light (needs a visible ring on white backgrounds). */
export function isLightSwatchFill(cssColor: string): boolean {
  const hex = /^#([0-9a-f]{6})$/i.exec(cssColor);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.85;
  }
  if (cssColor.startsWith("hsl")) {
    const m = cssColor.match(/hsl\(\s*\d+\s+([\d.]+)%\s+([\d.]+)%/i);
    if (m) {
      const l = parseFloat(m[2]);
      return l > 88;
    }
  }
  return false;
}
