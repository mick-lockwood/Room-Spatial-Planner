// src/main.js
import { Plan2D } from "./plan2d.js";
import { View3D } from "./view3d.js";
import { createInitialSceneState } from "./types.js";

function uuid() {
  return Math.random().toString(36).slice(2);
}

window.addEventListener("DOMContentLoaded", () => {
  let state = createInitialSceneState();

  // Seed with a default bench
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

  let toolMode = "select";
  let showServices = true;
  let showClearances = false;

  // --- DOM references ---
  const canvas2d = document.getElementById("canvas2d");
  const view3dContainer = document.getElementById("view3d");
  const summaryArea = document.getElementById("summary-area");

  if (!canvas2d) {
    console.error("main.js: canvas2d not found");
    return;
  }
  if (!summaryArea) {
    console.error("main.js: summaryArea not found");
    return;
  }

  const btnUpdateRoom = document.getElementById("update-room");
  const btnAddObject = document.getElementById("add-object");
  const btnAddService = document.getElementById("add-service");
  const btnAddOpening = document.getElementById("add-opening");
  const selAddObjectType = document.getElementById("add-object-type");
  const selAddServiceType = document.getElementById("add-service-type");
  const selAddOpeningType = document.getElementById("add-opening-type");

  const btnToolSelect = document.getElementById("tool-select");
  const btnToolMeasure = document.getElementById("tool-measure");
  const btnToggleServices = document.getElementById("toggle-services");
  const btnToggleClearances = document.getElementById("toggle-clearances");
  const btnRotate = document.getElementById("btn-rotate");
  const btnDelete = document.getElementById("btn-delete");

  const inputLen = document.getElementById("room-length");
  const inputWid = document.getElementById("room-width");
  const inputHgt = document.getElementById("room-height");

  // --- 2D view (always-on) ---
  let view3d = null;

  function refresh3D() {
    if (view3d) {
      view3d.update(state);
    }
  }

  function refreshSummary() {
    const equip = (state.objects || []).length;
    const gpos = (state.services || []).filter(s => s.type === "gpo").length;
    const lights = (state.services || []).filter(s => s.type === "light").length;

    summaryArea.innerHTML = `
      <table>
        <tr><th>Item</th><th>Count</th></tr>
        <tr><td>Equipment</td><td>${equip}</td></tr>
        <tr><td>GPOs</td><td>${gpos}</td></tr>
        <tr><td>Lights</td><td>${lights}</td></tr>
      </table>
    `;
  }

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

  // --- 3D view (optional, but should work if THREE is loaded) ---
  if (window.THREE && view3dContainer) {
    try {
      view3d = new View3D(view3dContainer);
    } catch (e) {
      console.error("Failed to initialise View3D:", e);
      view3d = null;
    }
  } else {
    console.warn("THREE or view3dContainer missing; 3D view disabled.");
  }

  refresh3D();
  refreshSummary();

  // --- Room controls ---
  btnUpdateRoom.onclick = () => {
    const len = Number(inputLen.value) || 6000;
    const wid = Number(inputWid.value) || 4000;
    const hgt = Number(inputHgt.value) || 2700;

    state = {
      ...state,
      room: { ...state.room, length: len, width: wid, height: hgt }
    };
    refresh3D();
  };

  // --- Add object ---
  btnAddObject.onclick = () => {
    const cat = selAddObjectType.value;

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
  btnAddService.onclick = () => {
    const type = selAddServiceType.value;

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
  btnAddOpening.onclick = () => {
    const type = selAddOpeningType.value; // currently only "roller_door"

    const opening = {
      id: uuid(),
      type,
      wall: "S",
      offset: 500,
      width: 2500,
      height: 2200
    };

    state = {
      ...state,
      openings: [...state.openings, opening]
    };
    // Plan2D will pick this up on next render
  };

  // --- Tool buttons ---
  btnToolSelect.onclick = () => {
    toolMode = "select";
  };
  btnToolMeasure.onclick = () => {
    toolMode = "measure"; // not yet implemented
  };
  btnToggleServices.onclick = () => {
    showServices = !showServices;
  };
  btnToggleClearances.onclick = () => {
    showClearances = !showClearances;
  };

  // --- Rotate selected object ---
  btnRotate.onclick = () => {
    if (!state.selectionId) return;
    const objects = state.objects.map(o =>
      o.id === state.selectionId
        ? { ...o, rotation: (o.rotation || 0) + Math.PI / 2 }
        : o
    );
    state = { ...state, objects };
    refresh3D();
  };

  // --- Delete selected ---
  btnDelete.onclick = () => {
    if (!state.selectionId) return;
    const objects = state.objects.filter(o => o.id !== state.selectionId);
    const services = state.services.filter(s => s.id !== state.selectionId);
    state = { ...state, objects, services, selectionId: undefined };
    refresh3D();
    refreshSummary();
  };
});
