// src/types.js

// Simple helper to create the initial scene state
export function createInitialSceneState() {
  return {
    room: {
      id: "room1",
      name: "Test Garage",
      length: 6000,
      width: 4000,
      height: 2700
    },
    openings: [],   // wall openings like roller doors
    objects: [],    // benches, cabinets, machinery, etc.
    services: [],   // GPOs, lights, etc.
    selectionId: undefined
  };
}
