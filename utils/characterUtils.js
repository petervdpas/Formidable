// utils/characterUtils.js

// Grouped for maintainability

export const characterCategories = {
  arrows: [
    "→","←","↑","↓","↔","↕","⇨","⇦","⇧","⇩","↻","↺","↩","↪","↫","↬",
  ],
  greek: [
    "α","β","γ","δ","ε","ζ","η","θ","λ","μ","ν","ξ","π","ρ","σ","ω",
  ],
  math: [
    "±","×","÷","√","∞","≈","≤","≥","∑","∏","∂","∆","∫","∇","∝","∴",
  ],
  accentedE: [
    "é","è","ê","ë","ė","ē","ę","ĕ","ȩ","ẻ","ẽ","ế","ề","ệ","ḗ","ḕ",
  ],
  symbols: [
    "©","®","™","★","☆","☀","☁","☂","☃","☕","♠","♥","♣","♦","✓","✗",
  ],
  boxesShapes: [
    "□","■","▢","▣","◯","●","◍","◌","◆","◇","△","▽","▼","▲","◄","►",
  ],
  latinExtended: [
    "à","á","â","ä","ã","å","ā","ă","ą","ç","ć","č","đ","ð","ñ","õ",
  ],
  mixedExtras: [
    "ù","ú","û","ü","ū","ŭ","ů","ű","ỳ","ý","ÿ","ŷ","ž","ź","ż","þ",
  ],
};

// Flat export for grid population
export const allCharacters = Object.values(characterCategories).flat();

// Convert to grid-ready array for createOptionGrid
export function toGridOptions(chars) {
  return chars.map(c => ({ value: c, label: c }));
}
