/* ============================================================
   Wedding Seating Chart — static app (vanilla JS)
   Data model (also the exported / seed JSON shape):
   {
     version: 1,
     grid: 25,
     tables: [
       { id, label, x, y, rotation(0|90), seats: [8 items, each a guest name string or null] }
     ],
     guests: [ "Name", ... ]   // full roster; anyone not in a seat is "unseated"
   }
   ============================================================ */

const GRID = 25;
const STORAGE_KEY = "weddingSeatingChart_v1";
const SEAT_COUNT = 10;   // 4 + 4 along the sides, plus 2 optional head seats

// Table surface dimensions per orientation (px). Longer tables to fit 4 per side.
const DIMS = {
  0:  { w: 270, h: 110 },   // horizontal: long axis left-right
  90: { w: 110, h: 270 },   // vertical:   long axis top-bottom
};
const SEAT_W = 56, SEAT_H = 30, GAP = 6;

let state = loadState() || defaultState();

/* ---------------- Seat geometry ----------------
   Seat indices are stable across rotation so guests keep their seat:
   0-3 = "side A"  (top when horizontal / left when vertical)
   4-7 = "side B"  (bottom when horizontal / right when vertical)
   8   = "head 1"  (left end when horizontal / top when vertical)   -- optional
   9   = "head 2"  (right end when horizontal / bottom when vertical)-- optional
   Head seats (8, 9) are only shown/usable when table.heads is true.
*/
const HEAD_SEATS = [8, 9];

function seatOffsets(rotation) {
  const { w, h } = DIMS[rotation];
  if (rotation === 0) {
    const xs = [14, 78, 142, 206];            // four across the long side
    const midY = (h - SEAT_H) / 2;
    return [
      { x: xs[0], y: -(SEAT_H + GAP) },       // 0 top
      { x: xs[1], y: -(SEAT_H + GAP) },       // 1 top
      { x: xs[2], y: -(SEAT_H + GAP) },       // 2 top
      { x: xs[3], y: -(SEAT_H + GAP) },       // 3 top
      { x: xs[0], y: h + GAP },               // 4 bottom
      { x: xs[1], y: h + GAP },               // 5 bottom
      { x: xs[2], y: h + GAP },               // 6 bottom
      { x: xs[3], y: h + GAP },               // 7 bottom
      { x: -(SEAT_W + GAP), y: midY },        // 8 left head
      { x: w + GAP, y: midY },                // 9 right head
    ];
  } else {
    const ys = [14, 78, 142, 206];
    const midX = (w - SEAT_W) / 2;
    return [
      { x: -(SEAT_W + GAP), y: ys[0] },       // 0 left
      { x: -(SEAT_W + GAP), y: ys[1] },       // 1 left
      { x: -(SEAT_W + GAP), y: ys[2] },       // 2 left
      { x: -(SEAT_W + GAP), y: ys[3] },       // 3 left
      { x: w + GAP, y: ys[0] },               // 4 right
      { x: w + GAP, y: ys[1] },               // 5 right
      { x: w + GAP, y: ys[2] },               // 6 right
      { x: w + GAP, y: ys[3] },               // 7 right
      { x: midX, y: -(SEAT_H + GAP) },        // 8 top head
      { x: midX, y: h + GAP },                // 9 bottom head
    ];
  }
}

/* ---------------- State helpers ---------------- */
// Distinct, reasonably muted palette; cycles if there are more groups than colors.
const PALETTE = [
  "#6b8f71", "#c77d5a", "#5a7fa8", "#b0894e", "#8a6ba8", "#4f9d9d",
  "#c76b8f", "#7d9b4e", "#a8635a", "#5f6bb0", "#9d7d4f", "#4e9d6b",
];

