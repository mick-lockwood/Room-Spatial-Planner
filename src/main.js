// src/main.js
import { Plan2D } from "./plan2d.js";
import { View3D } from "./view3d.js";
import { createInitialSceneState } from "./types.js";

function uuid() {
  return Math.random().toString(36).slice(2);
}

let state = createInitialSceneState();

// Seed with a default bench so there is something visible
state.objects.push({
  id: uuid(),
  name: "Workbench 1",
  category: "bench",
  position: { x: 1000, y: 1000 },
  rotation: 0,
  width: 1800,
  depth: 750,
  height: 900,
  clearanceFront: 900,
  clearanceSides: 300,
  clearanceBack: 0
});

let toolMode = "select"; // or "measure"
let showServices = true;
let showClearances = false;

// --- DOM references ---
const canvas2d = document.getElementById("canvas2d");
const view3dContainer = document.getElementById("view3d");
const summaryArea = document.getElementById("summary-area");

// --- 2D view ---
const plan2d = new Plan2D({
  canvas: canvas2d,
  getState: () => state,
  setState: s => {
    state = s;
    refresh3D();
    refreshSummary();
  },
  getTool: () => toolMode,
  showServices: () => showServices,
  showClearances: () => showClearances
});

// --- 3D view ---
const view3d = new View3D(view3dContainer);

function refresh3D() {
  view3d.update(state);
}

// initial draw AFTER view3d exists
refresh3D();

// --- Summary ---
function refreshSummary() {
  const equip = state.objects.length;
  const gpos = state.services.filter(s => s.type === "gpo").length;
  const lights = state.services.filter(s => s.type === "light").length;

  summaryArea.innerHTML = `
    <table>
      <tr><th>Item</th><th>Count</th></tr>
      <tr><td>Equipment</td><td>${equip}</td></tr>
      <tr><td>GPOs</td><td>${gpos}</td></tr>
      <tr><td>Lights</td><td>${lights}</td></tr>
    </table>
  `;
}
refreshSummary();

// --- Room controls ---
document.getElementById("update-room").onclick = () => {
  const len = Number(document.getElementById("room-length").value) || 6000;
  const wid = Number(document.getElementById("room-width").value) || 4000;
  const hgt = Number(document.getElementById("room-height").value) || 2700;

  state = {
    ...state,
    room: { ...state.room, length: len, width: wid, height: hgt }
  };
  refresh3D();
};

// --- Add object ---
document.getElementById("add-object").onclick = () => {
  const typeSel = document.getElementById("add-object-type");
  const cat = typeSel.value;

  let base = {};
  if (cat === "bench") {
    base = { width: 1800, depth: 750, height: 900 };
  } else if (cat === "cabinet") {
    base = { width: 900, depth: 600, height: 2100 };
  } else if (cat === "machinery") {
    base = {
      width: 800,
      depth: 800,
      height: 1400,
      clearanceFront: 1000,
      clearanceSides: 500,
      clearanceBack: 300
    };
  } else if (cat === "bike") {
    base = { width: 400, depth: 1800, height: 1200 };
  } else if (cat === "gym") {
    base = {
      width: 2000,
      depth: 2000,
      height: 2200,
      clearanceFront: 1500,
      clearanceSides: 800
    };
  } else {
    base = { width: 1000, depth: 1000, height: 1000 };
  }

  const obj = {
    id: uuid(),
    name: `${cat.toUpperCase()} ${state.objects.length + 1}`,
    category: cat,
    position: {
      x: state.room.length / 2,
      y: state.room.width / 2
    },
    rotation: 0,
    width: base.width,
    depth: base.depth,
    height: base.height,
    clearanceFront: base.clearanceFront,
    clearanceSides: base.clearanceSides,
    clearanceBack: base.clearanceBack
  };

  state = {
    ...state,
    objects: [...state.objects, obj],
    selectionId: obj.id
  };
  refresh3D();
  refreshSummary();
};

// --- Add service ---
document.getElementById("add-service").onclick = () => {
  const typeSel = document.getElementById("add-service-type");
  const type = typeSel.value;

  const s = {
    id: uuid(),
    type,
    position: {
      x: state.room.length / 2,
      y: state.room.width / 2
    },
    elevation: type === "light" ? state.room.height - 200 : 1200,
    attributes:
      type === "gpo"
        ? { amps: 10, phase: "1P" }
        : { fittingType: "batten" }
  };

  state = {
    ...state,
    services: [...state.services, s],
    selectionId: s.id
  };
  refresh3D();
  refreshSummary();
};

// --- Add opening (roller door on south wall) ---
document.getElementById("add-opening").onclick = () => {
  const sel = document.getElementById("add-opening-type");
  const type = sel.value; // only roller_door supported now

  const opening = {
    id: uuid(),
    type,          // "roller_door"
    wall: "S",     // south wall
    offset: 500,   // 500mm from west corner
    width: 2500,   // 2.5m wide
    height: 2200   // 2.2m high
  };

  state = {
    ...state,
    openings: [...state.openings, opening]
  };
  // 2D only for now
};

// --- Tool buttons ---
document.getElementById("tool-select").onclick = () => {
  toolMode = "select";
};
document.getElementById("tool-measure").onclick = () => {
  toolMode = "measure"; // not yet implemented
};
document.getElementById("toggle-services").onclick = () => {
  showServices = !showServices;
};
document.getElementById("toggle-clearances").onclick = () => {
  showClearances = !showClearances;
};

// --- Rotate selected object ---
document.getElementById("btn-rotate").onclick = () => {
  if (!state.selectionId) return;
  const objects = state.objects.map(o =>
    o.id === state.selectionId
      ? { ...o, rotation: (o.rotation || 0) + Math.PI / 2 }
      : o
  );
  state = { ...state, objects };
  refresh3D();
};

// --- Delete selected object/service ---
document.getElementById("btn-delete").onclick = () => {
  if (!state.selectionId) return;
  const objects = state.objects.filter(o => o.id !== state.selectionId);
  const services = state.services.filter(s => s.id !== state.selectionId);
  state = { ...state, objects, services, selectionId: undefined };
  refresh3D();
  refreshSummary();
};
