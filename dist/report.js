import { barChart, formatNumber, lineChart, loadRows, loadSummary, median, numberValue } from "./data.js";

const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
const renderChart = (id, svg) => { const element = document.getElementById(id); if (element) element.innerHTML = svg; };

async function render() {
  const summary = await loadSummary();
  setText("metricRecords", formatNumber(summary.rows));
  setText("metricAthletes", formatNumber(summary.uniqueAthletes));
  setText("metricYears", formatNumber(summary.yearCount));
  setText("metricYearsNote", `${summary.yearMin}–${summary.yearMax}`);
  setText("metricMeets", formatNumber(summary.uniqueMeets));
  setText("findingRows", formatNumber(summary.rows));
  setText("findingYears", formatNumber(summary.yearCount));

  renderChart("yearChart", lineChart(summary.yearly.map((item) => ({ year: item.year, value: item.medianTotalKg })), { label: "Median total by year in kilograms", color: "#8b2942", format: (value) => `${formatNumber(value, 0)} kg` }));
  const eventItems = Object.entries(summary.categories.event).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  renderChart("eventChart", barChart(eventItems, { label: "Competition entries by lifts included", color: "#315b45", format: (value) => formatNumber(value) }));

  const rows = await loadRows();
  const equipmentGroups = Object.entries(rows.reduce((groups, row) => {
    const value = numberValue(row.totalKg);
    if (value === null || value <= 0) return groups;
    const key = row.equipment || "Unknown";
    (groups[key] ||= []).push(value);
    return groups;
  }, {}));
  const equipmentItems = equipmentGroups.map(([label, values]) => ({ label, value: median(values) })).sort((a, b) => b.value - a.value);
  renderChart("equipmentChart", barChart(equipmentItems, { label: "Middle recorded total by support category", color: "#7a9b68", format: (value) => `${formatNumber(value, 0)} kg` }));
}

render().catch((error) => {
  document.querySelectorAll(".chart").forEach((element) => { element.textContent = "The chart could not load. Check that the data file is present."; });
  console.error(error);
});
