
// controls/calculator.js

function evaluateMath(a, operator, b) {
  const x = Number(a ?? 0);
  const y = Number(b ?? 0);

  if (isNaN(x) || (["/", "%", "divide", "mod"].includes(operator) && y === 0)) {
    return "";
  }

  switch (operator) {
    case "+":
    case "add":
      return x + y;
    case "-":
    case "subtract":
      return x - y;
    case "*":
    case "multiply":
      return x * y;
    case "/":
    case "divide":
      return x / y;
    case "%":
    case "mod":
      return x % y;
    case "pad":
      return String(x).padStart(y, "0");
    case "abs":
      return Math.abs(x);
    case "round":
      return Math.round(x);
    case "ceil":
      return Math.ceil(x);
    case "floor":
      return Math.floor(x);
    default:
      return "";
  }
}

function computeStats(values = [], percentile = null) {
  const clean = values
    .map((v) => Number(v))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  if (clean.length === 0) return null;

  const sum = clean.reduce((a, b) => a + b, 0);
  const avg = sum / clean.length;
  const min = clean[0];
  const max = clean[clean.length - 1];

  // Median
  const mid = Math.floor(clean.length / 2);
  const median =
    clean.length % 2 === 0
      ? (clean[mid - 1] + clean[mid]) / 2
      : clean[mid];

  // Standard deviation (sample)
  const variance =
    clean.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    (clean.length - 1);
  const stddev = Math.sqrt(variance);

  // Percentile
  let percentileValue = null;
  if (percentile != null) {
    const p = Math.min(Math.max(Number(percentile), 0), 100);
    const idx = (p / 100) * (clean.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) {
      percentileValue = clean[lower];
    } else {
      const weight = idx - lower;
      percentileValue =
        clean[lower] * (1 - weight) + clean[upper] * weight;
    }
  }

  return {
    min,
    max,
    sum,
    avg,
    median,
    stddev,
    percentile: percentileValue,
    percentileInput: percentile,
    count: clean.length,
  };
}

module.exports = { evaluateMath, computeStats };