function defaultState() {
  return {
    version: 1, grid: GRID, tables: [], guests: [],
    personColors: {},  // name -> hex color, assigned in the UI
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch { return null; }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleFileWrite();
}
function normalize(obj) {
  const s = defaultState();
  if (Array.isArray(obj.guests)) s.guests = dedupe(obj.guests.map(String));
  if (obj.personColors && typeof obj.personColors === "object") s.personColors = obj.personColors;
  if (Array.isArray(obj.tables)) {
    s.tables = obj.tables.map((t, i) => {
      const seats = Array.isArray(t.seats) ? t.seats.slice(0, SEAT_COUNT) : [];
      while (seats.length < SEAT_COUNT) seats.push(null);
      const cleaned = seats.map(v => (v == null || v === "" ? null : String(v)));
      // If a head seat is occupied, heads must be enabled for it to show.
      const heads = t.heads === true || HEAD_SEATS.some(i => cleaned[i]);
      return {
        id: t.id || genId(),
        label: t.label || `Table ${i + 1}`,
        x: snap(Number(t.x) || 60),
        y: snap(Number(t.y) || 60),
        rotation: t.rotation === 90 ? 90 : 0,
        heads,
        seats: cleaned,
      };
    });
  }
  // Any seated name missing from roster gets added (seed JSON convenience).
  const seated = seatedNames();
  for (const t of s.tables) for (const n of t.seats) if (n) seated.add(n);
  for (const n of seated) if (!s.guests.includes(n)) s.guests.push(n);
  return s;

  function seatedNames() {
    const set = new Set();
    for (const t of s.tables) for (const n of t.seats) if (n) set.add(n);
    return set;
  }
}
function dedupe(arr) {
  const seen = new Set(), out = [];
  for (const x of arr) { const v = x.trim(); if (v && !seen.has(v)) { seen.add(v); out.push(v); } }
  return out;
}
function genId() { return "t" + Math.floor(performance.now() * 1000).toString(36) + Math.floor(performance.now() % 1000); }
function snap(v) { return Math.round(v / GRID) * GRID; }
function getTable(id) { return state.tables.find(t => t.id === id); }
function seatedSet() {
  const s = new Set();
  for (const t of state.tables) for (const n of t.seats) if (n) s.add(n);
  return s;
}
function unseatedGuests() {
  const seated = seatedSet();
  return state.guests.filter(g => !seated.has(g));
}

/* ---------------- Colors ---------------- */
function guestColor(name) {
  return state.personColors[name] || null;
}
function contrastText(hex) {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#33302b";
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#33302b" : "#ffffff";
}

/* ---------------- Rendering ---------------- */
const room = document.getElementById("room");
const inventory = document.getElementById("inventory");
let searchTerm = "";

function render() {
  renderRoom();
  renderInventory();
  renderStats();
  saveState();
}

function renderStats() {
  const total = state.guests.length;
  const un = unseatedGuests().length;
  document.getElementById("seatedCount").textContent = `${total - un} seated`;
  document.getElementById("unseatedCount").textContent = `${un} unseated`;
}

function renderRoom() {
  room.innerHTML = "";
  for (const t of state.tables) room.appendChild(buildTable(t));
}

function buildTable(t) {
  const dims = DIMS[t.rotation];
  const el = document.createElement("div");
  el.className = "table";
  el.style.left = t.x + "px";
  el.style.top = t.y + "px";
  el.dataset.id = t.id;

  // surface
  const surface = document.createElement("div");
  surface.className = "surface";
  surface.style.width = dims.w + "px";
  surface.style.height = dims.h + "px";

  const label = document.createElement("div");
  label.className = "label";
  label.textContent = t.label;
  label.title = "Double-click to rename";
  // don't let interacting with the label start a table drag
  label.addEventListener("pointerdown", e => e.stopPropagation());
  label.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    startLabelEdit(label, t);
  });

  const controls = document.createElement("div");
  controls.className = "table-controls";
  controls.appendChild(makeCtrl("⟳", "Rotate 90°", () => { t.rotation = t.rotation === 0 ? 90 : 0; render(); }));
  controls.appendChild(makeCtrl(t.heads ? "H⁻" : "H⁺", t.heads ? "Remove head seats" : "Add head seats", () => {
    if (t.heads) {
      // turning heads off unseats anyone in a head seat (they return to inventory)
      HEAD_SEATS.forEach(i => { t.seats[i] = null; });
      t.heads = false;
    } else {
      t.heads = true;
    }
    render();
  }));
  controls.appendChild(makeCtrl("⌫", "Clear seats", () => {
    if (t.seats.some(Boolean) && confirm(`Unseat everyone at ${t.label}?`)) { t.seats = Array(SEAT_COUNT).fill(null); render(); }
  }));
  controls.appendChild(makeCtrl("✕", "Delete table", () => {
    if (confirm(`Delete ${t.label}? Seated guests return to the inventory.`)) {
      state.tables = state.tables.filter(x => x.id !== t.id); render();
    }
  }));

  surface.appendChild(label);
  surface.appendChild(controls);
  enableTableDrag(surface, t);
  el.appendChild(surface);

  // seats
  const offsets = seatOffsets(t.rotation);
  offsets.forEach((off, i) => {
    if (HEAD_SEATS.includes(i) && !t.heads) return;  // hidden unless heads enabled
    const seat = document.createElement("div");
    seat.className = "seat";
    seat.style.left = off.x + "px";
    seat.style.top = off.y + "px";
    seat.dataset.tableId = t.id;
    seat.dataset.index = i;

    const name = t.seats[i];
    if (name) {
      seat.classList.add("occupied");
      seat.appendChild(makeGuestChip(name, { type: "seat", tableId: t.id, index: i }));
    }
    enableSeatDrop(seat);
    el.appendChild(seat);
  });

  return el;
}

