// modules/historyManager.js

import { EventBus } from "./eventBus.js";

const History = {
  stack: [],
  index: -1,
  maxSize: 50,

  init(cfg) {
    this.maxSize = cfg?.history?.max_size ?? 50;
    this.stack = [];
    this.index = -1;
  },

  // Build a formidable:// link for storage entry
  makeLink(template, storageEntry) {
    return `formidable://${template}:${storageEntry}`;
  },

  add(template, storageEntry) {
    const link = this.makeLink(template, storageEntry);
    // prevent duplicate push when same link
    if (this.stack[this.index] === link) return;

    // truncate forward history if navigating fresh
    this.stack = this.stack.slice(0, this.index + 1);

    this.stack.push(link);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.index++;
    }

    EventBus.emit("history:state", {
      canBack: this.canBack(),
      canForward: this.canForward(),
    });
  },

  back() {
    if (this.canBack()) {
      this.index--;
      return this.stack[this.index];
    }
    return null;
  },

  forward() {
    if (this.canForward()) {
      this.index++;
      return this.stack[this.index];
    }
    return null;
  },

  canBack() {
    return this.index > 0;
  },

  canForward() {
    return this.index < this.stack.length - 1;
  },
};

export { History };
