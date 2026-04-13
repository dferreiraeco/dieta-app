// Carrega o index.html num sandbox VM com DOM stubado e expõe as funções puras
// da aplicação pra que os testes possam invocá-las sem browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createSandbox() {
  const stubEl = {
    addEventListener: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    innerHTML: '', textContent: '',
    setAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    parentElement: null,
    getBoundingClientRect: () => ({ top: 0, right: 0, left: 0, bottom: 0, width: 0, height: 0 }),
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    focus: () => {},
    value: '',
    checked: false,
    dataset: {},
  };
  stubEl.parentElement = stubEl;

  const localStorage_ = {
    _s: {},
    getItem(k) { return this._s[k] !== undefined ? this._s[k] : null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
    clear() { this._s = {}; },
    get length() { return Object.keys(this._s).length; },
    key(i) { return Object.keys(this._s)[i] || null; },
  };

  const firebaseStub = {
    initializeApp: () => ({}),
    auth: Object.assign(
      () => ({
        onAuthStateChanged: () => {},
        signOut: () => Promise.resolve(),
        currentUser: null,
      }),
      { GoogleAuthProvider: function() {} }
    ),
    firestore: Object.assign(
      () => ({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              onSnapshot: () => ({}),
              doc: () => ({
                set: () => Promise.resolve(),
                delete: () => Promise.resolve(),
                get: () => Promise.resolve({ exists: false, data: () => ({}) }),
              }),
            }),
            set: () => Promise.resolve(),
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
          }),
        }),
        enablePersistence: () => Promise.resolve(),
        batch: () => ({ set: () => {}, commit: () => Promise.resolve() }),
      }),
      { FieldValue: { serverTimestamp: () => null } }
    ),
  };

  const sandbox = {
    console, JSON, Math, Date, Object, Array, Number, String, Boolean, Error, Promise,
    Symbol, Map, Set, RegExp, parseFloat, parseInt, isNaN, isFinite, encodeURIComponent,
    decodeURIComponent,
    document: {
      getElementById: () => stubEl,
      querySelectorAll: () => [],
      querySelector: () => stubEl,
      addEventListener: () => {},
      createElement: () => stubEl,
      body: stubEl,
      documentElement: stubEl,
      head: { appendChild: () => {} },
    },
    localStorage: localStorage_,
    navigator: {
      serviceWorker: { register: () => Promise.resolve() },
      onLine: true,
      canShare: () => false,
      share: () => Promise.resolve(),
    },
    location: { hash: '', search: '', pathname: '/', reload: () => {}, href: '' },
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    firebase: firebaseStub,
    history: { replaceState: () => {}, pushState: () => {} },
    alert: () => {},
    confirm: () => true,
    prompt: () => '',
    requestAnimationFrame: (cb) => { try { cb(0); } catch (e) {} return 0; },
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    Blob: function() {},
    File: function() {},
    FileReader: function() { return { readAsText: () => {}, onload: null }; },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function loadApp(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const projectDir = path.dirname(htmlPath);

  // 1. Carrega arquivos externos <script src="..."> (relativos ao projeto, ignora CDN http(s))
  const srcMatches = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/g)];
  const externalJs = [];
  for (const m of srcMatches) {
    const src = m[1];
    if (src.startsWith('http://') || src.startsWith('https://')) continue;
    const localPath = path.join(projectDir, src.split('?')[0]);
    if (fs.existsSync(localPath)) {
      externalJs.push(fs.readFileSync(localPath, 'utf8'));
    }
  }

  // 2. Carrega scripts inline
  const scripts = html.match(/<script(?!\s+src)[^>]*>([\s\S]*?)<\/script>/g) || [];
  const inlineJs = scripts
    .map(s => s.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''))
    .join('\n');

  // 3. Concatena em ordem: externos primeiro, depois inline (mesma ordem do navegador)
  let js = externalJs.join('\n') + '\n' + inlineJs;

  // Expor símbolos internos para os testes
  js += `
;window.__APP__ = {
  computeMenuFromStock,
  computeIngredientNeeds,
  computeAromatics,
  buildFruitBuySuggestions,
  BREAKFAST_BASELINE,
  INGREDIENTS,
  MARMITA_DEFS,
  DINNER_DEFS,
  GEN_PROTEINS,
  GEN_CARBS,
  GEN_DINNER_PROTEINS,
  GEN_SHARED_DINNER_PROTEINS,
  GEN_DINNER_OTHERS,
  GEN_SNACKS,
  GEN_FRUITS,
  FRUIT_WEEKLY_CARB_NEED,
  FRUIT_AVG_CARB,
};`;

  const sandbox = createSandbox();
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { filename: 'app.js', timeout: 5000 });
  return sandbox.__APP__;
}

// Mini test harness — zero dependencies
class TestHarness {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
  }

  test(name, fn) {
    try {
      fn();
      console.log('  \u2713 ' + name);
      this.passed++;
    } catch (e) {
      console.log('  \u2717 ' + name);
      console.log('    ' + (e.message || e));
      this.failures.push({ name, error: e });
      this.failed++;
    }
  }

  describe(group, fn) {
    console.log('\n' + group);
    fn();
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    const total = this.passed + this.failed;
    if (this.failed === 0) {
      console.log(`\u2713 ${this.passed}/${total} tests passed`);
      return 0;
    } else {
      console.log(`\u2717 ${this.failed}/${total} tests failed`);
      return 1;
    }
  }
}

// Helpers para assertions
function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg || 'Deep assertion failed'}:\n  expected ${e}\n  got      ${a}`);
  }
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

module.exports = { loadApp, TestHarness, assertEq, assertDeepEq, assertTrue };