function startLabelEdit(label, t) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "label-edit";
  input.value = t.label;
  input.addEventListener("pointerdown", e => e.stopPropagation());

  const commit = (save) => {
    input.removeEventListener("blur", onBlur);
    if (save) { t.label = input.value.trim() || t.label; }
    render();
  };
  const onBlur = () => commit(true);
  input.addEventListener("blur", onBlur);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    else if (e.key === "Escape") { e.preventDefault(); commit(false); }
  });

  label.replaceWith(input);
  input.focus();
  input.select();
}

function makeCtrl(text, title, onClick) {
  const b = document.createElement("button");
  b.className = "tctrl";
  b.textContent = text;
  b.title = title;
  // stop table-drag from starting on control press
  b.addEventListener("pointerdown", e => e.stopPropagation());
  b.addEventListener("click", e => { e.stopPropagation(); onClick(); });
  return b;
}

function renderInventory() {
  inventory.innerHTML = "";
  const term = searchTerm.toLowerCase();
  const guests = unseatedGuests().filter(g => g.toLowerCase().includes(term)).sort((a, b) => a.localeCompare(b));
  for (const name of guests) {
    inventory.appendChild(makeGuestChip(name, { type: "inventory" }));
  }
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function makeGuestChip(name, source) {
  const chip = document.createElement("div");
  chip.className = "guest";
  if (source.type === "seat") {
    chip.classList.add("seated");
    chip.textContent = initials(name);
    chip.dataset.full = name;   // shown via CSS ::after on hover
  } else {
    chip.textContent = name;
  }
  chip.title = name;

  const color = guestColor(name);
  if (color) {
    if (source.type === "seat") {
      chip.style.background = color;
      chip.style.borderColor = color;
      chip.style.color = contrastText(color);
    } else {
      chip.style.borderLeft = `4px solid ${color}`;
    }
  }

  // Accept a color swatch dropped onto this person (per-person override).
  const onColorOver = (e) => {
    if (!dragData || dragData.kind !== "color") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";   // must match the swatch's effectAllowed or the drop is rejected
    chip.classList.add("color-target");
  };
  chip.addEventListener("dragenter", onColorOver);
  chip.addEventListener("dragover", onColorOver);
  chip.addEventListener("dragleave", () => chip.classList.remove("color-target"));
  chip.addEventListener("drop", (e) => {
    if (!dragData || dragData.kind !== "color") return;
    e.preventDefault();
    e.stopPropagation();
    chip.classList.remove("color-target");
    if (dragData.color) state.personColors[name] = dragData.color;
    else delete state.personColors[name];   // eraser swatch
    render();
  });

  chip.draggable = true;
  chip.addEventListener("dragstart", (e) => {
    dragData = { ...source, name };
    chip.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", name); } catch {}
  });
  chip.addEventListener("dragend", () => { chip.classList.remove("dragging"); dragData = null; });
  // don't let a guest drag inside a seat trigger the table move
  chip.addEventListener("pointerdown", e => e.stopPropagation());
  return chip;
}

/* ---------------- Guest drag & drop ---------------- */
let dragData = null;

function enableSeatDrop(seat) {
  seat.addEventListener("dragover", (e) => {
    if (!dragData || dragData.kind === "color") return;   // color drops are handled by the chip
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    seat.classList.add("drag-over");
  });
  seat.addEventListener("dragleave", () => seat.classList.remove("drag-over"));
  seat.addEventListener("drop", (e) => {
    if (!dragData || dragData.kind === "color") return;
    e.preventDefault();
    seat.classList.remove("drag-over");
    const table = getTable(seat.dataset.tableId);
    const index = Number(seat.dataset.index);
    placeInSeat(table, index, dragData);
    render();
  });
}

function placeInSeat(table, index, src) {
  const occupant = table.seats[index]; // may be null

  if (src.type === "seat") {
    const srcTable = getTable(src.tableId);
    if (srcTable === table && src.index === index) return; // dropped on itself
    // swap: displaced occupant (or null) goes to the source seat
    srcTable.seats[src.index] = occupant;
    table.seats[index] = src.name;
  } else {
    // from inventory: place here. any occupant becomes unseated automatically.
    table.seats[index] = src.name;
  }
}

// Inventory as a drop zone -> unseat
inventory.addEventListener("dragover", (e) => {
  if (!dragData || dragData.kind === "color") return;
  e.preventDefault();
  inventory.classList.add("drag-over");
});
inventory.addEventListener("dragleave", () => inventory.classList.remove("drag-over"));
inventory.addEventListener("drop", (e) => {
  e.preventDefault();
  inventory.classList.remove("drag-over");
  if (!dragData) return;
  if (dragData.type === "seat") {
    getTable(dragData.tableId).seats[dragData.index] = null;
    render();
  }
});

/* ---------------- Table dragging (pointer, snap on release) ---------------- */
function enableTableDrag(surface, t) {
  surface.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = surface.parentElement;
    const startX = e.clientX, startY = e.clientY;
    const originX = t.x, originY = t.y;
    surface.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      // divide screen delta by zoom to get room-space delta
      el.style.left = (originX + (ev.clientX - startX) / zoom) + "px";
      el.style.top = (originY + (ev.clientY - startY) / zoom) + "px";
    };
    const onUp = (ev) => {
      surface.releasePointerCapture(e.pointerId);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      let nx = snap(originX + (ev.clientX - startX) / zoom);
      let ny = snap(originY + (ev.clientY - startY) / zoom);
      // keep the surface inside the room
      const dims = DIMS[t.rotation];
      nx = Math.max(SEAT_W + GAP, Math.min(nx, room.clientWidth - dims.w - SEAT_W - GAP));
      ny = Math.max(SEAT_H + GAP, Math.min(ny, room.clientHeight - dims.h - SEAT_H - GAP));
      t.x = nx; t.y = ny;
      render();
    };
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerup", onUp);
  });
}

