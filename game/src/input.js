// Last Ferry — Salt Harbor.
// Keyboard and mouse input. Pointer lock drives the third-person camera;
// one-shot key presses are consumed by the gameplay layer each frame.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { dx: 0, dy: 0, wheel: 0, left: false, right: false, clicked: false };
    this.locked = false;
    this.enabled = true;

    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
      if (event.code === 'MouseLeft') this.mouse.left = false;
    });
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled) return;
      if (!this.locked) {
        this.requestLock();
        return;
      }
      if (event.button === 0) { this.mouse.left = true; this.mouse.clicked = true; }
      if (event.button === 2) this.mouse.right = true;
    });
    canvas.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouse.left = false;
      if (event.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.mouse.dx += event.movementX;
      this.mouse.dy += event.movementY;
    });
    window.addEventListener('wheel', (event) => {
      if (this.locked) this.mouse.wheel += Math.sign(event.deltaY);
    }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) {
        this.down.clear();
        this.mouse.left = false;
        this.mouse.right = false;
      }
    });
  }

  requestLock() {
    if (this.locked) return;
    try {
      const result = this.canvas.requestPointerLock?.();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // Pointer lock can be refused by the browser; the game stays keyboard-playable.
    }
  }

  release() {
    if (this.locked) document.exitPointerLock?.();
  }

  isDown(code) {
    return this.down.has(code);
  }

  consume(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  consumeClick() {
    if (!this.mouse.clicked) return false;
    this.mouse.clicked = false;
    return true;
  }

  takeLook() {
    const dx = this.mouse.dx;
    const dy = this.mouse.dy;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.wheel = 0;
    this.mouse.clicked = false;
  }
}