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