/* ---------------- Toolbar actions ---------------- */
document.getElementById("addTableBtn").addEventListener("click", () => {
  // place near top-left, nudged so multiple adds don't fully overlap
  const n = state.tables.length;
  state.tables.push({
    id: genId(),
    label: `Table ${n + 1}`,
    x: snap(80 + (n % 5) * 40),
    y: snap(80 + (n % 5) * 40),
    rotation: 0,
    heads: false,
    seats: Array(SEAT_COUNT).fill(null),
  });
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset everything (tables, guests, assignments)?")) {
    state = defaultState();
    render();
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "seating-chart.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("csvInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseGuestCsv(text);
  if (parsed == null) { alert('Could not find a "guest name" column in the CSV header.'); e.target.value = ""; return; }

  const names = parsed.records.map(r => r.name);
  const merged = dedupe([...state.guests, ...names]);
  const added = merged.length - state.guests.length;
  state.guests = merged;

  // If the CSV has a "color" column, apply it as each person's color.
  const colorKey = parsed.attrCols.find(c => c.trim().toLowerCase() === "color");
  let colored = 0;
  if (colorKey) {
    for (const rec of parsed.records) {
      const v = (rec.attrs[colorKey] || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { state.personColors[rec.name] = v; colored++; }
    }
  }

  render();
  alert(`Loaded ${names.length} name(s) from CSV. ${added} new guest(s) added.` +
        (colored ? `\n${colored} colored from the "color" column.` : ""));
  e.target.value = "";
});

document.getElementById("jsonInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const obj = JSON.parse(await file.text());
    state = normalize(obj);
    render();
  } catch (err) {
    alert("Invalid JSON file: " + err.message);
  }
  e.target.value = "";
});

document.getElementById("guestSearch").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderInventory();
});

/* ---------------- CSV parsing ---------------- */
// Minimal CSV parser that handles quoted fields and commas within quotes.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

function parseGuestCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return null;
  const header = rows[0].map(h => h.trim());
  const lower = header.map(h => h.toLowerCase());
  let nameCol = lower.indexOf("guest name");
  if (nameCol === -1) nameCol = lower.findIndex(h => h.replace(/[_-]/g, " ").includes("guest name"));
  if (nameCol === -1) nameCol = lower.findIndex(h => h === "name" || h.includes("guest"));
  if (nameCol === -1) return null;

  const attrCols = header.filter((_, i) => i !== nameCol);
  const records = [];
  for (const r of rows.slice(1)) {
    const name = (r[nameCol] || "").trim();
    if (!name) continue;
    const attrs = {};
    header.forEach((h, i) => { if (i !== nameCol) attrs[h] = (r[i] || "").trim(); });
    records.push({ name, attrs });
  }
  return { attrCols, records };
}

