# Wedding Seating Chart

Live at **https://esteng.github.io/wedding/**

A static, in-browser seating-chart tool. No login, no server — everything runs in your
browser and saves to *your* browser's local storage.

## Sharing work (manual handoff)

There is no shared/live database, so to collaborate you pass a file back and forth:

1. **Editor** arranges tables/guests, then clicks **Export JSON** (top bar) to download
   `seating-chart.json`.
2. Send that file to the other person (email, Drive, etc.).
3. **Other person** clicks **Load Assignment JSON** and picks the file to pick up exactly
   where the first person left off.

⚠️ Only one person should edit at a time — if you both edit and export, whoever loads
last wins. Treat the JSON file as the single source of truth.

Tip: in Chrome/Edge you can use **Auto-save to File…** to keep a local `.json` in sync
automatically while you work; you still share it via the steps above.

## Loading guests

- **Load Guest CSV** takes a file with a `guest name` column (extra columns ignored,
  except an optional `color` column of `#RRGGBB` values that tints each person).
- `mock-guests.csv` in this folder is fake sample data to try things out.

## Files

- `index.html`, `styles.css`, `app.js` — the app
- `mock-guests.csv` — demo data
