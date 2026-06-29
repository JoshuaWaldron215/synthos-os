// Parses loose money strings like "$12k", "$1.2m", "$8,000" into a number.
// Returns 0 for blanks or unparseable input so totals stay robust.
export function parseMoney(input: string): number {
  if (!input) return 0;
  const s = input.toLowerCase().replace(/[$,\s]/g, "");
  const m = s.match(/^(-?\d*\.?\d+)([km])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (Number.isNaN(n)) return 0;
  if (m[2] === "k") n *= 1_000;
  else if (m[2] === "m") n *= 1_000_000;
  return n;
}

// Formats a number back into a compact money string ("$12k", "$1.2m").
export function formatMoney(n: number): string {
  if (!n) return "$0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}m`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000)}k`;
  return `${sign}$${abs}`;
}

export function sumMoney(values: string[]): string {
  return formatMoney(values.reduce((acc, v) => acc + parseMoney(v), 0));
}
