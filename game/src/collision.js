// Last Ferry — Salt Harbor.
// Collision world for Salt Harbor.
//
// Every solid object registers a simple invisible proxy: a yaw-rotated box with
// a vertical span and a label that names its source. The player is a capsule
// footprint resolved against the proxies, vehicles are OBBs resolved with SAT,
// and the camera shortens its boom with a ray test. A per-cell spatial hash
// keeps queries cheap. No render mesh is ever used as a collider.

const CELL = 10;

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.stamp = 1;
  }

  addBox(x, z, hx, hz, y0, y1, yaw, label, tag = 'prop') {
    const box = {
      x, z, hx, hz, y0, y1,
      yaw: yaw ?? 0,
      cos: Math.cos(yaw ?? 0),
      sin: Math.sin(yaw ?? 0),
      label,
      tag,
      mark: 0,
    };
    box.radius = Math.hypot(hx, hz);
    this.boxes.push(box);
    return box;
  }

  addBoxAt(x, z, w, d, y0, y1, yaw, label, tag = 'prop') {
    return this.addBox(x, z, w / 2, d / 2, y0, y1, yaw ?? 0, label, tag);
  }

  addWall(x1, z1, x2, z2, thickness, y0, y1, label, tag = 'wall') {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) return;
    const yaw = Math.atan2(dx, dz);
    // A box's local Z runs along the segment.
    this.addBox((x1 + x2) / 2, (z1 + z2) / 2, thickness / 2, length / 2, y0, y1, yaw, label, tag);
  }

  build() {
    this.grid.clear();
    for (const box of this.boxes) {
      const ex = Math.abs(box.hx * box.cos) + Math.abs(box.hz * box.sin);
      const ez = Math.abs(box.hx * box.sin) + Math.abs(box.hz * box.cos);
      const x0 = Math.floor((box.x - ex) / CELL);
      const x1 = Math.floor((box.x + ex) / CELL);
      const z0 = Math.floor((box.z - ez) / CELL);
      const z1 = Math.floor((box.z + ez) / CELL);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const key = gx * 100003 + gz;
          let cell = this.grid.get(key);
          if (!cell) {
            cell = [];
            this.grid.set(key, cell);
          }
          cell.push(box);
        }
      }
    }
  }

  query(x, z, radius = 0) {
    const out = [];
    this.stamp++;
    const x0 = Math.floor((x - radius) / CELL);
    const x1 = Math.floor((x + radius) / CELL);
    const z0 = Math.floor((z - radius) / CELL);
    const z1 = Math.floor((z + radius) / CELL);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gz = z0; gz <= z1; gz++) {
        const cell = this.grid.get(gx * 100003 + gz);
        if (!cell) continue;
        for (const box of cell) {
          if (box.mark === this.stamp) continue;
          box.mark = this.stamp;
          out.push(box);
        }
      }
    }
    return out;
  }

  // Resolve a circle footprint against every overlapping proxy. `y` is the feet
  // height; the capsule spans y+0.15 .. y+1.65. Returns the number of pushes.
  resolveCircle(pos, radius, y) {
    let pushes = 0;
    const low = y + 0.12;
    const high = y + 1.62;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      const near = this.query(pos.x, pos.z, radius + 2.5);
      for (const box of near) {
        if (high < box.y0 || low > box.y1) continue;
        const dx = pos.x - box.x;
        const dz = pos.z - box.z;
        const reach = box.radius + radius;
        if (dx * dx + dz * dz > reach * reach) continue;
        const lx = dx * box.cos - dz * box.sin;
        const lz = dx * box.sin + dz * box.cos;
        const cx = Math.max(-box.hx, Math.min(box.hx, lx));
        const cz = Math.max(-box.hz, Math.min(box.hz, lz));
        let nx = lx - cx;
        let nz = lz - cz;
        let dist = Math.hypot(nx, nz);
        if (dist >= radius) continue;
        let push;
        if (dist < 1e-5) {
          // Centre inside the proxy: escape along the shallowest face.
          const ox = box.hx - Math.abs(lx);
          const oz = box.hz - Math.abs(lz);
          if (ox < oz) {
            nx = Math.sign(lx) || 1;
            nz = 0;
            push = ox + radius;
          } else {
            nx = 0;
            nz = Math.sign(lz) || 1;
            push = oz + radius;
          }
        } else {
          push = radius - dist;
          nx /= dist;
          nz /= dist;
        }
        // Back to world space.
        const wx = nx * box.cos + nz * box.sin;
        const wz = -nx * box.sin + nz * box.cos;
        pos.x += wx * push;
        pos.z += wz * push;
        pushes++;
        moved = true;
      }
      if (!moved) break;
    }
    return pushes;
  }

  // SAT between two 2D OBBs. Returns the minimum translation to move A out of B.
  static obbOverlap(a, b) {
    const axes = [
      [a.cos, -a.sin], [a.sin, a.cos],
      [b.cos, -b.sin], [b.sin, b.cos],
    ];
    let minDepth = Infinity;
    let minAxis = null;
    for (const [ax, az] of axes) {
      const projA = Math.abs(a.hx * (a.cos * ax - a.sin * az)) + Math.abs(a.hz * (a.sin * ax + a.cos * az));
      const projB = Math.abs(b.hx * (b.cos * ax - b.sin * az)) + Math.abs(b.hz * (b.sin * ax + b.cos * az));
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.abs(dx * ax + dz * az);
      const overlap = projA + projB - dist;
      if (overlap <= 0) return null;
      if (overlap < minDepth) {
        minDepth = overlap;
        const dir = dx * ax + dz * az >= 0 ? -1 : 1;
        minAxis = [ax * dir, az * dir];
      }
    }
    return { depth: minDepth, nx: minAxis[0], nz: minAxis[1] };
  }

  // Push a vehicle OBB out of static proxies. Returns the strongest hit.
  resolveVehicle(car, y, ignoreLabels = null) {
    let hit = null;
    const near = this.query(car.x, car.z, car.radius + 3);
    for (const box of near) {
      if (y + 1.4 < box.y0 || y + 0.2 > box.y1) continue;
      if (ignoreLabels && ignoreLabels.includes(box.label)) continue;
      const overlap = CollisionWorld.obbOverlap(car, box);
      if (!overlap) continue;
      car.x += overlap.nx * overlap.depth;
      car.z += overlap.nz * overlap.depth;
      hit = overlap;
      car.impact = Math.max(car.impact ?? 0, Math.hypot(car.vx, car.vz));
    }
    return hit;
  }

  raycast(origin, direction, maxDistance) {
    let best = maxDistance;
    let bestBox = null;
    const dirX = direction.x;
    const dirY = direction.y;
    const dirZ = direction.z;
    // Broad phase: sample the segment's cells.
    const steps = Math.ceil(maxDistance / CELL) + 1;
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxDistance;
      const x = origin.x + dirX * t;
      const z = origin.z + dirZ * t;
      for (const box of this.query(x, z, CELL)) {
        if (seen.has(box)) continue;
        seen.add(box);
        const tHit = rayBox(origin, direction, box);
        if (tHit !== null && tHit >= 0 && tHit < best) {
          best = tHit;
          bestBox = box;
        }
      }
    }
    return bestBox ? { distance: best, box: bestBox } : null;
  }

  stats() {
    const byTag = {};
    for (const box of this.boxes) byTag[box.tag] = (byTag[box.tag] ?? 0) + 1;
    return { total: this.boxes.length, byTag };
  }
}

function rayBox(origin, dir, box) {
  const ox = origin.x - box.x;
  const oz = origin.z - box.z;
  const lox = ox * box.cos - oz * box.sin;
  const loz = ox * box.sin + oz * box.cos;
  const ldx = dir.x * box.cos - dir.z * box.sin;
  const ldz = dir.x * box.sin + dir.z * box.cos;
  let tmin = 0;
  let tmax = Infinity;
  const slab = (o, d, h) => {
    if (Math.abs(d) < 1e-8) return o >= -h && o <= h;
    let t1 = (-h - o) / d;
    let t2 = (h - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };
  if (!slab(lox, ldx, box.hx)) return null;
  if (!slab(loz, ldz, box.hz)) return null;
  const shifted = origin.y - (box.y0 + box.y1) / 2;
  if (!slab(shifted, dir.y, (box.y1 - box.y0) / 2)) return null;
  return tmin;
}