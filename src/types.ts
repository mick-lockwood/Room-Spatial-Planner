export type Vector2 = { x: number; y: number };

export type ObjectCategory =
  | "bench"
  | "cabinet"
  | "machinery"
  | "bike"
  | "gym"
  | "vehicle"
  | "misc";

export type ServiceType = "gpo" | "light" | "switch" | "data";

export interface RoomShell {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}

export interface Opening {
  id: string;
  type: "roller_door" | "door" | "window";
  wall: "N" | "E" | "S" | "W";
  offset: number;
  width: number;
  height: number;
}

export interface ObjectInstance {
  id: string;
  name: string;
  category: ObjectCategory;
  position: Vector2;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  clearanceFront?: number;
  clearanceSides?: number;
  clearanceBack?: number;
  powerRequirement?: {
    phase: "1P" | "3P";
    amps: number;
    dedicatedCircuit?: boolean;
  };
}

export interface ServicePoint {
  id: string;
  type: ServiceType;
  position: Vector2;
  elevation: number;
  attributes?: {
    amps?: number;
    phase?: "1P" | "3P";
    weatherproof?: boolean;
    fittingType?: "batten" | "highbay" | "downlight" | "other";
    groupId?: string;
  };
  linkedObjectId?: string;
}

export interface SceneState {
  room: RoomShell;
  openings: Opening[];
  objects: ObjectInstance[];
  services: ServicePoint[];
  selectionId?: string;
}
