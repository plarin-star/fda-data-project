# Women Who Lift

An interactive data website exploring women’s powerlifting meet records across time, events, equipment categories, and federations.

## What is included

- A scrollable report page with findings, summary statistics, and charts.
- A browser dashboard with year, event, equipment, federation, and age-class filters.
- Quick views for all records, full powerlifting meets, raw SBD records, and recent years.
- A prepared women-only analysis slice with 105,491 meet records, 56,921 anonymous athlete IDs, 51 years, and 16,605 meets represented.
- Stable anonymous athlete IDs instead of publishing lifter names.

## Data

The source is the public [OpenPowerlifting bulk CSV archive](https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html). One row represents one female lifter in one competition. The prepared file is stored at `dist/data/women-powerlifting.csv`, with summary metadata in `dist/data/summary.json`.

The browser dataset is a deterministic, year-balanced sample capped at 2,500 women’s records per year. This keeps the public dashboard responsive while preserving repeated time periods, groups, categorical dimensions, and numeric measures required by the project brief. Names are replaced with stable IDs during preparation.

## Run locally

Serve the `dist` folder with any static web server and open `index.html`. For example:

```text
python -m http.server 4173 --directory dist
```

The site is designed for GitHub Pages and deploys from the `dist` folder through the workflow in `.github/workflows/pages.yml`.

## Notes and limitations

Competition records do not represent every woman who strength trains. Totals vary by event type, equipment, federation, and meet context, so comparisons should be made within a clearly defined slice.
