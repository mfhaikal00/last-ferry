// Last Ferry — front end.
// The HUD is the only writer of DOM text: objectives, wanted stars, dialogue,
// speed, ammo, cash, interaction prompts, the minimap and the menus. The minimap
// draws from the same road and collision data as the world.

import { NODES, POI, ROADS } from './core.js';

const MINI = 210;

export class Hud {
  constructor(options = {}) {
    this.onStart = options.onStart ?? (() => {});
    this.onResume = options.onResume ?? (() => {});
    this.onRetry = options.onRetry ?? (() => {});
    this.onSave = options.onSave ?? (() => {});
    this.onQuit = options.onQuit ?? (() => {});
    this.onMissionContinue = options.onMissionContinue ?? (() => {});
    this.dialogueTimer = 0;
    this.toastTimer = 0;
    this.damageTimer = 0;
    this.controlsOpen = false;
    this.interaction = '';
    this.buildLoading();
    this.buildHud();
    this.buildTitle();
    this.buildPause();
    this.buildMissionCard();
  }

  buildLoading() {
    const el = document.createElement('div');
    el.id = 'loading';
    el.innerHTML = `
      <div class="load-logo">Last <span>Ferry</span></div>
      <div class="load-track"><div id="load-bar"></div></div>
      <div id="load-text">Loading Salt Harbor</div>`;
    document.body.appendChild(el);
    this.loading = el;
    this.loadBar = el.querySelector('#load-bar');
    this.loadText = el.querySelector('#load-text');
  }

  setLoading(progress, label) {
    this.loadBar.style.width = `${Math.round(progress * 100)}%`;
    if (label) this.loadText.textContent = label;
  }

  finishLoading() {
    this.loadBar.style.width = '100%';
    this.loading.style.opacity = '0';
    setTimeout(() => this.loading.classList.add('hidden'), 520);
  }

