import { barChart, escapeHtml, formatNumber, lineChart, loadRows, median, numberValue } from "./data.js";

let rows = [];
const state = { yearFrom: "", yearTo: "", event: "", equipment: "", federation: "", ageClass: "" };
const presets = {
  all: {},
  full: { event: "SBD" },
  raw: { event: "SBD", equipment: "Raw" },
  recent: { yearFrom: "2015" },
};
const el = (id) => document.getElementById(id);

function setText(id, value) { if (el(id)) el(id).textContent = value; }
function valuesFor(key) { return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); }
function addOptions(id, values, label = (value) => value) { const select = el(id); values.forEach((value) => select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(label(value))}</option>`)); }

function filteredRows() {
  return rows.filter((row) => {
    const year = Number(row.year);
    return (!state.yearFrom || year >= Number(state.yearFrom)) && (!state.yearTo || year <= Number(state.yearTo)) && (!state.event || row.event === state.event) && (!state.equipment || row.equipment === state.equipment) && (!state.federation || row.federation === state.federation) && (!state.ageClass || row.ageClass === state.ageClass);
  });
}

function renderStats(current) {
  const totals = current.map((row) => numberValue(row.totalKg)).filter((value) => value !== null && value > 0);
  setText("resultRecords", formatNumber(current.length));
  setText("resultAthletes", formatNumber(new Set(current.map((row) => row.athleteId)).size));
  setText("resultMedian", totals.length ? `${formatNumber(median(totals), 1)} kg` : "—");
  setText("resultBest", totals.length ? `${formatNumber(Math.max(...totals), 1)} kg` : "—");
  const active = Object.entries(state).filter(([, value]) => value).map(([key, value]) => `${key.replace("yearFrom", "from").replace("yearTo", "to").replace("ageClass", "age")} ${value}`);
  setText("filterSummary", active.length ? `${formatNumber(current.length)} records · ${active.join(" · ")}` : `${formatNumber(current.length)} records · all filters cleared`);
}

function renderCharts(current) {
  const yearly = Object.entries(current.reduce((groups, row) => { (groups[row.year] ||= []).push(row); return groups; }, {})).sort((a, b) => Number(a[0]) - Number(b[0])).map(([year, values]) => ({ year, value: values.length }));
  renderChart("dashboardYearChart", lineChart(yearly, { label: "Filtered competition entries over time", color: "#8b2942", format: (value) => formatNumber(value) }));
  setText("yearChartLabel", yearly.length ? `${yearly[0].year}–${yearly[yearly.length - 1].year}` : "no matching years");

  const equipment = Object.entries(current.reduce((groups, row) => { const value = numberValue(row.totalKg); if (value !== null && value > 0) (groups[row.equipment || "Unknown"] ||= []).push(value); return groups; }, {})).map(([label, values]) => ({ label, value: median(values) })).sort((a, b) => b.value - a.value);
  renderChart("dashboardEquipmentChart", barChart(equipment, { width: 600, label: "Middle recorded total by support category", format: (value) => `${formatNumber(value, 0)} kg`, color: "#7a9b68" }));

  const federations = Object.entries(current.reduce((groups, row) => { const key = row.federation || "Unknown"; groups[key] = (groups[key] || 0) + 1; return groups; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  renderChart("dashboardFederationChart", barChart(federations, { width: 600, label: "Most common organizing bodies", format: (value) => formatNumber(value), color: "#315b45" }));
}

function renderTable(current) {
  const records = current.filter((row) => numberValue(row.totalKg) !== null).sort((a, b) => numberValue(b.totalKg) - numberValue(a.totalKg)).slice(0, 12);
  el("recordsTable").innerHTML = records.length ? records.map((row) => { const dots = numberValue(row.dots); return `<tr><td class="mono">${escapeHtml(row.athleteId)}</td><td>${escapeHtml(row.date)}</td><td><strong>${escapeHtml(formatNumber(numberValue(row.totalKg), 1))}</strong></td><td>${escapeHtml(formatNumber(dots > 0 ? dots : null, 1))}</td><td>${escapeHtml(row.event)}</td><td>${escapeHtml(row.equipment)}</td><td>${escapeHtml(row.federation)}</td><td class="meet-cell">${escapeHtml(row.meetName)}</td></tr>`; }).join("") : `<tr><td colspan="8">No records match these filters.</td></tr>`;
}

function renderChart(id, svg) { if (el(id)) el(id).innerHTML = svg; }

function render() { const current = filteredRows(); renderStats(current); renderCharts(current); renderTable(current); }

function sameState(values) { return Object.keys(state).every((key) => (values[key] || "") === state[key]); }
function syncPresetButtons() { document.querySelectorAll("[data-preset]").forEach((button) => button.classList.toggle("active", sameState(presets[button.dataset.preset] || {}))); }
function applyPreset(name) {
  const next = presets[name] || presets.all;
  Object.keys(state).forEach((key) => { state[key] = next[key] || ""; });
  document.querySelectorAll("[data-filter]").forEach((control) => { control.value = state[control.dataset.filter] || ""; });
  syncPresetButtons();
  render();
}
function syncState(event) { state[event.target.dataset.filter] = event.target.value; syncPresetButtons(); render(); }

async function init() {
  try {
    rows = await loadRows();
    const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => Number(a) - Number(b));
    addOptions("yearFrom", years); addOptions("yearTo", years); addOptions("eventFilter", valuesFor("event")); addOptions("equipmentFilter", valuesFor("equipment")); addOptions("ageFilter", valuesFor("ageClass"));
    const federationCounts = rows.reduce((groups, row) => { groups[row.federation] = (groups[row.federation] || 0) + 1; return groups; }, {});
    addOptions("federationFilter", Object.entries(federationCounts).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([name]) => name));
    document.querySelectorAll("[data-filter]").forEach((control) => control.addEventListener("change", syncState));
    document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
    el("resetFilters").addEventListener("click", () => applyPreset("all"));
    el("dashboardStatus").textContent = `Loaded ${formatNumber(rows.length)} women’s meet records. Filters and charts run locally in your browser.`;
    render();
  } catch (error) {
    el("dashboardStatus").textContent = "The dataset could not load. Check that the data file is present in the published site.";
    console.error(error);
  }
}

init();
