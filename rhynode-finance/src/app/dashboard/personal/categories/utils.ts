function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((c) => c + c)
          .join("")
      : sanitized;
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

export function getContrastColor(hex?: string | null) {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return "text-white";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "text-black" : "text-white";
}
