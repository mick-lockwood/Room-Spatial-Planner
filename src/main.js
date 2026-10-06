// main.ts
import { Plan2D } from "./plan2d";
import { View3D } from "./view3d";
import type { SceneState, ObjectInstance, ServicePoint } from "./types";

function uuid() {
  return Math.random().toString(36).slice(2);
}

let state: SceneState = {
  room: {
    id: "room1",
    name: "Test Garage",
    length: 6000,
    width: 4000,
    height: 2700,
  },
  openings: [],
  objects: [
    {
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
      clearanceBack: 0,
    } as ObjectInstance,
  ],
  services: [],
  selectionId: undefined,
};

let toolMode: "select" | "measure" = "select";
let showServices = true;
let showClearances = false;

const canvas2d = document.getElementById("canvas2d") as HTMLCanvasElement;
const view3dContainer = document.getElementById("view3d") as HTMLDivElement;
const summaryArea = document.getElementById("summary-area") as HTMLDivElement;

// 2D
const plan2d = new Plan2D({
  canvas: canvas2d,
  getState: () => state,
  setState: (s: SceneState) => {
    state = s;
    refresh3D();
    refreshSummary();
  },
  getTool: () => toolMode,
  showServices: () => showServices,
  showClearances: () => showClearances,
});

// 3D
const view3d = new View3D(view3dContainer);
function refresh3D() {
  view3d.update(state);
}
refresh3D();

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

// Room controls
(document.getElementById("update-room") as HTMLButtonElement).onclick = () => {
  const len = Number((document.getElementById("room-length") as HTMLInputElement).value) || 6000;
  const wid = Number((document.getElementById("room-width") as HTMLInputElement).value) || 4000;
  const hgt = Number((document.getElementById("room-height") as HTMLInputElement).value) || 2700;

  state = {
    ...state,
    room: { ...state.room, length: len, width: wid, height: hgt },
  };
  refresh3D();
};

// Add object
(document.getElementById("add-object") as HTMLButtonElement).onclick = () => {
  const typeSel = document.getElementById("add-object-type") as HTMLSelectElement;
  const cat = typeSel.value as ObjectInstance["category"];

  const base: Partial<ObjectInstance> =
    cat === "bench"
      ? { width: 1800, depth: 750, height: 900 }
      : cat === "cabinet"
      ? { width: 900, depth: 600, height: 2100 }
      : cat === "machinery"
      ? { width: 800, depth: 800, height: 1400, clearanceFront: 1000, clearanceSides: 500, clearanceBack: 300 }
      : cat === "bike"
      ? { width: 400, depth: 1800, height: 1200 }
      : cat === "gym"
      ? { width: 2000, depth: 2000, height: 2200, clearanceFront: 1500, clearanceSides: 800 }
      : { width: 1000, depth: 1000, height: 1000 };

  const obj: ObjectInstance = {
    id: uuid(),
    name: `${cat.toUpperCase()} ${state.objects.length + 1}`,
    category: cat,
    position: {
      x: state.room.length / 2,
      y: state.room.width / 2,
    },
    rotation: 0,
    width: base.width!,
    depth: base.depth!,
    height: base.height!,
    clearanceFront: base.clearanceFront,
    clearanceSides: base.clearanceSides,
    clearanceBack: base.clearanceBack,
  };

  state = {
    ...state,
    objects: [...state.objects, obj],
    selectionId: obj.id,
  };
  refresh3D();
  refreshSummary();
};

// Add service
(document.getElementById("add-service") as HTMLButtonElement).onclick = () => {
  const typeSel = document.getElementById("add-service-type") as HTMLSelectElement;
  const type = typeSel.value as ServicePoint["type"];
  const s: ServicePoint = {
    id: uuid(),
    type,
    position: {
      x: state.room.length / 2,
      y: state.room.width / 2,
    },
    elevation: type === "light" ? state.room.height - 200 : 1200,
    attributes:
      type === "gpo"
        ? { amps: 10, phase: "1P" }
        : { fittingType: "batten" },
  };
  state = {
    ...state,
    services: [...state.services, s],
    selectionId: s.id,
  };
  refresh3D();
  refreshSummary();
};

// Tool buttons
(document.getElementById("tool-select") as HTMLButtonElement).onclick = () => {
  toolMode = "select";
};
(document.getElementById("tool-measure") as HTMLButtonElement).onclick = () => {
  toolMode = "measure"; // not yet implemented
};

(document.getElementById("toggle-services") as HTMLButtonElement).onclick = () => {
  showServices = !showServices;
};
(document.getElementById("toggle-clearances") as HTMLButtonElement).onclick = () => {
  showClearances = !showClearances;
};
