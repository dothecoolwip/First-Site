// ESLint flat config for the game modules (build_cache/game.js = src/js/*.js in one IIFE, as shipped).
// Catches undefined names, duplicate declarations/keys and other mistakes a concatenated bundle hides.
const browser = ['window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage', 'performance', 'console',
  'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone',
  'atob', 'btoa', 'fetch', 'Image', 'Audio', 'AudioContext', 'webkitAudioContext', 'OfflineAudioContext', 'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams',
  'speechSynthesis', 'SpeechSynthesisUtterance', 'OffscreenCanvas', 'HTMLCanvasElement', 'HTMLElement', 'Element', 'Node', 'getComputedStyle', 'matchMedia',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'TextDecoder', 'TextEncoder', 'createImageBitmap', 'ImageData', 'Event', 'CustomEvent', 'KeyboardEvent',
  'PointerEvent', 'ResizeObserver', 'MutationObserver', 'IntersectionObserver', 'addEventListener', 'removeEventListener', 'alert', 'confirm', 'caches', 'self',
  'Response', 'Request', 'Headers', 'DOMParser', 'XMLSerializer', 'AbortController', 'crypto', 'indexedDB', 'Notification', 'visualViewport', 'ClipboardItem', 'Path2D'];
const data = ['THREE', 'SFX_B64', 'UAL_GLB', 'GLTFX', 'SkelUtils', 'SFX_FILES', 'ASSET_GEO', 'FANTASY_GEO', 'VILLAGE_GEO', 'KENNEY_GEO', 'PACK_GEO', 'DECOR_GEO', 'DECOR_META', 'OUTFIT_GEO', 'WSKIN_GEO', 'REALM_GEO', 'ANIMAL_GLB', 'CASTLE_GEO', 'VFX_IMG'];
const globals = Object.fromEntries([...browser, ...data].map(k => [k, 'readonly']));
module.exports = [{
  files: ['build_cache/game.js'],
  languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals },
  linterOptions: { reportUnusedDisableDirectives: 'off' },
  rules: {
    'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-dupe-args': 'error', 'no-const-assign': 'error',
    'no-func-assign': 'error', 'no-unreachable': 'error', 'no-self-assign': 'error', 'no-dupe-else-if': 'error', 'no-duplicate-case': 'error',
    'no-unsafe-negation': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-sparse-arrays': 'error', 'no-loss-of-precision': 'error',
    'no-compare-neg-zero': 'error', 'no-cond-assign': ['error', 'except-parens'], 'no-unsafe-finally': 'error', 'getter-return': 'error',
  },
}];
