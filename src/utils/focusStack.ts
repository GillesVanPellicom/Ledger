type FocusLayer = {
  id: string;
  onEnter?: () => void;
};

class FocusStack {
  private stack: FocusLayer[] = [];
  private listeners: (() => void)[] = [];

  push(layer: FocusLayer) {
    // Remove if already exists to avoid duplicates and move to top
    this.stack = this.stack.filter(l => l.id !== layer.id);
    this.stack.push(layer);
    this.notify();
  }

  remove(id: string) {
    this.stack = this.stack.filter(l => l.id !== id);
    this.notify();
  }

  isTop(id: string) {
    return this.stack.length > 0 && this.stack.at(-1).id === id;
  }

  getTop() {
    return this.stack.length > 0 ? this.stack.at(-1) : null;
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const focusStack = new FocusStack();
