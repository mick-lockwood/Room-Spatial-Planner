// plan2d.ts
import type { SceneState, ObjectInstance, ServicePoint } from "./types";

export type ToolMode = "select" | "measure";

export interface Plan2DOptions {
  canvas: HTMLCanvasElement;
  getState: () => SceneState;
  setState: (s: SceneState) => void;
  getTool: () => ToolMode;
  showServices: () => boolean;
  showClearances: () => boolean;
}

export class Plan2D {
  private ctx: CanvasRenderingContext2D;
  private options: Plan2DOptions;
  private scale = 0.05; // pixels per mm (tune as required)
  private draggingId: string | null = null;
  private dragOffset = { x: 0, y: 0 };

  constructor(options: Plan2DOptions) {
    this.options = options;
    const ctx = options.canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    this.ctx = ctx;

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
    this.attachEvents();
    this.loop();
  }

  private handleResize() {
    const { canvas } = this.options;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  private loop = () => {
    this.render();
    requestAnimationFrame(this.loop);
  };

  private worldToScreen(x: number, y: number) {
    // origin bottom-left -> screen origin top-left
    const { canvas } = this.options;
    return {
      sx: x * this.scale + 40, // margin
      sy: canvas.height - (y * this.scale + 40),
    };
  }

  private screenToWorld(sx: number, sy: number) {
    const { canvas } = this.options;
    return {
      x: (sx - 40) / this.scale,
      y: (canvas.height - sy - 40) / this.scale,
    };
  }

  private render() {
    const state = this.options.getState();
    const { canvas } = this.options;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Room
    ctx.save();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    const { sx, sy } = this.worldToScreen(0, 0);
    const { sx: sx2, sy: sy2 } = this.worldToScreen(state.room.length, state.room.width);
    const w = sx2 - sx;
    const h = sy2 - sy;
    ctx.strokeRect(sx, sy2, w, -h); // since sy2 < sy in screen space
    ctx.restore();

    // Openings could be drawn here (omitted in this minimal pass)

    // Clearances
    if (this.options.showClearances()) {
      ctx.save();
      ctx.fillStyle = "rgba(255,0,0,0.08)";
      state.objects.forEach(o => {
        const clearance = this.getClearanceRect(o);
        if (!clearance) return;
        const p1 = this.worldToScreen(clearance.x, clearance.y);
        const p2 = this.worldToScreen(clearance.x + clearance.w, clearance.y + clearance.h);
        ctx.fillRect(p1.sx, p2.sy, p2.sx - p1.sx, p1.sy - p2.sy);
      });
      ctx.restore();
    }

    // Objects
    state.objects.forEach(o => this.drawObject(o, o.id === state.selectionId));

    // Services
    if (this.options.showServices()) {
      state.services.forEach(s => this.drawService(s, s.id === state.selectionId));
    }
  }

  private drawObject(o: ObjectInstance, selected: boolean) {
    const ctx = this.ctx;
    const center = this.worldToScreen(o.position.x, o.position.y);
    const w = o.width * this.scale;
    const d = o.depth * this.scale;

    ctx.save();
    ctx.translate(center.sx, center.sy);
    ctx.rotate(-o.rotation); // invert for screen

    ctx.fillStyle = selected ? "#4caf50" : "#999";
    ctx.fillRect(-w / 2, -d / 2, w, d);

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -d / 2, w, d);

    // Label
    ctx.fillStyle = "#000";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(o.name, 0, 0);

    ctx.restore();
  }

  private drawService(s: ServicePoint, selected: boolean) {
    const ctx = this.ctx;
    const { sx, sy } = this.worldToScreen(s.position.x, s.position.y);

    ctx.save();
    if (s.type === "gpo") {
      ctx.strokeStyle = selected ? "#ff9800" : "#0000ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "light") {
      ctx.strokeStyle = selected ? "#ff9800" : "#ffeb3b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy);
      ctx.lineTo(sx + 6, sy);
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(sx, sy + 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  private getClearanceRect(o: ObjectInstance) {
    const cf = o.clearanceFront ?? 0;
    const cb = o.clearanceBack ?? 0;
    const cs = o.clearanceSides ?? 0;
    if (!cf && !cb && !cs) return null;
    // For prototype assume rotation = 0 (axis-aligned). Rotation-safe handling can come later.
    const x = o.position.x - o.width / 2 - cs;
    const y = o.position.y - o.depth / 2 - cb;
    const w = o.width + cs * 2;
    const h = o.depth + cf + cb;
    return { x, y, w, h };
  }

  private attachEvents() {
    const { canvas } = this.options;
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  private hitTestObject(x: number, y: number, obj: ObjectInstance): boolean {
    // Ignore rotation in hit test for now
    const halfW = obj.width / 2;
    const halfD = obj.depth / 2;
    return (
      x >= obj.position.x - halfW &&
      x <= obj.position.x + halfW &&
      y >= obj.position.y - halfD &&
      y <= obj.position.y + halfD
    );
  }

  private hitTestService(x: number, y: number, s: ServicePoint): boolean {
    const dx = x - s.position.x;
    const dy = y - s.position.y;
    const r = 150; // mm hit radius
    return dx * dx + dy * dy <= r * r;
  }

  private onMouseDown = (ev: MouseEvent) => {
    const tool = this.options.getTool();
    if (tool !== "select") return;

    const rect = this.options.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const wpt = this.screenToWorld(sx, sy);
    const state = this.options.getState();

    // Check objects first
    for (const o of [...state.objects].reverse()) {
      if (this.hitTestObject(wpt.x, wpt.y, o)) {
        this.draggingId = o.id;
        this.dragOffset = {
          x: wpt.x - o.position.x,
          y: wpt.y - o.position.y,
        };
        this.options.setState({ ...state, selectionId: o.id });
        return;
      }
    }

    // Then services
    for (const s of [...state.services].reverse()) {
      if (this.hitTestService(wpt.x, wpt.y, s)) {
        this.draggingId = s.id;
        this.dragOffset = {
          x: wpt.x - s.position.x,
          y: wpt.y - s.position.y,
        };
        this.options.setState({ ...state, selectionId: s.id });
        return;
      }
    }

    // Clicked empty space
    this.draggingId = null;
    this.options.setState({ ...state, selectionId: undefined });
  };

  private onMouseMove = (ev: MouseEvent) => {
    if (!this.draggingId) return;
    const rect = this.options.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const wpt = this.screenToWorld(sx, sy);

    const state = this.options.getState();
    const objects = state.objects.map(o =>
      o.id === this.draggingId
        ? { ...o, position: { x: wpt.x - this.dragOffset.x, y: wpt.y - this.dragOffset.y } }
        : o
    );
    const services = state.services.map(s =>
      s.id === this.draggingId
        ? { ...s, position: { x: wpt.x - this.dragOffset.x, y: wpt.y - this.dragOffset.y } }
        : s
    );

    this.options.setState({ ...state, objects, services });
  };

  private onMouseUp = () => {
    this.draggingId = null;
  };
}
