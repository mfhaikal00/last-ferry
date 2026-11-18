// Last Ferry — Salt Harbor.
// HUD, title menu, pause panel and mission card. The HUD is the only system that
// writes DOM text: objectives, wanted stars, dialogue, speed, ammo, cash, the
// minimap canvas and the interaction prompt.

export class Hud {
  constructor(options = {}) {
    this.onStart = options.onStart ?? (() => {});
    this.onResume = options.onResume ?? (() => {});
    this.onSave = options.onSave ?? (() => {});
    this.onQuit = options.onQuit ?? (() => {});
    this.onMissionContinue = options.onMissionContinue ?? (() => {});
    this.dialogueTimer = 0;
    this.toastTimer = 0;
    this.damageTimer = 0;
    this.controlsOpen = false;
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
      <div id="load-text">Loading Salt Harbor</div>
    `;
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
      <div class="bottom-left">
        <div id="dialogue"><span class="speaker"></span><p></p></div>
      </div>
      <div class="bottom-right">
        <div id="speed"><b>0</b><span>KM/H</span></div>
        <div class="meter-row" id="health-row"><label>HEALTH</label><div class="meter"><i id="health-bar"></i></div><b id="health-value">100</b></div>
        <div class="statline"><span>AMMO <b id="ammo">30 / 90</b></span><span>$ <b id="cash">120</b></span></div>
      </div>
      <div id="interact"></div>
      <div id="toast"></div>
      <div id="crosshair"><i></i></div>
      <div id="damage"></div>
    `;
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
    this.interaction = '';
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
            <span><kbd>Left click</kbd> Fire</span>
            <span><kbd>Esc</kbd> Pause</span>
            <span><kbd>M</kbd> Replay the run</span>
          </div>
        </div>
        <div class="title-foot">Salt Harbor · 30 FPS target · Plays offline</div>
      </div>
    `;
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
          <button id="btn-save">Save game</button>
          <button id="btn-title">Back to title</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.pauseScreen = el;
    el.querySelector('#btn-resume').addEventListener('click', () => this.onResume());
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
      </div>
    `;
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

  setMoney(value) {
    this.cash.textContent = String(value);
  }

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

  setCrosshair(visible) {
    this.crosshair.classList.toggle('show', visible);
  }

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

  showPause(visible) {
    this.pauseScreen.classList.toggle('hidden', !visible);
  }

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