/* ---------------- Auto-save to a JSON file (File System Access API) ---------------- */
const supportsFS = typeof window.showSaveFilePicker === "function";
let fileHandle = null;      // active, permission-granted handle we write to
let pendingHandle = null;   // restored handle awaiting a user gesture to re-grant
let writeTimer = null, isWriting = false, dirtyAgain = false;

// Tiny IndexedDB store so the chosen file reconnects across page reloads.
const IDB = { db: "seatingChartFS", store: "handles", key: "file" };
function idb(mode, run) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(IDB.db, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(IDB.store);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(IDB.store, mode);
      const req = run(tx.objectStore(IDB.store));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const storeHandle = h => idb("readwrite", s => s.put(h, IDB.key));
const readHandle  = () => idb("readonly",  s => s.get(IDB.key));
const forgetHandle = () => idb("readwrite", s => s.delete(IDB.key));

function scheduleFileWrite() {
  if (!fileHandle) return;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(writeFile, 250);   // debounce rapid edits
}

async function writeFile() {
  if (!fileHandle) return;
  if (isWriting) { dirtyAgain = true; return; }
  isWriting = true;
  try {
    const w = await fileHandle.createWritable();
    await w.write(JSON.stringify(state, null, 2));
    await w.close();
    setStatus(`Saved ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error(err);
    setStatus("⚠ file save failed", true);
  } finally {
    isWriting = false;
    if (dirtyAgain) { dirtyAgain = false; writeFile(); }
  }
}

async function chooseAutosaveFile() {
  if (!supportsFS) {
    alert("This browser can't write files directly (try Chrome or Edge).\n\nYour work still auto-saves inside this browser, and you can use Export JSON any time.");
    return;
  }
  try {
    const h = await window.showSaveFilePicker({
      suggestedName: "seating-chart.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
    });
    fileHandle = h;
    pendingHandle = null;
    await storeHandle(h);
    await writeFile();
    updateAutosaveUI();
  } catch (err) {
    if (err.name !== "AbortError") alert("Could not set up auto-save: " + err.message);
  }
}

async function reconnectAutosave() {
  if (!pendingHandle) return;
  const perm = await pendingHandle.requestPermission({ mode: "readwrite" });
  if (perm === "granted") {
    fileHandle = pendingHandle;
    pendingHandle = null;
    await writeFile();
  } else {
    await forgetHandle();
    pendingHandle = null;
  }
  updateAutosaveUI();
}

function updateAutosaveUI() {
  const btn = document.getElementById("autosaveBtn");
  if (fileHandle) {
    btn.textContent = `Auto-saving ✓ ${fileHandle.name}`;
    btn.classList.add("primary");
    btn.title = "Click to choose a different file";
  } else if (pendingHandle) {
    btn.textContent = `Resume auto-save (${pendingHandle.name})`;
    btn.classList.remove("primary");
    btn.title = "Click to re-grant write access to this file";
  } else {
    btn.textContent = "Auto-save to File…";
    btn.classList.remove("primary");
    btn.title = "Pick a JSON file to keep in sync with every edit";
  }
}

function setStatus(text, isError) {
  const el = document.getElementById("saveStatus");
  el.textContent = text;
  el.style.color = isError ? "var(--danger)" : "var(--accent)";
}

document.getElementById("autosaveBtn").addEventListener("click", () => {
  if (pendingHandle && !fileHandle) reconnectAutosave();
  else chooseAutosaveFile();
});

async function restoreAutosave() {
  if (!supportsFS) return;
  let h;
  try { h = await readHandle(); } catch { return; }
  if (!h) return;
  const perm = await h.queryPermission({ mode: "readwrite" });
  if (perm === "granted") { fileHandle = h; }
  else { pendingHandle = h; }   // needs a click to re-grant (browser requires a gesture)
  updateAutosaveUI();
}

/* ---------------- Color palette (drag a swatch onto a person) ---------------- */
// Make a swatch element draggable as a color. `color === null` means "clear/eraser".
function makeColorDraggable(sw, getColor) {
  sw.draggable = true;
  sw.addEventListener("dragstart", (e) => {
    const color = getColor();
    dragData = { kind: "color", color };
    e.dataTransfer.effectAllowed = "copy";
    try { e.dataTransfer.setData("text/plain", color || "clear"); } catch {}
  });
  sw.addEventListener("dragend", () => { dragData = null; });
}

function buildPalette() {
  const el = document.getElementById("palette");
  el.innerHTML = "";

  const makeSwatch = (color, isEraser) => {
    const sw = document.createElement("div");
    sw.className = "swatch-drag" + (isEraser ? " eraser" : "");
    // inline sizing so swatches are always visible even if CSS is cached/stale
    sw.style.width = "24px";
    sw.style.height = "24px";
    sw.style.borderRadius = "6px";
    sw.style.cursor = "grab";
    if (isEraser) {
      sw.textContent = "⌀";
      sw.title = "Drop on a person to clear their color";
      sw.style.border = "1px dashed #8a847a";
      sw.style.display = "flex";
      sw.style.alignItems = "center";
      sw.style.justifyContent = "center";
    } else {
      sw.style.background = color;
      sw.style.border = "1px solid rgba(0,0,0,.15)";
      sw.title = color;
    }
    makeColorDraggable(sw, () => (isEraser ? null : color));
    return sw;
  };

  el.appendChild(makeSwatch(null, true));          // eraser first
  PALETTE.forEach(c => el.appendChild(makeSwatch(c, false)));

  // Custom color: the square drags whatever the color input currently holds.
  const customSwatch = document.getElementById("customSwatch");
  const customInput = document.getElementById("customColor");
  customSwatch.style.width = "24px";
  customSwatch.style.height = "24px";
  customSwatch.style.borderRadius = "6px";
  customSwatch.style.cursor = "grab";
  customSwatch.style.border = "1px solid rgba(0,0,0,.15)";
  const syncCustom = () => { customSwatch.style.background = customInput.value; customSwatch.title = customInput.value; };
  syncCustom();
  customInput.addEventListener("input", syncCustom);
  makeColorDraggable(customSwatch, () => customInput.value);
}

/* ---------------- Room size (in-app, persisted; overrides the CSS defaults) ---------------- */
let roomW = parseInt(localStorage.getItem("seatingRoomW"), 10) || 1600;
let roomH = parseInt(localStorage.getItem("seatingRoomH"), 10) || 4060;

function applyRoomSize() {
  roomW = Math.max(600, roomW);
  roomH = Math.max(600, roomH);
  room.style.width = roomW + "px";
  room.style.height = roomH + "px";
  localStorage.setItem("seatingRoomW", String(roomW));
  localStorage.setItem("seatingRoomH", String(roomH));
  applyZoom();   // stage size depends on room size
}

document.getElementById("roomTaller").addEventListener("click", () => { roomH += 400; applyRoomSize(); });
document.getElementById("roomShorter").addEventListener("click", () => { roomH -= 400; applyRoomSize(); });
document.getElementById("roomWider").addEventListener("click", () => { roomW += 300; applyRoomSize(); });
document.getElementById("roomNarrower").addEventListener("click", () => { roomW -= 300; applyRoomSize(); });

/* ---------------- Zoom ---------------- */
let zoom = parseFloat(localStorage.getItem("seatingZoom")) || 1;
const roomStage = document.getElementById("roomStage");

function applyZoom() {
  zoom = Math.max(0.2, Math.min(1.5, zoom));
  room.style.transform = `scale(${zoom})`;
  // size the stage to the scaled dimensions so the scrollbars match what you see
  if (roomStage) {
    roomStage.style.width = room.offsetWidth * zoom + "px";
    roomStage.style.height = room.offsetHeight * zoom + "px";
  }
  document.getElementById("zoomLabel").textContent = Math.round(zoom * 100) + "%";
  localStorage.setItem("seatingZoom", String(zoom));
}
function setZoom(z) { zoom = z; applyZoom(); }

document.getElementById("zoomIn").addEventListener("click", () => setZoom(zoom + 0.1));
document.getElementById("zoomOut").addEventListener("click", () => setZoom(zoom - 0.1));
document.getElementById("zoomFit").addEventListener("click", () => {
  const wrap = document.getElementById("roomWrap");
  const z = Math.min(
    (wrap.clientWidth - 60) / room.offsetWidth,
    (wrap.clientHeight - 60) / room.offsetHeight
  );
  setZoom(z);
});

/* ---------------- Boot ---------------- */
buildPalette();
render();
applyRoomSize();   // also runs applyZoom()
restoreAutosave();
