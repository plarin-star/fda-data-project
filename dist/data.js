const CSV_URL = new URL("./data/women-powerlifting.csv", import.meta.url);
const SUMMARY_URL = new URL("./data/summary.json", import.meta.url);

export const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatNumber = (value, digits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
};

export const median = (values) => {
  const sorted = values.filter((value) => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character]));

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') { cell += '"'; index += 1; }
      else { quoted = !quoted; }
    } else if (character === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else { cell += character; }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function loadSummary() {
  const response = await fetch(SUMMARY_URL);
  if (!response.ok) throw new Error(`Summary request failed: ${response.status}`);
  return response.json();
}

export async function loadRows() {
  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
  const text = await response.text();
  const parsed = parseCSV(text);
  const headers = parsed.shift();
  return parsed.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

export function groupRows(rows, key) {
  return rows.reduce((groups, row) => {
    const value = row[key] || "Unknown";
    if (!groups[value]) groups[value] = [];
    groups[value].push(row);
    return groups;
  }, {});
}

export function makeSvg({ width = 640, height = 260, content = "", label = "Chart" }) {
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}" preserveAspectRatio="none"><rect width="${width}" height="${height}" fill="transparent"/>${content}</svg>`;
}

export function barChart(items, { width = 640, height = 260, color = "#f26b5b", format = (value) => formatNumber(value), label = "Bar chart" } = {}) {
  const margin = { top: 16, right: 42, bottom: 34, left: 110 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const max = Math.max(...items.map((item) => item.value), 1);
  const barHeight = Math.min(26, innerHeight / Math.max(items.length, 1) - 8);
  const gap = innerHeight / Math.max(items.length, 1);
  const content = items.map((item, index) => {
    const y = margin.top + index * gap + (gap - barHeight) / 2;
    const barWidth = Math.max(2, (item.value / max) * innerWidth);
    return `<text class="axis-label" x="${margin.left - 10}" y="${y + barHeight / 2 + 4}" text-anchor="end">${escapeHtml(item.label)}</text><rect class="chart-bar" x="${margin.left}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${barHeight / 2}" fill="${color}" opacity=".9"><title>${escapeHtml(item.label)}: ${escapeHtml(format(item.value))}</title></rect><text class="value-label" x="${Math.min(width - 4, margin.left + barWidth + 8)}" y="${y + barHeight / 2 + 4}">${escapeHtml(format(item.value))}</text>`;
  }).join("");
  return makeSvg({ width, height, content, label });
}

export function lineChart(points, { width = 760, height = 260, color = "#f26b5b", format = (value) => formatNumber(value, 0), label = "Line chart" } = {}) {
  const margin = { top: 24, right: 24, bottom: 34, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const values = points.map((point) => point.value).filter((value) => value !== null);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const x = (index) => margin.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
  const y = (value) => margin.top + innerHeight - ((value - min) / Math.max(max - min, 1)) * innerHeight;
  const valid = points.filter((point) => point.value !== null);
  const path = valid.map((point) => `${x(points.indexOf(point))},${y(point.value)}`).join(" ");
  const dots = valid.map((point) => `<circle class="chart-dot" cx="${x(points.indexOf(point))}" cy="${y(point.value)}" r="4" fill="${color}"><title>${escapeHtml(point.year)}: ${escapeHtml(format(point.value))}</title></circle>`).join("");
  const first = points[0]?.year ?? "";
  const last = points[points.length - 1]?.year ?? "";
  const content = `<line class="grid-line" x1="${margin.left}" y1="${y(max)}" x2="${width - margin.right}" y2="${y(max)}"/><line class="grid-line" x1="${margin.left}" y1="${y(min)}" x2="${width - margin.right}" y2="${y(min)}"/><polyline points="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}<text class="axis-label" x="${margin.left}" y="${height - 8}">${first}</text><text class="axis-label" x="${width - margin.right}" y="${height - 8}" text-anchor="end">${last}</text><text class="value-label" x="${margin.left}" y="${margin.top - 6}">${escapeHtml(format(max))}</text><text class="value-label" x="${margin.left}" y="${height - margin.bottom + 14}">${escapeHtml(format(min))}</text>`;
  return makeSvg({ width, height, content, label });
}
