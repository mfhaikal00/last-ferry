// Last Ferry — Salt Harbor.
// Top-down minimap drawn from the same road and node data as the world, so
// positions and routes always match.

import { NODES, POI, ROADS, WORLD } from './config.js';

const W = 210;
export class Minimap {
  constructor(canvas, collision) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * this.dpr;
    canvas.height = W * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.blocks = collision.boxes
      .filter((b) => ['building', 'stall', 'container', 'ferry', 'sign'].includes(b.tag))
      .map((b) => ({ x: b.x, z: b.z, hx: b.hx, hz: b.hz, yaw: b.yaw, tag: b.tag }));
    this.bounds = { minX: -190, maxX: 186, minZ: -142, maxZ: 168 };
    this.scale = (W - 20) / Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    this.cx = (this.bounds.minX + this.bounds.maxX) / 2;
    this.cz = (this.bounds.minZ + this.bounds.maxZ) / 2;
    this.time = 0;
  }

  toMap(x, z) {
    return {
      x: W / 2 + (x - this.cx) * this.scale,
      y: W / 2 + (z - this.cz) * this.scale,
    };
  }

  draw(state) {
    this.time += 1 / 30;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, W);
    ctx.clip();

    // Water.
    ctx.fillStyle = '#0b3444';
    ctx.fillRect(0, 0, W, W);

    // Land mass, with the canal and sea cut back out.
    const land = new Path2D();
    const p = (x, z) => this.toMap(x, z);
    const a = p(this.bounds.minX, this.bounds.minZ);
    const b = p(this.bounds.maxX, this.bounds.minZ);
    const c = p(this.bounds.maxX, 108);
    const d = p(this.bounds.minX, 108);
    land.moveTo(a.x, a.y);
    land.lineTo(b.x, b.y);
    land.lineTo(c.x, c.y);
    land.lineTo(d.x, d.y);
    land.closePath();
    ctx.fillStyle = '#a49882';
    ctx.fill(land);
    ctx.strokeStyle = 'rgba(240,226,196,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke(land);

    // Canal.
    const c0 = p(75, 25);
    const c1 = p(125, 25);
    const c2 = p(125, 108);
    const c3 = p(75, 108);
    ctx.fillStyle = '#0b3444';
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.lineTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.lineTo(c3.x, c3.y);
    ctx.closePath();
    ctx.fill();

    // Buildings and stalls.
    for (const block of this.blocks) {
      const m = this.toMap(block.x, block.z);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(-block.yaw);
      ctx.fillStyle = block.tag === 'building' ? 'rgba(49,46,40,0.78)' : block.tag === 'ferry' ? '#d86d2c' : block.tag === 'container' ? '#5d665f' : 'rgba(92,78,58,0.5)';
      const w = Math.max(2, block.hx * 2 * this.scale);
      const h = Math.max(2, block.hz * 2 * this.scale);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // Roads.
    for (const [name, def] of Object.entries(ROADS)) {
      ctx.beginPath();
      def.points.forEach(([x, z], i) => {
        const m = p(x, z);
        if (i === 0) ctx.moveTo(m.x, m.y);
        else ctx.lineTo(m.x, m.y);
      });
      ctx.strokeStyle = name === 'bridge' ? '#d9c9a8' : '#5c574c';
      ctx.lineWidth = Math.max(2, def.width * this.scale * 1.15);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(246,233,200,0.8)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Pier.
    const pier = p(-118, 108);
    ctx.strokeStyle = '#9b7b53';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pier.x, pier.y);
    ctx.lineTo(pier.x, p(-118, 145).y);
    ctx.stroke();

    // Ferry icon.
    const ferry = p(-112, 138);
    ctx.fillStyle = '#e07a32';
    ctx.beginPath();
    ctx.roundRect(ferry.x - 9, ferry.y - 4, 18, 8, 3);
    ctx.fill();

    // Named nodes and POI labels.
    const poiLabel = (x, z, text, colour = 'rgba(255,240,209,0.9)') => {
      const m = p(x, z);
      ctx.font = '700 6.5px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(9,20,25,0.9)';
      ctx.strokeText(text, m.x, m.y + 9);
      ctx.fillStyle = colour;
      ctx.fillText(text, m.x, m.y + 9);
    };
    poiLabel(POI.market.x, POI.market.z, 'FISH MARKET');
    poiLabel(POI.workshop.x, POI.workshop.z, 'WORKSHOP');
    poiLabel(POI.terminal.x, POI.terminal.z, 'FERRY');
    poiLabel(POI.bridge.x, POI.bridge.z, 'BRIDGE');

    // Objective marker.
    if (state.objective) {
      const m = p(state.objective.x, state.objective.z);
      const pulse = 3 + Math.sin(this.time * 4) * 1.1;
      ctx.strokeStyle = '#ffc45e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(m.x, m.y, pulse + 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffc45e';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Police and vehicles.
    for (const vehicle of state.vehicles ?? []) {
      const m = p(vehicle.x, vehicle.z);
      ctx.fillStyle = vehicle.key === 'police' ? (Math.sin(this.time * 8) > 0 ? '#ff4338' : '#4b83ff') : 'rgba(235,225,200,0.55)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, vehicle.key === 'police' ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player arrow.
    if (state.player) {
      const m = p(state.player.x, state.player.z);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(-state.player.yaw + Math.PI);
      ctx.fillStyle = '#ffd98d';
      ctx.strokeStyle = 'rgba(12,24,28,0.95)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(4.2, 4.6);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.2, 4.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Compass.
    ctx.fillStyle = 'rgba(11,27,34,0.65)';
    ctx.beginPath();
    ctx.arc(W - 15, 15, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe1ab';
    ctx.font = '700 8px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', W - 15, 18);

    ctx.restore();
  }
}

export { W as MINIMAP_SIZE };