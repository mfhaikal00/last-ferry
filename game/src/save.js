// Last Ferry — Salt Harbor.
// Save and resume. localStorage is optional in private windows; every call
// degrades to an in-memory no-op rather than blocking the game.

const KEY = 'lastFerry.save.v1';

export class SaveSystem {
  constructor() {
    this.memory = null;
  }

  read() {
    try {
      const text = localStorage.getItem(KEY);
      if (!text) return null;
      const data = JSON.parse(text);
      if (!data || data.version !== 1) return null;
      return data;
    } catch {
      return this.memory;
    }
  }

  write(state) {
    const data = { ...state, version: 1, savedAt: new Date().toISOString() };
    this.memory = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    this.memory = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
  }

  summary() {
    const data = this.read();
    if (!data) return '';
    const money = data.money ?? 0;
    return `$${money} · ${data.district ?? 'Salt Harbor'}`;
  }
}