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
    openings: [],
    objects: [],
    services: [],
    selectionId: undefined
  };
}
