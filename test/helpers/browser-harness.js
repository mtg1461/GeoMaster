const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..", "..");

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.values = new Set();
  }

  add(...tokens) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens) {
    tokens.forEach((token) => this.values.delete(token));
  }

  contains(token) {
    return this.values.has(token);
  }

  toggle(token, force) {
    const shouldAdd = force === undefined ? !this.values.has(token) : Boolean(force);

    if (shouldAdd) {
      this.values.add(token);
    } else {
      this.values.delete(token);
    }

    return shouldAdd;
  }

  replaceFromString(value) {
    this.values = new Set(String(value).split(/\s+/u).filter(Boolean));
  }

  toString() {
    return [...this.values].join(" ");
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.eventListeners = new Map();
    this.style = {
      values: new Map(),
      setProperty: (name, value) => this.style.values.set(name, value),
    };
    this._textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.type = "";
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList.replaceFromString(value);
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent || "").join("");
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get ariaLabel() {
    return this.getAttribute("aria-label") || "";
  }

  set ariaLabel(value) {
    this.setAttribute("aria-label", value);
  }

  get alt() {
    return this.getAttribute("alt") ?? "";
  }

  set alt(value) {
    this.setAttribute("alt", value);
  }

  get src() {
    return this.getAttribute("src") ?? "";
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  appendChild(node) {
    this._textContent = "";
    this.children.push(node);
    node.parentElement = this;
    return node;
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentElement = null;
    });
    this.children = [];
    this._textContent = "";
    this.append(...nodes);
  }

  setAttribute(name, value) {
    if (name === "class") {
      this.className = value;
      return;
    }

    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    if (name === "class") {
      return this.className;
    }

    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    this.eventListeners.set(type, listeners.filter((candidate) => candidate !== listener));
  }

  dispatch(type, overrides = {}) {
    const event = {
      currentTarget: this,
      preventDefault() {},
      target: this,
      type,
      ...overrides,
    };

    (this.eventListeners.get(type) || []).forEach((listener) => listener(event));
    return event;
  }

  click() {
    return this.dispatch("click");
  }

  focus() {
    this.focused = true;
  }

  matches(selector) {
    if (selector.startsWith(".")) {
      return this.classList.contains(selector.slice(1));
    }

    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelectorAll(selector) {
    const matches = [];

    for (const child of this.children) {
      if (child.matches(selector)) {
        matches.push(child);
      }
      matches.push(...child.querySelectorAll(selector));
    }

    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

function createDocument() {
  return {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
}

function createElements() {
  const elementNames = [
    "answerPanel",
    "choicePanel",
    "gameMode",
    "guess",
    "guessField",
    "guessPanel",
    "guessPrompt",
    "hint",
    "mapClickPrompt",
    "submit",
  ];

  return Object.fromEntries(elementNames.map((name) => [name, new FakeElement("div")]));
}

function loadBrowserScripts(relativePaths, { document = createDocument(), window = {} } = {}) {
  window.GeoMaster = window.GeoMaster || {};
  window.document = document;
  window.requestAnimationFrame = window.requestAnimationFrame || ((callback) => callback());
  window.setTimeout = window.setTimeout || setTimeout;

  const context = vm.createContext({
    clearTimeout,
    console,
    document,
    setTimeout,
    window,
  });

  for (const relativePath of relativePaths) {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    vm.runInContext(source, context, { filename: relativePath });
  }

  return { context, document, window };
}

module.exports = {
  FakeElement,
  createDocument,
  createElements,
  loadBrowserScripts,
  projectRoot,
};
