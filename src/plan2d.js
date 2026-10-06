// src/plan2d.js

export class Plan2D {
  constructor(options) {
    this.options = options;
    const ctx = options.canvas.getContext("2d");
    if (!ctx) {
      console.error("Plan2D: canvas.getContext('2d') returned null");
      throw new Error("No 2D context");
    }
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
    canvas.width = Math.max(10, rect.width);   // avoid 0
    canvas.height = Math.max(10, rect.height); // avoid 0
    // console.log("Plan2D resize:", canvas.width, canvas.height);
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

    if (!state || !state.room) {
      console.warn("Plan2D.render: state or state.room missing");