  buildHud() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.className = 'hidden';
    hud.innerHTML = `
      <div class="top-left">
        <div class="brand"><b>LAST FERRY</b><span>Salt Harbor</span></div>
        <div class="mission-name" id="mission-name">Last Ferry</div>
        <div id="objective">Take the impounded tow truck</div>
        <div id="objective-area">Impound lot · Fish Market</div>
      </div>
      <div class="top-right">
        <div class="wanted" id="wanted" aria-label="Wanted level">
          <span class="star">★</span><span class="star">★</span><span class="star">★</span>
        </div>
        <div class="minimap-wrap"><canvas id="minimap" width="210" height="210"></canvas><div class="mini-label">Salt Harbor</div></div>
        <div class="district" id="district">Workshop</div>
      </div>
      <div class="bottom-left"><div id="dialogue"><span class="speaker"></span><p></p></div></div>
      <div class="bottom-right">
        <div id="speed"><b>0</b><span>KM/H</span></div>
        <div class="meter-row" id="health-row"><label>HEALTH</label><div class="meter"><i id="health-bar"></i></div><b id="health-value">100</b></div>
        <div class="statline"><span>AMMO <b id="ammo">30 / 90</b></span><span>$ <b id="cash">120</b></span></div>
      </div>
      <div id="interact"></div>
      <div id="toast"></div>
      <div id="crosshair"><i></i></div>
      <div id="damage"></div>`;
    document.body.appendChild(hud);
    this.hud = hud;
    this.objective = hud.querySelector('#objective');
    this.objectiveArea = hud.querySelector('#objective-area');
    this.missionName = hud.querySelector('#mission-name');
    this.wantedStars = [...hud.querySelectorAll('#wanted .star')];
    this.district = hud.querySelector('#district');
    this.dialogue = hud.querySelector('#dialogue');
    this.dialogueSpeaker = this.dialogue.querySelector('.speaker');
    this.dialogueText = this.dialogue.querySelector('p');
    this.speed = hud.querySelector('#speed');
    this.speedValue = this.speed.querySelector('b');
    this.healthBar = hud.querySelector('#health-bar');
    this.healthRow = hud.querySelector('#health-row');
    this.healthValue = hud.querySelector('#health-value');
    this.ammo = hud.querySelector('#ammo');
    this.cash = hud.querySelector('#cash');
    this.interact = hud.querySelector('#interact');
    this.toast = hud.querySelector('#toast');
    this.crosshair = hud.querySelector('#crosshair');
    this.damage = hud.querySelector('#damage');
    this.minimapCanvas = hud.querySelector('#minimap');
  }

  buildTitle() {
    const el = document.createElement('div');
    el.id = 'title-screen';
    el.className = 'screen';
    el.innerHTML = `
      <div class="title-copy">
        <div class="eyebrow">A harbour crime story</div>
        <h1 class="logo">Last<span>Ferry</span></h1>
        <div class="city-line">Salt Harbor</div>
        <p class="tagline">Bagas has one run left: take the impounded tow truck across the bridge, reach the last ferry, and keep the harbour patrol off his back.</p>
        <div class="menu">
          <button class="primary" id="btn-start">Start the run <small>New game</small></button>
          <button id="btn-continue">Continue <small>Saved run</small></button>
          <button id="btn-controls">Controls <small>Keyboard · mouse</small></button>
        </div>
        <div class="controls-panel" id="controls-panel">
          <h3>Controls</h3>
          <div class="control-grid">
            <span><kbd>W A S D</kbd> Move / drive</span>
            <span><kbd>Shift</kbd> Sprint</span>
            <span><kbd>Mouse</kbd> Look / steer camera</span>
            <span><kbd>Space</kbd> Jump / handbrake</span>
            <span><kbd>E</kbd> Enter / exit vehicle</span>
            <span><kbd>R</kbd> Equip / unequip rifle</span>
            <span><kbd>F</kbd> Reload rifle</span>
            <span><kbd>J</kbd> Punch · <kbd>K</kbd> Kick</span>
            <span><kbd>Left click</kbd> Fire / punch</span>
            <span><kbd>Esc</kbd> Pause · <kbd>M</kbd> Replay</span>
          </div>
        </div>
        <div class="title-foot">Salt Harbor · 30 FPS target · Plays offline</div>
      </div>`;
    document.body.appendChild(el);
    this.title = el;
    this.startButton = el.querySelector('#btn-start');
    this.continueButton = el.querySelector('#btn-continue');
    this.controlsPanel = el.querySelector('#controls-panel');
    this.startButton.addEventListener('click', () => this.onStart(false));
    this.continueButton.addEventListener('click', () => this.onStart(true));
    el.querySelector('#btn-controls').addEventListener('click', () => {
      this.controlsOpen = !this.controlsOpen;
      this.controlsPanel.classList.toggle('show', this.controlsOpen);
    });
  }

  buildPause() {
    const el = document.createElement('div');
    el.id = 'pause-screen';
    el.className = 'screen hidden';
    el.innerHTML = `
      <div class="card">
        <div class="card-kicker">Salt Harbor</div>
        <h2>Paused</h2>
        <div class="menu">
          <button class="primary" id="btn-resume">Resume</button>
          <button id="btn-retry">Retry checkpoint</button>
          <button id="btn-save">Save game</button>
          <button id="btn-title">Back to title</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.pauseScreen = el;
    el.querySelector('#btn-resume').addEventListener('click', () => this.onResume());
    el.querySelector('#btn-retry').addEventListener('click', () => this.onRetry());
    el.querySelector('#btn-save').addEventListener('click', () => this.onSave());
    el.querySelector('#btn-title').addEventListener('click', () => this.onQuit());
  }

  buildMissionCard() {
    const el = document.createElement('div');
    el.id = 'mission-card';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="card">
        <div class="card-kicker">Mission complete</div>
        <h2 id="card-title">Last Ferry</h2>
        <p id="card-detail"></p>
        <div class="reward" id="card-reward"></div>
        <div class="card-actions"><button class="primary" id="card-continue">Continue</button></div>
      </div>`;
    document.body.appendChild(el);
    this.missionCard = el;
    el.querySelector('#card-continue').addEventListener('click', () => {
      this.missionCard.classList.add('hidden');
      this.onMissionContinue();
    });
  }

  showTitle(hasSave, saveInfo = '') {
    this.title.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.continueButton.disabled = !hasSave;
    if (saveInfo) this.continueButton.querySelector('small').textContent = saveInfo;
    this.finishLoading();
  }

  hideTitle() {
    this.title.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  setMission(name, subtitle) {
    this.missionName.textContent = name;
    if (subtitle) this.missionNote = subtitle;
  }

  setObjective(text, area) {
    this.objective.textContent = text;
    if (area) this.objectiveArea.textContent = area;
    this.objective.style.transform = 'translateY(0)';
  }

  setDistrict(name) {
    if (name && this.district.textContent !== name) this.district.textContent = name;
  }

  setWanted(stars) {
    this.wantedStars.forEach((star, index) => star.classList.toggle('on', index < stars));
  }

  setMoney(value) { this.cash.textContent = String(value); }

  setHealth(value) {
    const pct = Math.max(0, Math.min(100, value));
    this.healthBar.style.width = `${pct}%`;
    this.healthValue.textContent = String(Math.round(pct));
    this.healthRow.classList.toggle('low', pct < 30);
  }

  setAmmo(ammo, reserve, visible) {
    this.ammo.classList.toggle('on', visible);
    this.ammo.textContent = `${ammo} / ${reserve}`;
  }

  setSpeed(kmh, visible) {
    this.speed.classList.toggle('on', visible);
    this.speedValue.textContent = String(Math.round(kmh));
  }

  setDialogue(speaker, text, seconds = 4.5) {
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueText.textContent = text;
    this.dialogue.classList.add('show');
    this.dialogueTimer = seconds;
  }

  hideDialogue() {
    this.dialogueTimer = 0;
    this.dialogue.classList.remove('show');
  }

  showToast(text) {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    this.toastTimer = 3.2;
  }

  setInteract(text) {
    if (text === this.interaction) return;
    this.interaction = text;
    if (text) {
      this.interact.innerHTML = `<kbd>E</kbd>${text}`;
      this.interact.classList.add('show');
    } else {
      this.interact.classList.remove('show');
    }
  }

  setCrosshair(visible) { this.crosshair.classList.toggle('show', visible); }

  damageFlash() {
    this.damage.classList.add('on');
    this.damageTimer = 0.12;
  }

  showMissionComplete(data) {
    this.missionCard.classList.remove('hidden');
    this.missionCard.querySelector('#card-title').textContent = data.title;
    this.missionCard.querySelector('#card-detail').textContent = data.detail;
    const reward = data.reward ?? data.money;
    this.missionCard.querySelector('#card-reward').textContent = reward ? `+$${reward}` : '';
  }

  showPause(visible) { this.pauseScreen.classList.toggle('hidden', !visible); }

  update(dt) {
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogue.classList.remove('show');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.remove('show');
    }
    if (this.damageTimer > 0) {
      this.damageTimer -= dt;
      if (this.damageTimer <= 0) this.damage.classList.remove('on');
    }
  }
}

