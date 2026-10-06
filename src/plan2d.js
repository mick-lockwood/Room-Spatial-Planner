// src/plan2d.js

export class Plan2D {
  constructor(options) {
    this.options = options;
    const ctx = options.canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    this.ctx = ctx;

    this.scale = 0.05; // pixels per mm
    this.draggingId = null;
    this.dragOffset = { x: 0, y: 0 };

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
    this.attachEvents();
    this.loop();
  }

  handleResize() {
    const canvas = this.options.canvas;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  loop = () => {
    this.render();
    requestAnimationFrame(this.loop);
  };

  worldToScreen(x, y) {
    const canvas = this.options.canvas;
    return {
      sx: x * this.scale + 40,
      sy: canvas.height - (y * this.scale + 40)
    };
  }

  screenToWorld(sx, sy) {
    const canvas = this.options.canvas;
    return {
      x: (sx - 40) / this.scale,
      y: (canvas.height - sy - 40) / this.scale
    };
  }

  render() {
    const state = this.options.getState();
    const canvas = this.options.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Room outline
    ctx.save();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    const p1 = this.worldToScreen(0, 0);
    const p2 = this.worldToScreen(state.room.length, state.room.width);
    const w = p2.sx - p1.sx;
    const h = p2.sy - p1.sy;
    ctx.strokeRect(p1.sx, p2.sy, w, -h);
    ctx.restore();

    // Openings (very simple: roller door on south wall)
    ctx.save();
    ctx.strokeStyle = "#00796b";
    ctx.lineWidth = 4;
    state.openings.forEach(op => {
      if (op.wall === "S") {
        // South wall runs from (0,0) to (length,0)
        const x1 = op.offset;
        const x2 = op.offset + op.width;
        const y = 0;
        const sp1 = this.worldToScreen(x1, y);
        const sp2 = this.worldToScreen(x2, y);
    
        // Draw a thick line segment on the wall to show the opening
        ctx.beginPath();
        ctx.moveTo(sp1.sx, sp1.sy);
        ctx.lineTo(sp2.sx, sp2.sy);
        ctx.stroke();
      }
      // You can add logic for N/E/W later
    });
    ctx.restore();

    // Clearance zones
    if (this.options.showClearances()) {
      ctx.save();
      ctx.fillStyle = "rgba(255,0,0,0.08)";
      state.objects.forEach(o => {
        const clearance = this.getClearanceRect(o);
        if (!clearance) return;
        const c1 = this.worldToScreen(clearance.x, clearance.y);
        const c2 = this.worldToScreen(
          clearance.x + clearance.w,
          clearance.y + clearance.h
        );
        ctx.fillRect(c1.sx, c2.sy, c2.sx - c1.sx, c1.sy - c2.sy);
      });
      ctx.restore();
    }

    // Objects
    state.objects.forEach(o =>
      this.drawObject(o, o.id === state.selectionId)
    );

    // Services
    if (this.options.showServices()) {
      state.services.forEach(s =>
        this.drawService(s, s.id === state.selectionId)
      );
    }
  }

  drawObject(o, selected) {
    const ctx = this.ctx;
    const center = this.worldToScreen(o.position.x, o.position.y);
    const w = o.width * this.scale;
    const d = o.depth * this.scale;

    ctx.save();
    ctx.translate(center.sx, center.sy);
    ctx.rotate(-o.rotation);

    ctx.fillStyle = selected ? "#4caf50" : "#999";
    ctx.fillRect(-w / 2, -d / 2, w, d);
    
    // base outline
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -d / 2, w, d);
    
    // highlight outline if selected
    if (selected) {
      ctx.strokeStyle = "#ff5722";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -d / 2, w, d);
      ctx.setLineDash([]);
    }


    ctx.fillStyle = "#000";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(o.name, 0, 0);

    ctx.restore();
  }

  drawService(s, selected) {
    const ctx = this.ctx;
    const p = this.worldToScreen(s.position.x, s.position.y);

    ctx.save();
    if (s.type === "gpo") {
      ctx.strokeStyle = selected ? "#ff9800" : "#0000ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "light") {
      ctx.strokeStyle = selected ? "#ff9800" : "#ffeb3b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.sx - 6, p.sy);
      ctx.lineTo(p.sx + 6, p.sy);
      ctx.moveTo(p.sx, p.sy - 6);
      ctx.lineTo(p.sx, p.sy + 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  getClearanceRect(o) {
    const cf = o.clearanceFront || 0;
    const cb = o.clearanceBack || 0;
    const cs = o.clearanceSides || 0;
    if (!cf && !cb && !cs) return null;

    const x = o.position.x - o.width / 2 - cs;
    const y = o.position.y - o.depth / 2 - cb;
    const w = o.width + cs * 2;
    const h = o.depth + cf + cb;
    return { x, y, w, h };
  }

  attachEvents() {
    const canvas = this.options.canvas;
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  hitTestObject(x, y, obj) {
    const halfW = obj.width / 2;
    const halfD = obj.depth / 2;
    return (
      x >= obj.position.x - halfW &&
      x <= obj.position.x + halfW &&
      y >= obj.position.y - halfD &&
      y <= obj.position.y + halfD
    );
  }

  hitTestService(x, y, s) {
    const dx = x - s.position.x;
    const dy = y - s.position.y;
    const r = 150;
    return dx * dx + dy * dy <= r * r;
  }

  onMouseDown = ev => {
    const tool = this.options.getTool();
    if (tool !== "select") return;

    const rect = this.options.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const wpt = this.screenToWorld(sx, sy);
    const state = this.options.getState();

    // objects (topmost last)
    for (const o of [...state.objects].reverse()) {
      if (this.hitTestObject(wpt.x, wpt.y, o)) {
        this.draggingId = o.id;
        this.dragOffset = {
          x: wpt.x - o.position.x,
          y: wpt.y - o.position.y
        };
        this.options.setState({ ...state, selectionId: o.id });
        return;
      }
    }

    // services
    for (const s of [...state.services].reverse()) {
      if (this.hitTestService(wpt.x, wpt.y, s)) {
        this.draggingId = s.id;
        this.dragOffset = {
          x: wpt.x - s.position.x,
          y: wpt.y - s.position.y
        };
        this.options.setState({ ...state, selectionId: s.id });
        return;
      }
    }

    this.draggingId = null;
    this.options.setState({ ...state, selectionId: undefined });
  };

  onMouseMove = ev => {
    if (!this.draggingId) return;
    const rect = this.options.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const wpt = this.screenToWorld(sx, sy);

    const state = this.options.getState();

    const objects = state.objects.map(o =>
      o.id === this.draggingId
        ? {
            ...o,
            position: {
              x: wpt.x - this.dragOffset.x,
              y: wpt.y - this.dragOffset.y
            }
          }
        : o
    );

    const services = state.services.map(s =>
      s.id === this.draggingId
        ? {
            ...s,
            position: {
              x: wpt.x - this.dragOffset.x,
              y: wpt.y - this.dragOffset.y
            }
          }
        : s
    );

    this.options.setState({ ...state, objects, services });
  };

  onMouseUp = () => {
    this.draggingId = null;
  };
}