// --- minimap ----------------------------------------------------------------

export class Minimap {
  constructor(canvas, collision) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = MINI * this.dpr;
    canvas.height = MINI * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.blocks = collision.boxes
      .filter((b) => ['building', 'stall', 'container', 'ferry', 'sign'].includes(b.tag))
      .map((b) => ({ x: b.x, z: b.z, hx: b.hx, hz: b.hz, yaw: b.yaw, tag: b.tag }));
    this.bounds = { minX: -190, maxX: 186, minZ: -142, maxZ: 168 };
    this.scale = (MINI - 20) / Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    this.cx = (this.bounds.minX + this.bounds.maxX) / 2;
    this.cz = (this.bounds.minZ + this.bounds.maxZ) / 2;
    this.time = 0;
  }

  toMap(x, z) {
    return { x: MINI / 2 + (x - this.cx) * this.scale, y: MINI / 2 + (z - this.cz) * this.scale };
  }

  draw(state) {
    this.time += 1 / 30;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, MINI, MINI);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, MINI, MINI);
    ctx.clip();

    ctx.fillStyle = '#0b3444';
    ctx.fillRect(0, 0, MINI, MINI);

    const p = (x, z) => this.toMap(x, z);
    const land = new Path2D();
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

    for (const block of this.blocks) {
      const m = this.toMap(block.x, block.z);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(-block.yaw);
      ctx.fillStyle = block.tag === 'building' ? 'rgba(49,46,40,0.78)'
        : block.tag === 'ferry' ? '#d86d2c'
          : block.tag === 'container' ? '#5d665f' : 'rgba(92,78,58,0.5)';
      const w = Math.max(2, block.hx * 2 * this.scale);
      const h = Math.max(2, block.hz * 2 * this.scale);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

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

    const pier = p(-118, 108);
    ctx.strokeStyle = '#9b7b53';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pier.x, pier.y);
    ctx.lineTo(pier.x, p(-118, 145).y);
    ctx.stroke();

    const ferry = p(-112, 138);
    ctx.fillStyle = '#e07a32';
    ctx.beginPath();
    ctx.roundRect(ferry.x - 9, ferry.y - 4, 18, 8, 3);
    ctx.fill();

    const label = (x, z, text, colour = 'rgba(255,240,209,0.9)') => {
      const m = p(x, z);
      ctx.font = '700 6.5px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(9,20,25,0.9)';
      ctx.strokeText(text, m.x, m.y + 9);
      ctx.fillStyle = colour;
      ctx.fillText(text, m.x, m.y + 9);
    };
    label(POI.market.x, POI.market.z, 'FISH MARKET');
    label(POI.workshop.x, POI.workshop.z, 'WORKSHOP');
    label(POI.terminal.x, POI.terminal.z, 'FERRY');
    label(POI.bridge.x, POI.bridge.z, 'BRIDGE');

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

    for (const vehicle of state.vehicles ?? []) {
      const m = p(vehicle.x, vehicle.z);
      ctx.fillStyle = vehicle.key === 'police'
        ? (Math.sin(this.time * 8) > 0 ? '#ff4338' : '#4b83ff')
        : 'rgba(235,225,200,0.55)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, vehicle.key === 'police' ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

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

    ctx.fillStyle = 'rgba(11,27,34,0.65)';
    ctx.beginPath();
    ctx.arc(MINI - 15, 15, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe1ab';
    ctx.font = '700 8px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', MINI - 15, 18);
    ctx.restore();
  }
}

export { MINI as MINIMAP_SIZE };