var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { g as getStore, o as onStoreChanged, f as clearAll, i as importData, h as updateSettings, j as deleteOptionSet, c as upsertOptionSet, k as deleteQA, l as upsertManyQA, u as upsertQA, m as updateProfile } from "./storage-DrgdSKCL.js";
import { n as loadSeedCatalog, g as getAdapter, s as saveDocument, u as updateDocument, o as splitTitle } from "./seed-CEX56cSr.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReact_production_min;
function requireReact_production_min() {
  if (hasRequiredReact_production_min) return react_production_min;
  hasRequiredReact_production_min = 1;
  var l = Symbol.for("react.element"), n = Symbol.for("react.portal"), p = Symbol.for("react.fragment"), q = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z = Symbol.iterator;
  function A(a) {
    if (null === a || "object" !== typeof a) return null;
    a = z && a[z] || a["@@iterator"];
    return "function" === typeof a ? a : null;
  }
  var B = { isMounted: function() {
    return false;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, C = Object.assign, D = {};
  function E(a, b, e) {
    this.props = a;
    this.context = b;
    this.refs = D;
    this.updater = e || B;
  }
  E.prototype.isReactComponent = {};
  E.prototype.setState = function(a, b) {
    if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, a, b, "setState");
  };
  E.prototype.forceUpdate = function(a) {
    this.updater.enqueueForceUpdate(this, a, "forceUpdate");
  };
  function F() {
  }
  F.prototype = E.prototype;
  function G(a, b, e) {
    this.props = a;
    this.context = b;
    this.refs = D;
    this.updater = e || B;
  }
  var H = G.prototype = new F();
  H.constructor = G;
  C(H, E.prototype);
  H.isPureReactComponent = true;
  var I = Array.isArray, J = Object.prototype.hasOwnProperty, K = { current: null }, L = { key: true, ref: true, __self: true, __source: true };
  function M(a, b, e) {
    var d, c = {}, k = null, h = null;
    if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
    var g = arguments.length - 2;
    if (1 === g) c.children = e;
    else if (1 < g) {
      for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
      c.children = f;
    }
    if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
    return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
  }
  function N(a, b) {
    return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
  }
  function O(a) {
    return "object" === typeof a && null !== a && a.$$typeof === l;
  }
  function escape(a) {
    var b = { "=": "=0", ":": "=2" };
    return "$" + a.replace(/[=:]/g, function(a2) {
      return b[a2];
    });
  }
  var P = /\/+/g;
  function Q(a, b) {
    return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
  }
  function R(a, b, e, d, c) {
    var k = typeof a;
    if ("undefined" === k || "boolean" === k) a = null;
    var h = false;
    if (null === a) h = true;
    else switch (k) {
      case "string":
      case "number":
        h = true;
        break;
      case "object":
        switch (a.$$typeof) {
          case l:
          case n:
            h = true;
        }
    }
    if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
      return a2;
    })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
    h = 0;
    d = "" === d ? "." : d + ":";
    if (I(a)) for (var g = 0; g < a.length; g++) {
      k = a[g];
      var f = d + Q(k, g);
      h += R(k, b, e, f, c);
    }
    else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
    else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
    return h;
  }
  function S(a, b, e) {
    if (null == a) return a;
    var d = [], c = 0;
    R(a, d, "", "", function(a2) {
      return b.call(e, a2, c++);
    });
    return d;
  }
  function T(a) {
    if (-1 === a._status) {
      var b = a._result;
      b = b();
      b.then(function(b2) {
        if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
      }, function(b2) {
        if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
      });
      -1 === a._status && (a._status = 0, a._result = b);
    }
    if (1 === a._status) return a._result.default;
    throw a._result;
  }
  var U = { current: null }, V = { transition: null }, W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
  function X() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  react_production_min.Children = { map: S, forEach: function(a, b, e) {
    S(a, function() {
      b.apply(this, arguments);
    }, e);
  }, count: function(a) {
    var b = 0;
    S(a, function() {
      b++;
    });
    return b;
  }, toArray: function(a) {
    return S(a, function(a2) {
      return a2;
    }) || [];
  }, only: function(a) {
    if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
    return a;
  } };
  react_production_min.Component = E;
  react_production_min.Fragment = p;
  react_production_min.Profiler = r;
  react_production_min.PureComponent = G;
  react_production_min.StrictMode = q;
  react_production_min.Suspense = w;
  react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
  react_production_min.act = X;
  react_production_min.cloneElement = function(a, b, e) {
    if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
    var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
    if (null != b) {
      void 0 !== b.ref && (k = b.ref, h = K.current);
      void 0 !== b.key && (c = "" + b.key);
      if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
      for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
    }
    var f = arguments.length - 2;
    if (1 === f) d.children = e;
    else if (1 < f) {
      g = Array(f);
      for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
      d.children = g;
    }
    return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
  };
  react_production_min.createContext = function(a) {
    a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
    a.Provider = { $$typeof: t, _context: a };
    return a.Consumer = a;
  };
  react_production_min.createElement = M;
  react_production_min.createFactory = function(a) {
    var b = M.bind(null, a);
    b.type = a;
    return b;
  };
  react_production_min.createRef = function() {
    return { current: null };
  };
  react_production_min.forwardRef = function(a) {
    return { $$typeof: v, render: a };
  };
  react_production_min.isValidElement = O;
  react_production_min.lazy = function(a) {
    return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
  };
  react_production_min.memo = function(a, b) {
    return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
  };
  react_production_min.startTransition = function(a) {
    var b = V.transition;
    V.transition = {};
    try {
      a();
    } finally {
      V.transition = b;
    }
  };
  react_production_min.unstable_act = X;
  react_production_min.useCallback = function(a, b) {
    return U.current.useCallback(a, b);
  };
  react_production_min.useContext = function(a) {
    return U.current.useContext(a);
  };
  react_production_min.useDebugValue = function() {
  };
  react_production_min.useDeferredValue = function(a) {
    return U.current.useDeferredValue(a);
  };
  react_production_min.useEffect = function(a, b) {
    return U.current.useEffect(a, b);
  };
  react_production_min.useId = function() {
    return U.current.useId();
  };
  react_production_min.useImperativeHandle = function(a, b, e) {
    return U.current.useImperativeHandle(a, b, e);
  };
  react_production_min.useInsertionEffect = function(a, b) {
    return U.current.useInsertionEffect(a, b);
  };
  react_production_min.useLayoutEffect = function(a, b) {
    return U.current.useLayoutEffect(a, b);
  };
  react_production_min.useMemo = function(a, b) {
    return U.current.useMemo(a, b);
  };
  react_production_min.useReducer = function(a, b, e) {
    return U.current.useReducer(a, b, e);
  };
  react_production_min.useRef = function(a) {
    return U.current.useRef(a);
  };
  react_production_min.useState = function(a) {
    return U.current.useState(a);
  };
  react_production_min.useSyncExternalStore = function(a, b, e) {
    return U.current.useSyncExternalStore(a, b, e);
  };
  react_production_min.useTransition = function() {
    return U.current.useTransition();
  };
  react_production_min.version = "18.3.1";
  return react_production_min;
}
var hasRequiredReact;
function requireReact() {
  if (hasRequiredReact) return react.exports;
  hasRequiredReact = 1;
  {
    react.exports = requireReact_production_min();
  }
  return react.exports;
}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactJsxRuntime_production_min;
function requireReactJsxRuntime_production_min() {
  if (hasRequiredReactJsxRuntime_production_min) return reactJsxRuntime_production_min;
  hasRequiredReactJsxRuntime_production_min = 1;
  var f = requireReact(), k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p = { key: true, ref: true, __self: true, __source: true };
  function q(c, a, g) {
    var b, d = {}, e = null, h = null;
    void 0 !== g && (e = "" + g);
    void 0 !== a.key && (e = "" + a.key);
    void 0 !== a.ref && (h = a.ref);
    for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
    if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
    return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
  }
  reactJsxRuntime_production_min.Fragment = l;
  reactJsxRuntime_production_min.jsx = q;
  reactJsxRuntime_production_min.jsxs = q;
  return reactJsxRuntime_production_min;
}
var hasRequiredJsxRuntime;
function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  {
    jsxRuntime.exports = requireReactJsxRuntime_production_min();
  }
  return jsxRuntime.exports;
}
var jsxRuntimeExports = requireJsxRuntime();
var reactExports = requireReact();
var client = {};
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredScheduler_production_min;
function requireScheduler_production_min() {
  if (hasRequiredScheduler_production_min) return scheduler_production_min;
  hasRequiredScheduler_production_min = 1;
  (function(exports) {
    function f(a, b) {
      var c = a.length;
      a.push(b);
      a: for (; 0 < c; ) {
        var d = c - 1 >>> 1, e = a[d];
        if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;
        else break a;
      }
    }
    function h(a) {
      return 0 === a.length ? null : a[0];
    }
    function k(a) {
      if (0 === a.length) return null;
      var b = a[0], c = a.pop();
      if (c !== b) {
        a[0] = c;
        a: for (var d = 0, e = a.length, w = e >>> 1; d < w; ) {
          var m = 2 * (d + 1) - 1, C = a[m], n = m + 1, x = a[n];
          if (0 > g(C, c)) n < e && 0 > g(x, C) ? (a[d] = x, a[n] = c, d = n) : (a[d] = C, a[m] = c, d = m);
          else if (n < e && 0 > g(x, c)) a[d] = x, a[n] = c, d = n;
          else break a;
        }
      }
      return b;
    }
    function g(a, b) {
      var c = a.sortIndex - b.sortIndex;
      return 0 !== c ? c : a.id - b.id;
    }
    if ("object" === typeof performance && "function" === typeof performance.now) {
      var l = performance;
      exports.unstable_now = function() {
        return l.now();
      };
    } else {
      var p = Date, q = p.now();
      exports.unstable_now = function() {
        return p.now() - q;
      };
    }
    var r = [], t = [], u = 1, v = null, y = 3, z = false, A = false, B = false, D = "function" === typeof setTimeout ? setTimeout : null, E = "function" === typeof clearTimeout ? clearTimeout : null, F = "undefined" !== typeof setImmediate ? setImmediate : null;
    "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function G(a) {
      for (var b = h(t); null !== b; ) {
        if (null === b.callback) k(t);
        else if (b.startTime <= a) k(t), b.sortIndex = b.expirationTime, f(r, b);
        else break;
        b = h(t);
      }
    }
    function H(a) {
      B = false;
      G(a);
      if (!A) if (null !== h(r)) A = true, I(J);
      else {
        var b = h(t);
        null !== b && K(H, b.startTime - a);
      }
    }
    function J(a, b) {
      A = false;
      B && (B = false, E(L), L = -1);
      z = true;
      var c = y;
      try {
        G(b);
        for (v = h(r); null !== v && (!(v.expirationTime > b) || a && !M()); ) {
          var d = v.callback;
          if ("function" === typeof d) {
            v.callback = null;
            y = v.priorityLevel;
            var e = d(v.expirationTime <= b);
            b = exports.unstable_now();
            "function" === typeof e ? v.callback = e : v === h(r) && k(r);
            G(b);
          } else k(r);
          v = h(r);
        }
        if (null !== v) var w = true;
        else {
          var m = h(t);
          null !== m && K(H, m.startTime - b);
          w = false;
        }
        return w;
      } finally {
        v = null, y = c, z = false;
      }
    }
    var N = false, O = null, L = -1, P = 5, Q = -1;
    function M() {
      return exports.unstable_now() - Q < P ? false : true;
    }
    function R() {
      if (null !== O) {
        var a = exports.unstable_now();
        Q = a;
        var b = true;
        try {
          b = O(true, a);
        } finally {
          b ? S() : (N = false, O = null);
        }
      } else N = false;
    }
    var S;
    if ("function" === typeof F) S = function() {
      F(R);
    };
    else if ("undefined" !== typeof MessageChannel) {
      var T = new MessageChannel(), U = T.port2;
      T.port1.onmessage = R;
      S = function() {
        U.postMessage(null);
      };
    } else S = function() {
      D(R, 0);
    };
    function I(a) {
      O = a;
      N || (N = true, S());
    }
    function K(a, b) {
      L = D(function() {
        a(exports.unstable_now());
      }, b);
    }
    exports.unstable_IdlePriority = 5;
    exports.unstable_ImmediatePriority = 1;
    exports.unstable_LowPriority = 4;
    exports.unstable_NormalPriority = 3;
    exports.unstable_Profiling = null;
    exports.unstable_UserBlockingPriority = 2;
    exports.unstable_cancelCallback = function(a) {
      a.callback = null;
    };
    exports.unstable_continueExecution = function() {
      A || z || (A = true, I(J));
    };
    exports.unstable_forceFrameRate = function(a) {
      0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P = 0 < a ? Math.floor(1e3 / a) : 5;
    };
    exports.unstable_getCurrentPriorityLevel = function() {
      return y;
    };
    exports.unstable_getFirstCallbackNode = function() {
      return h(r);
    };
    exports.unstable_next = function(a) {
      switch (y) {
        case 1:
        case 2:
        case 3:
          var b = 3;
          break;
        default:
          b = y;
      }
      var c = y;
      y = b;
      try {
        return a();
      } finally {
        y = c;
      }
    };
    exports.unstable_pauseExecution = function() {
    };
    exports.unstable_requestPaint = function() {
    };
    exports.unstable_runWithPriority = function(a, b) {
      switch (a) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          a = 3;
      }
      var c = y;
      y = a;
      try {
        return b();
      } finally {
        y = c;
      }
    };
    exports.unstable_scheduleCallback = function(a, b, c) {
      var d = exports.unstable_now();
      "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
      switch (a) {
        case 1:
          var e = -1;
          break;
        case 2:
          e = 250;
          break;
        case 5:
          e = 1073741823;
          break;
        case 4:
          e = 1e4;
          break;
        default:
          e = 5e3;
      }
      e = c + e;
      a = { id: u++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
      c > d ? (a.sortIndex = c, f(t, a), null === h(r) && a === h(t) && (B ? (E(L), L = -1) : B = true, K(H, c - d))) : (a.sortIndex = e, f(r, a), A || z || (A = true, I(J)));
      return a;
    };
    exports.unstable_shouldYield = M;
    exports.unstable_wrapCallback = function(a) {
      var b = y;
      return function() {
        var c = y;
        y = b;
        try {
          return a.apply(this, arguments);
        } finally {
          y = c;
        }
      };
    };
  })(scheduler_production_min);
  return scheduler_production_min;
}
var hasRequiredScheduler;
function requireScheduler() {
  if (hasRequiredScheduler) return scheduler.exports;
  hasRequiredScheduler = 1;
  {
    scheduler.exports = requireScheduler_production_min();
  }
  return scheduler.exports;
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactDom_production_min;
function requireReactDom_production_min() {
  if (hasRequiredReactDom_production_min) return reactDom_production_min;
  hasRequiredReactDom_production_min = 1;
  var aa = requireReact(), ca = requireScheduler();
  function p(a) {
    for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
    return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var da = /* @__PURE__ */ new Set(), ea = {};
  function fa(a, b) {
    ha(a, b);
    ha(a + "Capture", b);
  }
  function ha(a, b) {
    ea[a] = b;
    for (a = 0; a < b.length; a++) da.add(b[a]);
  }
  var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
  function oa(a) {
    if (ja.call(ma, a)) return true;
    if (ja.call(la, a)) return false;
    if (ka.test(a)) return ma[a] = true;
    la[a] = true;
    return false;
  }
  function pa(a, b, c, d) {
    if (null !== c && 0 === c.type) return false;
    switch (typeof b) {
      case "function":
      case "symbol":
        return true;
      case "boolean":
        if (d) return false;
        if (null !== c) return !c.acceptsBooleans;
        a = a.toLowerCase().slice(0, 5);
        return "data-" !== a && "aria-" !== a;
      default:
        return false;
    }
  }
  function qa(a, b, c, d) {
    if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return true;
    if (d) return false;
    if (null !== c) switch (c.type) {
      case 3:
        return !b;
      case 4:
        return false === b;
      case 5:
        return isNaN(b);
      case 6:
        return isNaN(b) || 1 > b;
    }
    return false;
  }
  function v(a, b, c, d, e, f, g) {
    this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
    this.attributeName = d;
    this.attributeNamespace = e;
    this.mustUseProperty = c;
    this.propertyName = a;
    this.type = b;
    this.sanitizeURL = f;
    this.removeEmptyString = g;
  }
  var z = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
    z[a] = new v(a, 0, false, a, null, false, false);
  });
  [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
    var b = a[0];
    z[b] = new v(b, 1, false, a[1], null, false, false);
  });
  ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
    z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
  });
  ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
    z[a] = new v(a, 2, false, a, null, false, false);
  });
  "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
    z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
  });
  ["checked", "multiple", "muted", "selected"].forEach(function(a) {
    z[a] = new v(a, 3, true, a, null, false, false);
  });
  ["capture", "download"].forEach(function(a) {
    z[a] = new v(a, 4, false, a, null, false, false);
  });
  ["cols", "rows", "size", "span"].forEach(function(a) {
    z[a] = new v(a, 6, false, a, null, false, false);
  });
  ["rowSpan", "start"].forEach(function(a) {
    z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
  });
  var ra = /[\-:]([a-z])/g;
  function sa(a) {
    return a[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
    var b = a.replace(
      ra,
      sa
    );
    z[b] = new v(b, 1, false, a, null, false, false);
  });
  "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
    var b = a.replace(ra, sa);
    z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
  });
  ["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
    var b = a.replace(ra, sa);
    z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
  });
  ["tabIndex", "crossOrigin"].forEach(function(a) {
    z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
  });
  z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
  ["src", "href", "action", "formAction"].forEach(function(a) {
    z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
  });
  function ta(a, b, c, d) {
    var e = z.hasOwnProperty(b) ? z[b] : null;
    if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
  }
  var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
  var Ia = Symbol.for("react.offscreen");
  var Ja = Symbol.iterator;
  function Ka(a) {
    if (null === a || "object" !== typeof a) return null;
    a = Ja && a[Ja] || a["@@iterator"];
    return "function" === typeof a ? a : null;
  }
  var A = Object.assign, La;
  function Ma(a) {
    if (void 0 === La) try {
      throw Error();
    } catch (c) {
      var b = c.stack.trim().match(/\n( *(at )?)/);
      La = b && b[1] || "";
    }
    return "\n" + La + a;
  }
  var Na = false;
  function Oa(a, b) {
    if (!a || Na) return "";
    Na = true;
    var c = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (b) if (b = function() {
        throw Error();
      }, Object.defineProperty(b.prototype, "props", { set: function() {
        throw Error();
      } }), "object" === typeof Reflect && Reflect.construct) {
        try {
          Reflect.construct(b, []);
        } catch (l) {
          var d = l;
        }
        Reflect.construct(a, [], b);
      } else {
        try {
          b.call();
        } catch (l) {
          d = l;
        }
        a.call(b.prototype);
      }
      else {
        try {
          throw Error();
        } catch (l) {
          d = l;
        }
        a();
      }
    } catch (l) {
      if (l && d && "string" === typeof l.stack) {
        for (var e = l.stack.split("\n"), f = d.stack.split("\n"), g = e.length - 1, h = f.length - 1; 1 <= g && 0 <= h && e[g] !== f[h]; ) h--;
        for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f[h]) {
          if (1 !== g || 1 !== h) {
            do
              if (g--, h--, 0 > h || e[g] !== f[h]) {
                var k = "\n" + e[g].replace(" at new ", " at ");
                a.displayName && k.includes("<anonymous>") && (k = k.replace("<anonymous>", a.displayName));
                return k;
              }
            while (1 <= g && 0 <= h);
          }
          break;
        }
      }
    } finally {
      Na = false, Error.prepareStackTrace = c;
    }
    return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
  }
  function Pa(a) {
    switch (a.tag) {
      case 5:
        return Ma(a.type);
      case 16:
        return Ma("Lazy");
      case 13:
        return Ma("Suspense");
      case 19:
        return Ma("SuspenseList");
      case 0:
      case 2:
      case 15:
        return a = Oa(a.type, false), a;
      case 11:
        return a = Oa(a.type.render, false), a;
      case 1:
        return a = Oa(a.type, true), a;
      default:
        return "";
    }
  }
  function Qa(a) {
    if (null == a) return null;
    if ("function" === typeof a) return a.displayName || a.name || null;
    if ("string" === typeof a) return a;
    switch (a) {
      case ya:
        return "Fragment";
      case wa:
        return "Portal";
      case Aa:
        return "Profiler";
      case za:
        return "StrictMode";
      case Ea:
        return "Suspense";
      case Fa:
        return "SuspenseList";
    }
    if ("object" === typeof a) switch (a.$$typeof) {
      case Ca:
        return (a.displayName || "Context") + ".Consumer";
      case Ba:
        return (a._context.displayName || "Context") + ".Provider";
      case Da:
        var b = a.render;
        a = a.displayName;
        a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
        return a;
      case Ga:
        return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
      case Ha:
        b = a._payload;
        a = a._init;
        try {
          return Qa(a(b));
        } catch (c) {
        }
    }
    return null;
  }
  function Ra(a) {
    var b = a.type;
    switch (a.tag) {
      case 24:
        return "Cache";
      case 9:
        return (b.displayName || "Context") + ".Consumer";
      case 10:
        return (b._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
      case 7:
        return "Fragment";
      case 5:
        return b;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return Qa(b);
      case 8:
        return b === za ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if ("function" === typeof b) return b.displayName || b.name || null;
        if ("string" === typeof b) return b;
    }
    return null;
  }
  function Sa(a) {
    switch (typeof a) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return a;
      case "object":
        return a;
      default:
        return "";
    }
  }
  function Ta(a) {
    var b = a.type;
    return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
  }
  function Ua(a) {
    var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
    if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
      var e = c.get, f = c.set;
      Object.defineProperty(a, b, { configurable: true, get: function() {
        return e.call(this);
      }, set: function(a2) {
        d = "" + a2;
        f.call(this, a2);
      } });
      Object.defineProperty(a, b, { enumerable: c.enumerable });
      return { getValue: function() {
        return d;
      }, setValue: function(a2) {
        d = "" + a2;
      }, stopTracking: function() {
        a._valueTracker = null;
        delete a[b];
      } };
    }
  }
  function Va(a) {
    a._valueTracker || (a._valueTracker = Ua(a));
  }
  function Wa(a) {
    if (!a) return false;
    var b = a._valueTracker;
    if (!b) return true;
    var c = b.getValue();
    var d = "";
    a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
    a = d;
    return a !== c ? (b.setValue(a), true) : false;
  }
  function Xa(a) {
    a = a || ("undefined" !== typeof document ? document : void 0);
    if ("undefined" === typeof a) return null;
    try {
      return a.activeElement || a.body;
    } catch (b) {
      return a.body;
    }
  }
  function Ya(a, b) {
    var c = b.checked;
    return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
  }
  function Za(a, b) {
    var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
    c = Sa(null != b.value ? b.value : c);
    a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
  }
  function ab(a, b) {
    b = b.checked;
    null != b && ta(a, "checked", b, false);
  }
  function bb(a, b) {
    ab(a, b);
    var c = Sa(b.value), d = b.type;
    if (null != c) if ("number" === d) {
      if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
    } else a.value !== "" + c && (a.value = "" + c);
    else if ("submit" === d || "reset" === d) {
      a.removeAttribute("value");
      return;
    }
    b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
    null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
  }
  function db(a, b, c) {
    if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
      var d = b.type;
      if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
      b = "" + a._wrapperState.initialValue;
      c || b === a.value || (a.value = b);
      a.defaultValue = b;
    }
    c = a.name;
    "" !== c && (a.name = "");
    a.defaultChecked = !!a._wrapperState.initialChecked;
    "" !== c && (a.name = c);
  }
  function cb(a, b, c) {
    if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
  }
  var eb = Array.isArray;
  function fb(a, b, c, d) {
    a = a.options;
    if (b) {
      b = {};
      for (var e = 0; e < c.length; e++) b["$" + c[e]] = true;
      for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
    } else {
      c = "" + Sa(c);
      b = null;
      for (e = 0; e < a.length; e++) {
        if (a[e].value === c) {
          a[e].selected = true;
          d && (a[e].defaultSelected = true);
          return;
        }
        null !== b || a[e].disabled || (b = a[e]);
      }
      null !== b && (b.selected = true);
    }
  }
  function gb(a, b) {
    if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
    return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
  }
  function hb(a, b) {
    var c = b.value;
    if (null == c) {
      c = b.children;
      b = b.defaultValue;
      if (null != c) {
        if (null != b) throw Error(p(92));
        if (eb(c)) {
          if (1 < c.length) throw Error(p(93));
          c = c[0];
        }
        b = c;
      }
      null == b && (b = "");
      c = b;
    }
    a._wrapperState = { initialValue: Sa(c) };
  }
  function ib(a, b) {
    var c = Sa(b.value), d = Sa(b.defaultValue);
    null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
    null != d && (a.defaultValue = "" + d);
  }
  function jb(a) {
    var b = a.textContent;
    b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
  }
  function kb(a) {
    switch (a) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function lb(a, b) {
    return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
  }
  var mb, nb = (function(a) {
    return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
      MSApp.execUnsafeLocalFunction(function() {
        return a(b, c, d, e);
      });
    } : a;
  })(function(a, b) {
    if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;
    else {
      mb = mb || document.createElement("div");
      mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
      for (b = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
      for (; b.firstChild; ) a.appendChild(b.firstChild);
    }
  });
  function ob(a, b) {
    if (b) {
      var c = a.firstChild;
      if (c && c === a.lastChild && 3 === c.nodeType) {
        c.nodeValue = b;
        return;
      }
    }
    a.textContent = b;
  }
  var pb = {
    animationIterationCount: true,
    aspectRatio: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    columns: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridArea: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowSpan: true,
    gridRowStart: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnSpan: true,
    gridColumnStart: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true
  }, qb = ["Webkit", "ms", "Moz", "O"];
  Object.keys(pb).forEach(function(a) {
    qb.forEach(function(b) {
      b = b + a.charAt(0).toUpperCase() + a.substring(1);
      pb[b] = pb[a];
    });
  });
  function rb(a, b, c) {
    return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
  }
  function sb(a, b) {
    a = a.style;
    for (var c in b) if (b.hasOwnProperty(c)) {
      var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
      "float" === c && (c = "cssFloat");
      d ? a.setProperty(c, e) : a[c] = e;
    }
  }
  var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
  function ub(a, b) {
    if (b) {
      if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
      if (null != b.dangerouslySetInnerHTML) {
        if (null != b.children) throw Error(p(60));
        if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
      }
      if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
    }
  }
  function vb(a, b) {
    if (-1 === a.indexOf("-")) return "string" === typeof b.is;
    switch (a) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return false;
      default:
        return true;
    }
  }
  var wb = null;
  function xb(a) {
    a = a.target || a.srcElement || window;
    a.correspondingUseElement && (a = a.correspondingUseElement);
    return 3 === a.nodeType ? a.parentNode : a;
  }
  var yb = null, zb = null, Ab = null;
  function Bb(a) {
    if (a = Cb(a)) {
      if ("function" !== typeof yb) throw Error(p(280));
      var b = a.stateNode;
      b && (b = Db(b), yb(a.stateNode, a.type, b));
    }
  }
  function Eb(a) {
    zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
  }
  function Fb() {
    if (zb) {
      var a = zb, b = Ab;
      Ab = zb = null;
      Bb(a);
      if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
    }
  }
  function Gb(a, b) {
    return a(b);
  }
  function Hb() {
  }
  var Ib = false;
  function Jb(a, b, c) {
    if (Ib) return a(b, c);
    Ib = true;
    try {
      return Gb(a, b, c);
    } finally {
      if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
    }
  }
  function Kb(a, b) {
    var c = a.stateNode;
    if (null === c) return null;
    var d = Db(c);
    if (null === d) return null;
    c = d[b];
    a: switch (b) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
        a = !d;
        break a;
      default:
        a = false;
    }
    if (a) return null;
    if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
    return c;
  }
  var Lb = false;
  if (ia) try {
    var Mb = {};
    Object.defineProperty(Mb, "passive", { get: function() {
      Lb = true;
    } });
    window.addEventListener("test", Mb, Mb);
    window.removeEventListener("test", Mb, Mb);
  } catch (a) {
    Lb = false;
  }
  function Nb(a, b, c, d, e, f, g, h, k) {
    var l = Array.prototype.slice.call(arguments, 3);
    try {
      b.apply(c, l);
    } catch (m) {
      this.onError(m);
    }
  }
  var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
    Ob = true;
    Pb = a;
  } };
  function Tb(a, b, c, d, e, f, g, h, k) {
    Ob = false;
    Pb = null;
    Nb.apply(Sb, arguments);
  }
  function Ub(a, b, c, d, e, f, g, h, k) {
    Tb.apply(this, arguments);
    if (Ob) {
      if (Ob) {
        var l = Pb;
        Ob = false;
        Pb = null;
      } else throw Error(p(198));
      Qb || (Qb = true, Rb = l);
    }
  }
  function Vb(a) {
    var b = a, c = a;
    if (a.alternate) for (; b.return; ) b = b.return;
    else {
      a = b;
      do
        b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
      while (a);
    }
    return 3 === b.tag ? c : null;
  }
  function Wb(a) {
    if (13 === a.tag) {
      var b = a.memoizedState;
      null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
      if (null !== b) return b.dehydrated;
    }
    return null;
  }
  function Xb(a) {
    if (Vb(a) !== a) throw Error(p(188));
  }
  function Yb(a) {
    var b = a.alternate;
    if (!b) {
      b = Vb(a);
      if (null === b) throw Error(p(188));
      return b !== a ? null : a;
    }
    for (var c = a, d = b; ; ) {
      var e = c.return;
      if (null === e) break;
      var f = e.alternate;
      if (null === f) {
        d = e.return;
        if (null !== d) {
          c = d;
          continue;
        }
        break;
      }
      if (e.child === f.child) {
        for (f = e.child; f; ) {
          if (f === c) return Xb(e), a;
          if (f === d) return Xb(e), b;
          f = f.sibling;
        }
        throw Error(p(188));
      }
      if (c.return !== d.return) c = e, d = f;
      else {
        for (var g = false, h = e.child; h; ) {
          if (h === c) {
            g = true;
            c = e;
            d = f;
            break;
          }
          if (h === d) {
            g = true;
            d = e;
            c = f;
            break;
          }
          h = h.sibling;
        }
        if (!g) {
          for (h = f.child; h; ) {
            if (h === c) {
              g = true;
              c = f;
              d = e;
              break;
            }
            if (h === d) {
              g = true;
              d = f;
              c = e;
              break;
            }
            h = h.sibling;
          }
          if (!g) throw Error(p(189));
        }
      }
      if (c.alternate !== d) throw Error(p(190));
    }
    if (3 !== c.tag) throw Error(p(188));
    return c.stateNode.current === c ? a : b;
  }
  function Zb(a) {
    a = Yb(a);
    return null !== a ? $b(a) : null;
  }
  function $b(a) {
    if (5 === a.tag || 6 === a.tag) return a;
    for (a = a.child; null !== a; ) {
      var b = $b(a);
      if (null !== b) return b;
      a = a.sibling;
    }
    return null;
  }
  var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
  function mc(a) {
    if (lc && "function" === typeof lc.onCommitFiberRoot) try {
      lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
    } catch (b) {
    }
  }
  var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
  function nc(a) {
    a >>>= 0;
    return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
  }
  var rc = 64, sc = 4194304;
  function tc(a) {
    switch (a & -a) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return a & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return a & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return a;
    }
  }
  function uc(a, b) {
    var c = a.pendingLanes;
    if (0 === c) return 0;
    var d = 0, e = a.suspendedLanes, f = a.pingedLanes, g = c & 268435455;
    if (0 !== g) {
      var h = g & ~e;
      0 !== h ? d = tc(h) : (f &= g, 0 !== f && (d = tc(f)));
    } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f && (d = tc(f));
    if (0 === d) return 0;
    if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f = b & -b, e >= f || 16 === e && 0 !== (f & 4194240))) return b;
    0 !== (d & 4) && (d |= c & 16);
    b = a.entangledLanes;
    if (0 !== b) for (a = a.entanglements, b &= d; 0 < b; ) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
    return d;
  }
  function vc(a, b) {
    switch (a) {
      case 1:
      case 2:
      case 4:
        return b + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return b + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function wc(a, b) {
    for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f = a.pendingLanes; 0 < f; ) {
      var g = 31 - oc(f), h = 1 << g, k = e[g];
      if (-1 === k) {
        if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
      } else k <= b && (a.expiredLanes |= h);
      f &= ~h;
    }
  }
  function xc(a) {
    a = a.pendingLanes & -1073741825;
    return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
  }
  function yc() {
    var a = rc;
    rc <<= 1;
    0 === (rc & 4194240) && (rc = 64);
    return a;
  }
  function zc(a) {
    for (var b = [], c = 0; 31 > c; c++) b.push(a);
    return b;
  }
  function Ac(a, b, c) {
    a.pendingLanes |= b;
    536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
    a = a.eventTimes;
    b = 31 - oc(b);
    a[b] = c;
  }
  function Bc(a, b) {
    var c = a.pendingLanes & ~b;
    a.pendingLanes = b;
    a.suspendedLanes = 0;
    a.pingedLanes = 0;
    a.expiredLanes &= b;
    a.mutableReadLanes &= b;
    a.entangledLanes &= b;
    b = a.entanglements;
    var d = a.eventTimes;
    for (a = a.expirationTimes; 0 < c; ) {
      var e = 31 - oc(c), f = 1 << e;
      b[e] = 0;
      d[e] = -1;
      a[e] = -1;
      c &= ~f;
    }
  }
  function Cc(a, b) {
    var c = a.entangledLanes |= b;
    for (a = a.entanglements; c; ) {
      var d = 31 - oc(c), e = 1 << d;
      e & b | a[d] & b && (a[d] |= b);
      c &= ~e;
    }
  }
  var C = 0;
  function Dc(a) {
    a &= -a;
    return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
  }
  var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Sc(a, b) {
    switch (a) {
      case "focusin":
      case "focusout":
        Lc = null;
        break;
      case "dragenter":
      case "dragleave":
        Mc = null;
        break;
      case "mouseover":
      case "mouseout":
        Nc = null;
        break;
      case "pointerover":
      case "pointerout":
        Oc.delete(b.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Pc.delete(b.pointerId);
    }
  }
  function Tc(a, b, c, d, e, f) {
    if (null === a || a.nativeEvent !== f) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
    a.eventSystemFlags |= d;
    b = a.targetContainers;
    null !== e && -1 === b.indexOf(e) && b.push(e);
    return a;
  }
  function Uc(a, b, c, d, e) {
    switch (b) {
      case "focusin":
        return Lc = Tc(Lc, a, b, c, d, e), true;
      case "dragenter":
        return Mc = Tc(Mc, a, b, c, d, e), true;
      case "mouseover":
        return Nc = Tc(Nc, a, b, c, d, e), true;
      case "pointerover":
        var f = e.pointerId;
        Oc.set(f, Tc(Oc.get(f) || null, a, b, c, d, e));
        return true;
      case "gotpointercapture":
        return f = e.pointerId, Pc.set(f, Tc(Pc.get(f) || null, a, b, c, d, e)), true;
    }
    return false;
  }
  function Vc(a) {
    var b = Wc(a.target);
    if (null !== b) {
      var c = Vb(b);
      if (null !== c) {
        if (b = c.tag, 13 === b) {
          if (b = Wb(c), null !== b) {
            a.blockedOn = b;
            Ic(a.priority, function() {
              Gc(c);
            });
            return;
          }
        } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
          a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
          return;
        }
      }
    }
    a.blockedOn = null;
  }
  function Xc(a) {
    if (null !== a.blockedOn) return false;
    for (var b = a.targetContainers; 0 < b.length; ) {
      var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
      if (null === c) {
        c = a.nativeEvent;
        var d = new c.constructor(c.type, c);
        wb = d;
        c.target.dispatchEvent(d);
        wb = null;
      } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
      b.shift();
    }
    return true;
  }
  function Zc(a, b, c) {
    Xc(a) && c.delete(b);
  }
  function $c() {
    Jc = false;
    null !== Lc && Xc(Lc) && (Lc = null);
    null !== Mc && Xc(Mc) && (Mc = null);
    null !== Nc && Xc(Nc) && (Nc = null);
    Oc.forEach(Zc);
    Pc.forEach(Zc);
  }
  function ad(a, b) {
    a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
  }
  function bd(a) {
    function b(b2) {
      return ad(b2, a);
    }
    if (0 < Kc.length) {
      ad(Kc[0], a);
      for (var c = 1; c < Kc.length; c++) {
        var d = Kc[c];
        d.blockedOn === a && (d.blockedOn = null);
      }
    }
    null !== Lc && ad(Lc, a);
    null !== Mc && ad(Mc, a);
    null !== Nc && ad(Nc, a);
    Oc.forEach(b);
    Pc.forEach(b);
    for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
    for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
  }
  var cd = ua.ReactCurrentBatchConfig, dd = true;
  function ed(a, b, c, d) {
    var e = C, f = cd.transition;
    cd.transition = null;
    try {
      C = 1, fd(a, b, c, d);
    } finally {
      C = e, cd.transition = f;
    }
  }
  function gd(a, b, c, d) {
    var e = C, f = cd.transition;
    cd.transition = null;
    try {
      C = 4, fd(a, b, c, d);
    } finally {
      C = e, cd.transition = f;
    }
  }
  function fd(a, b, c, d) {
    if (dd) {
      var e = Yc(a, b, c, d);
      if (null === e) hd(a, b, d, id, c), Sc(a, d);
      else if (Uc(e, a, b, c, d)) d.stopPropagation();
      else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
        for (; null !== e; ) {
          var f = Cb(e);
          null !== f && Ec(f);
          f = Yc(a, b, c, d);
          null === f && hd(a, b, d, id, c);
          if (f === e) break;
          e = f;
        }
        null !== e && d.stopPropagation();
      } else hd(a, b, d, null, c);
    }
  }
  var id = null;
  function Yc(a, b, c, d) {
    id = null;
    a = xb(d);
    a = Wc(a);
    if (null !== a) if (b = Vb(a), null === b) a = null;
    else if (c = b.tag, 13 === c) {
      a = Wb(b);
      if (null !== a) return a;
      a = null;
    } else if (3 === c) {
      if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
      a = null;
    } else b !== a && (a = null);
    id = a;
    return null;
  }
  function jd(a) {
    switch (a) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (ec()) {
          case fc:
            return 1;
          case gc:
            return 4;
          case hc:
          case ic:
            return 16;
          case jc:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var kd = null, ld = null, md = null;
  function nd() {
    if (md) return md;
    var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f = e.length;
    for (a = 0; a < c && b[a] === e[a]; a++) ;
    var g = c - a;
    for (d = 1; d <= g && b[c - d] === e[f - d]; d++) ;
    return md = e.slice(a, 1 < d ? 1 - d : void 0);
  }
  function od(a) {
    var b = a.keyCode;
    "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
    10 === a && (a = 13);
    return 32 <= a || 13 === a ? a : 0;
  }
  function pd() {
    return true;
  }
  function qd() {
    return false;
  }
  function rd(a) {
    function b(b2, d, e, f, g) {
      this._reactName = b2;
      this._targetInst = e;
      this.type = d;
      this.nativeEvent = f;
      this.target = g;
      this.currentTarget = null;
      for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f) : f[c]);
      this.isDefaultPrevented = (null != f.defaultPrevented ? f.defaultPrevented : false === f.returnValue) ? pd : qd;
      this.isPropagationStopped = qd;
      return this;
    }
    A(b.prototype, { preventDefault: function() {
      this.defaultPrevented = true;
      var a2 = this.nativeEvent;
      a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
    }, stopPropagation: function() {
      var a2 = this.nativeEvent;
      a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
    }, persist: function() {
    }, isPersistent: pd });
    return b;
  }
  var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
    return a.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
    return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
  }, movementX: function(a) {
    if ("movementX" in a) return a.movementX;
    a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
    return wd;
  }, movementY: function(a) {
    return "movementY" in a ? a.movementY : xd;
  } }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
    return "clipboardData" in a ? a.clipboardData : window.clipboardData;
  } }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Nd = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Pd(a) {
    var b = this.nativeEvent;
    return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
  }
  function zd() {
    return Pd;
  }
  var Qd = A({}, ud, { key: function(a) {
    if (a.key) {
      var b = Md[a.key] || a.key;
      if ("Unidentified" !== b) return b;
    }
    return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
    return "keypress" === a.type ? od(a) : 0;
  }, keyCode: function(a) {
    return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
  }, which: function(a) {
    return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
  } }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
    deltaX: function(a) {
      return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
    },
    deltaY: function(a) {
      return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
  ia && "documentMode" in document && (be = document.documentMode);
  var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
  function ge(a, b) {
    switch (a) {
      case "keyup":
        return -1 !== $d.indexOf(b.keyCode);
      case "keydown":
        return 229 !== b.keyCode;
      case "keypress":
      case "mousedown":
      case "focusout":
        return true;
      default:
        return false;
    }
  }
  function he(a) {
    a = a.detail;
    return "object" === typeof a && "data" in a ? a.data : null;
  }
  var ie = false;
  function je(a, b) {
    switch (a) {
      case "compositionend":
        return he(b);
      case "keypress":
        if (32 !== b.which) return null;
        fe = true;
        return ee;
      case "textInput":
        return a = b.data, a === ee && fe ? null : a;
      default:
        return null;
    }
  }
  function ke(a, b) {
    if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
    switch (a) {
      case "paste":
        return null;
      case "keypress":
        if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
          if (b.char && 1 < b.char.length) return b.char;
          if (b.which) return String.fromCharCode(b.which);
        }
        return null;
      case "compositionend":
        return de && "ko" !== b.locale ? null : b.data;
      default:
        return null;
    }
  }
  var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
  function me(a) {
    var b = a && a.nodeName && a.nodeName.toLowerCase();
    return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
  }
  function ne(a, b, c, d) {
    Eb(d);
    b = oe(b, "onChange");
    0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
  }
  var pe = null, qe = null;
  function re(a) {
    se(a, 0);
  }
  function te(a) {
    var b = ue(a);
    if (Wa(b)) return a;
  }
  function ve(a, b) {
    if ("change" === a) return b;
  }
  var we = false;
  if (ia) {
    var xe;
    if (ia) {
      var ye = "oninput" in document;
      if (!ye) {
        var ze = document.createElement("div");
        ze.setAttribute("oninput", "return;");
        ye = "function" === typeof ze.oninput;
      }
      xe = ye;
    } else xe = false;
    we = xe && (!document.documentMode || 9 < document.documentMode);
  }
  function Ae() {
    pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
  }
  function Be(a) {
    if ("value" === a.propertyName && te(qe)) {
      var b = [];
      ne(b, qe, a, xb(a));
      Jb(re, b);
    }
  }
  function Ce(a, b, c) {
    "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
  }
  function De(a) {
    if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
  }
  function Ee(a, b) {
    if ("click" === a) return te(b);
  }
  function Fe(a, b) {
    if ("input" === a || "change" === a) return te(b);
  }
  function Ge(a, b) {
    return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
  }
  var He = "function" === typeof Object.is ? Object.is : Ge;
  function Ie(a, b) {
    if (He(a, b)) return true;
    if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return false;
    var c = Object.keys(a), d = Object.keys(b);
    if (c.length !== d.length) return false;
    for (d = 0; d < c.length; d++) {
      var e = c[d];
      if (!ja.call(b, e) || !He(a[e], b[e])) return false;
    }
    return true;
  }
  function Je(a) {
    for (; a && a.firstChild; ) a = a.firstChild;
    return a;
  }
  function Ke(a, b) {
    var c = Je(a);
    a = 0;
    for (var d; c; ) {
      if (3 === c.nodeType) {
        d = a + c.textContent.length;
        if (a <= b && d >= b) return { node: c, offset: b - a };
        a = d;
      }
      a: {
        for (; c; ) {
          if (c.nextSibling) {
            c = c.nextSibling;
            break a;
          }
          c = c.parentNode;
        }
        c = void 0;
      }
      c = Je(c);
    }
  }
  function Le(a, b) {
    return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
  }
  function Me() {
    for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
      try {
        var c = "string" === typeof b.contentWindow.location.href;
      } catch (d) {
        c = false;
      }
      if (c) a = b.contentWindow;
      else break;
      b = Xa(a.document);
    }
    return b;
  }
  function Ne(a) {
    var b = a && a.nodeName && a.nodeName.toLowerCase();
    return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
  }
  function Oe(a) {
    var b = Me(), c = a.focusedElem, d = a.selectionRange;
    if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
      if (null !== d && Ne(c)) {
        if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
        else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
          a = a.getSelection();
          var e = c.textContent.length, f = Math.min(d.start, e);
          d = void 0 === d.end ? f : Math.min(d.end, e);
          !a.extend && f > d && (e = d, d = f, f = e);
          e = Ke(c, f);
          var g = Ke(
            c,
            d
          );
          e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
        }
      }
      b = [];
      for (a = c; a = a.parentNode; ) 1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
      "function" === typeof c.focus && c.focus();
      for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
    }
  }
  var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
  function Ue(a, b, c) {
    var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
    Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
  }
  function Ve(a, b) {
    var c = {};
    c[a.toLowerCase()] = b.toLowerCase();
    c["Webkit" + a] = "webkit" + b;
    c["Moz" + a] = "moz" + b;
    return c;
  }
  var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
  ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
  function Ze(a) {
    if (Xe[a]) return Xe[a];
    if (!We[a]) return a;
    var b = We[a], c;
    for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
    return a;
  }
  var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function ff(a, b) {
    df.set(a, b);
    fa(b, [a]);
  }
  for (var gf = 0; gf < ef.length; gf++) {
    var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
    ff(jf, "on" + kf);
  }
  ff($e, "onAnimationEnd");
  ff(af, "onAnimationIteration");
  ff(bf, "onAnimationStart");
  ff("dblclick", "onDoubleClick");
  ff("focusin", "onFocus");
  ff("focusout", "onBlur");
  ff(cf, "onTransitionEnd");
  ha("onMouseEnter", ["mouseout", "mouseover"]);
  ha("onMouseLeave", ["mouseout", "mouseover"]);
  ha("onPointerEnter", ["pointerout", "pointerover"]);
  ha("onPointerLeave", ["pointerout", "pointerover"]);
  fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
  fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
  fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
  fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
  fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
  fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
  function nf(a, b, c) {
    var d = a.type || "unknown-event";
    a.currentTarget = c;
    Ub(d, b, void 0, a);
    a.currentTarget = null;
  }
  function se(a, b) {
    b = 0 !== (b & 4);
    for (var c = 0; c < a.length; c++) {
      var d = a[c], e = d.event;
      d = d.listeners;
      a: {
        var f = void 0;
        if (b) for (var g = d.length - 1; 0 <= g; g--) {
          var h = d[g], k = h.instance, l = h.currentTarget;
          h = h.listener;
          if (k !== f && e.isPropagationStopped()) break a;
          nf(e, h, l);
          f = k;
        }
        else for (g = 0; g < d.length; g++) {
          h = d[g];
          k = h.instance;
          l = h.currentTarget;
          h = h.listener;
          if (k !== f && e.isPropagationStopped()) break a;
          nf(e, h, l);
          f = k;
        }
      }
    }
    if (Qb) throw a = Rb, Qb = false, Rb = null, a;
  }
  function D(a, b) {
    var c = b[of];
    void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
    var d = a + "__bubble";
    c.has(d) || (pf(b, a, 2, false), c.add(d));
  }
  function qf(a, b, c) {
    var d = 0;
    b && (d |= 4);
    pf(c, a, d, b);
  }
  var rf = "_reactListening" + Math.random().toString(36).slice(2);
  function sf(a) {
    if (!a[rf]) {
      a[rf] = true;
      da.forEach(function(b2) {
        "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
      });
      var b = 9 === a.nodeType ? a : a.ownerDocument;
      null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
    }
  }
  function pf(a, b, c, d) {
    switch (jd(b)) {
      case 1:
        var e = ed;
        break;
      case 4:
        e = gd;
        break;
      default:
        e = fd;
    }
    c = e.bind(null, b, c, a);
    e = void 0;
    !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
    d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
  }
  function hd(a, b, c, d, e) {
    var f = d;
    if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
      if (null === d) return;
      var g = d.tag;
      if (3 === g || 4 === g) {
        var h = d.stateNode.containerInfo;
        if (h === e || 8 === h.nodeType && h.parentNode === e) break;
        if (4 === g) for (g = d.return; null !== g; ) {
          var k = g.tag;
          if (3 === k || 4 === k) {
            if (k = g.stateNode.containerInfo, k === e || 8 === k.nodeType && k.parentNode === e) return;
          }
          g = g.return;
        }
        for (; null !== h; ) {
          g = Wc(h);
          if (null === g) return;
          k = g.tag;
          if (5 === k || 6 === k) {
            d = f = g;
            continue a;
          }
          h = h.parentNode;
        }
      }
      d = d.return;
    }
    Jb(function() {
      var d2 = f, e2 = xb(c), g2 = [];
      a: {
        var h2 = df.get(a);
        if (void 0 !== h2) {
          var k2 = td, n = a;
          switch (a) {
            case "keypress":
              if (0 === od(c)) break a;
            case "keydown":
            case "keyup":
              k2 = Rd;
              break;
            case "focusin":
              n = "focus";
              k2 = Fd;
              break;
            case "focusout":
              n = "blur";
              k2 = Fd;
              break;
            case "beforeblur":
            case "afterblur":
              k2 = Fd;
              break;
            case "click":
              if (2 === c.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              k2 = Bd;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              k2 = Dd;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              k2 = Vd;
              break;
            case $e:
            case af:
            case bf:
              k2 = Hd;
              break;
            case cf:
              k2 = Xd;
              break;
            case "scroll":
              k2 = vd;
              break;
            case "wheel":
              k2 = Zd;
              break;
            case "copy":
            case "cut":
            case "paste":
              k2 = Jd;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              k2 = Td;
          }
          var t = 0 !== (b & 4), J = !t && "scroll" === a, x = t ? null !== h2 ? h2 + "Capture" : null : h2;
          t = [];
          for (var w = d2, u; null !== w; ) {
            u = w;
            var F = u.stateNode;
            5 === u.tag && null !== F && (u = F, null !== x && (F = Kb(w, x), null != F && t.push(tf(w, F, u))));
            if (J) break;
            w = w.return;
          }
          0 < t.length && (h2 = new k2(h2, n, null, c, e2), g2.push({ event: h2, listeners: t }));
        }
      }
      if (0 === (b & 7)) {
        a: {
          h2 = "mouseover" === a || "pointerover" === a;
          k2 = "mouseout" === a || "pointerout" === a;
          if (h2 && c !== wb && (n = c.relatedTarget || c.fromElement) && (Wc(n) || n[uf])) break a;
          if (k2 || h2) {
            h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
            if (k2) {
              if (n = c.relatedTarget || c.toElement, k2 = d2, n = n ? Wc(n) : null, null !== n && (J = Vb(n), n !== J || 5 !== n.tag && 6 !== n.tag)) n = null;
            } else k2 = null, n = d2;
            if (k2 !== n) {
              t = Bd;
              F = "onMouseLeave";
              x = "onMouseEnter";
              w = "mouse";
              if ("pointerout" === a || "pointerover" === a) t = Td, F = "onPointerLeave", x = "onPointerEnter", w = "pointer";
              J = null == k2 ? h2 : ue(k2);
              u = null == n ? h2 : ue(n);
              h2 = new t(F, w + "leave", k2, c, e2);
              h2.target = J;
              h2.relatedTarget = u;
              F = null;
              Wc(e2) === d2 && (t = new t(x, w + "enter", n, c, e2), t.target = u, t.relatedTarget = J, F = t);
              J = F;
              if (k2 && n) b: {
                t = k2;
                x = n;
                w = 0;
                for (u = t; u; u = vf(u)) w++;
                u = 0;
                for (F = x; F; F = vf(F)) u++;
                for (; 0 < w - u; ) t = vf(t), w--;
                for (; 0 < u - w; ) x = vf(x), u--;
                for (; w--; ) {
                  if (t === x || null !== x && t === x.alternate) break b;
                  t = vf(t);
                  x = vf(x);
                }
                t = null;
              }
              else t = null;
              null !== k2 && wf(g2, h2, k2, t, false);
              null !== n && null !== J && wf(g2, J, n, t, true);
            }
          }
        }
        a: {
          h2 = d2 ? ue(d2) : window;
          k2 = h2.nodeName && h2.nodeName.toLowerCase();
          if ("select" === k2 || "input" === k2 && "file" === h2.type) var na = ve;
          else if (me(h2)) if (we) na = Fe;
          else {
            na = De;
            var xa = Ce;
          }
          else (k2 = h2.nodeName) && "input" === k2.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
          if (na && (na = na(a, d2))) {
            ne(g2, na, c, e2);
            break a;
          }
          xa && xa(a, h2, d2);
          "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
        }
        xa = d2 ? ue(d2) : window;
        switch (a) {
          case "focusin":
            if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
            break;
          case "focusout":
            Se = Re = Qe = null;
            break;
          case "mousedown":
            Te = true;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Te = false;
            Ue(g2, c, e2);
            break;
          case "selectionchange":
            if (Pe) break;
          case "keydown":
          case "keyup":
            Ue(g2, c, e2);
        }
        var $a;
        if (ae) b: {
          switch (a) {
            case "compositionstart":
              var ba = "onCompositionStart";
              break b;
            case "compositionend":
              ba = "onCompositionEnd";
              break b;
            case "compositionupdate":
              ba = "onCompositionUpdate";
              break b;
          }
          ba = void 0;
        }
        else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
        ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
        if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
      }
      se(g2, b);
    });
  }
  function tf(a, b, c) {
    return { instance: a, listener: b, currentTarget: c };
  }
  function oe(a, b) {
    for (var c = b + "Capture", d = []; null !== a; ) {
      var e = a, f = e.stateNode;
      5 === e.tag && null !== f && (e = f, f = Kb(a, c), null != f && d.unshift(tf(a, f, e)), f = Kb(a, b), null != f && d.push(tf(a, f, e)));
      a = a.return;
    }
    return d;
  }
  function vf(a) {
    if (null === a) return null;
    do
      a = a.return;
    while (a && 5 !== a.tag);
    return a ? a : null;
  }
  function wf(a, b, c, d, e) {
    for (var f = b._reactName, g = []; null !== c && c !== d; ) {
      var h = c, k = h.alternate, l = h.stateNode;
      if (null !== k && k === d) break;
      5 === h.tag && null !== l && (h = l, e ? (k = Kb(c, f), null != k && g.unshift(tf(c, k, h))) : e || (k = Kb(c, f), null != k && g.push(tf(c, k, h))));
      c = c.return;
    }
    0 !== g.length && a.push({ event: b, listeners: g });
  }
  var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
  function zf(a) {
    return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
  }
  function Af(a, b, c) {
    b = zf(b);
    if (zf(a) !== b && c) throw Error(p(425));
  }
  function Bf() {
  }
  var Cf = null, Df = null;
  function Ef(a, b) {
    return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
  }
  var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
    return Hf.resolve(null).then(a).catch(If);
  } : Ff;
  function If(a) {
    setTimeout(function() {
      throw a;
    });
  }
  function Kf(a, b) {
    var c = b, d = 0;
    do {
      var e = c.nextSibling;
      a.removeChild(c);
      if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
        if (0 === d) {
          a.removeChild(e);
          bd(b);
          return;
        }
        d--;
      } else "$" !== c && "$?" !== c && "$!" !== c || d++;
      c = e;
    } while (c);
    bd(b);
  }
  function Lf(a) {
    for (; null != a; a = a.nextSibling) {
      var b = a.nodeType;
      if (1 === b || 3 === b) break;
      if (8 === b) {
        b = a.data;
        if ("$" === b || "$!" === b || "$?" === b) break;
        if ("/$" === b) return null;
      }
    }
    return a;
  }
  function Mf(a) {
    a = a.previousSibling;
    for (var b = 0; a; ) {
      if (8 === a.nodeType) {
        var c = a.data;
        if ("$" === c || "$!" === c || "$?" === c) {
          if (0 === b) return a;
          b--;
        } else "/$" === c && b++;
      }
      a = a.previousSibling;
    }
    return null;
  }
  var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
  function Wc(a) {
    var b = a[Of];
    if (b) return b;
    for (var c = a.parentNode; c; ) {
      if (b = c[uf] || c[Of]) {
        c = b.alternate;
        if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
          if (c = a[Of]) return c;
          a = Mf(a);
        }
        return b;
      }
      a = c;
      c = a.parentNode;
    }
    return null;
  }
  function Cb(a) {
    a = a[Of] || a[uf];
    return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
  }
  function ue(a) {
    if (5 === a.tag || 6 === a.tag) return a.stateNode;
    throw Error(p(33));
  }
  function Db(a) {
    return a[Pf] || null;
  }
  var Sf = [], Tf = -1;
  function Uf(a) {
    return { current: a };
  }
  function E(a) {
    0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
  }
  function G(a, b) {
    Tf++;
    Sf[Tf] = a.current;
    a.current = b;
  }
  var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
  function Yf(a, b) {
    var c = a.type.contextTypes;
    if (!c) return Vf;
    var d = a.stateNode;
    if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
    var e = {}, f;
    for (f in c) e[f] = b[f];
    d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
    return e;
  }
  function Zf(a) {
    a = a.childContextTypes;
    return null !== a && void 0 !== a;
  }
  function $f() {
    E(Wf);
    E(H);
  }
  function ag(a, b, c) {
    if (H.current !== Vf) throw Error(p(168));
    G(H, b);
    G(Wf, c);
  }
  function bg(a, b, c) {
    var d = a.stateNode;
    b = b.childContextTypes;
    if ("function" !== typeof d.getChildContext) return c;
    d = d.getChildContext();
    for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
    return A({}, c, d);
  }
  function cg(a) {
    a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
    Xf = H.current;
    G(H, a);
    G(Wf, Wf.current);
    return true;
  }
  function dg(a, b, c) {
    var d = a.stateNode;
    if (!d) throw Error(p(169));
    c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
    G(Wf, c);
  }
  var eg = null, fg = false, gg = false;
  function hg(a) {
    null === eg ? eg = [a] : eg.push(a);
  }
  function ig(a) {
    fg = true;
    hg(a);
  }
  function jg() {
    if (!gg && null !== eg) {
      gg = true;
      var a = 0, b = C;
      try {
        var c = eg;
        for (C = 1; a < c.length; a++) {
          var d = c[a];
          do
            d = d(true);
          while (null !== d);
        }
        eg = null;
        fg = false;
      } catch (e) {
        throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
      } finally {
        C = b, gg = false;
      }
    }
    return null;
  }
  var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
  function tg(a, b) {
    kg[lg++] = ng;
    kg[lg++] = mg;
    mg = a;
    ng = b;
  }
  function ug(a, b, c) {
    og[pg++] = rg;
    og[pg++] = sg;
    og[pg++] = qg;
    qg = a;
    var d = rg;
    a = sg;
    var e = 32 - oc(d) - 1;
    d &= ~(1 << e);
    c += 1;
    var f = 32 - oc(b) + e;
    if (30 < f) {
      var g = e - e % 5;
      f = (d & (1 << g) - 1).toString(32);
      d >>= g;
      e -= g;
      rg = 1 << 32 - oc(b) + e | c << e | d;
      sg = f + a;
    } else rg = 1 << f | c << e | d, sg = a;
  }
  function vg(a) {
    null !== a.return && (tg(a, 1), ug(a, 1, 0));
  }
  function wg(a) {
    for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
    for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
  }
  var xg = null, yg = null, I = false, zg = null;
  function Ag(a, b) {
    var c = Bg(5, null, null, 0);
    c.elementType = "DELETED";
    c.stateNode = b;
    c.return = a;
    b = a.deletions;
    null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
  }
  function Cg(a, b) {
    switch (a.tag) {
      case 5:
        var c = a.type;
        b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
        return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
      case 6:
        return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
      case 13:
        return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
      default:
        return false;
    }
  }
  function Dg(a) {
    return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
  }
  function Eg(a) {
    if (I) {
      var b = yg;
      if (b) {
        var c = b;
        if (!Cg(a, b)) {
          if (Dg(a)) throw Error(p(418));
          b = Lf(c.nextSibling);
          var d = xg;
          b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
        }
      } else {
        if (Dg(a)) throw Error(p(418));
        a.flags = a.flags & -4097 | 2;
        I = false;
        xg = a;
      }
    }
  }
  function Fg(a) {
    for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
    xg = a;
  }
  function Gg(a) {
    if (a !== xg) return false;
    if (!I) return Fg(a), I = true, false;
    var b;
    (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
    if (b && (b = yg)) {
      if (Dg(a)) throw Hg(), Error(p(418));
      for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
    }
    Fg(a);
    if (13 === a.tag) {
      a = a.memoizedState;
      a = null !== a ? a.dehydrated : null;
      if (!a) throw Error(p(317));
      a: {
        a = a.nextSibling;
        for (b = 0; a; ) {
          if (8 === a.nodeType) {
            var c = a.data;
            if ("/$" === c) {
              if (0 === b) {
                yg = Lf(a.nextSibling);
                break a;
              }
              b--;
            } else "$" !== c && "$!" !== c && "$?" !== c || b++;
          }
          a = a.nextSibling;
        }
        yg = null;
      }
    } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
    return true;
  }
  function Hg() {
    for (var a = yg; a; ) a = Lf(a.nextSibling);
  }
  function Ig() {
    yg = xg = null;
    I = false;
  }
  function Jg(a) {
    null === zg ? zg = [a] : zg.push(a);
  }
  var Kg = ua.ReactCurrentBatchConfig;
  function Lg(a, b, c) {
    a = c.ref;
    if (null !== a && "function" !== typeof a && "object" !== typeof a) {
      if (c._owner) {
        c = c._owner;
        if (c) {
          if (1 !== c.tag) throw Error(p(309));
          var d = c.stateNode;
        }
        if (!d) throw Error(p(147, a));
        var e = d, f = "" + a;
        if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f) return b.ref;
        b = function(a2) {
          var b2 = e.refs;
          null === a2 ? delete b2[f] : b2[f] = a2;
        };
        b._stringRef = f;
        return b;
      }
      if ("string" !== typeof a) throw Error(p(284));
      if (!c._owner) throw Error(p(290, a));
    }
    return a;
  }
  function Mg(a, b) {
    a = Object.prototype.toString.call(b);
    throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
  }
  function Ng(a) {
    var b = a._init;
    return b(a._payload);
  }
  function Og(a) {
    function b(b2, c2) {
      if (a) {
        var d2 = b2.deletions;
        null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
      }
    }
    function c(c2, d2) {
      if (!a) return null;
      for (; null !== d2; ) b(c2, d2), d2 = d2.sibling;
      return null;
    }
    function d(a2, b2) {
      for (a2 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
      return a2;
    }
    function e(a2, b2) {
      a2 = Pg(a2, b2);
      a2.index = 0;
      a2.sibling = null;
      return a2;
    }
    function f(b2, c2, d2) {
      b2.index = d2;
      if (!a) return b2.flags |= 1048576, c2;
      d2 = b2.alternate;
      if (null !== d2) return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
      b2.flags |= 2;
      return c2;
    }
    function g(b2) {
      a && null === b2.alternate && (b2.flags |= 2);
      return b2;
    }
    function h(a2, b2, c2, d2) {
      if (null === b2 || 6 !== b2.tag) return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
      b2 = e(b2, c2);
      b2.return = a2;
      return b2;
    }
    function k(a2, b2, c2, d2) {
      var f2 = c2.type;
      if (f2 === ya) return m(a2, b2, c2.props.children, d2, c2.key);
      if (null !== b2 && (b2.elementType === f2 || "object" === typeof f2 && null !== f2 && f2.$$typeof === Ha && Ng(f2) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
      d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
      d2.ref = Lg(a2, b2, c2);
      d2.return = a2;
      return d2;
    }
    function l(a2, b2, c2, d2) {
      if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
      b2 = e(b2, c2.children || []);
      b2.return = a2;
      return b2;
    }
    function m(a2, b2, c2, d2, f2) {
      if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f2), b2.return = a2, b2;
      b2 = e(b2, c2);
      b2.return = a2;
      return b2;
    }
    function q(a2, b2, c2) {
      if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
      if ("object" === typeof b2 && null !== b2) {
        switch (b2.$$typeof) {
          case va:
            return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
          case wa:
            return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
          case Ha:
            var d2 = b2._init;
            return q(a2, d2(b2._payload), c2);
        }
        if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
        Mg(a2, b2);
      }
      return null;
    }
    function r(a2, b2, c2, d2) {
      var e2 = null !== b2 ? b2.key : null;
      if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
      if ("object" === typeof c2 && null !== c2) {
        switch (c2.$$typeof) {
          case va:
            return c2.key === e2 ? k(a2, b2, c2, d2) : null;
          case wa:
            return c2.key === e2 ? l(a2, b2, c2, d2) : null;
          case Ha:
            return e2 = c2._init, r(
              a2,
              b2,
              e2(c2._payload),
              d2
            );
        }
        if (eb(c2) || Ka(c2)) return null !== e2 ? null : m(a2, b2, c2, d2, null);
        Mg(a2, c2);
      }
      return null;
    }
    function y(a2, b2, c2, d2, e2) {
      if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
      if ("object" === typeof d2 && null !== d2) {
        switch (d2.$$typeof) {
          case va:
            return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k(b2, a2, d2, e2);
          case wa:
            return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l(b2, a2, d2, e2);
          case Ha:
            var f2 = d2._init;
            return y(a2, b2, c2, f2(d2._payload), e2);
        }
        if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m(b2, a2, d2, e2, null);
        Mg(b2, d2);
      }
      return null;
    }
    function n(e2, g2, h2, k2) {
      for (var l2 = null, m2 = null, u = g2, w = g2 = 0, x = null; null !== u && w < h2.length; w++) {
        u.index > w ? (x = u, u = null) : x = u.sibling;
        var n2 = r(e2, u, h2[w], k2);
        if (null === n2) {
          null === u && (u = x);
          break;
        }
        a && u && null === n2.alternate && b(e2, u);
        g2 = f(n2, g2, w);
        null === m2 ? l2 = n2 : m2.sibling = n2;
        m2 = n2;
        u = x;
      }
      if (w === h2.length) return c(e2, u), I && tg(e2, w), l2;
      if (null === u) {
        for (; w < h2.length; w++) u = q(e2, h2[w], k2), null !== u && (g2 = f(u, g2, w), null === m2 ? l2 = u : m2.sibling = u, m2 = u);
        I && tg(e2, w);
        return l2;
      }
      for (u = d(e2, u); w < h2.length; w++) x = y(u, e2, w, h2[w], k2), null !== x && (a && null !== x.alternate && u.delete(null === x.key ? w : x.key), g2 = f(x, g2, w), null === m2 ? l2 = x : m2.sibling = x, m2 = x);
      a && u.forEach(function(a2) {
        return b(e2, a2);
      });
      I && tg(e2, w);
      return l2;
    }
    function t(e2, g2, h2, k2) {
      var l2 = Ka(h2);
      if ("function" !== typeof l2) throw Error(p(150));
      h2 = l2.call(h2);
      if (null == h2) throw Error(p(151));
      for (var u = l2 = null, m2 = g2, w = g2 = 0, x = null, n2 = h2.next(); null !== m2 && !n2.done; w++, n2 = h2.next()) {
        m2.index > w ? (x = m2, m2 = null) : x = m2.sibling;
        var t2 = r(e2, m2, n2.value, k2);
        if (null === t2) {
          null === m2 && (m2 = x);
          break;
        }
        a && m2 && null === t2.alternate && b(e2, m2);
        g2 = f(t2, g2, w);
        null === u ? l2 = t2 : u.sibling = t2;
        u = t2;
        m2 = x;
      }
      if (n2.done) return c(
        e2,
        m2
      ), I && tg(e2, w), l2;
      if (null === m2) {
        for (; !n2.done; w++, n2 = h2.next()) n2 = q(e2, n2.value, k2), null !== n2 && (g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
        I && tg(e2, w);
        return l2;
      }
      for (m2 = d(e2, m2); !n2.done; w++, n2 = h2.next()) n2 = y(m2, e2, w, n2.value, k2), null !== n2 && (a && null !== n2.alternate && m2.delete(null === n2.key ? w : n2.key), g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
      a && m2.forEach(function(a2) {
        return b(e2, a2);
      });
      I && tg(e2, w);
      return l2;
    }
    function J(a2, d2, f2, h2) {
      "object" === typeof f2 && null !== f2 && f2.type === ya && null === f2.key && (f2 = f2.props.children);
      if ("object" === typeof f2 && null !== f2) {
        switch (f2.$$typeof) {
          case va:
            a: {
              for (var k2 = f2.key, l2 = d2; null !== l2; ) {
                if (l2.key === k2) {
                  k2 = f2.type;
                  if (k2 === ya) {
                    if (7 === l2.tag) {
                      c(a2, l2.sibling);
                      d2 = e(l2, f2.props.children);
                      d2.return = a2;
                      a2 = d2;
                      break a;
                    }
                  } else if (l2.elementType === k2 || "object" === typeof k2 && null !== k2 && k2.$$typeof === Ha && Ng(k2) === l2.type) {
                    c(a2, l2.sibling);
                    d2 = e(l2, f2.props);
                    d2.ref = Lg(a2, l2, f2);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                  c(a2, l2);
                  break;
                } else b(a2, l2);
                l2 = l2.sibling;
              }
              f2.type === ya ? (d2 = Tg(f2.props.children, a2.mode, h2, f2.key), d2.return = a2, a2 = d2) : (h2 = Rg(f2.type, f2.key, f2.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f2), h2.return = a2, a2 = h2);
            }
            return g(a2);
          case wa:
            a: {
              for (l2 = f2.key; null !== d2; ) {
                if (d2.key === l2) if (4 === d2.tag && d2.stateNode.containerInfo === f2.containerInfo && d2.stateNode.implementation === f2.implementation) {
                  c(a2, d2.sibling);
                  d2 = e(d2, f2.children || []);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                } else {
                  c(a2, d2);
                  break;
                }
                else b(a2, d2);
                d2 = d2.sibling;
              }
              d2 = Sg(f2, a2.mode, h2);
              d2.return = a2;
              a2 = d2;
            }
            return g(a2);
          case Ha:
            return l2 = f2._init, J(a2, d2, l2(f2._payload), h2);
        }
        if (eb(f2)) return n(a2, d2, f2, h2);
        if (Ka(f2)) return t(a2, d2, f2, h2);
        Mg(a2, f2);
      }
      return "string" === typeof f2 && "" !== f2 || "number" === typeof f2 ? (f2 = "" + f2, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f2), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f2, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
    }
    return J;
  }
  var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
  function $g() {
    Zg = Yg = Xg = null;
  }
  function ah(a) {
    var b = Wg.current;
    E(Wg);
    a._currentValue = b;
  }
  function bh(a, b, c) {
    for (; null !== a; ) {
      var d = a.alternate;
      (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
      if (a === c) break;
      a = a.return;
    }
  }
  function ch(a, b) {
    Xg = a;
    Zg = Yg = null;
    a = a.dependencies;
    null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
  }
  function eh(a) {
    var b = a._currentValue;
    if (Zg !== a) if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
      if (null === Xg) throw Error(p(308));
      Yg = a;
      Xg.dependencies = { lanes: 0, firstContext: a };
    } else Yg = Yg.next = a;
    return b;
  }
  var fh = null;
  function gh(a) {
    null === fh ? fh = [a] : fh.push(a);
  }
  function hh(a, b, c, d) {
    var e = b.interleaved;
    null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
    b.interleaved = c;
    return ih(a, d);
  }
  function ih(a, b) {
    a.lanes |= b;
    var c = a.alternate;
    null !== c && (c.lanes |= b);
    c = a;
    for (a = a.return; null !== a; ) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
    return 3 === c.tag ? c.stateNode : null;
  }
  var jh = false;
  function kh(a) {
    a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function lh(a, b) {
    a = a.updateQueue;
    b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
  }
  function mh(a, b) {
    return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
  }
  function nh(a, b, c) {
    var d = a.updateQueue;
    if (null === d) return null;
    d = d.shared;
    if (0 !== (K & 2)) {
      var e = d.pending;
      null === e ? b.next = b : (b.next = e.next, e.next = b);
      d.pending = b;
      return ih(a, c);
    }
    e = d.interleaved;
    null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
    d.interleaved = b;
    return ih(a, c);
  }
  function oh(a, b, c) {
    b = b.updateQueue;
    if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
      var d = b.lanes;
      d &= a.pendingLanes;
      c |= d;
      b.lanes = c;
      Cc(a, c);
    }
  }
  function ph(a, b) {
    var c = a.updateQueue, d = a.alternate;
    if (null !== d && (d = d.updateQueue, c === d)) {
      var e = null, f = null;
      c = c.firstBaseUpdate;
      if (null !== c) {
        do {
          var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
          null === f ? e = f = g : f = f.next = g;
          c = c.next;
        } while (null !== c);
        null === f ? e = f = b : f = f.next = b;
      } else e = f = b;
      c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f, shared: d.shared, effects: d.effects };
      a.updateQueue = c;
      return;
    }
    a = c.lastBaseUpdate;
    null === a ? c.firstBaseUpdate = b : a.next = b;
    c.lastBaseUpdate = b;
  }
  function qh(a, b, c, d) {
    var e = a.updateQueue;
    jh = false;
    var f = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
    if (null !== h) {
      e.shared.pending = null;
      var k = h, l = k.next;
      k.next = null;
      null === g ? f = l : g.next = l;
      g = k;
      var m = a.alternate;
      null !== m && (m = m.updateQueue, h = m.lastBaseUpdate, h !== g && (null === h ? m.firstBaseUpdate = l : h.next = l, m.lastBaseUpdate = k));
    }
    if (null !== f) {
      var q = e.baseState;
      g = 0;
      m = l = k = null;
      h = f;
      do {
        var r = h.lane, y = h.eventTime;
        if ((d & r) === r) {
          null !== m && (m = m.next = {
            eventTime: y,
            lane: 0,
            tag: h.tag,
            payload: h.payload,
            callback: h.callback,
            next: null
          });
          a: {
            var n = a, t = h;
            r = b;
            y = c;
            switch (t.tag) {
              case 1:
                n = t.payload;
                if ("function" === typeof n) {
                  q = n.call(y, q, r);
                  break a;
                }
                q = n;
                break a;
              case 3:
                n.flags = n.flags & -65537 | 128;
              case 0:
                n = t.payload;
                r = "function" === typeof n ? n.call(y, q, r) : n;
                if (null === r || void 0 === r) break a;
                q = A({}, q, r);
                break a;
              case 2:
                jh = true;
            }
          }
          null !== h.callback && 0 !== h.lane && (a.flags |= 64, r = e.effects, null === r ? e.effects = [h] : r.push(h));
        } else y = { eventTime: y, lane: r, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m ? (l = m = y, k = q) : m = m.next = y, g |= r;
        h = h.next;
        if (null === h) if (h = e.shared.pending, null === h) break;
        else r = h, h = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
      } while (1);
      null === m && (k = q);
      e.baseState = k;
      e.firstBaseUpdate = l;
      e.lastBaseUpdate = m;
      b = e.shared.interleaved;
      if (null !== b) {
        e = b;
        do
          g |= e.lane, e = e.next;
        while (e !== b);
      } else null === f && (e.shared.lanes = 0);
      rh |= g;
      a.lanes = g;
      a.memoizedState = q;
    }
  }
  function sh(a, b, c) {
    a = b.effects;
    b.effects = null;
    if (null !== a) for (b = 0; b < a.length; b++) {
      var d = a[b], e = d.callback;
      if (null !== e) {
        d.callback = null;
        d = c;
        if ("function" !== typeof e) throw Error(p(191, e));
        e.call(d);
      }
    }
  }
  var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
  function xh(a) {
    if (a === th) throw Error(p(174));
    return a;
  }
  function yh(a, b) {
    G(wh, b);
    G(vh, a);
    G(uh, th);
    a = b.nodeType;
    switch (a) {
      case 9:
      case 11:
        b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
        break;
      default:
        a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
    }
    E(uh);
    G(uh, b);
  }
  function zh() {
    E(uh);
    E(vh);
    E(wh);
  }
  function Ah(a) {
    xh(wh.current);
    var b = xh(uh.current);
    var c = lb(b, a.type);
    b !== c && (G(vh, a), G(uh, c));
  }
  function Bh(a) {
    vh.current === a && (E(uh), E(vh));
  }
  var L = Uf(0);
  function Ch(a) {
    for (var b = a; null !== b; ) {
      if (13 === b.tag) {
        var c = b.memoizedState;
        if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
      } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
        if (0 !== (b.flags & 128)) return b;
      } else if (null !== b.child) {
        b.child.return = b;
        b = b.child;
        continue;
      }
      if (b === a) break;
      for (; null === b.sibling; ) {
        if (null === b.return || b.return === a) return null;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
    return null;
  }
  var Dh = [];
  function Eh() {
    for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
    Dh.length = 0;
  }
  var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
  function P() {
    throw Error(p(321));
  }
  function Mh(a, b) {
    if (null === b) return false;
    for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
    return true;
  }
  function Nh(a, b, c, d, e, f) {
    Hh = f;
    M = b;
    b.memoizedState = null;
    b.updateQueue = null;
    b.lanes = 0;
    Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
    a = c(d, e);
    if (Jh) {
      f = 0;
      do {
        Jh = false;
        Kh = 0;
        if (25 <= f) throw Error(p(301));
        f += 1;
        O = N = null;
        b.updateQueue = null;
        Fh.current = Qh;
        a = c(d, e);
      } while (Jh);
    }
    Fh.current = Rh;
    b = null !== N && null !== N.next;
    Hh = 0;
    O = N = M = null;
    Ih = false;
    if (b) throw Error(p(300));
    return a;
  }
  function Sh() {
    var a = 0 !== Kh;
    Kh = 0;
    return a;
  }
  function Th() {
    var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    null === O ? M.memoizedState = O = a : O = O.next = a;
    return O;
  }
  function Uh() {
    if (null === N) {
      var a = M.alternate;
      a = null !== a ? a.memoizedState : null;
    } else a = N.next;
    var b = null === O ? M.memoizedState : O.next;
    if (null !== b) O = b, N = a;
    else {
      if (null === a) throw Error(p(310));
      N = a;
      a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
      null === O ? M.memoizedState = O = a : O = O.next = a;
    }
    return O;
  }
  function Vh(a, b) {
    return "function" === typeof b ? b(a) : b;
  }
  function Wh(a) {
    var b = Uh(), c = b.queue;
    if (null === c) throw Error(p(311));
    c.lastRenderedReducer = a;
    var d = N, e = d.baseQueue, f = c.pending;
    if (null !== f) {
      if (null !== e) {
        var g = e.next;
        e.next = f.next;
        f.next = g;
      }
      d.baseQueue = e = f;
      c.pending = null;
    }
    if (null !== e) {
      f = e.next;
      d = d.baseState;
      var h = g = null, k = null, l = f;
      do {
        var m = l.lane;
        if ((Hh & m) === m) null !== k && (k = k.next = { lane: 0, action: l.action, hasEagerState: l.hasEagerState, eagerState: l.eagerState, next: null }), d = l.hasEagerState ? l.eagerState : a(d, l.action);
        else {
          var q = {
            lane: m,
            action: l.action,
            hasEagerState: l.hasEagerState,
            eagerState: l.eagerState,
            next: null
          };
          null === k ? (h = k = q, g = d) : k = k.next = q;
          M.lanes |= m;
          rh |= m;
        }
        l = l.next;
      } while (null !== l && l !== f);
      null === k ? g = d : k.next = h;
      He(d, b.memoizedState) || (dh = true);
      b.memoizedState = d;
      b.baseState = g;
      b.baseQueue = k;
      c.lastRenderedState = d;
    }
    a = c.interleaved;
    if (null !== a) {
      e = a;
      do
        f = e.lane, M.lanes |= f, rh |= f, e = e.next;
      while (e !== a);
    } else null === e && (c.lanes = 0);
    return [b.memoizedState, c.dispatch];
  }
  function Xh(a) {
    var b = Uh(), c = b.queue;
    if (null === c) throw Error(p(311));
    c.lastRenderedReducer = a;
    var d = c.dispatch, e = c.pending, f = b.memoizedState;
    if (null !== e) {
      c.pending = null;
      var g = e = e.next;
      do
        f = a(f, g.action), g = g.next;
      while (g !== e);
      He(f, b.memoizedState) || (dh = true);
      b.memoizedState = f;
      null === b.baseQueue && (b.baseState = f);
      c.lastRenderedState = f;
    }
    return [f, d];
  }
  function Yh() {
  }
  function Zh(a, b) {
    var c = M, d = Uh(), e = b(), f = !He(d.memoizedState, e);
    f && (d.memoizedState = e, dh = true);
    d = d.queue;
    $h(ai.bind(null, c, d, a), [a]);
    if (d.getSnapshot !== b || f || null !== O && O.memoizedState.tag & 1) {
      c.flags |= 2048;
      bi(9, ci.bind(null, c, d, e, b), void 0, null);
      if (null === Q) throw Error(p(349));
      0 !== (Hh & 30) || di(c, b, e);
    }
    return e;
  }
  function di(a, b, c) {
    a.flags |= 16384;
    a = { getSnapshot: b, value: c };
    b = M.updateQueue;
    null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
  }
  function ci(a, b, c, d) {
    b.value = c;
    b.getSnapshot = d;
    ei(b) && fi(a);
  }
  function ai(a, b, c) {
    return c(function() {
      ei(b) && fi(a);
    });
  }
  function ei(a) {
    var b = a.getSnapshot;
    a = a.value;
    try {
      var c = b();
      return !He(a, c);
    } catch (d) {
      return true;
    }
  }
  function fi(a) {
    var b = ih(a, 1);
    null !== b && gi(b, a, 1, -1);
  }
  function hi(a) {
    var b = Th();
    "function" === typeof a && (a = a());
    b.memoizedState = b.baseState = a;
    a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
    b.queue = a;
    a = a.dispatch = ii.bind(null, M, a);
    return [b.memoizedState, a];
  }
  function bi(a, b, c, d) {
    a = { tag: a, create: b, destroy: c, deps: d, next: null };
    b = M.updateQueue;
    null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
    return a;
  }
  function ji() {
    return Uh().memoizedState;
  }
  function ki(a, b, c, d) {
    var e = Th();
    M.flags |= a;
    e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
  }
  function li(a, b, c, d) {
    var e = Uh();
    d = void 0 === d ? null : d;
    var f = void 0;
    if (null !== N) {
      var g = N.memoizedState;
      f = g.destroy;
      if (null !== d && Mh(d, g.deps)) {
        e.memoizedState = bi(b, c, f, d);
        return;
      }
    }
    M.flags |= a;
    e.memoizedState = bi(1 | b, c, f, d);
  }
  function mi(a, b) {
    return ki(8390656, 8, a, b);
  }
  function $h(a, b) {
    return li(2048, 8, a, b);
  }
  function ni(a, b) {
    return li(4, 2, a, b);
  }
  function oi(a, b) {
    return li(4, 4, a, b);
  }
  function pi(a, b) {
    if ("function" === typeof b) return a = a(), b(a), function() {
      b(null);
    };
    if (null !== b && void 0 !== b) return a = a(), b.current = a, function() {
      b.current = null;
    };
  }
  function qi(a, b, c) {
    c = null !== c && void 0 !== c ? c.concat([a]) : null;
    return li(4, 4, pi.bind(null, b, a), c);
  }
  function ri() {
  }
  function si(a, b) {
    var c = Uh();
    b = void 0 === b ? null : b;
    var d = c.memoizedState;
    if (null !== d && null !== b && Mh(b, d[1])) return d[0];
    c.memoizedState = [a, b];
    return a;
  }
  function ti(a, b) {
    var c = Uh();
    b = void 0 === b ? null : b;
    var d = c.memoizedState;
    if (null !== d && null !== b && Mh(b, d[1])) return d[0];
    a = a();
    c.memoizedState = [a, b];
    return a;
  }
  function ui(a, b, c) {
    if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
    He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
    return b;
  }
  function vi(a, b) {
    var c = C;
    C = 0 !== c && 4 > c ? c : 4;
    a(true);
    var d = Gh.transition;
    Gh.transition = {};
    try {
      a(false), b();
    } finally {
      C = c, Gh.transition = d;
    }
  }
  function wi() {
    return Uh().memoizedState;
  }
  function xi(a, b, c) {
    var d = yi(a);
    c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
    if (zi(a)) Ai(b, c);
    else if (c = hh(a, b, c, d), null !== c) {
      var e = R();
      gi(c, a, d, e);
      Bi(c, b, d);
    }
  }
  function ii(a, b, c) {
    var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
    if (zi(a)) Ai(b, e);
    else {
      var f = a.alternate;
      if (0 === a.lanes && (null === f || 0 === f.lanes) && (f = b.lastRenderedReducer, null !== f)) try {
        var g = b.lastRenderedState, h = f(g, c);
        e.hasEagerState = true;
        e.eagerState = h;
        if (He(h, g)) {
          var k = b.interleaved;
          null === k ? (e.next = e, gh(b)) : (e.next = k.next, k.next = e);
          b.interleaved = e;
          return;
        }
      } catch (l) {
      } finally {
      }
      c = hh(a, b, e, d);
      null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
    }
  }
  function zi(a) {
    var b = a.alternate;
    return a === M || null !== b && b === M;
  }
  function Ai(a, b) {
    Jh = Ih = true;
    var c = a.pending;
    null === c ? b.next = b : (b.next = c.next, c.next = b);
    a.pending = b;
  }
  function Bi(a, b, c) {
    if (0 !== (c & 4194240)) {
      var d = b.lanes;
      d &= a.pendingLanes;
      c |= d;
      b.lanes = c;
      Cc(a, c);
    }
  }
  var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b) {
    Th().memoizedState = [a, void 0 === b ? null : b];
    return a;
  }, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
    c = null !== c && void 0 !== c ? c.concat([a]) : null;
    return ki(
      4194308,
      4,
      pi.bind(null, b, a),
      c
    );
  }, useLayoutEffect: function(a, b) {
    return ki(4194308, 4, a, b);
  }, useInsertionEffect: function(a, b) {
    return ki(4, 2, a, b);
  }, useMemo: function(a, b) {
    var c = Th();
    b = void 0 === b ? null : b;
    a = a();
    c.memoizedState = [a, b];
    return a;
  }, useReducer: function(a, b, c) {
    var d = Th();
    b = void 0 !== c ? c(b) : b;
    d.memoizedState = d.baseState = b;
    a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
    d.queue = a;
    a = a.dispatch = xi.bind(null, M, a);
    return [d.memoizedState, a];
  }, useRef: function(a) {
    var b = Th();
    a = { current: a };
    return b.memoizedState = a;
  }, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
    return Th().memoizedState = a;
  }, useTransition: function() {
    var a = hi(false), b = a[0];
    a = vi.bind(null, a[1]);
    Th().memoizedState = a;
    return [b, a];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(a, b, c) {
    var d = M, e = Th();
    if (I) {
      if (void 0 === c) throw Error(p(407));
      c = c();
    } else {
      c = b();
      if (null === Q) throw Error(p(349));
      0 !== (Hh & 30) || di(d, b, c);
    }
    e.memoizedState = c;
    var f = { value: c, getSnapshot: b };
    e.queue = f;
    mi(ai.bind(
      null,
      d,
      f,
      a
    ), [a]);
    d.flags |= 2048;
    bi(9, ci.bind(null, d, f, c, b), void 0, null);
    return c;
  }, useId: function() {
    var a = Th(), b = Q.identifierPrefix;
    if (I) {
      var c = sg;
      var d = rg;
      c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
      b = ":" + b + "R" + c;
      c = Kh++;
      0 < c && (b += "H" + c.toString(32));
      b += ":";
    } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
    return a.memoizedState = b;
  }, unstable_isNewReconciler: false }, Ph = {
    readContext: eh,
    useCallback: si,
    useContext: eh,
    useEffect: $h,
    useImperativeHandle: qi,
    useInsertionEffect: ni,
    useLayoutEffect: oi,
    useMemo: ti,
    useReducer: Wh,
    useRef: ji,
    useState: function() {
      return Wh(Vh);
    },
    useDebugValue: ri,
    useDeferredValue: function(a) {
      var b = Uh();
      return ui(b, N.memoizedState, a);
    },
    useTransition: function() {
      var a = Wh(Vh)[0], b = Uh().memoizedState;
      return [a, b];
    },
    useMutableSource: Yh,
    useSyncExternalStore: Zh,
    useId: wi,
    unstable_isNewReconciler: false
  }, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
    return Xh(Vh);
  }, useDebugValue: ri, useDeferredValue: function(a) {
    var b = Uh();
    return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
  }, useTransition: function() {
    var a = Xh(Vh)[0], b = Uh().memoizedState;
    return [a, b];
  }, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
  function Ci(a, b) {
    if (a && a.defaultProps) {
      b = A({}, b);
      a = a.defaultProps;
      for (var c in a) void 0 === b[c] && (b[c] = a[c]);
      return b;
    }
    return b;
  }
  function Di(a, b, c, d) {
    b = a.memoizedState;
    c = c(d, b);
    c = null === c || void 0 === c ? b : A({}, b, c);
    a.memoizedState = c;
    0 === a.lanes && (a.updateQueue.baseState = c);
  }
  var Ei = { isMounted: function(a) {
    return (a = a._reactInternals) ? Vb(a) === a : false;
  }, enqueueSetState: function(a, b, c) {
    a = a._reactInternals;
    var d = R(), e = yi(a), f = mh(d, e);
    f.payload = b;
    void 0 !== c && null !== c && (f.callback = c);
    b = nh(a, f, e);
    null !== b && (gi(b, a, e, d), oh(b, a, e));
  }, enqueueReplaceState: function(a, b, c) {
    a = a._reactInternals;
    var d = R(), e = yi(a), f = mh(d, e);
    f.tag = 1;
    f.payload = b;
    void 0 !== c && null !== c && (f.callback = c);
    b = nh(a, f, e);
    null !== b && (gi(b, a, e, d), oh(b, a, e));
  }, enqueueForceUpdate: function(a, b) {
    a = a._reactInternals;
    var c = R(), d = yi(a), e = mh(c, d);
    e.tag = 2;
    void 0 !== b && null !== b && (e.callback = b);
    b = nh(a, e, d);
    null !== b && (gi(b, a, d, c), oh(b, a, d));
  } };
  function Fi(a, b, c, d, e, f, g) {
    a = a.stateNode;
    return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f) : true;
  }
  function Gi(a, b, c) {
    var d = false, e = Vf;
    var f = b.contextType;
    "object" === typeof f && null !== f ? f = eh(f) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
    b = new b(c, f);
    a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
    b.updater = Ei;
    a.stateNode = b;
    b._reactInternals = a;
    d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f);
    return b;
  }
  function Hi(a, b, c, d) {
    a = b.state;
    "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
    "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
    b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
  }
  function Ii(a, b, c, d) {
    var e = a.stateNode;
    e.props = c;
    e.state = a.memoizedState;
    e.refs = {};
    kh(a);
    var f = b.contextType;
    "object" === typeof f && null !== f ? e.context = eh(f) : (f = Zf(b) ? Xf : H.current, e.context = Yf(a, f));
    e.state = a.memoizedState;
    f = b.getDerivedStateFromProps;
    "function" === typeof f && (Di(a, b, f, c), e.state = a.memoizedState);
    "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
    "function" === typeof e.componentDidMount && (a.flags |= 4194308);
  }
  function Ji(a, b) {
    try {
      var c = "", d = b;
      do
        c += Pa(d), d = d.return;
      while (d);
      var e = c;
    } catch (f) {
      e = "\nError generating stack: " + f.message + "\n" + f.stack;
    }
    return { value: a, source: b, stack: e, digest: null };
  }
  function Ki(a, b, c) {
    return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
  }
  function Li(a, b) {
    try {
      console.error(b.value);
    } catch (c) {
      setTimeout(function() {
        throw c;
      });
    }
  }
  var Mi = "function" === typeof WeakMap ? WeakMap : Map;
  function Ni(a, b, c) {
    c = mh(-1, c);
    c.tag = 3;
    c.payload = { element: null };
    var d = b.value;
    c.callback = function() {
      Oi || (Oi = true, Pi = d);
      Li(a, b);
    };
    return c;
  }
  function Qi(a, b, c) {
    c = mh(-1, c);
    c.tag = 3;
    var d = a.type.getDerivedStateFromError;
    if ("function" === typeof d) {
      var e = b.value;
      c.payload = function() {
        return d(e);
      };
      c.callback = function() {
        Li(a, b);
      };
    }
    var f = a.stateNode;
    null !== f && "function" === typeof f.componentDidCatch && (c.callback = function() {
      Li(a, b);
      "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
      var c2 = b.stack;
      this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
    });
    return c;
  }
  function Si(a, b, c) {
    var d = a.pingCache;
    if (null === d) {
      d = a.pingCache = new Mi();
      var e = /* @__PURE__ */ new Set();
      d.set(b, e);
    } else e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
    e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
  }
  function Ui(a) {
    do {
      var b;
      if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
      if (b) return a;
      a = a.return;
    } while (null !== a);
    return null;
  }
  function Vi(a, b, c, d, e) {
    if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
    a.flags |= 65536;
    a.lanes = e;
    return a;
  }
  var Wi = ua.ReactCurrentOwner, dh = false;
  function Xi(a, b, c, d) {
    b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
  }
  function Yi(a, b, c, d, e) {
    c = c.render;
    var f = b.ref;
    ch(b, e);
    d = Nh(a, b, c, d, f, e);
    c = Sh();
    if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
    I && c && vg(b);
    b.flags |= 1;
    Xi(a, b, d, e);
    return b.child;
  }
  function $i(a, b, c, d, e) {
    if (null === a) {
      var f = c.type;
      if ("function" === typeof f && !aj(f) && void 0 === f.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f, bj(a, b, f, d, e);
      a = Rg(c.type, null, d, b, b.mode, e);
      a.ref = b.ref;
      a.return = b;
      return b.child = a;
    }
    f = a.child;
    if (0 === (a.lanes & e)) {
      var g = f.memoizedProps;
      c = c.compare;
      c = null !== c ? c : Ie;
      if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
    }
    b.flags |= 1;
    a = Pg(f, d);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  function bj(a, b, c, d, e) {
    if (null !== a) {
      var f = a.memoizedProps;
      if (Ie(f, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
      else return b.lanes = a.lanes, Zi(a, b, e);
    }
    return cj(a, b, c, d, e);
  }
  function dj(a, b, c) {
    var d = b.pendingProps, e = d.children, f = null !== a ? a.memoizedState : null;
    if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
    else {
      if (0 === (c & 1073741824)) return a = null !== f ? f.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
      b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
      d = null !== f ? f.baseLanes : c;
      G(ej, fj);
      fj |= d;
    }
    else null !== f ? (d = f.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
    Xi(a, b, e, c);
    return b.child;
  }
  function gj(a, b) {
    var c = b.ref;
    if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
  }
  function cj(a, b, c, d, e) {
    var f = Zf(c) ? Xf : H.current;
    f = Yf(b, f);
    ch(b, e);
    c = Nh(a, b, c, d, f, e);
    d = Sh();
    if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
    I && d && vg(b);
    b.flags |= 1;
    Xi(a, b, c, e);
    return b.child;
  }
  function hj(a, b, c, d, e) {
    if (Zf(c)) {
      var f = true;
      cg(b);
    } else f = false;
    ch(b, e);
    if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
    else if (null === a) {
      var g = b.stateNode, h = b.memoizedProps;
      g.props = h;
      var k = g.context, l = c.contextType;
      "object" === typeof l && null !== l ? l = eh(l) : (l = Zf(c) ? Xf : H.current, l = Yf(b, l));
      var m = c.getDerivedStateFromProps, q = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate;
      q || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Hi(b, g, d, l);
      jh = false;
      var r = b.memoizedState;
      g.state = r;
      qh(b, d, g, e);
      k = b.memoizedState;
      h !== d || r !== k || Wf.current || jh ? ("function" === typeof m && (Di(b, c, m, d), k = b.memoizedState), (h = jh || Fi(b, c, h, d, r, k, l)) ? (q || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k), g.props = d, g.state = k, g.context = l, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
    } else {
      g = b.stateNode;
      lh(a, b);
      h = b.memoizedProps;
      l = b.type === b.elementType ? h : Ci(b.type, h);
      g.props = l;
      q = b.pendingProps;
      r = g.context;
      k = c.contextType;
      "object" === typeof k && null !== k ? k = eh(k) : (k = Zf(c) ? Xf : H.current, k = Yf(b, k));
      var y = c.getDerivedStateFromProps;
      (m = "function" === typeof y || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q || r !== k) && Hi(b, g, d, k);
      jh = false;
      r = b.memoizedState;
      g.state = r;
      qh(b, d, g, e);
      var n = b.memoizedState;
      h !== q || r !== n || Wf.current || jh ? ("function" === typeof y && (Di(b, c, y, d), n = b.memoizedState), (l = jh || Fi(b, c, l, d, r, n, k) || false) ? (m || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n, k), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n, k)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n), g.props = d, g.state = n, g.context = k, d = l) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), d = false);
    }
    return jj(a, b, c, d, f, e);
  }
  function jj(a, b, c, d, e, f) {
    gj(a, b);
    var g = 0 !== (b.flags & 128);
    if (!d && !g) return e && dg(b, c, false), Zi(a, b, f);
    d = b.stateNode;
    Wi.current = b;
    var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
    b.flags |= 1;
    null !== a && g ? (b.child = Ug(b, a.child, null, f), b.child = Ug(b, null, h, f)) : Xi(a, b, h, f);
    b.memoizedState = d.state;
    e && dg(b, c, true);
    return b.child;
  }
  function kj(a) {
    var b = a.stateNode;
    b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
    yh(a, b.containerInfo);
  }
  function lj(a, b, c, d, e) {
    Ig();
    Jg(e);
    b.flags |= 256;
    Xi(a, b, c, d);
    return b.child;
  }
  var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
  function nj(a) {
    return { baseLanes: a, cachePool: null, transitions: null };
  }
  function oj(a, b, c) {
    var d = b.pendingProps, e = L.current, f = false, g = 0 !== (b.flags & 128), h;
    (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
    if (h) f = true, b.flags &= -129;
    else if (null === a || null !== a.memoizedState) e |= 1;
    G(L, e & 1);
    if (null === a) {
      Eg(b);
      a = b.memoizedState;
      if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
      g = d.children;
      a = d.fallback;
      return f ? (d = b.mode, f = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f ? (f.childLanes = 0, f.pendingProps = g) : f = pj(g, d, 0, null), a = Tg(a, d, c, null), f.return = b, a.return = b, f.sibling = a, b.child = f, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
    }
    e = a.memoizedState;
    if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
    if (f) {
      f = d.fallback;
      g = b.mode;
      e = a.child;
      h = e.sibling;
      var k = { mode: "hidden", children: d.children };
      0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k, b.deletions = null) : (d = Pg(e, k), d.subtreeFlags = e.subtreeFlags & 14680064);
      null !== h ? f = Pg(h, f) : (f = Tg(f, g, c, null), f.flags |= 2);
      f.return = b;
      d.return = b;
      d.sibling = f;
      b.child = d;
      d = f;
      f = b.child;
      g = a.child.memoizedState;
      g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
      f.memoizedState = g;
      f.childLanes = a.childLanes & ~c;
      b.memoizedState = mj;
      return d;
    }
    f = a.child;
    a = f.sibling;
    d = Pg(f, { mode: "visible", children: d.children });
    0 === (b.mode & 1) && (d.lanes = c);
    d.return = b;
    d.sibling = null;
    null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
    b.child = d;
    b.memoizedState = null;
    return d;
  }
  function qj(a, b) {
    b = pj({ mode: "visible", children: b }, a.mode, 0, null);
    b.return = a;
    return a.child = b;
  }
  function sj(a, b, c, d) {
    null !== d && Jg(d);
    Ug(b, a.child, null, c);
    a = qj(b, b.pendingProps.children);
    a.flags |= 2;
    b.memoizedState = null;
    return a;
  }
  function rj(a, b, c, d, e, f, g) {
    if (c) {
      if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
      if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
      f = d.fallback;
      e = b.mode;
      d = pj({ mode: "visible", children: d.children }, e, 0, null);
      f = Tg(f, e, g, null);
      f.flags |= 2;
      d.return = b;
      f.return = b;
      d.sibling = f;
      b.child = d;
      0 !== (b.mode & 1) && Ug(b, a.child, null, g);
      b.child.memoizedState = nj(g);
      b.memoizedState = mj;
      return f;
    }
    if (0 === (b.mode & 1)) return sj(a, b, g, null);
    if ("$!" === e.data) {
      d = e.nextSibling && e.nextSibling.dataset;
      if (d) var h = d.dgst;
      d = h;
      f = Error(p(419));
      d = Ki(f, d, void 0);
      return sj(a, b, g, d);
    }
    h = 0 !== (g & a.childLanes);
    if (dh || h) {
      d = Q;
      if (null !== d) {
        switch (g & -g) {
          case 4:
            e = 2;
            break;
          case 16:
            e = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            e = 32;
            break;
          case 536870912:
            e = 268435456;
            break;
          default:
            e = 0;
        }
        e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
        0 !== e && e !== f.retryLane && (f.retryLane = e, ih(a, e), gi(d, a, e, -1));
      }
      tj();
      d = Ki(Error(p(421)));
      return sj(a, b, g, d);
    }
    if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
    a = f.treeContext;
    yg = Lf(e.nextSibling);
    xg = b;
    I = true;
    zg = null;
    null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
    b = qj(b, d.children);
    b.flags |= 4096;
    return b;
  }
  function vj(a, b, c) {
    a.lanes |= b;
    var d = a.alternate;
    null !== d && (d.lanes |= b);
    bh(a.return, b, c);
  }
  function wj(a, b, c, d, e) {
    var f = a.memoizedState;
    null === f ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f.isBackwards = b, f.rendering = null, f.renderingStartTime = 0, f.last = d, f.tail = c, f.tailMode = e);
  }
  function xj(a, b, c) {
    var d = b.pendingProps, e = d.revealOrder, f = d.tail;
    Xi(a, b, d.children, c);
    d = L.current;
    if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
    else {
      if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a; ) {
        if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);
        else if (19 === a.tag) vj(a, c, b);
        else if (null !== a.child) {
          a.child.return = a;
          a = a.child;
          continue;
        }
        if (a === b) break a;
        for (; null === a.sibling; ) {
          if (null === a.return || a.return === b) break a;
          a = a.return;
        }
        a.sibling.return = a.return;
        a = a.sibling;
      }
      d &= 1;
    }
    G(L, d);
    if (0 === (b.mode & 1)) b.memoizedState = null;
    else switch (e) {
      case "forwards":
        c = b.child;
        for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
        c = e;
        null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
        wj(b, false, e, c, f);
        break;
      case "backwards":
        c = null;
        e = b.child;
        for (b.child = null; null !== e; ) {
          a = e.alternate;
          if (null !== a && null === Ch(a)) {
            b.child = e;
            break;
          }
          a = e.sibling;
          e.sibling = c;
          c = e;
          e = a;
        }
        wj(b, true, c, null, f);
        break;
      case "together":
        wj(b, false, null, null, void 0);
        break;
      default:
        b.memoizedState = null;
    }
    return b.child;
  }
  function ij(a, b) {
    0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
  }
  function Zi(a, b, c) {
    null !== a && (b.dependencies = a.dependencies);
    rh |= b.lanes;
    if (0 === (c & b.childLanes)) return null;
    if (null !== a && b.child !== a.child) throw Error(p(153));
    if (null !== b.child) {
      a = b.child;
      c = Pg(a, a.pendingProps);
      b.child = c;
      for (c.return = b; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
      c.sibling = null;
    }
    return b.child;
  }
  function yj(a, b, c) {
    switch (b.tag) {
      case 3:
        kj(b);
        Ig();
        break;
      case 5:
        Ah(b);
        break;
      case 1:
        Zf(b.type) && cg(b);
        break;
      case 4:
        yh(b, b.stateNode.containerInfo);
        break;
      case 10:
        var d = b.type._context, e = b.memoizedProps.value;
        G(Wg, d._currentValue);
        d._currentValue = e;
        break;
      case 13:
        d = b.memoizedState;
        if (null !== d) {
          if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
          if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
          G(L, L.current & 1);
          a = Zi(a, b, c);
          return null !== a ? a.sibling : null;
        }
        G(L, L.current & 1);
        break;
      case 19:
        d = 0 !== (c & b.childLanes);
        if (0 !== (a.flags & 128)) {
          if (d) return xj(a, b, c);
          b.flags |= 128;
        }
        e = b.memoizedState;
        null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
        G(L, L.current);
        if (d) break;
        else return null;
      case 22:
      case 23:
        return b.lanes = 0, dj(a, b, c);
    }
    return Zi(a, b, c);
  }
  var zj, Aj, Bj, Cj;
  zj = function(a, b) {
    for (var c = b.child; null !== c; ) {
      if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
      else if (4 !== c.tag && null !== c.child) {
        c.child.return = c;
        c = c.child;
        continue;
      }
      if (c === b) break;
      for (; null === c.sibling; ) {
        if (null === c.return || c.return === b) return;
        c = c.return;
      }
      c.sibling.return = c.return;
      c = c.sibling;
    }
  };
  Aj = function() {
  };
  Bj = function(a, b, c, d) {
    var e = a.memoizedProps;
    if (e !== d) {
      a = b.stateNode;
      xh(uh.current);
      var f = null;
      switch (c) {
        case "input":
          e = Ya(a, e);
          d = Ya(a, d);
          f = [];
          break;
        case "select":
          e = A({}, e, { value: void 0 });
          d = A({}, d, { value: void 0 });
          f = [];
          break;
        case "textarea":
          e = gb(a, e);
          d = gb(a, d);
          f = [];
          break;
        default:
          "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
      }
      ub(c, d);
      var g;
      c = null;
      for (l in e) if (!d.hasOwnProperty(l) && e.hasOwnProperty(l) && null != e[l]) if ("style" === l) {
        var h = e[l];
        for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
      } else "dangerouslySetInnerHTML" !== l && "children" !== l && "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && "autoFocus" !== l && (ea.hasOwnProperty(l) ? f || (f = []) : (f = f || []).push(l, null));
      for (l in d) {
        var k = d[l];
        h = null != e ? e[l] : void 0;
        if (d.hasOwnProperty(l) && k !== h && (null != k || null != h)) if ("style" === l) if (h) {
          for (g in h) !h.hasOwnProperty(g) || k && k.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
          for (g in k) k.hasOwnProperty(g) && h[g] !== k[g] && (c || (c = {}), c[g] = k[g]);
        } else c || (f || (f = []), f.push(
          l,
          c
        )), c = k;
        else "dangerouslySetInnerHTML" === l ? (k = k ? k.__html : void 0, h = h ? h.__html : void 0, null != k && h !== k && (f = f || []).push(l, k)) : "children" === l ? "string" !== typeof k && "number" !== typeof k || (f = f || []).push(l, "" + k) : "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && (ea.hasOwnProperty(l) ? (null != k && "onScroll" === l && D("scroll", a), f || h === k || (f = [])) : (f = f || []).push(l, k));
      }
      c && (f = f || []).push("style", c);
      var l = f;
      if (b.updateQueue = l) b.flags |= 4;
    }
  };
  Cj = function(a, b, c, d) {
    c !== d && (b.flags |= 4);
  };
  function Dj(a, b) {
    if (!I) switch (a.tailMode) {
      case "hidden":
        b = a.tail;
        for (var c = null; null !== b; ) null !== b.alternate && (c = b), b = b.sibling;
        null === c ? a.tail = null : c.sibling = null;
        break;
      case "collapsed":
        c = a.tail;
        for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
        null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
    }
  }
  function S(a) {
    var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
    if (b) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
    else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
    a.subtreeFlags |= d;
    a.childLanes = c;
    return b;
  }
  function Ej(a, b, c) {
    var d = b.pendingProps;
    wg(b);
    switch (b.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return S(b), null;
      case 1:
        return Zf(b.type) && $f(), S(b), null;
      case 3:
        d = b.stateNode;
        zh();
        E(Wf);
        E(H);
        Eh();
        d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
        if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
        Aj(a, b);
        S(b);
        return null;
      case 5:
        Bh(b);
        var e = xh(wh.current);
        c = b.type;
        if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
        else {
          if (!d) {
            if (null === b.stateNode) throw Error(p(166));
            S(b);
            return null;
          }
          a = xh(uh.current);
          if (Gg(b)) {
            d = b.stateNode;
            c = b.type;
            var f = b.memoizedProps;
            d[Of] = b;
            d[Pf] = f;
            a = 0 !== (b.mode & 1);
            switch (c) {
              case "dialog":
                D("cancel", d);
                D("close", d);
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", d);
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++) D(lf[e], d);
                break;
              case "source":
                D("error", d);
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  d
                );
                D("load", d);
                break;
              case "details":
                D("toggle", d);
                break;
              case "input":
                Za(d, f);
                D("invalid", d);
                break;
              case "select":
                d._wrapperState = { wasMultiple: !!f.multiple };
                D("invalid", d);
                break;
              case "textarea":
                hb(d, f), D("invalid", d);
            }
            ub(c, f);
            e = null;
            for (var g in f) if (f.hasOwnProperty(g)) {
              var h = f[g];
              "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f.suppressHydrationWarning && Af(
                d.textContent,
                h,
                a
              ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
            }
            switch (c) {
              case "input":
                Va(d);
                db(d, f, true);
                break;
              case "textarea":
                Va(d);
                jb(d);
                break;
              case "select":
              case "option":
                break;
              default:
                "function" === typeof f.onClick && (d.onclick = Bf);
            }
            d = e;
            b.updateQueue = d;
            null !== d && (b.flags |= 4);
          } else {
            g = 9 === e.nodeType ? e : e.ownerDocument;
            "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
            "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
            a[Of] = b;
            a[Pf] = d;
            zj(a, b, false, false);
            b.stateNode = a;
            a: {
              g = vb(c, d);
              switch (c) {
                case "dialog":
                  D("cancel", a);
                  D("close", a);
                  e = d;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  D("load", a);
                  e = d;
                  break;
                case "video":
                case "audio":
                  for (e = 0; e < lf.length; e++) D(lf[e], a);
                  e = d;
                  break;
                case "source":
                  D("error", a);
                  e = d;
                  break;
                case "img":
                case "image":
                case "link":
                  D(
                    "error",
                    a
                  );
                  D("load", a);
                  e = d;
                  break;
                case "details":
                  D("toggle", a);
                  e = d;
                  break;
                case "input":
                  Za(a, d);
                  e = Ya(a, d);
                  D("invalid", a);
                  break;
                case "option":
                  e = d;
                  break;
                case "select":
                  a._wrapperState = { wasMultiple: !!d.multiple };
                  e = A({}, d, { value: void 0 });
                  D("invalid", a);
                  break;
                case "textarea":
                  hb(a, d);
                  e = gb(a, d);
                  D("invalid", a);
                  break;
                default:
                  e = d;
              }
              ub(c, e);
              h = e;
              for (f in h) if (h.hasOwnProperty(f)) {
                var k = h[f];
                "style" === f ? sb(a, k) : "dangerouslySetInnerHTML" === f ? (k = k ? k.__html : void 0, null != k && nb(a, k)) : "children" === f ? "string" === typeof k ? ("textarea" !== c || "" !== k) && ob(a, k) : "number" === typeof k && ob(a, "" + k) : "suppressContentEditableWarning" !== f && "suppressHydrationWarning" !== f && "autoFocus" !== f && (ea.hasOwnProperty(f) ? null != k && "onScroll" === f && D("scroll", a) : null != k && ta(a, f, k, g));
              }
              switch (c) {
                case "input":
                  Va(a);
                  db(a, d, false);
                  break;
                case "textarea":
                  Va(a);
                  jb(a);
                  break;
                case "option":
                  null != d.value && a.setAttribute("value", "" + Sa(d.value));
                  break;
                case "select":
                  a.multiple = !!d.multiple;
                  f = d.value;
                  null != f ? fb(a, !!d.multiple, f, false) : null != d.defaultValue && fb(
                    a,
                    !!d.multiple,
                    d.defaultValue,
                    true
                  );
                  break;
                default:
                  "function" === typeof e.onClick && (a.onclick = Bf);
              }
              switch (c) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  d = !!d.autoFocus;
                  break a;
                case "img":
                  d = true;
                  break a;
                default:
                  d = false;
              }
            }
            d && (b.flags |= 4);
          }
          null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
        }
        S(b);
        return null;
      case 6:
        if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);
        else {
          if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
          c = xh(wh.current);
          xh(uh.current);
          if (Gg(b)) {
            d = b.stateNode;
            c = b.memoizedProps;
            d[Of] = b;
            if (f = d.nodeValue !== c) {
              if (a = xg, null !== a) switch (a.tag) {
                case 3:
                  Af(d.nodeValue, c, 0 !== (a.mode & 1));
                  break;
                case 5:
                  true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
              }
            }
            f && (b.flags |= 4);
          } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
        }
        S(b);
        return null;
      case 13:
        E(L);
        d = b.memoizedState;
        if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
          if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f = false;
          else if (f = Gg(b), null !== d && null !== d.dehydrated) {
            if (null === a) {
              if (!f) throw Error(p(318));
              f = b.memoizedState;
              f = null !== f ? f.dehydrated : null;
              if (!f) throw Error(p(317));
              f[Of] = b;
            } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
            S(b);
            f = false;
          } else null !== zg && (Fj(zg), zg = null), f = true;
          if (!f) return b.flags & 65536 ? b : null;
        }
        if (0 !== (b.flags & 128)) return b.lanes = c, b;
        d = null !== d;
        d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
        null !== b.updateQueue && (b.flags |= 4);
        S(b);
        return null;
      case 4:
        return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
      case 10:
        return ah(b.type._context), S(b), null;
      case 17:
        return Zf(b.type) && $f(), S(b), null;
      case 19:
        E(L);
        f = b.memoizedState;
        if (null === f) return S(b), null;
        d = 0 !== (b.flags & 128);
        g = f.rendering;
        if (null === g) if (d) Dj(f, false);
        else {
          if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
            g = Ch(a);
            if (null !== g) {
              b.flags |= 128;
              Dj(f, false);
              d = g.updateQueue;
              null !== d && (b.updateQueue = d, b.flags |= 4);
              b.subtreeFlags = 0;
              d = c;
              for (c = b.child; null !== c; ) f = c, a = d, f.flags &= 14680066, g = f.alternate, null === g ? (f.childLanes = 0, f.lanes = a, f.child = null, f.subtreeFlags = 0, f.memoizedProps = null, f.memoizedState = null, f.updateQueue = null, f.dependencies = null, f.stateNode = null) : (f.childLanes = g.childLanes, f.lanes = g.lanes, f.child = g.child, f.subtreeFlags = 0, f.deletions = null, f.memoizedProps = g.memoizedProps, f.memoizedState = g.memoizedState, f.updateQueue = g.updateQueue, f.type = g.type, a = g.dependencies, f.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
              G(L, L.current & 1 | 2);
              return b.child;
            }
            a = a.sibling;
          }
          null !== f.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f, false), b.lanes = 4194304);
        }
        else {
          if (!d) if (a = Ch(g), null !== a) {
            if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f, true), null === f.tail && "hidden" === f.tailMode && !g.alternate && !I) return S(b), null;
          } else 2 * B() - f.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f, false), b.lanes = 4194304);
          f.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f.last, null !== c ? c.sibling = g : b.child = g, f.last = g);
        }
        if (null !== f.tail) return b = f.tail, f.rendering = b, f.tail = b.sibling, f.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
        S(b);
        return null;
      case 22:
      case 23:
        return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(p(156, b.tag));
  }
  function Ij(a, b) {
    wg(b);
    switch (b.tag) {
      case 1:
        return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
      case 3:
        return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
      case 5:
        return Bh(b), null;
      case 13:
        E(L);
        a = b.memoizedState;
        if (null !== a && null !== a.dehydrated) {
          if (null === b.alternate) throw Error(p(340));
          Ig();
        }
        a = b.flags;
        return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
      case 19:
        return E(L), null;
      case 4:
        return zh(), null;
      case 10:
        return ah(b.type._context), null;
      case 22:
      case 23:
        return Hj(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
  function Lj(a, b) {
    var c = a.ref;
    if (null !== c) if ("function" === typeof c) try {
      c(null);
    } catch (d) {
      W(a, b, d);
    }
    else c.current = null;
  }
  function Mj(a, b, c) {
    try {
      c();
    } catch (d) {
      W(a, b, d);
    }
  }
  var Nj = false;
  function Oj(a, b) {
    Cf = dd;
    a = Me();
    if (Ne(a)) {
      if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
      else a: {
        c = (c = a.ownerDocument) && c.defaultView || window;
        var d = c.getSelection && c.getSelection();
        if (d && 0 !== d.rangeCount) {
          c = d.anchorNode;
          var e = d.anchorOffset, f = d.focusNode;
          d = d.focusOffset;
          try {
            c.nodeType, f.nodeType;
          } catch (F) {
            c = null;
            break a;
          }
          var g = 0, h = -1, k = -1, l = 0, m = 0, q = a, r = null;
          b: for (; ; ) {
            for (var y; ; ) {
              q !== c || 0 !== e && 3 !== q.nodeType || (h = g + e);
              q !== f || 0 !== d && 3 !== q.nodeType || (k = g + d);
              3 === q.nodeType && (g += q.nodeValue.length);
              if (null === (y = q.firstChild)) break;
              r = q;
              q = y;
            }
            for (; ; ) {
              if (q === a) break b;
              r === c && ++l === e && (h = g);
              r === f && ++m === d && (k = g);
              if (null !== (y = q.nextSibling)) break;
              q = r;
              r = q.parentNode;
            }
            q = y;
          }
          c = -1 === h || -1 === k ? null : { start: h, end: k };
        } else c = null;
      }
      c = c || { start: 0, end: 0 };
    } else c = null;
    Df = { focusedElem: a, selectionRange: c };
    dd = false;
    for (V = b; null !== V; ) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;
    else for (; null !== V; ) {
      b = V;
      try {
        var n = b.alternate;
        if (0 !== (b.flags & 1024)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (null !== n) {
              var t = n.memoizedProps, J = n.memoizedState, x = b.stateNode, w = x.getSnapshotBeforeUpdate(b.elementType === b.type ? t : Ci(b.type, t), J);
              x.__reactInternalSnapshotBeforeUpdate = w;
            }
            break;
          case 3:
            var u = b.stateNode.containerInfo;
            1 === u.nodeType ? u.textContent = "" : 9 === u.nodeType && u.documentElement && u.removeChild(u.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(p(163));
        }
      } catch (F) {
        W(b, b.return, F);
      }
      a = b.sibling;
      if (null !== a) {
        a.return = b.return;
        V = a;
        break;
      }
      V = b.return;
    }
    n = Nj;
    Nj = false;
    return n;
  }
  function Pj(a, b, c) {
    var d = b.updateQueue;
    d = null !== d ? d.lastEffect : null;
    if (null !== d) {
      var e = d = d.next;
      do {
        if ((e.tag & a) === a) {
          var f = e.destroy;
          e.destroy = void 0;
          void 0 !== f && Mj(b, c, f);
        }
        e = e.next;
      } while (e !== d);
    }
  }
  function Qj(a, b) {
    b = b.updateQueue;
    b = null !== b ? b.lastEffect : null;
    if (null !== b) {
      var c = b = b.next;
      do {
        if ((c.tag & a) === a) {
          var d = c.create;
          c.destroy = d();
        }
        c = c.next;
      } while (c !== b);
    }
  }
  function Rj(a) {
    var b = a.ref;
    if (null !== b) {
      var c = a.stateNode;
      switch (a.tag) {
        case 5:
          a = c;
          break;
        default:
          a = c;
      }
      "function" === typeof b ? b(a) : b.current = a;
    }
  }
  function Sj(a) {
    var b = a.alternate;
    null !== b && (a.alternate = null, Sj(b));
    a.child = null;
    a.deletions = null;
    a.sibling = null;
    5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
    a.stateNode = null;
    a.return = null;
    a.dependencies = null;
    a.memoizedProps = null;
    a.memoizedState = null;
    a.pendingProps = null;
    a.stateNode = null;
    a.updateQueue = null;
  }
  function Tj(a) {
    return 5 === a.tag || 3 === a.tag || 4 === a.tag;
  }
  function Uj(a) {
    a: for (; ; ) {
      for (; null === a.sibling; ) {
        if (null === a.return || Tj(a.return)) return null;
        a = a.return;
      }
      a.sibling.return = a.return;
      for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
        if (a.flags & 2) continue a;
        if (null === a.child || 4 === a.tag) continue a;
        else a.child.return = a, a = a.child;
      }
      if (!(a.flags & 2)) return a.stateNode;
    }
  }
  function Vj(a, b, c) {
    var d = a.tag;
    if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
    else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a; ) Vj(a, b, c), a = a.sibling;
  }
  function Wj(a, b, c) {
    var d = a.tag;
    if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
    else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a; ) Wj(a, b, c), a = a.sibling;
  }
  var X = null, Xj = false;
  function Yj(a, b, c) {
    for (c = c.child; null !== c; ) Zj(a, b, c), c = c.sibling;
  }
  function Zj(a, b, c) {
    if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
      lc.onCommitFiberUnmount(kc, c);
    } catch (h) {
    }
    switch (c.tag) {
      case 5:
        U || Lj(c, b);
      case 6:
        var d = X, e = Xj;
        X = null;
        Yj(a, b, c);
        X = d;
        Xj = e;
        null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
        break;
      case 18:
        null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
        break;
      case 4:
        d = X;
        e = Xj;
        X = c.stateNode.containerInfo;
        Xj = true;
        Yj(a, b, c);
        X = d;
        Xj = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
          e = d = d.next;
          do {
            var f = e, g = f.destroy;
            f = f.tag;
            void 0 !== g && (0 !== (f & 2) ? Mj(c, b, g) : 0 !== (f & 4) && Mj(c, b, g));
            e = e.next;
          } while (e !== d);
        }
        Yj(a, b, c);
        break;
      case 1:
        if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
          d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
        } catch (h) {
          W(c, b, h);
        }
        Yj(a, b, c);
        break;
      case 21:
        Yj(a, b, c);
        break;
      case 22:
        c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
        break;
      default:
        Yj(a, b, c);
    }
  }
  function ak(a) {
    var b = a.updateQueue;
    if (null !== b) {
      a.updateQueue = null;
      var c = a.stateNode;
      null === c && (c = a.stateNode = new Kj());
      b.forEach(function(b2) {
        var d = bk.bind(null, a, b2);
        c.has(b2) || (c.add(b2), b2.then(d, d));
      });
    }
  }
  function ck(a, b) {
    var c = b.deletions;
    if (null !== c) for (var d = 0; d < c.length; d++) {
      var e = c[d];
      try {
        var f = a, g = b, h = g;
        a: for (; null !== h; ) {
          switch (h.tag) {
            case 5:
              X = h.stateNode;
              Xj = false;
              break a;
            case 3:
              X = h.stateNode.containerInfo;
              Xj = true;
              break a;
            case 4:
              X = h.stateNode.containerInfo;
              Xj = true;
              break a;
          }
          h = h.return;
        }
        if (null === X) throw Error(p(160));
        Zj(f, g, e);
        X = null;
        Xj = false;
        var k = e.alternate;
        null !== k && (k.return = null);
        e.return = null;
      } catch (l) {
        W(e, b, l);
      }
    }
    if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a), b = b.sibling;
  }
  function dk(a, b) {
    var c = a.alternate, d = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        ck(b, a);
        ek(a);
        if (d & 4) {
          try {
            Pj(3, a, a.return), Qj(3, a);
          } catch (t) {
            W(a, a.return, t);
          }
          try {
            Pj(5, a, a.return);
          } catch (t) {
            W(a, a.return, t);
          }
        }
        break;
      case 1:
        ck(b, a);
        ek(a);
        d & 512 && null !== c && Lj(c, c.return);
        break;
      case 5:
        ck(b, a);
        ek(a);
        d & 512 && null !== c && Lj(c, c.return);
        if (a.flags & 32) {
          var e = a.stateNode;
          try {
            ob(e, "");
          } catch (t) {
            W(a, a.return, t);
          }
        }
        if (d & 4 && (e = a.stateNode, null != e)) {
          var f = a.memoizedProps, g = null !== c ? c.memoizedProps : f, h = a.type, k = a.updateQueue;
          a.updateQueue = null;
          if (null !== k) try {
            "input" === h && "radio" === f.type && null != f.name && ab(e, f);
            vb(h, g);
            var l = vb(h, f);
            for (g = 0; g < k.length; g += 2) {
              var m = k[g], q = k[g + 1];
              "style" === m ? sb(e, q) : "dangerouslySetInnerHTML" === m ? nb(e, q) : "children" === m ? ob(e, q) : ta(e, m, q, l);
            }
            switch (h) {
              case "input":
                bb(e, f);
                break;
              case "textarea":
                ib(e, f);
                break;
              case "select":
                var r = e._wrapperState.wasMultiple;
                e._wrapperState.wasMultiple = !!f.multiple;
                var y = f.value;
                null != y ? fb(e, !!f.multiple, y, false) : r !== !!f.multiple && (null != f.defaultValue ? fb(
                  e,
                  !!f.multiple,
                  f.defaultValue,
                  true
                ) : fb(e, !!f.multiple, f.multiple ? [] : "", false));
            }
            e[Pf] = f;
          } catch (t) {
            W(a, a.return, t);
          }
        }
        break;
      case 6:
        ck(b, a);
        ek(a);
        if (d & 4) {
          if (null === a.stateNode) throw Error(p(162));
          e = a.stateNode;
          f = a.memoizedProps;
          try {
            e.nodeValue = f;
          } catch (t) {
            W(a, a.return, t);
          }
        }
        break;
      case 3:
        ck(b, a);
        ek(a);
        if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
          bd(b.containerInfo);
        } catch (t) {
          W(a, a.return, t);
        }
        break;
      case 4:
        ck(b, a);
        ek(a);
        break;
      case 13:
        ck(b, a);
        ek(a);
        e = a.child;
        e.flags & 8192 && (f = null !== e.memoizedState, e.stateNode.isHidden = f, !f || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
        d & 4 && ak(a);
        break;
      case 22:
        m = null !== c && null !== c.memoizedState;
        a.mode & 1 ? (U = (l = U) || m, ck(b, a), U = l) : ck(b, a);
        ek(a);
        if (d & 8192) {
          l = null !== a.memoizedState;
          if ((a.stateNode.isHidden = l) && !m && 0 !== (a.mode & 1)) for (V = a, m = a.child; null !== m; ) {
            for (q = V = m; null !== V; ) {
              r = V;
              y = r.child;
              switch (r.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Pj(4, r, r.return);
                  break;
                case 1:
                  Lj(r, r.return);
                  var n = r.stateNode;
                  if ("function" === typeof n.componentWillUnmount) {
                    d = r;
                    c = r.return;
                    try {
                      b = d, n.props = b.memoizedProps, n.state = b.memoizedState, n.componentWillUnmount();
                    } catch (t) {
                      W(d, c, t);
                    }
                  }
                  break;
                case 5:
                  Lj(r, r.return);
                  break;
                case 22:
                  if (null !== r.memoizedState) {
                    gk(q);
                    continue;
                  }
              }
              null !== y ? (y.return = r, V = y) : gk(q);
            }
            m = m.sibling;
          }
          a: for (m = null, q = a; ; ) {
            if (5 === q.tag) {
              if (null === m) {
                m = q;
                try {
                  e = q.stateNode, l ? (f = e.style, "function" === typeof f.setProperty ? f.setProperty("display", "none", "important") : f.display = "none") : (h = q.stateNode, k = q.memoizedProps.style, g = void 0 !== k && null !== k && k.hasOwnProperty("display") ? k.display : null, h.style.display = rb("display", g));
                } catch (t) {
                  W(a, a.return, t);
                }
              }
            } else if (6 === q.tag) {
              if (null === m) try {
                q.stateNode.nodeValue = l ? "" : q.memoizedProps;
              } catch (t) {
                W(a, a.return, t);
              }
            } else if ((22 !== q.tag && 23 !== q.tag || null === q.memoizedState || q === a) && null !== q.child) {
              q.child.return = q;
              q = q.child;
              continue;
            }
            if (q === a) break a;
            for (; null === q.sibling; ) {
              if (null === q.return || q.return === a) break a;
              m === q && (m = null);
              q = q.return;
            }
            m === q && (m = null);
            q.sibling.return = q.return;
            q = q.sibling;
          }
        }
        break;
      case 19:
        ck(b, a);
        ek(a);
        d & 4 && ak(a);
        break;
      case 21:
        break;
      default:
        ck(
          b,
          a
        ), ek(a);
    }
  }
  function ek(a) {
    var b = a.flags;
    if (b & 2) {
      try {
        a: {
          for (var c = a.return; null !== c; ) {
            if (Tj(c)) {
              var d = c;
              break a;
            }
            c = c.return;
          }
          throw Error(p(160));
        }
        switch (d.tag) {
          case 5:
            var e = d.stateNode;
            d.flags & 32 && (ob(e, ""), d.flags &= -33);
            var f = Uj(a);
            Wj(a, f, e);
            break;
          case 3:
          case 4:
            var g = d.stateNode.containerInfo, h = Uj(a);
            Vj(a, h, g);
            break;
          default:
            throw Error(p(161));
        }
      } catch (k) {
        W(a, a.return, k);
      }
      a.flags &= -3;
    }
    b & 4096 && (a.flags &= -4097);
  }
  function hk(a, b, c) {
    V = a;
    ik(a);
  }
  function ik(a, b, c) {
    for (var d = 0 !== (a.mode & 1); null !== V; ) {
      var e = V, f = e.child;
      if (22 === e.tag && d) {
        var g = null !== e.memoizedState || Jj;
        if (!g) {
          var h = e.alternate, k = null !== h && null !== h.memoizedState || U;
          h = Jj;
          var l = U;
          Jj = g;
          if ((U = k) && !l) for (V = e; null !== V; ) g = V, k = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k ? (k.return = g, V = k) : jk(e);
          for (; null !== f; ) V = f, ik(f), f = f.sibling;
          V = e;
          Jj = h;
          U = l;
        }
        kk(a);
      } else 0 !== (e.subtreeFlags & 8772) && null !== f ? (f.return = e, V = f) : kk(a);
    }
  }
  function kk(a) {
    for (; null !== V; ) {
      var b = V;
      if (0 !== (b.flags & 8772)) {
        var c = b.alternate;
        try {
          if (0 !== (b.flags & 8772)) switch (b.tag) {
            case 0:
            case 11:
            case 15:
              U || Qj(5, b);
              break;
            case 1:
              var d = b.stateNode;
              if (b.flags & 4 && !U) if (null === c) d.componentDidMount();
              else {
                var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
                d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
              }
              var f = b.updateQueue;
              null !== f && sh(b, f, d);
              break;
            case 3:
              var g = b.updateQueue;
              if (null !== g) {
                c = null;
                if (null !== b.child) switch (b.child.tag) {
                  case 5:
                    c = b.child.stateNode;
                    break;
                  case 1:
                    c = b.child.stateNode;
                }
                sh(b, g, c);
              }
              break;
            case 5:
              var h = b.stateNode;
              if (null === c && b.flags & 4) {
                c = h;
                var k = b.memoizedProps;
                switch (b.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    k.autoFocus && c.focus();
                    break;
                  case "img":
                    k.src && (c.src = k.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (null === b.memoizedState) {
                var l = b.alternate;
                if (null !== l) {
                  var m = l.memoizedState;
                  if (null !== m) {
                    var q = m.dehydrated;
                    null !== q && bd(q);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(p(163));
          }
          U || b.flags & 512 && Rj(b);
        } catch (r) {
          W(b, b.return, r);
        }
      }
      if (b === a) {
        V = null;
        break;
      }
      c = b.sibling;
      if (null !== c) {
        c.return = b.return;
        V = c;
        break;
      }
      V = b.return;
    }
  }
  function gk(a) {
    for (; null !== V; ) {
      var b = V;
      if (b === a) {
        V = null;
        break;
      }
      var c = b.sibling;
      if (null !== c) {
        c.return = b.return;
        V = c;
        break;
      }
      V = b.return;
    }
  }
  function jk(a) {
    for (; null !== V; ) {
      var b = V;
      try {
        switch (b.tag) {
          case 0:
          case 11:
          case 15:
            var c = b.return;
            try {
              Qj(4, b);
            } catch (k) {
              W(b, c, k);
            }
            break;
          case 1:
            var d = b.stateNode;
            if ("function" === typeof d.componentDidMount) {
              var e = b.return;
              try {
                d.componentDidMount();
              } catch (k) {
                W(b, e, k);
              }
            }
            var f = b.return;
            try {
              Rj(b);
            } catch (k) {
              W(b, f, k);
            }
            break;
          case 5:
            var g = b.return;
            try {
              Rj(b);
            } catch (k) {
              W(b, g, k);
            }
        }
      } catch (k) {
        W(b, b.return, k);
      }
      if (b === a) {
        V = null;
        break;
      }
      var h = b.sibling;
      if (null !== h) {
        h.return = b.return;
        V = h;
        break;
      }
      V = b.return;
    }
  }
  var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
  function R() {
    return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
  }
  function yi(a) {
    if (0 === (a.mode & 1)) return 1;
    if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
    if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
    a = C;
    if (0 !== a) return a;
    a = window.event;
    a = void 0 === a ? 16 : jd(a.type);
    return a;
  }
  function gi(a, b, c, d) {
    if (50 < yk) throw yk = 0, zk = null, Error(p(185));
    Ac(a, c, d);
    if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
  }
  function Dk(a, b) {
    var c = a.callbackNode;
    wc(a, b);
    var d = uc(a, a === Q ? Z : 0);
    if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
    else if (b = d & -d, a.callbackPriority !== b) {
      null != c && bc(c);
      if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
        0 === (K & 6) && jg();
      }), c = null;
      else {
        switch (Dc(d)) {
          case 1:
            c = fc;
            break;
          case 4:
            c = gc;
            break;
          case 16:
            c = hc;
            break;
          case 536870912:
            c = jc;
            break;
          default:
            c = hc;
        }
        c = Fk(c, Gk.bind(null, a));
      }
      a.callbackPriority = b;
      a.callbackNode = c;
    }
  }
  function Gk(a, b) {
    Ak = -1;
    Bk = 0;
    if (0 !== (K & 6)) throw Error(p(327));
    var c = a.callbackNode;
    if (Hk() && a.callbackNode !== c) return null;
    var d = uc(a, a === Q ? Z : 0);
    if (0 === d) return null;
    if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
    else {
      b = d;
      var e = K;
      K |= 2;
      var f = Jk();
      if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
      do
        try {
          Lk();
          break;
        } catch (h) {
          Mk(a, h);
        }
      while (1);
      $g();
      mk.current = f;
      K = e;
      null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
    }
    if (0 !== b) {
      2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
      if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      if (6 === b) Ck(a, d);
      else {
        e = a.current.alternate;
        if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f = xc(a), 0 !== f && (d = f, b = Nk(a, f))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
        a.finishedWork = e;
        a.finishedLanes = d;
        switch (b) {
          case 0:
          case 1:
            throw Error(p(345));
          case 2:
            Pk(a, tk, uk);
            break;
          case 3:
            Ck(a, d);
            if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
              if (0 !== uc(a, 0)) break;
              e = a.suspendedLanes;
              if ((e & d) !== d) {
                R();
                a.pingedLanes |= a.suspendedLanes & e;
                break;
              }
              a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
              break;
            }
            Pk(a, tk, uk);
            break;
          case 4:
            Ck(a, d);
            if ((d & 4194240) === d) break;
            b = a.eventTimes;
            for (e = -1; 0 < d; ) {
              var g = 31 - oc(d);
              f = 1 << g;
              g = b[g];
              g > e && (e = g);
              d &= ~f;
            }
            d = e;
            d = B() - d;
            d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
            if (10 < d) {
              a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
              break;
            }
            Pk(a, tk, uk);
            break;
          case 5:
            Pk(a, tk, uk);
            break;
          default:
            throw Error(p(329));
        }
      }
    }
    Dk(a, B());
    return a.callbackNode === c ? Gk.bind(null, a) : null;
  }
  function Nk(a, b) {
    var c = sk;
    a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
    a = Ik(a, b);
    2 !== a && (b = tk, tk = c, null !== b && Fj(b));
    return a;
  }
  function Fj(a) {
    null === tk ? tk = a : tk.push.apply(tk, a);
  }
  function Ok(a) {
    for (var b = a; ; ) {
      if (b.flags & 16384) {
        var c = b.updateQueue;
        if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
          var e = c[d], f = e.getSnapshot;
          e = e.value;
          try {
            if (!He(f(), e)) return false;
          } catch (g) {
            return false;
          }
        }
      }
      c = b.child;
      if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;
      else {
        if (b === a) break;
        for (; null === b.sibling; ) {
          if (null === b.return || b.return === a) return true;
          b = b.return;
        }
        b.sibling.return = b.return;
        b = b.sibling;
      }
    }
    return true;
  }
  function Ck(a, b) {
    b &= ~rk;
    b &= ~qk;
    a.suspendedLanes |= b;
    a.pingedLanes &= ~b;
    for (a = a.expirationTimes; 0 < b; ) {
      var c = 31 - oc(b), d = 1 << c;
      a[c] = -1;
      b &= ~d;
    }
  }
  function Ek(a) {
    if (0 !== (K & 6)) throw Error(p(327));
    Hk();
    var b = uc(a, 0);
    if (0 === (b & 1)) return Dk(a, B()), null;
    var c = Ik(a, b);
    if (0 !== a.tag && 2 === c) {
      var d = xc(a);
      0 !== d && (b = d, c = Nk(a, d));
    }
    if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
    if (6 === c) throw Error(p(345));
    a.finishedWork = a.current.alternate;
    a.finishedLanes = b;
    Pk(a, tk, uk);
    Dk(a, B());
    return null;
  }
  function Qk(a, b) {
    var c = K;
    K |= 1;
    try {
      return a(b);
    } finally {
      K = c, 0 === K && (Gj = B() + 500, fg && jg());
    }
  }
  function Rk(a) {
    null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
    var b = K;
    K |= 1;
    var c = ok.transition, d = C;
    try {
      if (ok.transition = null, C = 1, a) return a();
    } finally {
      C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
    }
  }
  function Hj() {
    fj = ej.current;
    E(ej);
  }
  function Kk(a, b) {
    a.finishedWork = null;
    a.finishedLanes = 0;
    var c = a.timeoutHandle;
    -1 !== c && (a.timeoutHandle = -1, Gf(c));
    if (null !== Y) for (c = Y.return; null !== c; ) {
      var d = c;
      wg(d);
      switch (d.tag) {
        case 1:
          d = d.type.childContextTypes;
          null !== d && void 0 !== d && $f();
          break;
        case 3:
          zh();
          E(Wf);
          E(H);
          Eh();
          break;
        case 5:
          Bh(d);
          break;
        case 4:
          zh();
          break;
        case 13:
          E(L);
          break;
        case 19:
          E(L);
          break;
        case 10:
          ah(d.type._context);
          break;
        case 22:
        case 23:
          Hj();
      }
      c = c.return;
    }
    Q = a;
    Y = a = Pg(a.current, null);
    Z = fj = b;
    T = 0;
    pk = null;
    rk = qk = rh = 0;
    tk = sk = null;
    if (null !== fh) {
      for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
        c.interleaved = null;
        var e = d.next, f = c.pending;
        if (null !== f) {
          var g = f.next;
          f.next = e;
          d.next = g;
        }
        c.pending = d;
      }
      fh = null;
    }
    return a;
  }
  function Mk(a, b) {
    do {
      var c = Y;
      try {
        $g();
        Fh.current = Rh;
        if (Ih) {
          for (var d = M.memoizedState; null !== d; ) {
            var e = d.queue;
            null !== e && (e.pending = null);
            d = d.next;
          }
          Ih = false;
        }
        Hh = 0;
        O = N = M = null;
        Jh = false;
        Kh = 0;
        nk.current = null;
        if (null === c || null === c.return) {
          T = 1;
          pk = b;
          Y = null;
          break;
        }
        a: {
          var f = a, g = c.return, h = c, k = b;
          b = Z;
          h.flags |= 32768;
          if (null !== k && "object" === typeof k && "function" === typeof k.then) {
            var l = k, m = h, q = m.tag;
            if (0 === (m.mode & 1) && (0 === q || 11 === q || 15 === q)) {
              var r = m.alternate;
              r ? (m.updateQueue = r.updateQueue, m.memoizedState = r.memoizedState, m.lanes = r.lanes) : (m.updateQueue = null, m.memoizedState = null);
            }
            var y = Ui(g);
            if (null !== y) {
              y.flags &= -257;
              Vi(y, g, h, f, b);
              y.mode & 1 && Si(f, l, b);
              b = y;
              k = l;
              var n = b.updateQueue;
              if (null === n) {
                var t = /* @__PURE__ */ new Set();
                t.add(k);
                b.updateQueue = t;
              } else n.add(k);
              break a;
            } else {
              if (0 === (b & 1)) {
                Si(f, l, b);
                tj();
                break a;
              }
              k = Error(p(426));
            }
          } else if (I && h.mode & 1) {
            var J = Ui(g);
            if (null !== J) {
              0 === (J.flags & 65536) && (J.flags |= 256);
              Vi(J, g, h, f, b);
              Jg(Ji(k, h));
              break a;
            }
          }
          f = k = Ji(k, h);
          4 !== T && (T = 2);
          null === sk ? sk = [f] : sk.push(f);
          f = g;
          do {
            switch (f.tag) {
              case 3:
                f.flags |= 65536;
                b &= -b;
                f.lanes |= b;
                var x = Ni(f, k, b);
                ph(f, x);
                break a;
              case 1:
                h = k;
                var w = f.type, u = f.stateNode;
                if (0 === (f.flags & 128) && ("function" === typeof w.getDerivedStateFromError || null !== u && "function" === typeof u.componentDidCatch && (null === Ri || !Ri.has(u)))) {
                  f.flags |= 65536;
                  b &= -b;
                  f.lanes |= b;
                  var F = Qi(f, h, b);
                  ph(f, F);
                  break a;
                }
            }
            f = f.return;
          } while (null !== f);
        }
        Sk(c);
      } catch (na) {
        b = na;
        Y === c && null !== c && (Y = c = c.return);
        continue;
      }
      break;
    } while (1);
  }
  function Jk() {
    var a = mk.current;
    mk.current = Rh;
    return null === a ? Rh : a;
  }
  function tj() {
    if (0 === T || 3 === T || 2 === T) T = 4;
    null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
  }
  function Ik(a, b) {
    var c = K;
    K |= 2;
    var d = Jk();
    if (Q !== a || Z !== b) uk = null, Kk(a, b);
    do
      try {
        Tk();
        break;
      } catch (e) {
        Mk(a, e);
      }
    while (1);
    $g();
    K = c;
    mk.current = d;
    if (null !== Y) throw Error(p(261));
    Q = null;
    Z = 0;
    return T;
  }
  function Tk() {
    for (; null !== Y; ) Uk(Y);
  }
  function Lk() {
    for (; null !== Y && !cc(); ) Uk(Y);
  }
  function Uk(a) {
    var b = Vk(a.alternate, a, fj);
    a.memoizedProps = a.pendingProps;
    null === b ? Sk(a) : Y = b;
    nk.current = null;
  }
  function Sk(a) {
    var b = a;
    do {
      var c = b.alternate;
      a = b.return;
      if (0 === (b.flags & 32768)) {
        if (c = Ej(c, b, fj), null !== c) {
          Y = c;
          return;
        }
      } else {
        c = Ij(c, b);
        if (null !== c) {
          c.flags &= 32767;
          Y = c;
          return;
        }
        if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
        else {
          T = 6;
          Y = null;
          return;
        }
      }
      b = b.sibling;
      if (null !== b) {
        Y = b;
        return;
      }
      Y = b = a;
    } while (null !== b);
    0 === T && (T = 5);
  }
  function Pk(a, b, c) {
    var d = C, e = ok.transition;
    try {
      ok.transition = null, C = 1, Wk(a, b, c, d);
    } finally {
      ok.transition = e, C = d;
    }
    return null;
  }
  function Wk(a, b, c, d) {
    do
      Hk();
    while (null !== wk);
    if (0 !== (K & 6)) throw Error(p(327));
    c = a.finishedWork;
    var e = a.finishedLanes;
    if (null === c) return null;
    a.finishedWork = null;
    a.finishedLanes = 0;
    if (c === a.current) throw Error(p(177));
    a.callbackNode = null;
    a.callbackPriority = 0;
    var f = c.lanes | c.childLanes;
    Bc(a, f);
    a === Q && (Y = Q = null, Z = 0);
    0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
      Hk();
      return null;
    }));
    f = 0 !== (c.flags & 15990);
    if (0 !== (c.subtreeFlags & 15990) || f) {
      f = ok.transition;
      ok.transition = null;
      var g = C;
      C = 1;
      var h = K;
      K |= 4;
      nk.current = null;
      Oj(a, c);
      dk(c, a);
      Oe(Df);
      dd = !!Cf;
      Df = Cf = null;
      a.current = c;
      hk(c);
      dc();
      K = h;
      C = g;
      ok.transition = f;
    } else a.current = c;
    vk && (vk = false, wk = a, xk = e);
    f = a.pendingLanes;
    0 === f && (Ri = null);
    mc(c.stateNode);
    Dk(a, B());
    if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
    if (Oi) throw Oi = false, a = Pi, Pi = null, a;
    0 !== (xk & 1) && 0 !== a.tag && Hk();
    f = a.pendingLanes;
    0 !== (f & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
    jg();
    return null;
  }
  function Hk() {
    if (null !== wk) {
      var a = Dc(xk), b = ok.transition, c = C;
      try {
        ok.transition = null;
        C = 16 > a ? 16 : a;
        if (null === wk) var d = false;
        else {
          a = wk;
          wk = null;
          xk = 0;
          if (0 !== (K & 6)) throw Error(p(331));
          var e = K;
          K |= 4;
          for (V = a.current; null !== V; ) {
            var f = V, g = f.child;
            if (0 !== (V.flags & 16)) {
              var h = f.deletions;
              if (null !== h) {
                for (var k = 0; k < h.length; k++) {
                  var l = h[k];
                  for (V = l; null !== V; ) {
                    var m = V;
                    switch (m.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Pj(8, m, f);
                    }
                    var q = m.child;
                    if (null !== q) q.return = m, V = q;
                    else for (; null !== V; ) {
                      m = V;
                      var r = m.sibling, y = m.return;
                      Sj(m);
                      if (m === l) {
                        V = null;
                        break;
                      }
                      if (null !== r) {
                        r.return = y;
                        V = r;
                        break;
                      }
                      V = y;
                    }
                  }
                }
                var n = f.alternate;
                if (null !== n) {
                  var t = n.child;
                  if (null !== t) {
                    n.child = null;
                    do {
                      var J = t.sibling;
                      t.sibling = null;
                      t = J;
                    } while (null !== t);
                  }
                }
                V = f;
              }
            }
            if (0 !== (f.subtreeFlags & 2064) && null !== g) g.return = f, V = g;
            else b: for (; null !== V; ) {
              f = V;
              if (0 !== (f.flags & 2048)) switch (f.tag) {
                case 0:
                case 11:
                case 15:
                  Pj(9, f, f.return);
              }
              var x = f.sibling;
              if (null !== x) {
                x.return = f.return;
                V = x;
                break b;
              }
              V = f.return;
            }
          }
          var w = a.current;
          for (V = w; null !== V; ) {
            g = V;
            var u = g.child;
            if (0 !== (g.subtreeFlags & 2064) && null !== u) u.return = g, V = u;
            else b: for (g = w; null !== V; ) {
              h = V;
              if (0 !== (h.flags & 2048)) try {
                switch (h.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Qj(9, h);
                }
              } catch (na) {
                W(h, h.return, na);
              }
              if (h === g) {
                V = null;
                break b;
              }
              var F = h.sibling;
              if (null !== F) {
                F.return = h.return;
                V = F;
                break b;
              }
              V = h.return;
            }
          }
          K = e;
          jg();
          if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
            lc.onPostCommitFiberRoot(kc, a);
          } catch (na) {
          }
          d = true;
        }
        return d;
      } finally {
        C = c, ok.transition = b;
      }
    }
    return false;
  }
  function Xk(a, b, c) {
    b = Ji(c, b);
    b = Ni(a, b, 1);
    a = nh(a, b, 1);
    b = R();
    null !== a && (Ac(a, 1, b), Dk(a, b));
  }
  function W(a, b, c) {
    if (3 === a.tag) Xk(a, a, c);
    else for (; null !== b; ) {
      if (3 === b.tag) {
        Xk(b, a, c);
        break;
      } else if (1 === b.tag) {
        var d = b.stateNode;
        if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
          a = Ji(c, a);
          a = Qi(b, a, 1);
          b = nh(b, a, 1);
          a = R();
          null !== b && (Ac(b, 1, a), Dk(b, a));
          break;
        }
      }
      b = b.return;
    }
  }
  function Ti(a, b, c) {
    var d = a.pingCache;
    null !== d && d.delete(b);
    b = R();
    a.pingedLanes |= a.suspendedLanes & c;
    Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
    Dk(a, b);
  }
  function Yk(a, b) {
    0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
    var c = R();
    a = ih(a, b);
    null !== a && (Ac(a, b, c), Dk(a, c));
  }
  function uj(a) {
    var b = a.memoizedState, c = 0;
    null !== b && (c = b.retryLane);
    Yk(a, c);
  }
  function bk(a, b) {
    var c = 0;
    switch (a.tag) {
      case 13:
        var d = a.stateNode;
        var e = a.memoizedState;
        null !== e && (c = e.retryLane);
        break;
      case 19:
        d = a.stateNode;
        break;
      default:
        throw Error(p(314));
    }
    null !== d && d.delete(b);
    Yk(a, c);
  }
  var Vk;
  Vk = function(a, b, c) {
    if (null !== a) if (a.memoizedProps !== b.pendingProps || Wf.current) dh = true;
    else {
      if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = false, yj(a, b, c);
      dh = 0 !== (a.flags & 131072) ? true : false;
    }
    else dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
    b.lanes = 0;
    switch (b.tag) {
      case 2:
        var d = b.type;
        ij(a, b);
        a = b.pendingProps;
        var e = Yf(b, H.current);
        ch(b, c);
        e = Nh(null, b, d, a, e, c);
        var f = Sh();
        b.flags |= 1;
        "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f = true, cg(b)) : f = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f, c)) : (b.tag = 0, I && f && vg(b), Xi(null, b, e, c), b = b.child);
        return b;
      case 16:
        d = b.elementType;
        a: {
          ij(a, b);
          a = b.pendingProps;
          e = d._init;
          d = e(d._payload);
          b.type = d;
          e = b.tag = Zk(d);
          a = Ci(d, a);
          switch (e) {
            case 0:
              b = cj(null, b, d, a, c);
              break a;
            case 1:
              b = hj(null, b, d, a, c);
              break a;
            case 11:
              b = Yi(null, b, d, a, c);
              break a;
            case 14:
              b = $i(null, b, d, Ci(d.type, a), c);
              break a;
          }
          throw Error(p(
            306,
            d,
            ""
          ));
        }
        return b;
      case 0:
        return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
      case 1:
        return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
      case 3:
        a: {
          kj(b);
          if (null === a) throw Error(p(387));
          d = b.pendingProps;
          f = b.memoizedState;
          e = f.element;
          lh(a, b);
          qh(b, d, null, c);
          var g = b.memoizedState;
          d = g.element;
          if (f.isDehydrated) if (f = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f, b.memoizedState = f, b.flags & 256) {
            e = Ji(Error(p(423)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else if (d !== e) {
            e = Ji(Error(p(424)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
          else {
            Ig();
            if (d === e) {
              b = Zi(a, b, c);
              break a;
            }
            Xi(a, b, d, c);
          }
          b = b.child;
        }
        return b;
      case 5:
        return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f && Ef(d, f) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
      case 6:
        return null === a && Eg(b), null;
      case 13:
        return oj(a, b, c);
      case 4:
        return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
      case 11:
        return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
      case 7:
        return Xi(a, b, b.pendingProps, c), b.child;
      case 8:
        return Xi(a, b, b.pendingProps.children, c), b.child;
      case 12:
        return Xi(a, b, b.pendingProps.children, c), b.child;
      case 10:
        a: {
          d = b.type._context;
          e = b.pendingProps;
          f = b.memoizedProps;
          g = e.value;
          G(Wg, d._currentValue);
          d._currentValue = g;
          if (null !== f) if (He(f.value, g)) {
            if (f.children === e.children && !Wf.current) {
              b = Zi(a, b, c);
              break a;
            }
          } else for (f = b.child, null !== f && (f.return = b); null !== f; ) {
            var h = f.dependencies;
            if (null !== h) {
              g = f.child;
              for (var k = h.firstContext; null !== k; ) {
                if (k.context === d) {
                  if (1 === f.tag) {
                    k = mh(-1, c & -c);
                    k.tag = 2;
                    var l = f.updateQueue;
                    if (null !== l) {
                      l = l.shared;
                      var m = l.pending;
                      null === m ? k.next = k : (k.next = m.next, m.next = k);
                      l.pending = k;
                    }
                  }
                  f.lanes |= c;
                  k = f.alternate;
                  null !== k && (k.lanes |= c);
                  bh(
                    f.return,
                    c,
                    b
                  );
                  h.lanes |= c;
                  break;
                }
                k = k.next;
              }
            } else if (10 === f.tag) g = f.type === b.type ? null : f.child;
            else if (18 === f.tag) {
              g = f.return;
              if (null === g) throw Error(p(341));
              g.lanes |= c;
              h = g.alternate;
              null !== h && (h.lanes |= c);
              bh(g, c, b);
              g = f.sibling;
            } else g = f.child;
            if (null !== g) g.return = f;
            else for (g = f; null !== g; ) {
              if (g === b) {
                g = null;
                break;
              }
              f = g.sibling;
              if (null !== f) {
                f.return = g.return;
                g = f;
                break;
              }
              g = g.return;
            }
            f = g;
          }
          Xi(a, b, e.children, c);
          b = b.child;
        }
        return b;
      case 9:
        return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
      case 14:
        return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
      case 15:
        return bj(a, b, b.type, b.pendingProps, c);
      case 17:
        return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
      case 19:
        return xj(a, b, c);
      case 22:
        return dj(a, b, c);
    }
    throw Error(p(156, b.tag));
  };
  function Fk(a, b) {
    return ac(a, b);
  }
  function $k(a, b, c, d) {
    this.tag = a;
    this.key = c;
    this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
    this.index = 0;
    this.ref = null;
    this.pendingProps = b;
    this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
    this.mode = d;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function Bg(a, b, c, d) {
    return new $k(a, b, c, d);
  }
  function aj(a) {
    a = a.prototype;
    return !(!a || !a.isReactComponent);
  }
  function Zk(a) {
    if ("function" === typeof a) return aj(a) ? 1 : 0;
    if (void 0 !== a && null !== a) {
      a = a.$$typeof;
      if (a === Da) return 11;
      if (a === Ga) return 14;
    }
    return 2;
  }
  function Pg(a, b) {
    var c = a.alternate;
    null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
    c.flags = a.flags & 14680064;
    c.childLanes = a.childLanes;
    c.lanes = a.lanes;
    c.child = a.child;
    c.memoizedProps = a.memoizedProps;
    c.memoizedState = a.memoizedState;
    c.updateQueue = a.updateQueue;
    b = a.dependencies;
    c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
    c.sibling = a.sibling;
    c.index = a.index;
    c.ref = a.ref;
    return c;
  }
  function Rg(a, b, c, d, e, f) {
    var g = 2;
    d = a;
    if ("function" === typeof a) aj(a) && (g = 1);
    else if ("string" === typeof a) g = 5;
    else a: switch (a) {
      case ya:
        return Tg(c.children, e, f, b);
      case za:
        g = 8;
        e |= 8;
        break;
      case Aa:
        return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f, a;
      case Ea:
        return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f, a;
      case Fa:
        return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f, a;
      case Ia:
        return pj(c, e, f, b);
      default:
        if ("object" === typeof a && null !== a) switch (a.$$typeof) {
          case Ba:
            g = 10;
            break a;
          case Ca:
            g = 9;
            break a;
          case Da:
            g = 11;
            break a;
          case Ga:
            g = 14;
            break a;
          case Ha:
            g = 16;
            d = null;
            break a;
        }
        throw Error(p(130, null == a ? a : typeof a, ""));
    }
    b = Bg(g, c, b, e);
    b.elementType = a;
    b.type = d;
    b.lanes = f;
    return b;
  }
  function Tg(a, b, c, d) {
    a = Bg(7, a, d, b);
    a.lanes = c;
    return a;
  }
  function pj(a, b, c, d) {
    a = Bg(22, a, d, b);
    a.elementType = Ia;
    a.lanes = c;
    a.stateNode = { isHidden: false };
    return a;
  }
  function Qg(a, b, c) {
    a = Bg(6, a, null, b);
    a.lanes = c;
    return a;
  }
  function Sg(a, b, c) {
    b = Bg(4, null !== a.children ? a.children : [], a.key, b);
    b.lanes = c;
    b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
    return b;
  }
  function al(a, b, c, d, e) {
    this.tag = b;
    this.containerInfo = a;
    this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = -1;
    this.callbackNode = this.pendingContext = this.context = null;
    this.callbackPriority = 0;
    this.eventTimes = zc(0);
    this.expirationTimes = zc(-1);
    this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
    this.entanglements = zc(0);
    this.identifierPrefix = d;
    this.onRecoverableError = e;
    this.mutableSourceEagerHydrationData = null;
  }
  function bl(a, b, c, d, e, f, g, h, k) {
    a = new al(a, b, c, h, k);
    1 === b ? (b = 1, true === f && (b |= 8)) : b = 0;
    f = Bg(3, null, null, b);
    a.current = f;
    f.stateNode = a;
    f.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
    kh(f);
    return a;
  }
  function cl(a, b, c) {
    var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
  }
  function dl(a) {
    if (!a) return Vf;
    a = a._reactInternals;
    a: {
      if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
      var b = a;
      do {
        switch (b.tag) {
          case 3:
            b = b.stateNode.context;
            break a;
          case 1:
            if (Zf(b.type)) {
              b = b.stateNode.__reactInternalMemoizedMergedChildContext;
              break a;
            }
        }
        b = b.return;
      } while (null !== b);
      throw Error(p(171));
    }
    if (1 === a.tag) {
      var c = a.type;
      if (Zf(c)) return bg(a, c, b);
    }
    return b;
  }
  function el(a, b, c, d, e, f, g, h, k) {
    a = bl(c, d, true, a, e, f, g, h, k);
    a.context = dl(null);
    c = a.current;
    d = R();
    e = yi(c);
    f = mh(d, e);
    f.callback = void 0 !== b && null !== b ? b : null;
    nh(c, f, e);
    a.current.lanes = e;
    Ac(a, e, d);
    Dk(a, d);
    return a;
  }
  function fl(a, b, c, d) {
    var e = b.current, f = R(), g = yi(e);
    c = dl(c);
    null === b.context ? b.context = c : b.pendingContext = c;
    b = mh(f, g);
    b.payload = { element: a };
    d = void 0 === d ? null : d;
    null !== d && (b.callback = d);
    a = nh(e, b, g);
    null !== a && (gi(a, e, g, f), oh(a, e, g));
    return g;
  }
  function gl(a) {
    a = a.current;
    if (!a.child) return null;
    switch (a.child.tag) {
      case 5:
        return a.child.stateNode;
      default:
        return a.child.stateNode;
    }
  }
  function hl(a, b) {
    a = a.memoizedState;
    if (null !== a && null !== a.dehydrated) {
      var c = a.retryLane;
      a.retryLane = 0 !== c && c < b ? c : b;
    }
  }
  function il(a, b) {
    hl(a, b);
    (a = a.alternate) && hl(a, b);
  }
  function jl() {
    return null;
  }
  var kl = "function" === typeof reportError ? reportError : function(a) {
    console.error(a);
  };
  function ll(a) {
    this._internalRoot = a;
  }
  ml.prototype.render = ll.prototype.render = function(a) {
    var b = this._internalRoot;
    if (null === b) throw Error(p(409));
    fl(a, b, null, null);
  };
  ml.prototype.unmount = ll.prototype.unmount = function() {
    var a = this._internalRoot;
    if (null !== a) {
      this._internalRoot = null;
      var b = a.containerInfo;
      Rk(function() {
        fl(null, a, null, null);
      });
      b[uf] = null;
    }
  };
  function ml(a) {
    this._internalRoot = a;
  }
  ml.prototype.unstable_scheduleHydration = function(a) {
    if (a) {
      var b = Hc();
      a = { blockedOn: null, target: a, priority: b };
      for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++) ;
      Qc.splice(c, 0, a);
      0 === c && Vc(a);
    }
  };
  function nl(a) {
    return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
  }
  function ol(a) {
    return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
  }
  function pl() {
  }
  function ql(a, b, c, d, e) {
    if (e) {
      if ("function" === typeof d) {
        var f = d;
        d = function() {
          var a2 = gl(g);
          f.call(a2);
        };
      }
      var g = el(b, d, a, 0, null, false, false, "", pl);
      a._reactRootContainer = g;
      a[uf] = g.current;
      sf(8 === a.nodeType ? a.parentNode : a);
      Rk();
      return g;
    }
    for (; e = a.lastChild; ) a.removeChild(e);
    if ("function" === typeof d) {
      var h = d;
      d = function() {
        var a2 = gl(k);
        h.call(a2);
      };
    }
    var k = bl(a, 0, false, null, null, false, false, "", pl);
    a._reactRootContainer = k;
    a[uf] = k.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk(function() {
      fl(b, k, c, d);
    });
    return k;
  }
  function rl(a, b, c, d, e) {
    var f = c._reactRootContainer;
    if (f) {
      var g = f;
      if ("function" === typeof e) {
        var h = e;
        e = function() {
          var a2 = gl(g);
          h.call(a2);
        };
      }
      fl(b, g, a, e);
    } else g = ql(c, b, a, e, d);
    return gl(g);
  }
  Ec = function(a) {
    switch (a.tag) {
      case 3:
        var b = a.stateNode;
        if (b.current.memoizedState.isDehydrated) {
          var c = tc(b.pendingLanes);
          0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
        }
        break;
      case 13:
        Rk(function() {
          var b2 = ih(a, 1);
          if (null !== b2) {
            var c2 = R();
            gi(b2, a, 1, c2);
          }
        }), il(a, 1);
    }
  };
  Fc = function(a) {
    if (13 === a.tag) {
      var b = ih(a, 134217728);
      if (null !== b) {
        var c = R();
        gi(b, a, 134217728, c);
      }
      il(a, 134217728);
    }
  };
  Gc = function(a) {
    if (13 === a.tag) {
      var b = yi(a), c = ih(a, b);
      if (null !== c) {
        var d = R();
        gi(c, a, b, d);
      }
      il(a, b);
    }
  };
  Hc = function() {
    return C;
  };
  Ic = function(a, b) {
    var c = C;
    try {
      return C = a, b();
    } finally {
      C = c;
    }
  };
  yb = function(a, b, c) {
    switch (b) {
      case "input":
        bb(a, c);
        b = c.name;
        if ("radio" === c.type && null != b) {
          for (c = a; c.parentNode; ) c = c.parentNode;
          c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
          for (b = 0; b < c.length; b++) {
            var d = c[b];
            if (d !== a && d.form === a.form) {
              var e = Db(d);
              if (!e) throw Error(p(90));
              Wa(d);
              bb(d, e);
            }
          }
        }
        break;
      case "textarea":
        ib(a, c);
        break;
      case "select":
        b = c.value, null != b && fb(a, !!c.multiple, b, false);
    }
  };
  Gb = Qk;
  Hb = Rk;
  var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
  var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
    a = Zb(a);
    return null === a ? null : a.stateNode;
  }, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
    var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!vl.isDisabled && vl.supportsFiber) try {
      kc = vl.inject(ul), lc = vl;
    } catch (a) {
    }
  }
  reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
  reactDom_production_min.createPortal = function(a, b) {
    var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
    if (!nl(b)) throw Error(p(200));
    return cl(a, b, null, c);
  };
  reactDom_production_min.createRoot = function(a, b) {
    if (!nl(a)) throw Error(p(299));
    var c = false, d = "", e = kl;
    null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
    b = bl(a, 1, false, null, null, c, false, d, e);
    a[uf] = b.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    return new ll(b);
  };
  reactDom_production_min.findDOMNode = function(a) {
    if (null == a) return null;
    if (1 === a.nodeType) return a;
    var b = a._reactInternals;
    if (void 0 === b) {
      if ("function" === typeof a.render) throw Error(p(188));
      a = Object.keys(a).join(",");
      throw Error(p(268, a));
    }
    a = Zb(b);
    a = null === a ? null : a.stateNode;
    return a;
  };
  reactDom_production_min.flushSync = function(a) {
    return Rk(a);
  };
  reactDom_production_min.hydrate = function(a, b, c) {
    if (!ol(b)) throw Error(p(200));
    return rl(null, a, b, true, c);
  };
  reactDom_production_min.hydrateRoot = function(a, b, c) {
    if (!nl(a)) throw Error(p(405));
    var d = null != c && c.hydratedSources || null, e = false, f = "", g = kl;
    null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
    b = el(b, null, a, 1, null != c ? c : null, e, false, f, g);
    a[uf] = b.current;
    sf(a);
    if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
      c,
      e
    );
    return new ml(b);
  };
  reactDom_production_min.render = function(a, b, c) {
    if (!ol(b)) throw Error(p(200));
    return rl(null, a, b, false, c);
  };
  reactDom_production_min.unmountComponentAtNode = function(a) {
    if (!ol(a)) throw Error(p(40));
    return a._reactRootContainer ? (Rk(function() {
      rl(null, null, a, false, function() {
        a._reactRootContainer = null;
        a[uf] = null;
      });
    }), true) : false;
  };
  reactDom_production_min.unstable_batchedUpdates = Qk;
  reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
    if (!ol(c)) throw Error(p(200));
    if (null == a || void 0 === a._reactInternals) throw Error(p(38));
    return rl(a, b, c, false, d);
  };
  reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
  return reactDom_production_min;
}
var hasRequiredReactDom;
function requireReactDom() {
  if (hasRequiredReactDom) return reactDom.exports;
  hasRequiredReactDom = 1;
  function checkDCE() {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    reactDom.exports = requireReactDom_production_min();
  }
  return reactDom.exports;
}
var hasRequiredClient;
function requireClient() {
  if (hasRequiredClient) return client;
  hasRequiredClient = 1;
  var m = requireReactDom();
  {
    client.createRoot = m.createRoot;
    client.hydrateRoot = m.hydrateRoot;
  }
  return client;
}
var clientExports = requireClient();
const Ctx = reactExports.createContext(null);
function useApp() {
  const state = reactExports.useContext(Ctx);
  if (!state) throw new Error("useApp outside provider");
  return state;
}
function AppProvider({ children }) {
  const [store, setStore] = reactExports.useState(null);
  const [seeds, setSeeds] = reactExports.useState(null);
  reactExports.useEffect(() => {
    void getStore().then(setStore);
    void loadSeedCatalog().then(setSeeds).catch(() => setSeeds(null));
    return onStoreChanged(setStore);
  }, []);
  if (!store) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tab-body muted", children: "Loading…" });
  const state = {
    store,
    seeds,
    async setProfile(profile) {
      setStore({ ...store, profile });
      await updateProfile(profile);
    },
    async saveQA(entry) {
      await upsertQA(entry);
      setStore(await getStore());
    },
    async saveManyQA(entries) {
      await upsertManyQA(entries);
      setStore(await getStore());
    },
    async removeQA(id) {
      await deleteQA(id);
      setStore(await getStore());
    },
    async saveOptionSet(set) {
      await upsertOptionSet(set);
      setStore(await getStore());
    },
    async removeOptionSet(id) {
      await deleteOptionSet(id);
      setStore(await getStore());
    },
    async patchSettings(patch) {
      setStore({ ...store, settings: { ...store.settings, ...patch } });
      await updateSettings(patch);
    },
    async importPayload(data, mode) {
      await importData(data, mode);
      setStore(await getStore());
    },
    async deleteAllData() {
      await clearAll();
      setStore(await getStore());
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Ctx.Provider, { value: state, children });
}
const TAILOR_BASE_URL = "http://127.0.0.1:8765";
const STAGE_LABELS = {
  queued: "Queued",
  profile: "Reading the job description",
  keywords: "Extracting keywords",
  route: "Choosing the role-family lens",
  mapping: "Mapping to your vault",
  retrieval: "Retrieving evidence",
  plan: "Planning bullet coverage",
  write: "Writing bullets",
  tighten: "Enforcing the line limits",
  review: "Reviewing and repairing",
  assemble: "Assembling the résumé",
  render: "Rendering the document",
  done: "Done"
};
function isTerminal(status) {
  return status === "done" || status === "failed" || status === "cancelled";
}
const LEAD_AGE_BRACKET = ["20s", "30s", "40s", "50s", "60s", "unknown"];
const LEAD_GENDER = ["m", "f", "unknown"];
const ENTITY_COLUMNS = {
  jobs: ["id", "user_id", "source", "ats", "ats_req_id", "source_url", "canonical_url", "title", "company", "company_domain", "location", "work_type", "sector", "description", "posted_at", "posted_age_text", "applicant_count", "experience_level", "experience_years_min", "sponsorship", "work_auth_required", "citizen_required", "fields_present", "captured_by", "raw", "dedupe_key", "fit_score", "fit", "status", "created_at", "updated_at"],
  leads: ["id", "user_id", "linkedin_url", "full_name", "first_name", "last_name", "headline", "company", "company_domain", "role_title", "location", "background", "age_bracket", "gender", "age_gender_confirmed", "standout_skill", "reach_out_reason", "job_id", "email", "email_type", "email_status", "email_source", "phone", "enrichment_raw", "enriched_at", "enrich_attempts", "next_enrich_at", "status", "responded", "responded_at", "response_text", "created_at", "updated_at"],
  messages: ["id", "user_id", "lead_id", "kind", "template_key", "body", "char_count", "sent_at", "sent_detected_by", "created_at", "updated_at"],
  comments: ["id", "user_id", "post_url", "post_author", "post_author_url", "post_text", "my_take", "draft", "final_text", "posted", "posted_at", "created_at", "updated_at"]
};
function pyStr(value) {
  if (value === null || value === void 0 || value === false || value === 0 || value === "") return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return String(value);
}
const PY_WS = "\\t\\n\\x0b\\x0c\\r\\x1c-\\x1f \\x85\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const WS_RUN = new RegExp(`[${PY_WS}]+`, "g");
const WS_EDGE = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, "g");
function pyStrip(text2) {
  return text2.replace(WS_EDGE, "");
}
function normText(value) {
  return pyStrip(pyStr(value).replace(WS_RUN, " "));
}
function normKey(value) {
  return pyStr(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const USES_PARAMS = /* @__PURE__ */ new Set(["", "ftp", "hdl", "prospero", "http", "imap", "https", "shttp", "rtsp", "rtspu", "sip", "sips", "mms", "sftp", "tel"]);
function pyUrlparse(raw) {
  let url = pyStrip(raw).replace(/[\t\r\n]/g, "");
  let scheme = "";
  const m = /^([A-Za-z0-9+.\-]+):/.exec(url);
  if (m) {
    scheme = m[1].toLowerCase();
    url = url.slice(m[0].length);
  }
  let netloc = "";
  if (url.startsWith("//")) {
    const rest = url.slice(2);
    const end = rest.search(/[/?#]/);
    netloc = end < 0 ? rest : rest.slice(0, end);
    url = end < 0 ? "" : rest.slice(end);
  }
  if (netloc.includes("[") !== netloc.includes("]")) return null;
  const hash = url.indexOf("#");
  if (hash >= 0) url = url.slice(0, hash);
  let query = "";
  const q = url.indexOf("?");
  if (q >= 0) {
    query = url.slice(q + 1);
    url = url.slice(0, q);
  }
  let path = url;
  if (USES_PARAMS.has(scheme) && path.includes(";")) {
    const from = path.includes("/") ? path.lastIndexOf("/") : 0;
    const i = path.indexOf(";", from);
    if (i >= 0) path = path.slice(0, i);
  }
  return { netloc, path, query };
}
function pyQueryFirst(query, name) {
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const key = pyUnquotePlus(pair.slice(0, eq));
    const value = pair.slice(eq + 1);
    if (key === name && value.length > 0) return pyUnquotePlus(value);
  }
  return null;
}
function pyUnquotePlus(text2) {
  const spaced = text2.replace(/\+/g, " ");
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced.replace(/%[0-9A-Fa-f]{2}/g, (hex) => {
      try {
        return decodeURIComponent(hex);
      } catch {
        return "�";
      }
    });
  }
}
function urlKey(url) {
  const text2 = pyStr(url);
  if (!text2) return null;
  const parsed = pyUrlparse(text2);
  if (!parsed) return null;
  const m = /\/jobs\/view\/(?:[^/]*-)?(\d{6,})/.exec(parsed.path) ?? /(\d{7,})/.exec(parsed.path);
  const current = pyQueryFirst(parsed.query, "currentJobId");
  if (current !== null) return "li:" + current;
  if (m && parsed.netloc.includes("linkedin.com")) return "li:" + m[1];
  const host = parsed.netloc.toLowerCase().split("www.").join("");
  const path = parsed.path.replace(/\/+$/, "");
  return host ? `${host}${path}`.toLowerCase() : null;
}
function dedupeKey(company, title, parts = {}) {
  const req = normText(parts.atsReqId);
  const li = normText(parts.linkedinJobId);
  const fromUrl = urlKey(parts.url);
  const desc = normText(parts.description);
  let tail = "";
  if (req) {
    tail = "req:" + req.toLowerCase();
  } else if (/^\d{6,}$/.test(li)) {
    tail = "li:" + li;
  } else if (fromUrl) {
    tail = fromUrl;
  } else if (desc) {
    tail = "desc:" + sha1Hex(Array.from(desc).slice(0, 2e3).join("")).slice(0, 12);
  }
  return `${normKey(company)}|${normKey(title)}|${tail}`;
}
function atsFromHost(hostname) {
  const host = hostname.toLowerCase();
  if (/\.myworkday(jobs|site)\.com$/.test(host)) return "workday";
  if (/(^|\.)greenhouse\.io$/.test(host)) return "greenhouse";
  if (/\.icims\.com$/.test(host)) return "icims";
  if (/(^|\.)successfactors\.(eu|com)$/.test(host)) return "successfactors";
  if (/\.oraclecloud\.com$/.test(host)) return "oracle";
  if (/(^|\.)taleo\.net$/.test(host)) return "taleo";
  if (/(^|\.)lever\.co$/.test(host)) return "lever";
  if (/(^|\.)ashbyhq\.com$/.test(host)) return "ashby";
  if (/(^|\.)smartrecruiters\.com$/.test(host)) return "smartrecruiters";
  if (/(^|\.)jobvite\.com$/.test(host)) return "jobvite";
  if (/(^|\.)bamboohr\.com$/.test(host)) return "bamboohr";
  if (/(^|\.)eightfold\.ai$/.test(host)) return "eightfold";
  return null;
}
function atsFromPath(path, query) {
  if (/\/sites\/[^/]+\/(?:job|jobs\/preview|requisitions\/preview)\/\d{4,}/.test(path)) return "oracle";
  if (/\/job\/[^/]+\/\d{5,}\/?$/.test(path) || query.includes("career_job_req_id=")) return "successfactors";
  return null;
}
function atsReqIdFromUrl(url) {
  const text2 = pyStr(url);
  if (!text2) return null;
  const parsed = pyUrlparse(text2);
  if (!parsed) return null;
  const host = parsed.netloc.toLowerCase();
  const path = parsed.path;
  const ats = atsFromHost(host) ?? atsFromPath(path, parsed.query);
  let m;
  const ghJid = pyQueryFirst(parsed.query, "gh_jid");
  if (ghJid && /^\d{3,}$/.test(ghJid)) return ghJid;
  if (ats === "workday") {
    const segments = path.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      m = /_([A-Za-z]{0,6}[-_]?\d{2,}[\w-]*)$/.exec(segments[i]);
      if (m) return m[1];
    }
    return null;
  }
  if (ats === "greenhouse") {
    m = /\/jobs\/(\d{4,})(?:\/|$)/.exec(path);
    if (m) return m[1];
    const token = pyQueryFirst(parsed.query, "token");
    return token && /^\d{3,}$/.test(token) ? token : null;
  }
  if (ats === "icims") {
    m = /\/jobs\/((?:\d{4}-)?\d{3,})(?:\/|$)/.exec(path);
    return m ? m[1] : null;
  }
  if (ats === "successfactors") {
    const req = pyQueryFirst(parsed.query, "career_job_req_id");
    if (req && /^\d{3,}$/.test(req)) return req;
    m = /\/job\/[^/]+\/(\d{5,})\/?$/.exec(path);
    return m ? m[1] : null;
  }
  if (ats === "oracle") {
    m = /\/(?:job|preview|requisitions\/preview)\/(\d{4,})(?:\/|$)/.exec(path);
    return m ? m[1] : null;
  }
  if (ats === "taleo") {
    const job = pyQueryFirst(parsed.query, "job");
    return job && /^[\w-]{3,}$/.test(job) ? job : null;
  }
  return null;
}
function pyInt(value) {
  const text2 = pyStr(value);
  if (/\bfirst\s+\d/i.test(text2)) return null;
  const m = /\d[\d,]*/.exec(text2);
  if (!m) return null;
  const n = Number.parseInt(m[0].replace(/,/g, ""), 10);
  return Number.isSafeInteger(n) ? n : null;
}
function pyDate(value) {
  const text2 = pyStrip(pyStr(value));
  let m = /^(\d{4}-\d{2}-\d{2})/.exec(text2);
  if (m) return m[1];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text2);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function pyWorkType(value) {
  const text2 = pyStrip(pyStr(value)).toLowerCase();
  if (!text2) return null;
  if (text2.includes("remote")) return "remote";
  if (text2.includes("hybrid")) return "hybrid";
  if (text2.includes("on-site") || text2.includes("onsite") || text2.includes("on site") || text2.includes("in office") || text2.includes("in-office")) return "onsite";
  return null;
}
function sha1Hex(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const length = bytes.length;
  const padded = Math.ceil((length + 9) / 64) * 64;
  const buf = new Uint8Array(padded);
  buf.set(bytes);
  buf[length] = 128;
  const view = new DataView(buf.buffer);
  const bits = length * 8;
  view.setUint32(padded - 8, Math.floor(bits / 4294967296), false);
  view.setUint32(padded - 4, bits >>> 0, false);
  let h0 = 1732584193;
  let h1 = 4023233417;
  let h2 = 2562383102;
  let h3 = 271733878;
  let h4 = 3285377520;
  const w = new Uint32Array(80);
  for (let offset = 0; offset < padded; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 80; i++) {
      const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = x << 1 | x >>> 31;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f;
      let k;
      if (i < 20) {
        f = b & c | ~b & d;
        k = 1518500249;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 1859775393;
      } else if (i < 60) {
        f = b & c | b & d | c & d;
        k = 2400959708;
      } else {
        f = b ^ c ^ d;
        k = 3395469782;
      }
      const t = (a << 5 | a >>> 27) + f + e + k + w[i] >>> 0;
      e = d;
      d = c;
      c = b << 30 | b >>> 2;
      b = a;
      a = t;
    }
    h0 = h0 + a >>> 0;
    h1 = h1 + b >>> 0;
    h2 = h2 + c >>> 0;
    h3 = h3 + d >>> 0;
    h4 = h4 + e >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((v) => v.toString(16).padStart(8, "0")).join("");
}
const PARAGRAPH_TAGS = /* @__PURE__ */ new Set([
  "P",
  "UL",
  "OL",
  "DL",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "SECTION",
  "ARTICLE",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "HEADER",
  "FOOTER",
  "ASIDE",
  "MAIN",
  "NAV",
  "FIELDSET",
  "FORM",
  "HR",
  "ADDRESS",
  "FIGURE",
  "DETAILS"
]);
const LINE_TAGS = /* @__PURE__ */ new Set(["DIV", "LI", "TR", "TD", "TH", "DD", "DT", "FIGCAPTION", "SUMMARY"]);
const SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SELECT", "OPTION", "SVG", "IFRAME", "HEAD", "TITLE"]);
function tidy(text2) {
  return text2.replace(/\r/g, "").replace(/ /g, " ").replace(/[ \t]+/g, " ").split("\n").map((line) => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function blockText(node) {
  if (!node) return "";
  const out = [];
  let trailing = 2;
  const newline = (count) => {
    while (trailing < count) {
      out.push("\n");
      trailing++;
    }
  };
  const text2 = (value) => {
    if (!value) return;
    if (!value.trim()) {
      if (trailing === 0) out.push(" ");
      return;
    }
    out.push(value);
    trailing = 0;
  };
  const walk = (n) => {
    if (n.nodeType === 3) {
      text2(n.nodeValue ?? "");
      return;
    }
    if (n.nodeType !== 1) return;
    const el = n;
    const tag = el.tagName.toUpperCase();
    if (SKIP_TAGS.has(tag)) return;
    if (tag === "BR") {
      newline(1);
      return;
    }
    const boundary = PARAGRAPH_TAGS.has(tag) ? 2 : LINE_TAGS.has(tag) ? 1 : 0;
    if (boundary) newline(boundary);
    if (tag === "LI") text2("• ");
    for (const child of Array.from(el.childNodes)) walk(child);
    if (boundary) newline(boundary);
  };
  walk(node);
  return tidy(out.join(""));
}
function blockTextExcluding(el, exclude) {
  if (!el) return "";
  const clone = el.cloneNode(true);
  for (const selector of exclude) {
    for (const junk of Array.from(clone.querySelectorAll(selector))) junk.remove();
  }
  return blockText(clone);
}
function oneLine(el, max = 300) {
  if (!el) return null;
  const text2 = normText(blockText(el));
  return text2.length > 0 && text2.length < max ? text2 : null;
}
function firstEl(root, selectors) {
  if (!root) return null;
  for (const selector of selectors) {
    let el = null;
    try {
      el = root.querySelector(selector);
    } catch {
      el = null;
    }
    if (el) return el;
  }
  return null;
}
function firstText(root, selectors, max = 300) {
  if (!root) return null;
  for (const selector of selectors) {
    let els = [];
    try {
      els = Array.from(root.querySelectorAll(selector));
    } catch {
      els = [];
    }
    for (const el of els) {
      const text2 = oneLine(el, max);
      if (text2) return text2;
    }
  }
  return null;
}
function metaContent(doc, property) {
  const el = doc.querySelector(`meta[property="${property}"]`) ?? doc.querySelector(`meta[name="${property}"]`);
  const text2 = normText(el == null ? void 0 : el.getAttribute("content"));
  return text2.length > 0 && text2.length < 300 ? text2 : null;
}
const COMPANY_NOISE = /\s*[-–—|:·]?\s*\b(careers?|jobs?|job opportunities|job openings|talent acquisition|talent|hiring|career site|careers site|recruiting|employment|opportunities)\b\s*$/i;
function cleanCompany(value) {
  let text2 = normText(value);
  if (!text2) return null;
  text2 = text2.replace(/^(?:(?:jobs|careers|work|join us)\s+)?(at|by|with)\s+/i, "");
  for (let i = 0; i < 3; i++) {
    const next = text2.replace(COMPANY_NOISE, "").trim();
    if (next === text2) break;
    if (next.length < 2) return null;
    text2 = next;
  }
  text2 = text2.replace(/[\s|·:–—-]+$/g, "").trim();
  return text2.length > 0 && text2.length < 200 ? text2 : null;
}
const AGE_RE = /^(today|yesterday|just now|(?:\d+\+?|an?)\s+(?:minute|hour|day|week|month|year)s?\s+ago)$/i;
function parsePostedAge(value) {
  const text2 = normText(value);
  if (!text2 || text2.length > 60) return null;
  const stripped = text2.replace(/^(?:re)?posted\s+(?:on\s+)?/i, "").replace(/[.]+$/, "").trim();
  return AGE_RE.test(stripped) ? stripped : null;
}
function tenantSlug(hostname, ats) {
  const host = hostname.toLowerCase();
  if (ats === "workday") {
    const m = /^([a-z0-9-]+)\.wd\d+\.myworkday(?:jobs|site)\.com$/.exec(host);
    return m ? m[1] : null;
  }
  if (ats === "icims") {
    const m = /^(?:careers|jobs|careers-|jobs-)?-?([a-z0-9-]+)\.icims\.com$/.exec(host);
    return m ? m[1].replace(/^(careers|jobs)-/, "") : null;
  }
  return null;
}
function companyDomain(hostname) {
  const host = hostname.toLowerCase().replace(/^(www|careers?|jobs?|apply|recruiting|talent|hire|join|work)\./, "");
  return host.includes(".") ? host : null;
}
const greenhouse = {
  name: "greenhouse",
  extract(doc, url) {
    const descriptionEl = firstEl(doc, [".job__description", "#job-description", '[class*="job__description"]', "#content"]);
    const description = blockTextExcluding(descriptionEl, ["#application", "form", "#header", ".job__header", "h1.app-title", ".company-name", ".location"]);
    return {
      title: firstText(doc, ["h1.job__title", ".app-title", "h1.section-header", "h1"]),
      company: cleanCompany(firstText(doc, [".company-name", '[class*="company-name"]'])),
      location: firstText(doc, [".location", ".job__location", '[class*="job__location"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      atsReqId: atsReqIdFromUrl(url.href)
    };
  }
};
const icims = {
  name: "icims",
  extract(doc, url) {
    const descriptionEl = firstEl(doc, [".iCIMS_JobContent", ".iCIMS_InfoMsg_Job", "#jobcontent", ".iCIMS_Expandable_Container"]);
    const description = blockTextExcluding(descriptionEl, ["form", ".iCIMS_JobHeaderGroup", "nav", "button"]);
    return {
      title: firstText(doc, [".iCIMS_Header h1", "h1.iCIMS_Header", "h1"]),
      location: firstText(doc, [".iCIMS_JobHeaderTag .iCIMS_JobsTable", ".iCIMS_JobLocation", '[class*="JobLocation"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      atsReqId: atsReqIdFromUrl(url.href)
    };
  }
};
const linkedin = {
  name: "linkedin",
  extract(doc, url) {
    var _a, _b, _c;
    const titleEl = firstEl(doc, [
      "h1.job-details-jobs-unified-top-card__job-title",
      ".job-details-jobs-unified-top-card__job-title h1",
      "h1.top-card-layout__title",
      "h1.topcard__title",
      ".jobs-unified-top-card__job-title",
      '[class*="top-card"] h1',
      "h1"
    ]);
    const title = ((_a = oneLine(titleEl)) == null ? void 0 : _a.replace(/\s+with verification$/i, "")) ?? null;
    const descriptionEl = firstEl(doc, [
      "#job-details",
      ".jobs-description__content",
      ".jobs-description-content__text",
      ".show-more-less-html__markup",
      ".description__text",
      '[class*="jobs-description"]'
    ]);
    const description = blockTextExcluding(descriptionEl, ["button", ".jobs-description__footer", '[class*="show-more-less-button"]']);
    const companyEl = firstEl(doc, [
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name a",
      "a.topcard__org-name-link",
      ".topcard__org-name-link",
      '[class*="top-card"] a[href*="/company/"]',
      'a[href*="/company/"]'
    ]);
    const criteria = /* @__PURE__ */ new Map();
    for (const item of Array.from(doc.querySelectorAll(".description__job-criteria-item"))) {
      const header = normText((_b = item.querySelector(".description__job-criteria-subheader")) == null ? void 0 : _b.textContent).toLowerCase();
      const value = normText((_c = item.querySelector(".description__job-criteria-text")) == null ? void 0 : _c.textContent);
      if (header && value) criteria.set(header, value);
    }
    const urn = doc.querySelector('[data-entity-urn*="jobPosting:"], [data-job-id]');
    const urnValue = (urn == null ? void 0 : urn.getAttribute("data-entity-urn")) ?? (urn == null ? void 0 : urn.getAttribute("data-job-id")) ?? "";
    const idMatch = /(\d{6,})/.exec(urnValue);
    let canonicalUrl = null;
    const apply = doc.querySelector('a[href*="/jobs/view/externalApply/"]');
    if (apply) {
      try {
        canonicalUrl = new URL(apply.getAttribute("href") ?? "", url.href).searchParams.get("url");
      } catch {
        canonicalUrl = null;
      }
    }
    return {
      title,
      titleEl,
      company: cleanCompany(oneLine(companyEl)),
      location: firstText(doc, [
        ".job-details-jobs-unified-top-card__bullet",
        ".jobs-unified-top-card__bullet",
        ".topcard__flavor--bullet"
      ]),
      description: description.length > 0 ? description : null,
      descriptionEl,
      experienceLevel: criteria.get("seniority level") ?? null,
      employmentType: criteria.get("employment type") ?? null,
      sector: criteria.get("industries") ?? null,
      applicantText: firstText(doc, [".num-applicants__caption", ".jobs-unified-top-card__applicant-count", '[class*="applicant"]'], 80),
      linkedinJobId: idMatch ? idMatch[1] : null,
      canonicalUrl
    };
  }
};
const oracle = {
  name: "oracle",
  extract(doc, url) {
    const descriptionEl = firstEl(doc, [".job-details__description-content", ".job-details__description", '[class*="job-details__description"]', '[class*="job-description"]']);
    const description = blockTextExcluding(descriptionEl, ["form", "nav", "button", '[class*="apply"]']);
    return {
      title: firstText(doc, [".job-details__title", "h1"]),
      location: firstText(doc, [".job-details__location", '[class*="job-details__location"]', '[class*="job-location"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      postedAgeText: parsePostedAge(firstText(doc, [".job-details__posted-date", '[class*="posted-date"]'])),
      atsReqId: atsReqIdFromUrl(url.href)
    };
  }
};
const successfactors = {
  name: "successfactors",
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['[itemprop="description"]', ".jobdescription", ".job-description", "#job-description", ".jobDisplay", ".jobDisplayShell"]);
    const description = blockTextExcluding(descriptionEl, ["form", "nav", "button", ".jobDetailsApply"]);
    return {
      title: firstText(doc, ['[itemprop="title"]', "h1.jobTitle", "h1"]),
      location: firstText(doc, ['[itemprop="jobLocation"]', ".jobGeoLocation", '[class*="jobLocation"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      atsReqId: atsReqIdFromUrl(url.href)
    };
  }
};
const workday = {
  name: "workday",
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['[data-automation-id="jobPostingDescription"]']);
    const description = descriptionEl ? blockText(descriptionEl) : null;
    return {
      title: firstText(doc, ['[data-automation-id="jobPostingHeader"]', "h2[data-automation-id]", "h1"]),
      location: firstText(doc, ['[data-automation-id="locations"] dd', '[data-automation-id="locations"]']),
      description: description && description.length > 0 ? description : null,
      descriptionEl,
      postedAgeText: parsePostedAge(firstText(doc, ['[data-automation-id="postedOn"] dd', '[data-automation-id="postedOn"]'])),
      // what the page states; the key and the column take the URL's id (lib/job-capture.ts buildJobRow)
      atsReqId: firstText(doc, ['[data-automation-id="requisitionId"] dd'], 40) ?? atsReqIdFromUrl(url.href),
      workTypeText: firstText(doc, ['[data-automation-id="remoteType"] dd', '[data-automation-id="remoteType"]'], 40)
    };
  }
};
const generic = { name: "generic", extract: () => ({}) };
const BY_ATS = { workday, greenhouse, icims, successfactors, oracle };
const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i;
function hostOf$2(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
function fingerprintAts(hostname, doc, frames = []) {
  const registry = getAdapter(hostname, doc);
  if (registry && !registry.hosts.test(hostname)) return registry.name;
  if (doc.querySelector('iframe[src*="greenhouse.io/embed"], script[src*="greenhouse.io/embed"], script[src*="boards.greenhouse.io"], iframe[src*="boards.greenhouse.io"]')) return "greenhouse";
  if (doc.querySelector('link[href*="rmkcdn.successfactors.com"], script[src*="rmkcdn.successfactors.com"]')) return "successfactors";
  if (doc.querySelector('iframe#icims_content_iframe, iframe[src*=".icims.com"]')) return "icims";
  if (doc.querySelector('iframe[src*="myworkdayjobs.com"], iframe[src*="myworkdaysite.com"]')) return "workday";
  for (const frame of frames) {
    const host = hostOf$2(frame.url);
    const ats = host ? atsFromHost(host) : null;
    if (ats) return ats;
  }
  return null;
}
function classifyPosting(url, doc, frames = []) {
  const host = url.hostname.toLowerCase();
  if (LINKEDIN_HOST.test(host)) {
    return { source: "linkedin", ats: "unknown", adapter: linkedin, matchedBy: "linkedin", companyDomain: null };
  }
  const hostAts = atsFromHost(host);
  if (hostAts) {
    return { source: "ats_portal", ats: hostAts, adapter: BY_ATS[hostAts] ?? generic, matchedBy: "host", companyDomain: null };
  }
  const domain = companyDomain(host);
  const fingerprint = url.searchParams.get("gh_jid") ? "greenhouse" : fingerprintAts(host, doc, frames);
  if (fingerprint) {
    return { source: "company_site", ats: fingerprint, adapter: BY_ATS[fingerprint] ?? generic, matchedBy: "fingerprint", companyDomain: domain };
  }
  return { source: "company_site", ats: "unknown", adapter: generic, matchedBy: "none", companyDomain: domain };
}
function isLoopbackV4(o) {
  return o[0] === 127;
}
function isPrivateV4(o) {
  if (o[0] === 10) return true;
  if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
  if (o[0] === 192 && o[1] === 168) return true;
  if (o[0] === 169 && o[1] === 254) return true;
  return false;
}
function isTailnetV4(o) {
  return o[0] === 100 && o[1] >= 64 && o[1] <= 127;
}
function parseIpv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => /^\d{1,3}$/.test(p) ? Number(p) : NaN);
  return octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? octets : null;
}
function classifyHost(hostname) {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "") return "unknown";
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost")) return "loopback";
  const v4 = parseIpv4(host);
  if (v4) {
    if (isLoopbackV4(v4)) return "loopback";
    if (isTailnetV4(v4)) return "tailnet";
    if (isPrivateV4(v4)) return "private";
    return "public";
  }
  if (host.includes(":")) {
    return /^f[cd][0-9a-f]{2}:/.test(host) ? "private" : "public";
  }
  if (host.endsWith(".ts.net")) return "tailnet";
  return "unknown";
}
const ALLOWED_CLASSES = ["loopback", "private", "tailnet"];
function describeRejection(host, cls) {
  if (cls === "public") {
    return `Refusing to send to ${host} — that is a public address. Tailor must stay on a network you control.`;
  }
  return `Refusing to send to ${host} — cannot verify it is a private address. Use an IP (127.0.0.1, 192.168.x.x, 10.x.x.x, 100.64–127.x.x) or a .ts.net name.`;
}
function assertAllowedTailorUrl(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`"${baseUrl}" is not a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported scheme "${parsed.protocol}" — use http:// or https://.`);
  }
  const cls = classifyHost(parsed.hostname);
  if (!ALLOWED_CLASSES.includes(cls)) {
    throw new Error(describeRejection(parsed.hostname, cls));
  }
}
const TAILOR_TOKEN_KEY = "flashfiller_tailor_v1";
const DEFAULT_CONFIG = {
  baseUrl: TAILOR_BASE_URL
};
const ENGINES_OFFERED = ["v6", "v7"];
const normalizeBaseUrl = (value) => value.trim().replace(/\/+$/, "");
function asModel(value) {
  return value === "claude-sonnet-4-6" || value === "claude-haiku-4-5" ? value : null;
}
async function getTailorConfig() {
  var _a, _b;
  const raw = await chrome.storage.local.get(TAILOR_TOKEN_KEY);
  const stored = raw == null ? void 0 : raw[TAILOR_TOKEN_KEY];
  return {
    baseUrl: normalizeBaseUrl((stored == null ? void 0 : stored.baseUrl) ?? "") || DEFAULT_CONFIG.baseUrl,
    token: ((_a = stored == null ? void 0 : stored.token) == null ? void 0 : _a.trim()) || "",
    engine: ENGINES_OFFERED.includes(stored == null ? void 0 : stored.engine) ? stored == null ? void 0 : stored.engine : "v6",
    domain: ((_b = stored == null ? void 0 : stored.domain) == null ? void 0 : _b.trim()) || "",
    mode: (stored == null ? void 0 : stored.mode) === "full" ? "full" : "skills",
    writerModel: asModel(stored == null ? void 0 : stored.writerModel),
    extractorModel: asModel(stored == null ? void 0 : stored.extractorModel)
  };
}
async function setTailorConfig(patch) {
  if (patch.baseUrl !== void 0) {
    const baseUrl = normalizeBaseUrl(patch.baseUrl);
    assertAllowedTailorUrl(baseUrl);
    patch = { ...patch, baseUrl };
  }
  const current = await getTailorConfig();
  await chrome.storage.local.set({ [TAILOR_TOKEN_KEY]: { ...current, ...patch } });
}
async function request(path, init = {}) {
  const { baseUrl, token } = await getTailorConfig();
  assertAllowedTailorUrl(baseUrl);
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...token ? { "X-Tailor-Token": token } : {},
        ...init.headers ?? {}
      }
    });
  } catch {
    throw new TailorOfflineError();
  }
  if (response.status === 401) {
    throw new Error(
      'Tailor rejected the token. Set it with "Set token" above — it is printed when `make serve` starts and cached in apps/mapper/.tailor-token.'
    );
  }
  const text2 = await response.text();
  let payload = null;
  if (text2) {
    try {
      payload = JSON.parse(text2);
    } catch {
      throw new Error(`Tailor returned a non-JSON response (HTTP ${response.status}).`);
    }
  }
  if (response.status === 422 && payload && typeof payload === "object" && "violations" in payload) {
    throw new FinalizeRejectedError(payload);
  }
  if (!response.ok) {
    const message = payload == null ? void 0 : payload.error;
    throw new Error(message ?? `Tailor returned HTTP ${response.status}.`);
  }
  return payload;
}
class TailorOfflineError extends Error {
  constructor() {
    super("Tailor service is not running.");
    this.name = "TailorOfflineError";
  }
}
class FinalizeRejectedError extends Error {
  constructor(body) {
    super(body.error || "Some boxes are over their line limits.");
    __publicField(this, "violations");
    __publicField(this, "limits");
    this.name = "FinalizeRejectedError";
    this.violations = body.violations ?? [];
    this.limits = body.limits ?? null;
  }
}
async function checkHealth() {
  try {
    return await request("/health");
  } catch (error) {
    if (error instanceof TailorOfflineError) return null;
    throw error;
  }
}
async function startTailor(req) {
  return request("/tailor", { method: "POST", body: JSON.stringify(req) });
}
async function getJob(jobId) {
  return request(`/tailor/${encodeURIComponent(jobId)}`);
}
async function cancelJob(jobId) {
  const res = await request(
    `/tailor/${encodeURIComponent(jobId)}/cancel`,
    { method: "POST" }
  );
  return res.cancelled;
}
async function finalizeJob(jobId, edits = {}) {
  return request(`/tailor/${encodeURIComponent(jobId)}/finalize`, {
    method: "POST",
    body: JSON.stringify(edits)
  });
}
async function measureEdits(jobId, edits) {
  return request(`/tailor/${encodeURIComponent(jobId)}/measure`, {
    method: "POST",
    body: JSON.stringify(edits)
  });
}
async function listFamilies() {
  const res = await request("/tailor/domains");
  return res.families ?? [];
}
function downloadResultDocument(result) {
  if (!result.document) return;
  const { name, mime, bytesB64 } = result.document;
  const url = URL.createObjectURL(base64ToBlob(bytesB64, mime));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
function estimateCoverLetterCostUsd() {
  return 0.05;
}
async function requestCoverLetter(jobId) {
  return request(`/tailor/${encodeURIComponent(jobId)}/coverletter`, {
    method: "POST"
  });
}
async function pollCoverLetter(jobId, onUpdate, opts = {}) {
  var _a, _b;
  const interval = opts.intervalMs ?? 2e3;
  const timeout = opts.timeoutMs ?? 5 * 60 * 1e3;
  const startedAt = Date.now();
  for (; ; ) {
    if ((_a = opts.signal) == null ? void 0 : _a.aborted) throw new Error("Stopped watching the cover letter.");
    const job = await getJob(jobId);
    onUpdate(job);
    if ((((_b = job.result) == null ? void 0 : _b.coverLetterStatus) ?? "none") !== "running") return job;
    if (Date.now() - startedAt > timeout) {
      throw new Error("Gave up waiting after 5 minutes — reopen to check on the letter.");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
function downloadCoverLetterDocument(result) {
  if (!result.coverLetterDocument) return;
  const { name, mime, bytesB64 } = result.coverLetterDocument;
  const url = URL.createObjectURL(base64ToBlob(bytesB64, mime));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
async function saveCoverLetterAsDocument(result) {
  if (!result.coverLetterDocument) {
    throw new Error("This run has no rendered cover letter document yet.");
  }
  const { name, mime, bytesB64 } = result.coverLetterDocument;
  const file = new File([base64ToBlob(bytesB64, mime)], name, { type: mime });
  return saveDocument(file, "coverLetter");
}
async function pollUntilDone(jobId, onUpdate, opts = {}) {
  var _a;
  const interval = opts.intervalMs ?? 2500;
  const timeout = opts.timeoutMs ?? 15 * 60 * 1e3;
  const startedAt = Date.now();
  for (; ; ) {
    if ((_a = opts.signal) == null ? void 0 : _a.aborted) throw new Error("Stopped watching this run.");
    const job = await getJob(jobId);
    onUpdate(job);
    if (isTerminal(job.status)) return job;
    if (Date.now() - startedAt > timeout) {
      throw new Error("Gave up waiting after 15 minutes — the run may still be going; reopen to check.");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
const TAILOR_ACTIVE_RUN_KEY = "flashfiller_tailor_active_run_v1";
const TAILOR_DRAFT_EDITS_KEY = "flashfiller_tailor_draft_edits_v1";
async function saveActiveRun(rec) {
  try {
    await chrome.storage.local.set({ [TAILOR_ACTIVE_RUN_KEY]: rec });
  } catch {
  }
}
async function getActiveRun() {
  try {
    const raw = await chrome.storage.local.get(TAILOR_ACTIVE_RUN_KEY);
    const rec = raw == null ? void 0 : raw[TAILOR_ACTIVE_RUN_KEY];
    return rec && typeof rec.jobId === "string" && rec.jobId ? rec : null;
  } catch {
    return null;
  }
}
async function clearActiveRun() {
  try {
    await chrome.storage.local.remove(TAILOR_ACTIVE_RUN_KEY);
  } catch {
  }
}
async function saveDraftEdits(edits) {
  try {
    await chrome.storage.local.set({ [TAILOR_DRAFT_EDITS_KEY]: edits });
  } catch {
  }
}
async function getDraftEdits(jobId) {
  try {
    const raw = await chrome.storage.local.get(TAILOR_DRAFT_EDITS_KEY);
    const rec = raw == null ? void 0 : raw[TAILOR_DRAFT_EDITS_KEY];
    return rec && rec.jobId === jobId ? rec : null;
  } catch {
    return null;
  }
}
async function clearDraftEdits() {
  try {
    await chrome.storage.local.remove(TAILOR_DRAFT_EDITS_KEY);
  } catch {
  }
}
function isUnknownJobError(e) {
  return e instanceof Error && !(e instanceof TailorOfflineError) && /unknown job/i.test(e.message);
}
function base64ToBlob(b64, mime) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
async function saveResultAsDocument(result, { kind = "resume", makeDefault = true } = {}) {
  if (!result.document) throw new Error("That run produced bullets but no document.");
  const { name, mime, bytesB64 } = result.document;
  const file = new File([base64ToBlob(bytesB64, mime)], name, { type: mime });
  const saved = await saveDocument(file, kind);
  if (makeDefault && !saved.isDefault) await updateDocument(saved.id, { isDefault: true });
  return saved;
}
function estimateCostUsd(engine = "v6", preset = {}) {
  if (engine === "v7") {
    const extraction = preset.extractorModel === "claude-sonnet-4-6" ? 0.09 : 0.03;
    if (preset.mode !== "full") return extraction;
    return Math.round((extraction + (preset.writerModel === "claude-haiku-4-5" ? 5e-3 : 0.03)) * 1e3) / 1e3;
  }
  if (engine === "v5") return 0.15;
  const haikuWriter = preset.writerModel === "claude-haiku-4-5";
  const haikuExtractor = preset.extractorModel === "claude-haiku-4-5";
  if (haikuWriter && haikuExtractor) return 0.09;
  if (haikuWriter) return 0.16;
  if (haikuExtractor) return 0.15;
  return 0.22;
}
function estimateRedraftCostUsd(preset = {}) {
  return preset.writerModel === "claude-haiku-4-5" ? 0.05 : 0.14;
}
const V6_PRESETS = [
  { id: "sonnet", label: "Sonnet extractor + writer (default)", preset: {} },
  { id: "haiku-extractor", label: "Haiku extractor, Sonnet writer", preset: { extractorModel: "claude-haiku-4-5" } },
  { id: "haiku", label: "all Haiku", preset: { writerModel: "claude-haiku-4-5", extractorModel: "claude-haiku-4-5" } }
];
const V7_PRESETS = [
  { id: "skills-haiku", label: "skills · Haiku extractor (default)", preset: {} },
  { id: "skills-sonnet", label: "skills · Sonnet extractor", preset: { extractorModel: "claude-sonnet-4-6" } },
  // full mode names its writer explicitly, so the cost tables (here and service/batch.py) key on it
  { id: "full-sonnet", label: "full · rephrase with the Sonnet writer", preset: { mode: "full", writerModel: "claude-sonnet-4-6" } },
  { id: "full-haiku", label: "full · rephrase with the Haiku writer", preset: { mode: "full", writerModel: "claude-haiku-4-5" } }
];
function presetId(engine, preset) {
  const list = engine === "v7" ? V7_PRESETS : V6_PRESETS;
  const hit = list.find((p) => (p.preset.mode ?? "skills") === (preset.mode ?? "skills") && (p.preset.writerModel ?? null) === (preset.writerModel ?? null) && (p.preset.extractorModel ?? null) === (preset.extractorModel ?? null));
  return (hit == null ? void 0 : hit.id) ?? list[0].id;
}
const HUB_OUTBOX_KEY = "flashfiller_hub_outbox_v1";
const HUB_DEAD_KEY = "flashfiller_hub_dead_v1";
const HUB_SURFACE = "extension";
const HUB_BATCH_MAX = 50;
function newRef() {
  var _a, _b;
  return ((_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) ?? `op-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
async function readList(key) {
  const raw = await chrome.storage.local.get(key);
  const list = raw == null ? void 0 : raw[key];
  return Array.isArray(list) ? list : [];
}
async function writeList(key, list) {
  await chrome.storage.local.set({ [key]: list });
}
async function getHubOutbox() {
  return readList(HUB_OUTBOX_KEY);
}
async function getHubDeadLetters() {
  return readList(HUB_DEAD_KEY);
}
let outboxChain = Promise.resolve();
function withOutbox(fn) {
  const run = outboxChain.then(fn, fn);
  outboxChain = run.catch(() => void 0);
  return run;
}
async function hubEnqueue(op, opts = {}) {
  const ref = op.clientRef ?? newRef();
  const entry = { ref, op: { ...op, clientRef: ref }, queuedAt: Date.now(), attempts: 0, lastError: null };
  await withOutbox(async () => {
    const outbox = await getHubOutbox();
    outbox.push(entry);
    await writeList(HUB_OUTBOX_KEY, outbox);
  });
  if (opts.flush !== false) await flushHubOutbox();
  return ref;
}
function hubInsert(table, row, opts) {
  return hubEnqueue({ op: "insert", table, body: row }, opts);
}
function hubUpsert(table, row, onConflict, opts) {
  return hubEnqueue({ op: "upsert", table, body: row, onConflict: null }, opts);
}
function hubUpdate(table, id, patch, opts) {
  return hubEnqueue({ op: "update", table, id, body: patch }, opts);
}
async function hubFetch(path, init = {}) {
  const { baseUrl, token } = await getTailorConfig();
  assertAllowedTailorUrl(baseUrl);
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Surface": HUB_SURFACE,
      ...token ? { "X-Tailor-Token": token } : {},
      ...init.headers ?? {}
    }
  });
}
let flushing = null;
let followUp = null;
function flushHubOutbox() {
  if (flushing) {
    if (!followUp) {
      followUp = flushing.then((first) => flushHubOutbox().then((second) => mergeReports(first, second)), () => flushHubOutbox()).finally(() => {
        followUp = null;
      });
    }
    return followUp;
  }
  flushing = doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}
function mergeReports(a, b) {
  return { ...b, sent: a.sent + b.sent, dead: a.dead + b.dead, rows: { ...a.rows ?? {}, ...b.rows ?? {} } };
}
const HUB_BATCH_MAX_BYTES = 9e5;
function takeChunk(outbox, maxOps) {
  const chunk = [];
  let bytes = 0;
  for (const e of outbox.slice(0, maxOps)) {
    const size = JSON.stringify(e.op).length;
    if (chunk.length > 0 && bytes + size > HUB_BATCH_MAX_BYTES) break;
    chunk.push(e);
    bytes += size;
  }
  return chunk;
}
async function doFlush() {
  let outbox = await getHubOutbox();
  if (outbox.length === 0) return { sent: 0, left: 0, dead: 0, offline: false, reason: "outbox empty" };
  let sent = 0;
  let dead = 0;
  const rows = {};
  let maxOps = HUB_BATCH_MAX;
  while (outbox.length > 0) {
    const chunk = takeChunk(outbox, maxOps);
    const body = { ops: chunk.map((e) => e.op), surface: HUB_SURFACE };
    let response;
    try {
      response = await hubFetch("/db/batch", { method: "POST", body: JSON.stringify(body) });
      if (!response) throw new Error("no response");
    } catch {
      return { sent, rows, left: outbox.length, dead, offline: true, reason: "Tailor service is not running." };
    }
    if (response.status === 401) {
      return { sent, rows, left: outbox.length, dead, offline: false, reason: "Tailor rejected the token — set it in the Tailor tab." };
    }
    if (response.status === 503) {
      return { sent, rows, left: outbox.length, dead, offline: false, reason: "The hub has no database configured (apps/mapper/.env)." };
    }
    if (response.status === 400 || response.status === 413) {
      if (chunk.length > 1) {
        maxOps = Math.max(1, Math.floor(chunk.length / 2));
        continue;
      }
      let why = `Hub answered HTTP ${response.status}.`;
      try {
        const err = await response.json();
        if (typeof (err == null ? void 0 : err.error) === "string") why = err.error;
      } catch {
      }
      const only = chunk[0];
      const existing = await getHubDeadLetters();
      await writeList(HUB_DEAD_KEY, [...existing, { ...only, attempts: only.attempts + 1, lastError: why, status: response.status, diedAt: Date.now() }].slice(-200));
      dead += 1;
      outbox = await withOutbox(async () => {
        const next = (await getHubOutbox()).filter((e) => e.ref !== only.ref);
        await writeList(HUB_OUTBOX_KEY, next);
        return next;
      });
      maxOps = HUB_BATCH_MAX;
      continue;
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!payload || !Array.isArray(payload.results)) {
      const attempted = new Set(chunk.map((e) => e.ref));
      outbox = await withOutbox(async () => {
        const next = (await getHubOutbox()).map((e) => attempted.has(e.ref) ? { ...e, attempts: e.attempts + 1 } : e);
        await writeList(HUB_OUTBOX_KEY, next);
        return next;
      });
      return { sent, rows, left: outbox.length, dead, offline: false, reason: `Hub answered HTTP ${response.status}.` };
    }
    const byRef = /* @__PURE__ */ new Map();
    for (const r of payload.results) if (r.clientRef) byRef.set(r.clientRef, r);
    const keep = [];
    const deadNow = [];
    for (const e of chunk) {
      const r = byRef.get(e.ref);
      if (r == null ? void 0 : r.ok) {
        sent += 1;
        if (r.row && typeof r.row === "object") rows[e.ref] = r.row;
      } else if (r && r.status >= 400 && r.status < 500) {
        deadNow.push({ ...e, attempts: e.attempts + 1, lastError: r.error ?? `HTTP ${r.status}`, status: r.status, diedAt: Date.now() });
      } else {
        keep.push({ ...e, attempts: e.attempts + 1, lastError: (r == null ? void 0 : r.error) ?? "no result for this op" });
      }
    }
    if (deadNow.length) {
      dead += deadNow.length;
      const existing = await getHubDeadLetters();
      await writeList(HUB_DEAD_KEY, [...existing, ...deadNow].slice(-200));
    }
    const chunkRefs = new Set(chunk.map((e) => e.ref));
    outbox = await withOutbox(async () => {
      const current = await getHubOutbox();
      const next = [...keep, ...current.filter((e) => !chunkRefs.has(e.ref))];
      await writeList(HUB_OUTBOX_KEY, next);
      return next;
    });
    if (keep.length > 0) {
      return { sent, rows, left: outbox.length, dead, offline: false, reason: keep[0].lastError ?? null };
    }
  }
  return { sent, rows, left: 0, dead, offline: false, reason: null };
}
async function hubQuery(table, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await hubFetch(`/db/${table}${qs ? `?${qs}` : ""}`);
  if (!r.ok) throw new Error(`Hub returned HTTP ${r.status}.`);
  const body = await r.json();
  return body.rows;
}
const CAPTURE_MATRIX = [
  "title",
  "company",
  "description",
  "experience_level",
  "sponsorship",
  "posted_at",
  "posted_age_text",
  "source_url",
  "work_type",
  "sector",
  "location",
  "applicant_count"
];
const DESCRIPTION_MIN = 200;
const DESCRIPTION_MAX = 6e4;
function clean$2(value, max = 300) {
  const text2 = normText(value);
  return text2.length > 0 && text2.length < max ? text2 : null;
}
function capChars(text2, max) {
  if (text2.length <= max) return text2;
  const cut = text2.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}
const APPLICANTS_RE = /^(?:over\s+|more than\s+)?\d[\d,]*\+?\s+(?:applicants?|people clicked apply)$/i;
const FIRST_N_RE = /\bfirst\s+\d+\s+applicants?\b/i;
function parseApplicants(value) {
  const text2 = normText(value);
  if (!text2) return { count: null, text: null };
  if (FIRST_N_RE.test(text2)) return { count: null, text: text2 };
  if (APPLICANTS_RE.test(text2)) return { count: pyInt(text2), text: text2 };
  return { count: null, text: null };
}
function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}
function htmlToText(html) {
  let text2 = blockText(parseHtml(html).body);
  if (/&lt;|<\/?(?:p|br|li|ul|ol|div|strong|b)\b/i.test(text2)) text2 = blockText(parseHtml(text2).body);
  return text2;
}
function hostOf$1(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
function precedes(el, descEl) {
  if (!descEl) return true;
  return (el.compareDocumentPosition(descEl) & 4) !== 0;
}
function findJobPosting(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  const obj = node;
  const type = obj["@type"];
  if (type === "JobPosting" || Array.isArray(type) && type.includes("JobPosting")) return obj;
  if (obj["@graph"]) return findJobPosting(obj["@graph"]);
  return null;
}
function joinStrings(value) {
  if (typeof value === "string") return clean$2(value);
  if (Array.isArray(value)) return clean$2(value.filter((v) => typeof v === "string").join(", "));
  return null;
}
function capPosting(posting) {
  const out = {};
  for (const [key, value] of Object.entries(posting)) {
    if (key === "description" || key === "@context") continue;
    if (typeof value === "string") out[key] = value.length > 2e3 ? capChars(value, 2e3) + "…" : value;
    else if (value !== null && typeof value === "object") {
      const json = JSON.stringify(value);
      out[key] = json.length > 2e3 ? capChars(json, 2e3) + "…" : value;
    } else out[key] = value;
  }
  return out;
}
function jsonLdLocation(posting) {
  const jobLocation = posting.jobLocation;
  const first = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  if (typeof first === "string") return clean$2(first);
  if (!first || typeof first !== "object") return null;
  const address = first.address;
  if (address && typeof address === "object") {
    const a = address;
    const parts = [clean$2(a.addressLocality), clean$2(a.addressRegion)].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return clean$2(a.addressCountry) ?? (typeof a.addressCountry === "object" && a.addressCountry ? clean$2(a.addressCountry.name) : null);
  }
  if (typeof address === "string") return clean$2(address);
  return clean$2(first.name);
}
function extractJsonLd(doc) {
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    let parsed;
    try {
      parsed = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }
    const posting = findJobPosting(parsed);
    if (!posting) continue;
    const org = posting.hiringOrganization;
    const identifier = posting.identifier;
    const locationType = posting.jobLocationType;
    const description = typeof posting.description === "string" ? htmlToText(posting.description) : null;
    return {
      title: clean$2(posting.title),
      company: typeof org === "string" ? clean$2(org) : clean$2(org == null ? void 0 : org.name),
      location: jsonLdLocation(posting),
      description: description && description.length >= DESCRIPTION_MIN ? description : null,
      postedAt: pyDate(posting.datePosted),
      industry: joinStrings(posting.industry),
      remote: locationType === "TELECOMMUTE" || Array.isArray(locationType) && locationType.includes("TELECOMMUTE"),
      identifier: typeof identifier === "string" ? clean$2(identifier, 80) : clean$2(identifier == null ? void 0 : identifier.value, 80),
      url: typeof posting.url === "string" ? posting.url : null,
      employmentType: joinStrings(posting.employmentType),
      posting: capPosting(posting)
    };
  }
  return null;
}
function extractMicrodata(doc) {
  const scope = doc.querySelector('[itemtype*="JobPosting"]');
  if (!scope) return null;
  const org = scope.querySelector('[itemprop="hiringOrganization"]');
  const loc = scope.querySelector('[itemprop="jobLocation"]');
  const locality = oneLine(loc == null ? void 0 : loc.querySelector('[itemprop="addressLocality"]'));
  const region = oneLine(loc == null ? void 0 : loc.querySelector('[itemprop="addressRegion"]'));
  const descriptionEl = scope.querySelector('[itemprop="description"]');
  const description = descriptionEl ? blockText(descriptionEl) : null;
  const posted = scope.querySelector('[itemprop="datePosted"]');
  return {
    title: oneLine(scope.querySelector('[itemprop="title"]')),
    company: oneLine((org == null ? void 0 : org.querySelector('[itemprop="name"]')) ?? org),
    location: [locality, region].filter(Boolean).join(", ") || oneLine(loc),
    description: description && description.length >= DESCRIPTION_MIN ? description : null,
    descriptionEl,
    postedAt: pyDate((posted == null ? void 0 : posted.getAttribute("content")) ?? (posted == null ? void 0 : posted.getAttribute("datetime")) ?? oneLine(posted)),
    industry: oneLine(scope.querySelector('[itemprop="industry"]')),
    employmentType: oneLine(scope.querySelector('[itemprop="employmentType"]'))
  };
}
function parseSiteTitle(title, source, ats) {
  if (!title) return {};
  if (source === "linkedin") {
    let m = /^(?:\(\d+\)\s*)?(.+?)\s+\|\s+(.+?)\s+\|\s+LinkedIn$/i.exec(title);
    if (m) return { role: clean$2(m[1]), company: clean$2(m[2]) };
    m = /^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)\s+\|\s+LinkedIn$/i.exec(title);
    if (m) return { company: clean$2(m[1]), role: clean$2(m[2]), location: clean$2(m[3]) };
    return {};
  }
  if (ats === "greenhouse") {
    const m = /^Job Application for (.+?) at (.+)$/i.exec(title);
    if (m) return { role: clean$2(m[1]), company: clean$2(m[2]) };
  }
  return {};
}
const SEMANTIC = [
  ['[data-automation-id="jobPostingDescription"]', "main"],
  ["#job-details", "main"],
  [".job-description", "main"],
  ['[class*="jobDescription"]', "main"],
  ['[class*="job-description"]', "main"],
  ["article", "article"],
  ["main", "main"]
];
const DESCRIPTION_JUNK = ["nav", "header", "footer", "form", "script", "style", "button"];
const SEE_MORE = /\n?\s*(?:…\s*)?(?:see|show)\s+(?:more|less)\s*$/i;
function stripSeeMore(text2) {
  return text2.replace(SEE_MORE, "").replace(SEE_MORE, "").trim();
}
function chromeAncestors(doc) {
  const out = /* @__PURE__ */ new Set();
  for (const chrome2 of Array.from(doc.querySelectorAll("nav, header, footer"))) {
    let node = chrome2;
    while (node) {
      if (out.has(node)) break;
      out.add(node);
      node = node.parentElement;
    }
  }
  return out;
}
function pickDescription(doc, adapter, ld, md) {
  const container = adapter.description ? stripSeeMore(adapter.description) : "";
  const containerClamped = !!adapter.description && (SEE_MORE.test(adapter.description) || !!doc.querySelector('[class*="show-more"], [class*="see-more"]'));
  const fromLd = (ld == null ? void 0 : ld.description) ? stripSeeMore(ld.description) : "";
  const anchor = adapter.descriptionEl ?? (md == null ? void 0 : md.descriptionEl) ?? null;
  if (container.length >= DESCRIPTION_MIN) {
    if (fromLd.length >= DESCRIPTION_MIN && container.length < 0.6 * fromLd.length) {
      return { text: fromLd, el: anchor, layer: "jsonld", truncated: false };
    }
    return { text: container, el: anchor, layer: "adapter", truncated: containerClamped && container.length < 400 };
  }
  if (fromLd.length >= DESCRIPTION_MIN) {
    const fallback = anchor ?? SEMANTIC.map(([selector]) => doc.querySelector(selector)).find((el) => el && (el.textContent ?? "").length > 400) ?? null;
    return { text: fromLd, el: fallback, layer: "jsonld", truncated: false };
  }
  if ((md == null ? void 0 : md.description) && md.description.length >= DESCRIPTION_MIN) {
    return { text: stripSeeMore(md.description), el: md.descriptionEl, layer: "microdata", truncated: false };
  }
  for (const [selector, layer] of SEMANTIC) {
    const el = doc.querySelector(selector);
    if (!el || (el.textContent ?? "").length <= 400) continue;
    const text2 = stripSeeMore(blockTextExcluding(el, DESCRIPTION_JUNK));
    if (text2.length > 400) return { text: text2, el, layer, truncated: false };
  }
  const chrome2 = chromeAncestors(doc);
  let best = null;
  let bestLength = 0;
  for (const el of Array.from(doc.querySelectorAll("div, section, td"))) {
    if (chrome2.has(el)) continue;
    const length = (el.textContent ?? "").length;
    if (length > bestLength && length < 4e4) {
      best = el;
      bestLength = length;
    }
  }
  if (best) {
    const text2 = stripSeeMore(blockTextExcluding(best, DESCRIPTION_JUNK));
    if (text2.length > 400) return { text: text2, el: best, layer: "largest-block", truncated: false };
  }
  const body = stripSeeMore(blockTextExcluding(doc.body, DESCRIPTION_JUNK));
  if (body.length > 400) return { text: body, el: doc.body, layer: "body", truncated: false };
  return null;
}
const EXCLUDE_SEL = [
  "nav",
  "aside",
  "footer",
  '[role="navigation"]',
  '[role="contentinfo"]',
  "select",
  "option",
  "label",
  "input",
  "textarea",
  '[role="option"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  "[aria-pressed]",
  "[aria-haspopup]",
  '[role="menu"]',
  '[role="listbox"]',
  "script",
  "style",
  "noscript",
  "template"
].join(", ");
function scanPieces(region, descEl) {
  const doc = region.ownerDocument;
  const walker = doc.createTreeWalker(region, 4);
  const pieces = [];
  const seenParents = /* @__PURE__ */ new Set();
  const excluded = /* @__PURE__ */ new Map();
  const isExcluded = (el) => {
    const chain = [];
    let node2 = el;
    let verdict2 = false;
    while (node2 && node2 !== region.parentElement) {
      const known = excluded.get(node2);
      if (known !== void 0) {
        verdict2 = known;
        break;
      }
      chain.push(node2);
      if (node2.matches(EXCLUDE_SEL)) {
        verdict2 = true;
        break;
      }
      node2 = node2.parentElement;
    }
    for (const seen of chain) excluded.set(seen, verdict2);
    return verdict2;
  };
  const push = (text2, el) => {
    for (const part of text2.split(/\s*[·•|]\s*/)) {
      const piece = part.trim();
      if (piece.length >= 2 && piece.length <= 120) pieces.push({ text: piece, el, inLink: !!el.closest("a[href]") });
    }
  };
  let node = walker.nextNode();
  let guard = 0;
  while (node && guard++ < 2e4) {
    const parent = node.parentElement;
    if (parent && !(descEl && descEl.contains(node)) && !isExcluded(parent)) {
      const own = normText(node.nodeValue);
      if (own.length >= 2 && own.length <= 120) push(own, parent);
      if (!seenParents.has(parent) && parent.childNodes.length <= 8) {
        seenParents.add(parent);
        const whole = normText(parent.textContent);
        if (whole !== own && whole.length >= 2 && whole.length <= 160) push(whole, parent);
      }
    }
    node = walker.nextNode();
  }
  return pieces;
}
function regionOf(doc, titleEl, descEl) {
  if (!titleEl || !descEl) return doc.body ?? doc.documentElement;
  let node = titleEl;
  while (node && !node.contains(descEl)) node = node.parentElement;
  return node ?? doc.body ?? doc.documentElement;
}
const LEVEL_LABEL_RE = /^(?:seniority|experience)\s+level\s*[:\-]?\s*(.*)$/i;
const LEVEL_PILLS = /* @__PURE__ */ new Set(["internship", "entry level", "mid-senior level", "not applicable"]);
const LEVEL_VALUES = /* @__PURE__ */ new Set([...LEVEL_PILLS, "associate", "director", "executive"]);
const WORK_LABEL_RE = /^(?:workplace type|work arrangement|remote type|location type|work location|workplace)\s*[:\-]?\s*(.*)$/i;
const WORK_SENTENCE_RE = /workplace type is (remote|hybrid|on-?site)/i;
const WORK_PILL_RE = /^(remote|hybrid|on-?site|in[- ]office)$/i;
const EMPLOYMENT_RE = /^(full[- ]time|part[- ]time|contract|temporary|internship|volunteer|freelance)$/i;
const REQ_WORD = "(?:(?:job|posting|position|vacancy)\\s*(?:id|identification|#|no\\.?|number|reference|ref\\.?)|req(?:uisition)?\\s*(?:id|identification|#|no\\.?|number|reference|ref\\.?)?)";
const REQ_VALUE = "([A-Za-z]{0,4}-?\\d{3,}[\\w-]*|\\d{4}-\\d{3,})";
const REQ_INLINE_RE = new RegExp(`^${REQ_WORD}\\s*[:#]?\\s*${REQ_VALUE}$`, "i");
const REQ_LABEL_RE = new RegExp(`^${REQ_WORD}\\s*[:#]?$`, "i");
const REQ_VALUE_RE = new RegExp(`^${REQ_VALUE}$`);
const POSTED_DATE_RE = /^posted(?:\s+on|\s+date)?\s*[:\-]?\s*(.+)$/i;
const POSTED_LABEL_RE = /^(?:posted(?:\s+on|\s+date)?|posting date|date posted)\s*[:\-]?$/i;
function scanRegion(region, descEl) {
  const pieces = scanPieces(region, descEl);
  const out = {
    postedAgeText: null,
    postedAt: null,
    applicantCount: null,
    applicantText: null,
    experienceLevel: null,
    employmentType: null,
    workType: null,
    workTypeText: null,
    sector: null,
    atsReqId: null
  };
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const next = pieces[i + 1];
    const before = precedes(piece.el, descEl);
    if (before) {
      if (!out.postedAgeText) out.postedAgeText = parsePostedAge(piece.text);
      if (!out.postedAt) {
        const m = POSTED_DATE_RE.exec(piece.text);
        const date = (m ? pyDate(m[1]) : null) ?? (POSTED_LABEL_RE.test(piece.text) && next ? pyDate(next.text) : null);
        if (date) out.postedAt = date;
      }
      if (!out.applicantText) {
        const applicants = parseApplicants(piece.text);
        if (applicants.text) {
          out.applicantText = applicants.text;
          out.applicantCount = applicants.count;
        }
      }
      if (!out.experienceLevel) {
        const m = LEVEL_LABEL_RE.exec(piece.text);
        if (m) {
          const value = clean$2(m[1], 40) ?? (next && next.text.length <= 40 ? next.text : null);
          if (value && !LEVEL_LABEL_RE.test(value)) out.experienceLevel = value;
        } else if (LEVEL_PILLS.has(piece.text.toLowerCase()) && !piece.inLink) {
          out.experienceLevel = piece.text;
        }
      }
      if (!out.employmentType && EMPLOYMENT_RE.test(piece.text) && !piece.inLink) out.employmentType = piece.text;
      if (!out.workType) {
        const label = WORK_LABEL_RE.exec(piece.text);
        const sentence = WORK_SENTENCE_RE.exec(piece.text);
        if (label) {
          const value = clean$2(label[1], 40) ?? (next ? next.text : null);
          const type = pyWorkType(value);
          if (type) {
            out.workType = type;
            out.workTypeText = value;
          }
        } else if (sentence) {
          out.workType = pyWorkType(sentence[1]);
          out.workTypeText = sentence[1];
        } else if (WORK_PILL_RE.test(piece.text) && !piece.inLink) {
          out.workType = pyWorkType(piece.text);
          out.workTypeText = piece.text;
        }
      }
    }
    if (!out.sector) {
      if (/^industr(?:y|ies)\s*[:\-]?$/i.test(piece.text) && next && next.text.length <= 80 && !LEVEL_VALUES.has(next.text.toLowerCase())) out.sector = next.text;
      else {
        const m = /^industr(?:y|ies)\s*[:\-]\s*(.+)$/i.exec(piece.text);
        if (m) out.sector = clean$2(m[1], 80);
      }
    }
    if (!out.atsReqId) {
      const inline = REQ_INLINE_RE.exec(piece.text);
      if (inline) out.atsReqId = inline[1];
      else if (REQ_LABEL_RE.test(piece.text) && next && REQ_VALUE_RE.test(next.text)) out.atsReqId = next.text;
    }
  }
  return out;
}
function deriveSponsorship(description) {
  const low = description.toLowerCase();
  if (/(no|not|unable to|will not|cannot|do not)\s+(offer|provide|sponsor)[^.]{0,40}(sponsorship|visa)/.test(low) || low.includes("without sponsorship") || low.includes("sponsorship is not available")) return "not_available";
  if (/(sponsorship (is )?available|will sponsor|able to sponsor)/.test(low)) return "available";
  return null;
}
function deriveCitizenRequired(description) {
  return /\bu\.?s\.?\s+citizen(ship)?\s+(is\s+)?required\b|must be a u\.?s\.? citizen/.test(description.toLowerCase());
}
function deriveYearsMin(description) {
  const re = /\b(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?)?\s*(?:years?|yrs?)\b/gi;
  let best = null;
  for (const m of description.matchAll(re)) {
    const index = m.index ?? 0;
    const after = description.slice(index + m[0].length, index + m[0].length + 60);
    const before = description.slice(Math.max(0, index - 30), index);
    if (!/experience|\bexp\b/i.test(after) && !/experience/i.test(before)) continue;
    if (/\b(age|old)\b/i.test(before)) continue;
    const n = Number(m[1]);
    if (n > 0 && n <= 30) best = best === null ? n : Math.min(best, n);
  }
  return best;
}
function pick(layers, field, candidates) {
  for (const [value, layer] of candidates) {
    if (value !== null && value !== void 0 && value !== "") {
      layers[field] = layer;
      return value;
    }
  }
  return null;
}
function slugCompany(url, ats) {
  const tenant = tenantSlug(url.hostname, ats);
  if (tenant) return tenant;
  if (ats === "greenhouse" || ats === "lever" || ats === "ashby") {
    const first = url.pathname.split("/").filter(Boolean)[0];
    return first && !/^(jobs?|embed)$/i.test(first) ? first : null;
  }
  return null;
}
function extractJobCapture(doc, url, opts = {}) {
  const layers = {};
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch {
    urlObj = new URL("https://invalid.local/");
  }
  const frames = opts.frames ?? [];
  const cls = classifyPosting(urlObj, doc, frames);
  const pageTitle = clean$2(opts.pageTitle || doc.title, 400);
  let ld = extractJsonLd(doc);
  const md = extractMicrodata(doc);
  let ad = cls.adapter.extract(doc, urlObj);
  let picked = pickDescription(doc, ad, ld, md);
  let sourceDoc = doc;
  let descriptionFrame = null;
  if ((!picked || picked.text.length < 400) && frames.length) {
    for (const frame of frames.slice(0, 10)) {
      let frameUrl;
      try {
        frameUrl = new URL(frame.url);
      } catch {
        continue;
      }
      const frameLd = extractJsonLd(frame.doc);
      const frameAd = cls.adapter.extract(frame.doc, frameUrl);
      const framePick = pickDescription(frame.doc, frameAd, frameLd, extractMicrodata(frame.doc));
      if (framePick && framePick.text.length >= 400) {
        picked = framePick;
        sourceDoc = frame.doc;
        descriptionFrame = frame.url;
        ad = { ...frameAd, ...Object.fromEntries(Object.entries(ad).filter(([, v]) => v !== null && v !== void 0)) };
        ld = ld ?? frameLd;
        break;
      }
    }
  }
  const siteTitle = parseSiteTitle(pageTitle, cls.source, cls.ats);
  const ogTitle = metaContent(doc, "og:title");
  const ogSplit = ogTitle ? splitTitle(ogTitle) : {};
  const titleSplit = pageTitle ? splitTitle(pageTitle) : {};
  const title = pick(layers, "title", [
    [ld == null ? void 0 : ld.title, "jsonld"],
    [md == null ? void 0 : md.title, "microdata"],
    [ad.title, "adapter"],
    [siteTitle.role, "title"],
    [ogSplit.role, "meta"],
    [titleSplit.role, "title"]
  ]);
  const company = pick(layers, "company", [
    [ld == null ? void 0 : ld.company, "jsonld"],
    [md == null ? void 0 : md.company, "microdata"],
    [ad.company, "adapter"],
    [siteTitle.company, "title"],
    [cleanCompany(metaContent(doc, "og:site_name")), "meta"],
    [cleanCompany(ogSplit.company), "meta"],
    [cleanCompany(titleSplit.company), "title"],
    [slugCompany(urlObj, cls.ats), "url"]
  ]);
  const location2 = pick(layers, "location", [
    [ld == null ? void 0 : ld.location, "jsonld"],
    [md == null ? void 0 : md.location, "microdata"],
    [ad.location, "adapter"],
    [siteTitle.location, "title"]
  ]);
  const description = picked ? capChars(picked.text, DESCRIPTION_MAX) : null;
  if (picked) layers.description = picked.layer;
  const descEl = (picked == null ? void 0 : picked.el) ?? null;
  const titleEl = ad.titleEl ?? Array.from(sourceDoc.querySelectorAll("h1")).find((h) => !h.closest('nav, footer, [role="navigation"]')) ?? null;
  const scans = scanRegion(regionOf(sourceDoc, titleEl, descEl), descEl);
  const postedAt = pick(layers, "posted_at", [[ld == null ? void 0 : ld.postedAt, "jsonld"], [md == null ? void 0 : md.postedAt, "microdata"], [ad.postedAt, "adapter"], [scans.postedAt, "text"]]);
  const postedAgeText = pick(layers, "posted_age_text", [[ad.postedAgeText, "adapter"], [scans.postedAgeText, "text"]]);
  const adapterApplicants = parseApplicants(ad.applicantText);
  const applicantText = adapterApplicants.text ?? scans.applicantText ?? null;
  const applicantCount = pick(layers, "applicant_count", [
    [ad.applicantCount, "adapter"],
    [adapterApplicants.count, "adapter"],
    [scans.applicantCount, "text"]
  ]);
  const experienceLevel = pick(layers, "experience_level", [[ad.experienceLevel, "adapter"], [scans.experienceLevel, "text"]]);
  const employmentType = pick(layers, "employment_type", [[ld == null ? void 0 : ld.employmentType, "jsonld"], [md == null ? void 0 : md.employmentType, "microdata"], [ad.employmentType, "adapter"], [scans.employmentType, "text"]]);
  const workTypeText = ad.workTypeText ?? scans.workTypeText ?? null;
  const workType = pick(layers, "work_type", [
    [(ld == null ? void 0 : ld.remote) ? "remote" : null, "jsonld"],
    [ad.workType, "adapter"],
    [ad.workTypeText ? pyWorkType(ad.workTypeText) : null, "adapter"],
    [scans.workType, "text"],
    [location2 && /\b(remote|hybrid|on-?site)\b/i.test(location2) ? pyWorkType(location2) : null, "location"]
  ]);
  const sector = pick(layers, "sector", [[ld == null ? void 0 : ld.industry, "jsonld"], [md == null ? void 0 : md.industry, "microdata"], [ad.sector, "adapter"], [scans.sector, "text"]]);
  const atsReqId = cls.source === "linkedin" ? null : pick(layers, "ats_req_id", [
    [ad.atsReqId, "adapter"],
    [(ld == null ? void 0 : ld.identifier) && /^[A-Za-z]{0,4}-?\d{3,}[\w-]*$/.test(ld.identifier) ? ld.identifier : null, "jsonld"],
    [scans.atsReqId, "text"]
  ]);
  const linkedinJobId = cls.source === "linkedin" ? pick(layers, "linkedin_job_id", [[ad.linkedinJobId, "adapter"], [(ld == null ? void 0 : ld.identifier) && /^\d{6,}$/.test(ld.identifier) ? ld.identifier : null, "jsonld"]]) : null;
  const ldHost = hostOf$1((ld == null ? void 0 : ld.url) ?? null);
  const canonicalUrl = pick(layers, "canonical_url", [
    [ad.canonicalUrl, "adapter"],
    [(ld == null ? void 0 : ld.url) && ldHost && ldHost !== urlObj.hostname.toLowerCase() ? ld.url : null, "jsonld"]
  ]);
  return {
    origin: "page",
    source: cls.source,
    ats: cls.ats,
    matchedBy: cls.matchedBy,
    adapter: cls.adapter.name,
    sourceUrl: url,
    canonicalUrl,
    companyDomain: cls.companyDomain,
    pageTitle,
    title,
    company,
    location: location2,
    description,
    postedAt,
    postedAgeText,
    applicantCount,
    applicantText,
    experienceLevel,
    employmentType,
    workType,
    workTypeText,
    sector,
    atsReqId,
    linkedinJobId,
    formTitle: null,
    formCompany: null,
    posting: (ld == null ? void 0 : ld.posting) ?? null,
    layers,
    truncated: (picked == null ? void 0 : picked.truncated) ?? false,
    descriptionFrame
  };
}
function manualCapture() {
  return {
    origin: "tailor-form",
    source: "manual",
    ats: "unknown",
    matchedBy: "none",
    adapter: "form",
    sourceUrl: null,
    canonicalUrl: null,
    companyDomain: null,
    pageTitle: null,
    title: null,
    company: null,
    location: null,
    description: null,
    postedAt: null,
    postedAgeText: null,
    applicantCount: null,
    applicantText: null,
    experienceLevel: null,
    employmentType: null,
    workType: null,
    workTypeText: null,
    sector: null,
    atsReqId: null,
    linkedinJobId: null,
    formTitle: null,
    formCompany: null,
    posting: null,
    layers: {},
    truncated: false,
    descriptionFrame: null
  };
}
function fieldsPresent(row) {
  const out = {};
  for (const field of CAPTURE_MATRIX) {
    const value = row[field];
    if (field === "sponsorship") out[field] = value ? "derived" : "missing";
    else if (field === "posted_at") out[field] = value ? "captured" : row.posted_age_text ? "derived" : "missing";
    else out[field] = value !== null && value !== void 0 && value !== "" ? "captured" : "missing";
  }
  return out;
}
function buildJobRow(capture) {
  const title = normText(capture.title);
  const company = normText(capture.company);
  if (!title) return { problem: "missing title" };
  if (!company) return { problem: "missing company" };
  const description = capChars((capture.description ?? "").trim(), DESCRIPTION_MAX);
  if (description.length < DESCRIPTION_MIN) {
    return {
      problem: description.length ? `only ${description.length} characters of description — paste the full posting into the Tailor tab` : "no job description found on the page — paste it into the Tailor tab"
    };
  }
  const sourceUrl = capture.sourceUrl;
  const sourceHost = hostOf$1(sourceUrl);
  const urlIsLinkedinId = !!sourceUrl && (urlKey(sourceUrl) ?? "").startsWith("li:");
  const linkedinJobId = capture.source === "linkedin" && !urlIsLinkedinId ? capture.linkedinJobId : null;
  const atsReqId = capture.source === "linkedin" ? null : atsReqIdFromUrl(sourceUrl);
  const pageReqId = capture.source !== "linkedin" && capture.atsReqId && capture.atsReqId !== atsReqId ? capture.atsReqId : null;
  const sponsorship = deriveSponsorship(description);
  const citizenRequired = deriveCitizenRequired(description);
  const yearsMin = deriveYearsMin(description);
  const canonical = capture.canonicalUrl && hostOf$1(capture.canonicalUrl) !== sourceHost ? capture.canonicalUrl : null;
  const raw = {
    _capture: "stage4b",
    _origin: capture.origin,
    _adapter: capture.adapter,
    _matched_by: capture.matchedBy,
    _page_title: capture.pageTitle,
    _layers: { ...capture.layers, ...sponsorship ? { sponsorship: "derived" } : {}, ...citizenRequired ? { citizen_required: "derived" } : {}, ...yearsMin !== null ? { experience_years_min: "derived" } : {} },
    _employment_type: capture.employmentType,
    _posting: capture.posting,
    _applicants_text: capture.applicantText,
    _posted_text: capture.postedAgeText,
    _work_type_text: capture.workTypeText,
    _url_key: sourceUrl ? urlKey(sourceUrl) : null,
    _linkedin_job_id: linkedinJobId,
    _page_req_id: pageReqId,
    _form_title: capture.formTitle,
    _form_company: capture.formCompany,
    _truncated: capture.truncated || null,
    _description_frame: capture.descriptionFrame
  };
  for (const key of Object.keys(raw)) if (raw[key] === null || raw[key] === void 0) delete raw[key];
  const draft = {
    source: capture.source,
    ats: capture.ats,
    ats_req_id: atsReqId,
    source_url: sourceUrl,
    canonical_url: canonical,
    title,
    company,
    company_domain: capture.source === "company_site" ? capture.companyDomain : null,
    location: clean$2(capture.location),
    work_type: capture.workType,
    sector: clean$2(capture.sector),
    description,
    posted_at: capture.postedAt,
    posted_age_text: clean$2(capture.postedAgeText, 60),
    applicant_count: capture.applicantCount,
    experience_level: clean$2(capture.experienceLevel, 80),
    experience_years_min: yearsMin,
    sponsorship,
    citizen_required: citizenRequired ? true : null,
    captured_by: "extension",
    raw,
    dedupe_key: dedupeKey(company, title, { atsReqId, url: sourceUrl, description, linkedinJobId })
  };
  const present = fieldsPresent(draft);
  draft.fields_present = present;
  const allowed = new Set(ENTITY_COLUMNS.jobs);
  const row = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value === null || value === void 0 || value === "") continue;
    if (!allowed.has(key)) continue;
    row[key] = value;
  }
  return { row, present };
}
function grabPage() {
  var _a;
  try {
    const top = window === window.top;
    const bodyText = (document.body && document.body.textContent || "").replace(/\s+/g, " ").trim();
    if (!top && bodyText.length < 200) return null;
    const clone = document.documentElement.cloneNode(true);
    try {
      const live = document.documentElement.querySelectorAll("*");
      const withRoots = [];
      for (let i = 0; i < live.length; i++) if (live[i].shadowRoot) withRoots.push(i);
      if (withRoots.length) {
        const cloned = clone.querySelectorAll("*");
        if (live.length === cloned.length) {
          for (const i of withRoots) cloned[i].insertAdjacentHTML("beforeend", ((_a = live[i].shadowRoot) == null ? void 0 : _a.innerHTML) ?? "");
        }
      }
    } catch {
    }
    for (const el of Array.from(clone.querySelectorAll('script:not([src]):not([type="application/ld+json"]), style, svg, noscript, template, video, audio, canvas, object, embed'))) el.remove();
    for (const el of Array.from(clone.querySelectorAll(".visually-hidden, .sr-only, .a11y-text"))) el.remove();
    for (const el of Array.from(clone.querySelectorAll('img[src^="data:"]'))) el.removeAttribute("src");
    for (const el of Array.from(clone.querySelectorAll("[style]"))) el.removeAttribute("style");
    let html = clone.outerHTML;
    if (html.length > 3e6) html = html.slice(0, 3e6);
    return { html, url: location.href, title: document.title, top };
  } catch {
    return null;
  }
}
async function captureActiveTabJob() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!(tab == null ? void 0 : tab.id) || !tab.url || !/^https?:/.test(tab.url)) {
    throw new Error("Open the job posting in the active tab first.");
  }
  const injections = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: grabPage
  });
  const pages = injections.map((i) => ({ frameId: i.frameId, page: i.result })).filter((p) => !!p.page && typeof p.page.html === "string" && p.page.html.length > 0);
  const top = pages.find((p) => p.frameId === 0 || p.page.top) ?? pages[0];
  if (!top) throw new Error("Could not read that page.");
  let budget = 8e6 - top.page.html.length;
  const frames = [];
  for (const p of pages) {
    if (p === top || budget <= 0) continue;
    budget -= p.page.html.length;
    frames.push({ url: p.page.url, doc: parseHtml(p.page.html) });
  }
  return extractJobCapture(parseHtml(top.page.html), top.page.url, { frames, pageTitle: top.page.title });
}
function describe(capture, present) {
  const filled = Object.values(present).filter((p) => p !== "missing").length;
  const where = capture.source === "manual" ? "manual" : capture.ats !== "unknown" ? `${capture.source}/${capture.ats}` : capture.source;
  return `${where}, ${filled}/${CAPTURE_MATRIX.length} fields`;
}
let recordChain = Promise.resolve();
function recordJob(row, label) {
  const run = recordChain.then(() => recordJobNow(row, label));
  recordChain = run.catch(() => void 0);
  return run;
}
async function recordJobNow(row, label) {
  var _a;
  try {
    const ref = await hubUpsert("jobs", row, void 0, { flush: false });
    const report = await flushHubOutbox();
    const dead = (await getHubDeadLetters()).find((d) => d.ref === ref);
    if (dead) return { status: "dead", note: `Job refused by the hub — ${dead.lastError ?? `HTTP ${dead.status}`}.`, ref, row, jobId: null };
    const queued = (await getHubOutbox()).some((e) => e.ref === ref);
    if (queued) return { status: "queued", note: `Job queued for the hub — ${report.reason ?? "not sent yet"}`, ref, row, jobId: null };
    const stored = (_a = report.rows) == null ? void 0 : _a[ref];
    const jobId = stored && typeof stored.id === "string" ? stored.id : null;
    return { status: "sent", note: `Job saved (${label}).`, ref, row, jobId };
  } catch (e) {
    return { status: "error", note: `Job not saved: ${e instanceof Error ? e.message : String(e)}`, row };
  }
}
async function recordActiveTabJob() {
  let capture;
  try {
    capture = await captureActiveTabJob();
  } catch (e) {
    return { status: "error", note: `Job not saved: ${e instanceof Error ? e.message : String(e)}` };
  }
  const built = buildJobRow(capture);
  if ("problem" in built) return { status: "refused", note: `Job not saved: ${built.problem}.`, capture };
  const out = await recordJob(built.row, describe(capture, built.present));
  if (capture.truncated && out.status === "sent") out.note += ' The description looked clamped — expand "see more" and read again for the full text.';
  return { ...out, capture };
}
function formUrl(value) {
  const text2 = normText(value ?? "");
  if (!text2) return null;
  try {
    return /^https?:$/.test(new URL(text2).protocol) ? text2 : null;
  } catch {
    return null;
  }
}
function sameposting(capture, form) {
  const page = normText(capture.description).toLowerCase();
  if (!page) {
    const same = (a, b) => normText(a ?? "").toLowerCase() === normText(b).toLowerCase();
    return same(capture.title, form.title) && same(capture.company, form.company);
  }
  const squeeze = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const p = squeeze(page);
  const desc = squeeze(form.description);
  const head = p.slice(0, 240);
  return desc.startsWith(head) || desc.includes(head) || p.includes(desc.slice(0, 240));
}
async function recordFormJob(capture, form) {
  const onPage = capture && capture.origin === "page" && sameposting(capture, form);
  const base = onPage ? capture : manualCapture();
  const title = onPage && capture.title ? capture.title : form.title;
  const company = onPage && capture.company ? capture.company : form.company;
  const typed = formUrl(form.url);
  const stale = !onPage && typed !== null && typed === normText((capture == null ? void 0 : capture.sourceUrl) ?? "");
  const sourceUrl = stale ? base.sourceUrl : typed ?? base.sourceUrl;
  const merged = {
    ...base,
    origin: "tailor-form",
    title,
    company,
    description: form.description,
    sourceUrl,
    formTitle: normText(form.title) !== normText(title) ? form.title : null,
    formCompany: normText(form.company) !== normText(company) ? form.company : null,
    layers: {
      ...base.layers,
      description: "form",
      ...title === form.title ? { title: "form" } : {},
      ...company === form.company ? { company: "form" } : {},
      ...sourceUrl && sourceUrl !== base.sourceUrl ? { source_url: "form" } : {}
    }
  };
  const built = buildJobRow(merged);
  if ("problem" in built) return { status: "refused", note: `Job not saved: ${built.problem}.`, capture: merged };
  const out = await recordJob(built.row, describe(merged, built.present));
  return { ...out, capture: merged };
}
function short(value, max = 80) {
  const clean2 = value.replace(/\s+/g, " ").trim();
  if (!clean2) return "—";
  return clean2.length <= max ? clean2 : `${clean2.slice(0, max).trim()}…`;
}
function RecentEntries(props) {
  if (props.entries.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "recents", "data-testid": props.testId ?? "recents", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "recents-title", children: props.title }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "recents-table", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        props.columns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: column.wide ? "wide" : void 0, children: column.label }, column.label)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "actions" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: props.entries.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        props.columns.map((column) => {
          const value = column.cell(entry);
          return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: column.wide ? "wide" : void 0, title: value || void 0, children: short(value) }, column.label);
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn small",
            "data-testid": `${props.testId ?? "recents"}-retrieve-${index}`,
            disabled: props.busy,
            title: props.busy ? props.busyWhy ?? "Working — wait for the current step to finish." : "Puts this entry back into the boxes above. It replaces what is in them.",
            onClick: () => props.onRetrieve(entry),
            children: "Retrieve entry"
          }
        ) })
      ] }, index)) })
    ] }),
    props.hint && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: props.hint })
  ] });
}
const TAILOR_RECENTS_KEY = "flashfiller_tailor_recents_v1";
const RECENTS_MAX = 3;
function withEntry(list, entry, max = RECENTS_MAX) {
  const same = (a, b) => a.company.trim().toLowerCase() === b.company.trim().toLowerCase() && a.role.trim().toLowerCase() === b.role.trim().toLowerCase() && a.jdText.trim() === b.jdText.trim();
  return [entry, ...list.filter((e) => !same(e, entry))].slice(0, max);
}
function asEntry(raw) {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw;
  if (typeof r.savedAt !== "number") return null;
  const str = (v) => typeof v === "string" ? v : "";
  const entry = {
    company: str(r.company),
    role: str(r.role),
    jdText: str(r.jdText),
    url: str(r.url),
    engine: str(r.engine),
    domain: str(r.domain),
    savedAt: r.savedAt
  };
  return entry.company || entry.role || entry.jdText ? entry : null;
}
async function loadTailorEntries() {
  try {
    const raw = await chrome.storage.local.get(TAILOR_RECENTS_KEY);
    const list = raw == null ? void 0 : raw[TAILOR_RECENTS_KEY];
    if (!Array.isArray(list)) return [];
    return list.map(asEntry).filter((e) => e !== null).slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}
async function rememberTailorEntry(entry, now = Date.now()) {
  const next = withEntry(await loadTailorEntries(), { ...entry, savedAt: now });
  try {
    await chrome.storage.local.set({ [TAILOR_RECENTS_KEY]: next });
  } catch {
  }
  return next;
}
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const YEAR = "(?:19|20)\\d{2}";
const POINT = `(?:${MONTH}\\s+)?${YEAR}`;
const RANGE_RE = new RegExp(`^(${POINT})\\s*(?:[-–—]|to)\\s*(present|current|${POINT})(?:\\s*[·•|].*)?$`, "i");
const LONE_YEAR_RE = new RegExp(`^${YEAR}$`);
const YEARS_RE = /(?:19|20)\d{2}/g;
const PRONOUN_RE = /^\(?\s*(she|he|they|ze|xe|per|ey|fae)\s*\/\s*(her|hers|him|his|them|their|zir|hir|xem|per|em|faer)(?:\s*\/\s*[a-z]+)?\s*\)?$/i;
const PRONOUN_IN_NAME_RE = /\s*\((she|he|they|ze|xe)\s*\/\s*[a-z/]+\)\s*$/i;
const TOP_NOISE_RE = new RegExp([
  "^contact info$",
  "^show all.*",
  "^see more$",
  "^…?\\s*see more$",
  "^open to work$",
  "^providing services.*",
  "^\\d[\\d,]*\\+?\\s*(connections?|followers?)$",
  ".*\\bmutual connections?\\b.*",
  "^linkedin member$",
  "^\\d+(st|nd|rd|th)\\+?(\\s*degree)?(\\s*connection)?$",
  "^message$",
  "^connect$",
  "^follow$",
  "^more$",
  "^talks about.*",
  "^he/him$",
  "^she/her$",
  "^they/them$"
].join("|"), "i");
const ENTRY_NOISE_RE = new RegExp([
  "^(full|part)[- ]time$",
  "^self[- ]employed$",
  "^freelance$",
  "^contract$",
  "^internship$",
  "^apprenticeship$",
  "^seasonal$",
  "^permanent$",
  "^temporary$",
  "^\\d+\\s*(yrs?|mos?)(\\s+\\d+\\s*mos?)?$",
  "^skills?:.*",
  "^show all.*",
  "^…?\\s*see more$",
  "^see more$",
  "^grade:.*",
  "^activities and societies:.*",
  "^issued.*"
].join("|"), "i");
const CREDENTIAL_RE = /^(?:ph\.?d|m\.?b\.?a|m\.?s\.?c?|b\.?s\.?c?|b\.?tech|m\.?tech|b\.?e|m\.?e|m\.?eng|p\.?e|p\.?eng|pmp|cpa|cfa|md|do|rn|jd|esq|eit|csm|cissp|pmi-acp|six sigma[a-z ]*|sr|jr|ii|iii|iv)\.?$/i;
function isCredential(part) {
  return CREDENTIAL_RE.test(part) || /^[A-Z][A-Z.\-]{1,7}$/.test(part);
}
const NOT_COMPANY_HOST = /(?:^|\.)(?:linkedin\.com|licdn\.com|lnkd\.in|twitter\.com|x\.com|facebook\.com|instagram\.com|threads\.net|youtube\.com|github\.com|gitlab\.com|medium\.com|substack\.com|calendly\.com|bit\.ly|t\.co|goo\.gl|behance\.net|dribbble\.com)$/i;
const SEE_MORE_RE = /\s*(?:…|\.\.\.)?\s*(?:see|show)\s+(?:more|less)\s*$/i;
function clean$1(value, max = 300) {
  const text2 = normText(value).replace(/^[•·]\s*/, "").trim();
  return text2.length > 0 && text2.length <= max ? text2 : null;
}
function beforeDot(value) {
  if (!value) return null;
  return clean$1(value.split(/\s+[·•]\s+/)[0]);
}
function uniqueAscending(years) {
  return Array.from(new Set(years)).sort((a, b) => a - b);
}
function yearIn(text2, last = false) {
  const found = text2.match(YEARS_RE);
  if (!found || !found.length) return null;
  return Number(last ? found[found.length - 1] : found[0]);
}
function parseDateRange(value) {
  const text2 = clean$1(value, 120);
  if (!text2) return null;
  const m = RANGE_RE.exec(text2);
  if (m) {
    const present = /^(?:present|current)$/i.test(m[2]);
    return { start: yearIn(m[1]), end: present ? null : yearIn(m[2], true), present };
  }
  if (LONE_YEAR_RE.test(text2)) {
    const year = Number(text2);
    return { start: year, end: year, present: false };
  }
  return null;
}
function entryLines(el) {
  if (!el) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (raw) => {
    const text2 = clean$1(raw, 400);
    if (!text2) return;
    const key = text2.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text2);
  };
  const spans = Array.from(el.querySelectorAll('span[aria-hidden="true"]'));
  const outer = spans.filter((span) => !spans.some((other) => other !== span && other.contains(span)));
  for (const span of outer) push(blockText(span));
  if (out.length) return out;
  for (const line of blockTextExcluding(el, ["button", ".visually-hidden", ".sr-only", "svg"]).split("\n")) push(line);
  return out;
}
function topLevelItems(root) {
  if (!root) return [];
  const items = Array.from(root.querySelectorAll("li"));
  return items.filter((li) => !items.some((other) => other !== li && other.contains(li)));
}
function ownLines(el) {
  const clone = el.cloneNode(true);
  for (const nested of Array.from(clone.querySelectorAll("li"))) nested.remove();
  return entryLines(clone);
}
function looksLikeLocation(text2) {
  return text2.length <= 90 && (/,/.test(text2) || /\b(remote|on-?site|hybrid|area|region|greater|metropolitan)\b/i.test(text2));
}
function parseEntry(lines, groupCompany) {
  if (!lines.length) return null;
  const entry = { title: beforeDot(lines[0]), company: groupCompany, location: null, range: null };
  for (const line of lines.slice(1)) {
    const range = parseDateRange(line);
    if (range) {
      if (!entry.range) entry.range = range;
      continue;
    }
    if (line.length > 140 || ENTRY_NOISE_RE.test(line)) continue;
    if (!entry.company) {
      entry.company = beforeDot(line);
      continue;
    }
    if (!entry.location && looksLikeLocation(line)) entry.location = beforeDot(line);
  }
  return entry;
}
function parseEntries(section) {
  const out = [];
  for (const item of topLevelItems(section)) {
    const nested = topLevelItems(item);
    const positions = nested.filter((li) => ownLines(li).some((line) => parseDateRange(line)));
    const own = ownLines(item);
    if (positions.length) {
      const company = beforeDot(own[0] ?? null);
      for (const position of positions) {
        const entry2 = parseEntry(ownLines(position), company);
        if (entry2) out.push(entry2);
      }
      continue;
    }
    const entry = parseEntry(own, null);
    if (entry) out.push(entry);
  }
  return out;
}
function sectionFor(doc, id, hints) {
  const anchor = doc.getElementById(id);
  if (anchor) return anchor.closest("section") ?? anchor.parentElement;
  for (const hint of hints) {
    let el = null;
    try {
      el = doc.querySelector(hint);
    } catch {
      el = null;
    }
    if (el) return el;
  }
  return null;
}
function topCardName(doc) {
  const hints = [
    ".pv-text-details__left-panel h1",
    "h1.text-heading-xlarge",
    "h1.top-card-layout__title",
    "main h1",
    "h1"
  ];
  for (const hint of hints) {
    let els = [];
    try {
      els = Array.from(doc.querySelectorAll(hint));
    } catch {
      els = [];
    }
    for (const el of els) {
      if (el.closest('nav, header, footer, [role="navigation"], [role="banner"]')) continue;
      if (clean$1(blockText(el), 120)) return el;
    }
  }
  return null;
}
function topCard(nameEl) {
  if (!nameEl) return null;
  const section = nameEl.closest("section");
  if (section) return section;
  let node = nameEl.parentElement;
  for (let i = 0; i < 3 && (node == null ? void 0 : node.parentElement); i++) node = node.parentElement;
  return node ?? nameEl.parentElement;
}
function topCardLines(card) {
  if (!card) return [];
  const clone = card.cloneNode(true);
  for (const nested of Array.from(clone.querySelectorAll('section, [id="about"], [id="experience"], [id="education"]'))) nested.remove();
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const line of blockTextExcluding(clone, ["button", ".visually-hidden", ".sr-only", "svg"]).split("\n")) {
    const text2 = clean$1(line, 260);
    if (!text2) continue;
    const key = text2.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text2);
  }
  return out;
}
function pickLine(card, selectors, reject, max = 260) {
  if (!card) return null;
  for (const selector of selectors) {
    let els = [];
    try {
      els = Array.from(card.querySelectorAll(selector));
    } catch {
      els = [];
    }
    for (const el of els) {
      const text2 = clean$1(blockText(el), max);
      if (text2 && !reject(text2)) return text2;
    }
  }
  return null;
}
function cleanName(raw) {
  let text2 = clean$1(raw, 120);
  if (!text2) return null;
  text2 = text2.replace(PRONOUN_IN_NAME_RE, "");
  text2 = text2.replace(/\s*[·•]\s*\d+(?:st|nd|rd|th)\+?(?:\s*degree)?(?:\s*connection)?\s*$/i, "");
  text2 = text2.replace(/\s*\b(?:is\s+)?verified\b\s*$/i, "");
  const parts = text2.split(",");
  if (parts.length > 1) {
    const tail = parts.slice(1).map((p) => p.trim()).filter(Boolean);
    if (tail.length && tail.every(isCredential)) text2 = parts[0];
  }
  return clean$1(text2.replace(/[\s,]+$/, ""), 120);
}
function findPronouns(doc, card, nameRaw) {
  var _a;
  const inName = nameRaw ? PRONOUN_IN_NAME_RE.exec(nameRaw) : null;
  if (inName) return ((_a = clean$1(inName[0].replace(/[()]/g, ""), 40)) == null ? void 0 : _a.toLowerCase()) ?? null;
  const labelled = pickLine(card ?? doc.body, ['[class*="pronoun"]', "[data-pronouns]"], (t) => !PRONOUN_RE.test(t), 40);
  if (labelled) return labelled.replace(/[()]/g, "").trim().toLowerCase();
  for (const line of topCardLines(card)) {
    if (PRONOUN_RE.test(line)) return line.replace(/[()]/g, "").trim().toLowerCase();
  }
  return null;
}
function externalHost(href, base) {
  const raw = normText(href);
  if (!raw || !/^https?:/i.test(raw)) return null;
  let host;
  try {
    host = new URL(raw, /^https?:/i.test(base) ? base : "https://www.linkedin.com/").hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host.includes(".") || NOT_COMPANY_HOST.test(host)) return null;
  return host;
}
function contactCompanyDomain(doc, base) {
  let roots = [];
  try {
    roots = Array.from(doc.querySelectorAll('#contact-info, [class*="contact-info"], [class*="ci-websites"]'));
  } catch {
    roots = [];
  }
  for (const root of roots) {
    for (const link of Array.from(root.querySelectorAll("a[href]"))) {
      const host = externalHost(link.getAttribute("href"), base);
      if (!host) continue;
      const context = normText((link.closest("li") ?? link.parentElement ?? link).textContent).toLowerCase();
      if (!/\bcompany\b/.test(context)) continue;
      const domain = companyDomain(host);
      if (domain) return domain;
    }
  }
  return null;
}
const LINKEDIN_HOST_RE$1 = /(?:^|\.)linkedin\.com$/;
function tidyUrl$1(parsed) {
  const host = parsed.hostname.toLowerCase();
  const path = LINKEDIN_HOST_RE$1.test(host) ? parsed.pathname.toLowerCase() : parsed.pathname;
  return `${parsed.protocol}//${host}${path}`.replace(/\/+$/, "");
}
function profileUrl$1(doc, url) {
  var _a, _b;
  const raw = normText(url);
  const absolute = /^https?:/i.test(raw);
  const stated = normText((_a = doc.querySelector('link[rel="canonical"]')) == null ? void 0 : _a.getAttribute("href")) || normText((_b = doc.querySelector('meta[property="og:url"]')) == null ? void 0 : _b.getAttribute("content"));
  if (stated) {
    try {
      const parsed = new URL(stated, absolute ? raw : "https://www.linkedin.com/");
      if (LINKEDIN_HOST_RE$1.test(parsed.hostname.toLowerCase())) return tidyUrl$1(parsed);
    } catch {
    }
  }
  if (absolute) {
    try {
      return tidyUrl$1(new URL(raw));
    } catch {
      return raw;
    }
  }
  return raw;
}
const NOTHING$1 = {
  fullName: null,
  firstName: null,
  lastName: null,
  headline: null,
  company: null,
  companyDomain: null,
  roleTitle: null,
  location: null,
  about: null,
  experienceYears: null,
  educationEndYears: null,
  pronouns: null
};
function parseLinkedInProfile(doc, url) {
  var _a, _b;
  if (!doc || typeof doc.querySelector !== "function") return { url: normText(url), ...NOTHING$1 };
  const base = profileUrl$1(doc, url);
  const profile = { url: base, ...NOTHING$1 };
  const nameEl = topCardName(doc);
  const card = topCard(nameEl);
  const nameRaw = nameEl ? clean$1(blockText(nameEl), 120) : null;
  profile.pronouns = findPronouns(doc, card, nameRaw);
  profile.fullName = cleanName(nameRaw);
  if (profile.fullName) {
    const words = profile.fullName.split(/\s+/).filter(Boolean);
    profile.firstName = words[0] ?? null;
    profile.lastName = words.length > 1 ? words.slice(1).join(" ") : null;
  }
  const nameKey = (profile.fullName ?? nameRaw ?? "").toLowerCase();
  const isName = (text2) => text2.toLowerCase() === nameKey || !!nameRaw && text2.toLowerCase() === nameRaw.toLowerCase();
  const rejectCommon = (text2) => isName(text2) || PRONOUN_RE.test(text2) || TOP_NOISE_RE.test(text2);
  profile.headline = pickLine(card, [
    ".text-body-medium.break-words",
    ".pv-text-details__left-panel .text-body-medium",
    "h2.top-card-layout__headline",
    ".top-card-layout__headline",
    "[data-generated-suggestion-target] .text-body-medium"
  ], (text2) => rejectCommon(text2) || text2.length < 3);
  const headlineKey = (profile.headline ?? "").toLowerCase();
  profile.location = pickLine(card, [
    "span.text-body-small.inline.t-black--light",
    ".pv-text-details__left-panel span.text-body-small",
    ".top-card-layout__first-subline",
    ".top-card__subline-item",
    '[class*="profile-info-subheader"] span'
  ], (text2) => rejectCommon(text2) || text2.toLowerCase() === headlineKey || !looksLikeLocation(text2), 90);
  if (!profile.headline || !profile.location) {
    for (const line of topCardLines(card)) {
      if (rejectCommon(line)) continue;
      if (!profile.headline && line.length >= 3 && line.length <= 250 && !looksLikeLocation(line)) {
        profile.headline = line;
        continue;
      }
      if (!profile.location && line.toLowerCase() !== (profile.headline ?? "").toLowerCase() && looksLikeLocation(line)) {
        profile.location = beforeDot(line);
      }
    }
  }
  const aboutSection = sectionFor(doc, "about", [".pv-about__summary-text", ".core-section-container__content", '[data-section="summary"]', "section.summary"]);
  if (aboutSection) {
    const text2 = blockTextExcluding(aboutSection, ["h2", "h3", "button", ".visually-hidden", ".sr-only", '[class*="show-more-less"]']).replace(/^about\s*\n+/i, "").replace(SEE_MORE_RE, "").trim();
    profile.about = text2.length > 0 ? text2.slice(0, 4e3) : null;
  }
  const experience = parseEntries(sectionFor(doc, "experience", ["section.experience", ".experience__list", '[data-section="experience"]']));
  const years = [];
  for (const entry of experience) {
    if ((_a = entry.range) == null ? void 0 : _a.start) years.push(entry.range.start);
    if ((_b = entry.range) == null ? void 0 : _b.end) years.push(entry.range.end);
  }
  profile.experienceYears = years.length ? uniqueAscending(years) : null;
  const current = experience.find((entry) => {
    var _a2;
    return ((_a2 = entry.range) == null ? void 0 : _a2.present) === true;
  }) ?? null;
  if (current) {
    profile.roleTitle = current.title;
    profile.company = current.company;
    if (!profile.location && current.location) profile.location = current.location;
  } else if (profile.headline) {
    const m = /^(.+?)\s+(?:at|@)\s+(.+)$/i.exec(profile.headline);
    if (m) {
      profile.roleTitle = clean$1(m[1], 140);
      profile.company = clean$1(m[2].split(/\s*[|·•]\s*/)[0], 140);
    }
  }
  const education = parseEntries(sectionFor(doc, "education", ["section.education", ".education__list", '[data-section="educationsDetails"]']));
  const ends = [];
  for (const entry of education) {
    if (entry.range && !entry.range.present && entry.range.end) ends.push(entry.range.end);
  }
  profile.educationEndYears = ends.length ? uniqueAscending(ends) : null;
  profile.companyDomain = contactCompanyDomain(doc, base);
  return profile;
}
const GRAD_AGE = 22;
const FIRST_ROLE_AGE = 22;
const OLDEST_YEAR = 1950;
function bracketOf(age) {
  if (age < 20) return null;
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  if (age < 70) return "60s";
  return null;
}
function suggestAgeBracket(profile, nowYear = (/* @__PURE__ */ new Date()).getUTCFullYear()) {
  const grads = profile.educationEndYears ?? [];
  const works = profile.experienceYears ?? [];
  const fromEducation = grads.length > 0;
  const year = fromEducation ? grads[0] : works.length > 0 ? works[0] : null;
  if (year === null) {
    return { bracket: "unknown", why: "the profile shows no education end years and no experience years — there is nothing to count from" };
  }
  if (year < OLDEST_YEAR || year > nowYear) {
    return { bracket: "unknown", why: `the earliest year on the profile is ${year}, outside ${OLDEST_YEAR}-${nowYear}, so it is not usable` };
  }
  const startAge = fromEducation ? GRAD_AGE : FIRST_ROLE_AGE;
  const age = startAge + (nowYear - year);
  const source = fromEducation ? `earliest education end year ${year}${grads.length > 1 ? ` (of ${grads.join(", ")})` : ""}; assume ${GRAD_AGE} at that graduation` : `no education years on the profile; earliest experience year ${year}${works.length > 1 ? ` (of ${works.join(", ")})` : ""}; assume ${FIRST_ROLE_AGE} at the first role`;
  const arithmetic = `${startAge} + (${nowYear} - ${year}) = about ${age}`;
  const bracket = bracketOf(age);
  if (!bracket) {
    return { bracket: "unknown", why: `${source}, so ${arithmetic}, which is outside the 20s-60s brackets` };
  }
  return { bracket, why: `${source}, so ${arithmetic} → ${bracket}` };
}
function suggestGender(profile) {
  const pronouns = normText(profile.pronouns).toLowerCase().replace(/[()]/g, "").trim();
  if (!pronouns) {
    return { gender: "unknown", why: "the profile states no pronouns, and a name is never evidence of gender — set it by hand" };
  }
  const first = pronouns.split("/")[0].trim();
  if (first === "she") return { gender: "f", why: `the profile states pronouns "${pronouns}"` };
  if (first === "he") return { gender: "m", why: `the profile states pronouns "${pronouns}"` };
  return { gender: "unknown", why: `the profile states pronouns "${pronouns}", which name no gender — set it by hand` };
}
const OUTREACH_SETTINGS_KEY = "flashfiller_outreach_v1";
const TARGET_ROLES_MAX = 20;
const DEFAULT_SETTINGS$1 = { skillset: "", targetRoles: [], lastTargetRole: "", tone: "casual" };
function asSettings$1(raw) {
  const roles = Array.isArray(raw == null ? void 0 : raw.targetRoles) ? raw.targetRoles.filter((r) => typeof r === "string" && !!r.trim()).slice(0, TARGET_ROLES_MAX) : [];
  return {
    skillset: typeof (raw == null ? void 0 : raw.skillset) === "string" ? raw.skillset : "",
    targetRoles: roles,
    lastTargetRole: typeof (raw == null ? void 0 : raw.lastTargetRole) === "string" ? raw.lastTargetRole : "",
    tone: (raw == null ? void 0 : raw.tone) === "professional" ? "professional" : "casual"
  };
}
async function getOutreachSettings() {
  try {
    const result = await chrome.storage.local.get(OUTREACH_SETTINGS_KEY);
    return asSettings$1(result[OUTREACH_SETTINGS_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS$1 };
  }
}
async function setOutreachSettings(patch) {
  const current = await getOutreachSettings();
  const next = asSettings$1({ ...current, ...patch });
  try {
    await chrome.storage.local.set({ [OUTREACH_SETTINGS_KEY]: next });
    return { status: "sent", note: "Saved.", settings: next };
  } catch (e) {
    return { status: "error", note: `Not saved — ${e instanceof Error ? e.message : String(e)}`, settings: current };
  }
}
function withTargetRole(roles, role) {
  const clean2 = role.trim();
  const kept = roles.map((r) => r.trim()).filter(Boolean);
  if (!clean2) return kept.slice(0, TARGET_ROLES_MAX);
  const rest = kept.filter((r) => r.toLowerCase() !== clean2.toLowerCase());
  return [clean2, ...rest].slice(0, TARGET_ROLES_MAX);
}
async function addTargetRole(role) {
  const current = await getOutreachSettings();
  const targetRoles = withTargetRole(current.targetRoles, role);
  const clean2 = role.trim();
  return setOutreachSettings({ targetRoles, ...clean2 ? { lastTargetRole: clean2 } : {} });
}
const OUTREACH_DRAFTS_KEY = "flashfiller_outreach_drafts_v1";
const OUTREACH_DRAFTS_SCHEMA_VERSION = 1;
const OUTREACH_DRAFTS_MAX = 10;
const OUTREACH_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
function asDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw;
  const profile = r.profile ?? null;
  const key = profileUrl(r.profileUrl ?? (profile == null ? void 0 : profile.linkedinUrl) ?? null);
  if (!key || !profile || typeof profile !== "object") return null;
  if (typeof r.text !== "string" || !r.text.trim()) return null;
  if (typeof r.savedAt !== "number" || !Number.isFinite(r.savedAt)) return null;
  return {
    profileUrl: key.canonical,
    // Rewrite the profile's own URL to the canonical key so the record cannot disagree with itself.
    profile: { ...profile, linkedinUrl: key.canonical },
    bracket: LEAD_AGE_BRACKET.includes(r.bracket) ? r.bracket : "unknown",
    gender: LEAD_GENDER.includes(r.gender) ? r.gender : "unknown",
    ageConfirmed: r.ageConfirmed === true,
    genderConfirmed: r.genderConfirmed === true,
    company: typeof r.company === "string" ? r.company : "",
    standoutSkill: typeof r.standoutSkill === "string" ? r.standoutSkill : "",
    templateKey: typeof r.templateKey === "string" ? r.templateKey : null,
    tone: r.tone === "professional" ? "professional" : "casual",
    values: r.values && typeof r.values === "object" ? r.values : {},
    text: r.text,
    sentAt: typeof r.sentAt === "string" ? r.sentAt : null,
    savedAt: r.savedAt
  };
}
function withOutreachDraft(drafts, draft, now = Date.now()) {
  const fresh = drafts.filter((d) => d.profileUrl !== draft.profileUrl && now - d.savedAt <= OUTREACH_DRAFT_MAX_AGE_MS);
  return [draft, ...fresh].slice(0, OUTREACH_DRAFTS_MAX);
}
function draftIsFor(draft, linkedinUrl, now = Date.now()) {
  if (!draft || !draft.text.trim()) return false;
  const want = profileUrl(linkedinUrl);
  const have = profileUrl(draft.profileUrl);
  if (!want || !have || want.canonical !== have.canonical) return false;
  return now - draft.savedAt <= OUTREACH_DRAFT_MAX_AGE_MS;
}
async function readDrafts() {
  try {
    const result = await chrome.storage.local.get(OUTREACH_DRAFTS_KEY);
    const raw = result[OUTREACH_DRAFTS_KEY];
    const list = Array.isArray(raw == null ? void 0 : raw.drafts) ? raw.drafts : [];
    const out = [];
    for (const entry of list) {
      const draft = asDraft(entry);
      if (draft) out.push(draft);
    }
    return out;
  } catch {
    return [];
  }
}
async function saveOutreachDraft(draft, now = Date.now()) {
  const entry = asDraft({ ...draft, savedAt: now });
  if (!entry) return;
  try {
    const drafts = withOutreachDraft(await readDrafts(), entry, now);
    await chrome.storage.local.set({
      [OUTREACH_DRAFTS_KEY]: { schemaVersion: OUTREACH_DRAFTS_SCHEMA_VERSION, drafts }
    });
  } catch {
  }
}
async function loadOutreachDraft(linkedinUrl, now = Date.now()) {
  const key = profileUrl(linkedinUrl);
  if (!key) return null;
  const drafts = await readDrafts();
  return drafts.find((d) => draftIsFor(d, key.canonical, now)) ?? null;
}
async function loadOutreachDrafts(now = Date.now()) {
  return (await readDrafts()).filter((d) => now - d.savedAt <= OUTREACH_DRAFT_MAX_AGE_MS);
}
async function clearOutreachDraft(linkedinUrl) {
  const key = profileUrl(linkedinUrl);
  if (!key) return;
  try {
    const drafts = (await readDrafts()).filter((d) => d.profileUrl !== key.canonical);
    await chrome.storage.local.set({
      [OUTREACH_DRAFTS_KEY]: { schemaVersion: OUTREACH_DRAFTS_SCHEMA_VERSION, drafts }
    });
  } catch {
  }
}
async function activeProfileUrl() {
  var _a;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return ((_a = profileUrl(typeof (tab == null ? void 0 : tab.url) === "string" ? tab.url : null)) == null ? void 0 : _a.canonical) ?? null;
  } catch {
    return null;
  }
}
async function loadDraftForActiveProfile(now = Date.now()) {
  const url = await activeProfileUrl();
  return url ? loadOutreachDraft(url, now) : null;
}
const PROFILE_PATH$1 = /^\/in\/([^/?#]+)/i;
function isLinkedInHost$1(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}
function profileUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(parsed.protocol) || !isLinkedInHost$1(parsed.hostname)) return null;
  const match = PROFILE_PATH$1.exec(parsed.pathname);
  if (!match) return null;
  let slug;
  try {
    slug = decodeURIComponent(match[1]).trim().toLowerCase();
  } catch {
    slug = match[1].trim().toLowerCase();
  }
  if (!slug) return null;
  return { canonical: `https://www.linkedin.com/in/${slug}`, slug };
}
function text$1(value, max = 300) {
  if (typeof value !== "string") return null;
  const clean2 = value.replace(/\s+/g, " ").trim();
  if (!clean2) return null;
  return clean2.length <= max ? clean2 : clean2.slice(0, max).trim();
}
function metaOf$1(doc, property) {
  const el = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  return text$1(el == null ? void 0 : el.getAttribute("content"), 600);
}
function findPerson(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPerson(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  const obj = node;
  const type = obj["@type"];
  if (type === "Person" || Array.isArray(type) && type.includes("Person")) return obj;
  if (obj["@graph"]) return findPerson(obj["@graph"]);
  return null;
}
function hostOf(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
function splitProfileTitle(title) {
  if (!title) return { name: null, headline: null };
  const stripped = title.replace(/^\(\d+\)\s*/, "").replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  if (!stripped || /^linkedin$/i.test(stripped)) return { name: null, headline: null };
  const dash = stripped.split(/\s+[-–—]\s+/);
  if (dash.length > 1) return { name: text$1(dash[0], 120), headline: text$1(dash.slice(1).join(" - "), 300) };
  return { name: text$1(stripped, 120), headline: null };
}
function splitName(full) {
  if (!full) return { first: null, last: null };
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
function readProfileDocument(doc, url) {
  var _a;
  const layers = {};
  let person = null;
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      person = findPerson(JSON.parse(script.textContent ?? ""));
    } catch {
      continue;
    }
    if (person) break;
  }
  const titleParts = splitProfileTitle(text$1(doc.title, 400) ?? metaOf$1(doc, "og:title"));
  const worksFor = person == null ? void 0 : person.worksFor;
  const employer = Array.isArray(worksFor) ? worksFor[0] : worksFor;
  const address = person == null ? void 0 : person.address;
  const put = (field, candidates) => {
    for (const [value, layer] of candidates) {
      if (value !== null && value !== void 0 && value !== "") {
        layers[field] = layer;
        return value;
      }
    }
    return null;
  };
  const fullName = put("fullName", [
    [text$1(person == null ? void 0 : person.name, 120), "jsonld"],
    [titleParts.name, "title"]
  ]);
  const jobTitle = Array.isArray(person == null ? void 0 : person.jobTitle) ? (person == null ? void 0 : person.jobTitle)[0] : person == null ? void 0 : person.jobTitle;
  const headline = put("headline", [
    [text$1(jobTitle, 300), "jsonld"],
    [titleParts.headline, "title"],
    [metaOf$1(doc, "og:description"), "meta"]
  ]);
  const company = put("company", [
    [typeof employer === "string" ? text$1(employer, 160) : text$1(employer == null ? void 0 : employer.name, 160), "jsonld"]
  ]);
  const location2 = put("location", [
    [typeof address === "string" ? text$1(address, 160) : text$1(address == null ? void 0 : address.addressLocality, 160), "jsonld"],
    [typeof address === "object" && address ? text$1(address.addressRegion, 160) : null, "jsonld"]
  ]);
  const background = put("background", [
    [text$1(person == null ? void 0 : person.description, 600), "jsonld"]
  ]);
  const companyDomain2 = put("companyDomain", [
    [typeof employer === "object" && employer ? hostOf(employer.url) ?? hostOf(employer.sameAs) : null, "jsonld"]
  ]);
  const { first, last } = splitName(fullName);
  const slug = ((_a = profileUrl(url)) == null ? void 0 : _a.slug) ?? null;
  return {
    slug,
    fullName,
    firstName: first,
    lastName: last,
    headline,
    company,
    companyDomain: companyDomain2,
    // A headline is not a job title. Only JSON-LD's own jobTitle earns role_title; otherwise the
    // panel shows the headline and the human types the title if it matters.
    roleTitle: text$1(person == null ? void 0 : person.jobTitle, 160),
    location: location2,
    background,
    // Nothing here suggests an age bracket or a gender. Both are the adapter's reading of education
    // years and pronouns, and both stay suggestions the human confirms.
    suggestedBracket: null,
    suggestedGender: null,
    layers
  };
}
function toProfile(partial, canonical, url) {
  var _a;
  const p = partial ?? {};
  const named = p.fullName ?? null;
  const split = splitName(named);
  return {
    linkedinUrl: canonical,
    slug: p.slug ?? ((_a = profileUrl(url)) == null ? void 0 : _a.slug) ?? null,
    fullName: named,
    firstName: p.firstName ?? split.first,
    lastName: p.lastName ?? split.last,
    headline: p.headline ?? null,
    company: p.company ?? null,
    companyDomain: p.companyDomain ?? null,
    roleTitle: p.roleTitle ?? null,
    location: p.location ?? null,
    background: p.background ?? null,
    suggestedBracket: p.suggestedBracket ?? null,
    suggestedGender: p.suggestedGender ?? null,
    bracketWhy: p.bracketWhy ?? null,
    genderWhy: p.genderWhy ?? null,
    layers: p.layers ?? {}
  };
}
function readProfileWithAdapter(doc, url) {
  const base = readProfileDocument(doc, url);
  let adapted = null;
  try {
    adapted = parseLinkedInProfile(doc, url);
  } catch {
    return base;
  }
  const layers = { ...base.layers ?? {} };
  const prefer = (field, fromAdapter, fallback) => {
    if (fromAdapter !== null && fromAdapter !== void 0 && fromAdapter !== "") {
      layers[field] = "adapter";
      return fromAdapter;
    }
    return fallback ?? null;
  };
  const age = suggestAgeBracket(adapted);
  const sex = suggestGender(adapted);
  return {
    ...base,
    fullName: prefer("fullName", adapted.fullName, base.fullName),
    firstName: prefer("firstName", adapted.firstName, base.firstName),
    lastName: prefer("lastName", adapted.lastName, base.lastName),
    headline: prefer("headline", adapted.headline, base.headline),
    company: prefer("company", adapted.company, base.company),
    companyDomain: prefer("companyDomain", adapted.companyDomain, base.companyDomain),
    roleTitle: prefer("roleTitle", adapted.roleTitle, base.roleTitle),
    location: prefer("location", adapted.location, base.location),
    background: prefer("background", adapted.about, base.background),
    suggestedBracket: age.bracket === "unknown" ? null : age.bracket,
    suggestedGender: sex.gender === "unknown" ? null : sex.gender,
    bracketWhy: age.why,
    genderWhy: sex.why,
    layers
  };
}
async function captureActiveTabProfile(parse = readProfileWithAdapter) {
  let url = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    url = typeof (tab == null ? void 0 : tab.url) === "string" ? tab.url : null;
    if (!(tab == null ? void 0 : tab.id) || !url) {
      return { status: "error", profile: null, pageTitle: null, url, note: "No page open — open the person’s LinkedIn profile (a linkedin.com/in/… page) in this tab and press this again." };
    }
    const target = profileUrl(url);
    if (!target) {
      let where = url;
      try {
        where = new URL(url).hostname + new URL(url).pathname;
      } catch {
      }
      return {
        status: "error",
        profile: null,
        pageTitle: null,
        url,
        note: `That tab is ${where} — this reads a LinkedIn profile, so open the person’s linkedin.com/in/… page and press this again.`
      };
    }
    const injections = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabPage });
    const page = injections.map((i) => i.result).find((p) => !!p && typeof p.html === "string" && p.html.length > 0);
    if (!(page == null ? void 0 : page.html)) {
      return { status: "error", profile: null, pageTitle: null, url, note: "Could not read that page — reload the profile and press this again." };
    }
    const pageTitle = typeof page.title === "string" && page.title ? page.title : null;
    const doc = new DOMParser().parseFromString(page.html, "text/html");
    const read = page.url ?? url;
    let parsed = null;
    try {
      parsed = parse(doc, read);
    } catch (e) {
      const fallback = toProfile(readProfileDocument(doc, read), target.canonical, read);
      return {
        status: "error",
        profile: fallback,
        pageTitle,
        url,
        note: `The profile adapter failed (${e instanceof Error ? e.message : String(e)}) — only the page’s own structured data was read. Check the fields before saving.`
      };
    }
    let profile = toProfile(parsed, target.canonical, read);
    if (!profile.fullName && pageTitle) {
      const fromTab = splitProfileTitle(pageTitle);
      if (fromTab.name) {
        profile = toProfile(
          {
            ...parsed ?? {},
            fullName: fromTab.name,
            firstName: null,
            lastName: null,
            headline: (parsed == null ? void 0 : parsed.headline) ?? fromTab.headline
          },
          target.canonical,
          read
        );
      }
    }
    if (!profile.fullName) {
      return {
        status: "error",
        profile,
        pageTitle,
        url,
        note: "Read the page but found no name on it — scroll the profile to the top and press this again, or type the name in."
      };
    }
    return { status: "sent", profile, pageTitle, url, note: `Read ${profile.fullName}${profile.company ? ` at ${profile.company}` : ""}.` };
  } catch (e) {
    return { status: "error", profile: null, pageTitle: null, url, note: `Could not read the page — ${e instanceof Error ? e.message : String(e)}` };
  }
}
async function call$1(path, init = {}) {
  let response;
  try {
    const { baseUrl, token } = await getTailorConfig();
    assertAllowedTailorUrl(baseUrl);
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...token ? { "X-Tailor-Token": token } : {}, ...init.headers ?? {} }
    });
  } catch {
    return { ok: false, note: "The hub is not running — start it with `make serve` and try again." };
  }
  if (response.status === 401) {
    return { ok: false, note: "The hub rejected the token — open Hub connection above and set it." };
  }
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, note: `The hub answered with something that is not JSON (HTTP ${response.status}).` };
    }
  }
  if (!response.ok) {
    const message = payload == null ? void 0 : payload.error;
    return { ok: false, note: message ?? `The hub answered HTTP ${response.status}.` };
  }
  return { ok: true, body: payload };
}
async function getTemplates() {
  const empty = { templates: [], max: 300, tokens: [], banned: [] };
  const res = await call$1("/outreach/templates");
  if (!res.ok) return { status: "error", note: `No templates — ${res.note}`, ...empty };
  const templates = Array.isArray(res.body.templates) ? res.body.templates : [];
  if (templates.length === 0) {
    return { status: "error", note: "The hub read no templates — check data/outreach/templates.MD and professional_templates.MD.", ...empty };
  }
  return {
    status: "sent",
    note: `${templates.length} templates.`,
    templates,
    max: typeof res.body.max === "number" ? res.body.max : 300,
    tokens: Array.isArray(res.body.tokens) ? res.body.tokens : [],
    banned: Array.isArray(res.body.banned) ? res.body.banned : []
  };
}
async function draftMessage(request2) {
  const body = {
    bracket: request2.bracket,
    gender: request2.gender,
    tone: request2.tone,
    values: request2.values
  };
  if (request2.text !== void 0) body.text = request2.text;
  if (request2.templateKey !== void 0) body.templateKey = request2.templateKey;
  const res = await call$1("/outreach/draft", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) return { status: "error", note: `No draft — ${res.note}`, draft: null };
  const draft = res.body;
  if (!draft || typeof draft.text !== "string") {
    return { status: "error", note: "The hub answered without a draft.", draft: null };
  }
  const reasons = Array.isArray(draft.reasons) ? draft.reasons : [];
  return {
    status: "sent",
    draft: { ...draft, reasons },
    note: reasons.length === 0 ? `Ready — ${draft.chars} of ${draft.max} characters.` : `Not ready: ${reasons.map((r) => r.fix).join("; ")}.`
  };
}
async function tightenMessage(text2, values = {}) {
  if (!text2.trim()) return { status: "error", note: "Nothing to tighten yet.", result: null };
  const res = await call$1("/outreach/tighten", { method: "POST", body: JSON.stringify({ text: text2, values }) });
  if (!res.ok) return { status: "error", note: `Not tightened, the draft is unchanged — ${res.note}`, result: null };
  const result = res.body;
  if (!result || typeof result.text !== "string" || !result.text.trim()) {
    return { status: "error", note: "The model returned nothing — the draft is unchanged.", result: null };
  }
  const reasons = Array.isArray(result.reasons) ? result.reasons : [];
  return {
    status: "sent",
    result: { ...result, reasons },
    note: reasons.length === 0 ? `Tightened to ${result.chars} characters (${result.costUsd != null ? `$${result.costUsd}` : "cost unreported"}).` : `Tightened to ${result.chars} characters, still not ready: ${reasons.map((r) => r.fix).join("; ")}.`
  };
}
const LEAD_COLUMNS = new Set(ENTITY_COLUMNS.leads);
const MESSAGE_COLUMNS = new Set(ENTITY_COLUMNS.messages);
function columnsKnown$1(draft, allowed) {
  const row = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value === null || value === void 0 || value === "") continue;
    if (!allowed.has(key)) continue;
    row[key] = value;
  }
  return row;
}
let writeChain$1 = Promise.resolve();
function enqueue$1(work) {
  const run = writeChain$1.then(work, work);
  writeChain$1 = run.then(() => void 0, () => void 0);
  return run;
}
async function settle$1(refs) {
  const report = await flushHubOutbox();
  const dead = await getHubDeadLetters();
  const outbox = await getHubOutbox();
  return refs.map((ref) => {
    var _a;
    const stored = (_a = report.rows) == null ? void 0 : _a[ref];
    if (stored) return { status: "sent", row: stored, note: "" };
    const died = dead.find((d) => d.ref === ref);
    if (died) return { status: "dead", row: null, note: died.lastError ?? `HTTP ${died.status}` };
    if (outbox.some((e) => e.ref === ref)) return { status: "queued", row: null, note: report.reason ?? "not sent yet" };
    return { status: "error", row: null, note: "the hub gave no answer for this write" };
  });
}
function saveLead(profile, fields = {}) {
  return enqueue$1(() => saveLeadNow(profile, fields));
}
async function saveLeadNow(profile, fields) {
  var _a;
  const key = profileUrl(profile.linkedinUrl);
  if (!key) {
    return { status: "error", note: "No LinkedIn profile URL on this person — read the profile page first.", leadId: null, row: {} };
  }
  const row = columnsKnown$1({
    linkedin_url: key.canonical,
    full_name: profile.fullName,
    first_name: profile.firstName,
    last_name: profile.lastName,
    headline: profile.headline,
    company: profile.company,
    company_domain: profile.companyDomain,
    role_title: profile.roleTitle,
    location: profile.location,
    background: profile.background,
    // the suggestion is only a starting value; what is stored is what the human left on screen
    age_bracket: fields.ageBracket ?? profile.suggestedBracket,
    gender: fields.gender ?? profile.suggestedGender,
    age_gender_confirmed: fields.ageGenderConfirmed === true ? true : void 0,
    standout_skill: fields.standoutSkill,
    reach_out_reason: fields.reachOutReason,
    job_id: fields.jobId,
    status: fields.status
  }, LEAD_COLUMNS);
  try {
    const ref = await hubUpsert("leads", row, void 0, { flush: false });
    const [done] = await settle$1([ref]);
    const leadId = typeof ((_a = done.row) == null ? void 0 : _a.id) === "string" ? done.row.id : null;
    const who = profile.fullName ?? key.slug;
    if (done.status === "sent") return { status: "sent", note: `Lead saved (${who}).`, leadId, row };
    if (done.status === "dead") return { status: "dead", note: `Lead refused by the hub — ${done.note}`, leadId: null, row };
    if (done.status === "queued") return { status: "queued", note: `Lead queued for the hub — ${done.note}.`, leadId: null, row };
    return { status: "error", note: `Lead not saved — ${done.note}.`, leadId: null, row };
  } catch (e) {
    return { status: "error", note: `Lead not saved — ${e instanceof Error ? e.message : String(e)}`, leadId: null, row };
  }
}
function recordSent(leadId, message) {
  return enqueue$1(() => recordSentNow(leadId, message));
}
async function recordSentNow(leadId, message) {
  var _a;
  const body = (message.body ?? "").trim();
  if (!leadId) {
    return { status: "error", note: "No lead id yet — the lead row has not reached the hub, so the message has nothing to point at. Save the lead once the hub is back, then press this again.", messageId: null, row: {} };
  }
  if (!body) {
    return { status: "error", note: "Nothing to log — the message is empty.", messageId: null, row: {} };
  }
  const row = columnsKnown$1({
    lead_id: leadId,
    kind: message.kind,
    template_key: message.templateKey,
    body,
    char_count: message.charCount ?? body.length,
    sent_at: (message.sentAt ?? /* @__PURE__ */ new Date()).toISOString(),
    sent_detected_by: "button"
  }, MESSAGE_COLUMNS);
  try {
    const messageRef = await hubInsert("messages", row, { flush: false });
    const leadRef = await hubUpdate("leads", leadId, { status: "messaged" }, { flush: false });
    const [sent, lead] = await settle$1([messageRef, leadRef]);
    const messageId = typeof ((_a = sent.row) == null ? void 0 : _a.id) === "string" ? sent.row.id : null;
    if (sent.status === "dead") {
      return { status: "dead", note: `Message not logged — refused by the hub — ${sent.note}`, messageId: null, row };
    }
    if (sent.status === "queued") {
      return { status: "queued", note: `Message queued for the hub (${sent.note}) — the email lookup happens when it lands.`, messageId: null, row };
    }
    if (sent.status === "error") {
      return { status: "error", note: `Message not logged — ${sent.note}.`, messageId: null, row };
    }
    if (lead.status !== "sent") {
      return {
        status: lead.status,
        messageId,
        row,
        note: `Message logged as sent and the hub is collecting the email, but the lead is still marked as captured — ${lead.note}.`
      };
    }
    return { status: "sent", note: "Message logged as sent — the lead is messaged, and the hub is collecting the email.", messageId, row };
  } catch (e) {
    return { status: "error", note: `Message not logged — ${e instanceof Error ? e.message : String(e)}`, messageId: null, row };
  }
}
const TOKEN_PROBE_PATH = "/outreach/templates";
function shortAddress(address) {
  return address.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}
function classifyConnection(facts) {
  const address = facts.address;
  if (facts.addressError) return { kind: "refused", address, why: facts.addressError };
  if (facts.healthError) return { kind: "error", address, why: facts.healthError, health: facts.health };
  if (!facts.health) return { kind: "down", address };
  const health = facts.health;
  if (facts.probeStatus === null) {
    return { kind: "error", address, health, why: "the token was not tested" };
  }
  const hasToken = facts.storedToken.trim() !== "";
  if (facts.probeStatus === 401 || facts.probeStatus === 403) {
    return hasToken ? { kind: "bad-token", address, health } : { kind: "no-token", address, health };
  }
  if (facts.probeStatus >= 200 && facts.probeStatus < 300) {
    return hasToken ? { kind: "ok", address, health } : { kind: "open", address, health };
  }
  return { kind: "error", address, health, why: `the hub answered HTTP ${facts.probeStatus} on ${TOKEN_PROBE_PATH}` };
}
function isConnected(state) {
  return state.kind === "ok" || state.kind === "open";
}
function summaryLine(state) {
  switch (state.kind) {
    case "unknown":
      return { text: "Hub connection — not checked yet.", tone: "muted" };
    case "refused":
      return { text: `Address refused, nothing was sent — ${state.why}`, tone: "warn" };
    case "down":
      return {
        text: `Hub not running at ${shortAddress(state.address)} — nothing can be drafted, tightened or logged. Start it with make serve, or fix the address here.`,
        tone: "warn"
      };
    case "error":
      return { text: `Hub at ${shortAddress(state.address)} answered something unusable — ${state.why}.`, tone: "warn" };
    case "no-token":
      return {
        text: "No hub token set — the hub is running, but every draft, tighten and log will come back 401. Set it here.",
        tone: "warn"
      };
    case "bad-token":
      return {
        text: "Hub rejected this token — the hub is up, the token is wrong. Re-copy it from apps/mapper/.tailor-token.",
        tone: "warn"
      };
    case "open":
      return { text: `Hub connected — ${shortAddress(state.address)}, and it asks for no token.`, tone: "ok" };
    case "ok":
      return {
        text: `Hub connected — ${shortAddress(state.address)}, token accepted. Change address or token`,
        tone: "ok"
      };
  }
}
function verdictLine(state) {
  var _a;
  switch (state.kind) {
    case "unknown":
      return "Nothing has been checked yet. Press Test connection.";
    case "refused":
      return `Nothing was sent — ${state.why}`;
    case "down":
      return `Nothing is listening at ${state.address}. The token was not tested — there was nothing to ask. Start the hub with make serve, or correct the address above.`;
    case "error":
      return `The hub at ${shortAddress(state.address)} did not answer usefully — ${state.why}. Until it does, the token cannot be tested.`;
    case "no-token":
      return "The hub is up, and it wants a token you have not set. Paste the one make serve printed into the box above and press Save.";
    case "bad-token":
      return `The hub is up${((_a = state.health) == null ? void 0 : _a.version) ? ` (version ${state.health.version})` : ""} but it rejected this token. /health is public, so a running hub proves nothing about the token — this is the authenticated check, and it failed. Re-copy it from apps/mapper/.tailor-token ("make token | pbcopy" gives it clean), then press Save.`;
    case "open":
      return "Connected — and this hub is running without a token (make serve --no-token), so anything on this machine can reach it.";
    case "ok":
      return "Connected. The hub answered /health, and it accepted this token on an authenticated call. Nothing was spent.";
  }
}
function shouldOpen(state, userClosed) {
  if (state.kind === "unknown" || isConnected(state)) return false;
  return !userClosed;
}
async function readHealth(address) {
  let response;
  try {
    response = await fetch(`${address}/health`);
  } catch {
    return { health: null, error: null };
  }
  let body = null;
  try {
    body = JSON.parse(await response.text());
  } catch {
    return { health: null, error: `HTTP ${response.status}, and the body was not JSON` };
  }
  if (!response.ok) return { health: null, error: `HTTP ${response.status} on /health` };
  return { health: body, error: null };
}
async function testConnection(over = {}) {
  const stored = await getTailorConfig().catch(() => ({ baseUrl: "", token: "" }));
  const address = (over.baseUrl ?? stored.baseUrl ?? "").trim().replace(/\/+$/, "");
  const storedToken = (over.token ?? stored.token ?? "").trim();
  try {
    assertAllowedTailorUrl(address);
  } catch (e) {
    return classifyConnection({
      address,
      storedToken,
      health: null,
      healthError: null,
      probeStatus: null,
      addressError: e instanceof Error ? e.message : String(e)
    });
  }
  const { health, error } = await readHealth(address);
  if (!health) {
    return classifyConnection({ address, storedToken, addressError: null, health, healthError: error, probeStatus: null });
  }
  let probeStatus = null;
  try {
    const probe = await fetch(`${address}${TOKEN_PROBE_PATH}`, {
      headers: storedToken ? { "X-Tailor-Token": storedToken } : {}
    });
    probeStatus = probe.status;
  } catch {
    return classifyConnection({
      address,
      storedToken,
      addressError: null,
      health,
      probeStatus: null,
      healthError: "the hub answered /health but not the authenticated check"
    });
  }
  return classifyConnection({ address, storedToken, addressError: null, health, healthError: null, probeStatus });
}
async function saveConnection(baseUrl, token) {
  const address = baseUrl.trim().replace(/\/+$/, "");
  try {
    await setTailorConfig({ baseUrl: address, token: token.trim() });
  } catch (e) {
    return { kind: "refused", address, why: e instanceof Error ? e.message : String(e) };
  }
  return testConnection();
}
function ServiceConnection({ open, onOpenChange, state, onChange }) {
  const [baseUrl, setBaseUrl] = reactExports.useState(null);
  const [token, setToken] = reactExports.useState("");
  const [busy, setBusy] = reactExports.useState(null);
  const [verdict2, setVerdict] = reactExports.useState(null);
  const [loaded, setLoaded] = reactExports.useState(false);
  if (open && !loaded) {
    setLoaded(true);
    void getTailorConfig().then((config) => {
      setBaseUrl(config.baseUrl);
      setToken(config.token);
    }).catch(() => setBaseUrl(TAILOR_BASE_URL));
  }
  const summary = summaryLine(state);
  const save = async () => {
    setBusy("saving");
    setVerdict(null);
    try {
      const next = await saveConnection(baseUrl ?? TAILOR_BASE_URL, token);
      setVerdict(verdictLine(next));
      onChange(next);
      if (isConnected(next)) onOpenChange(false);
    } finally {
      setBusy(null);
    }
  };
  const test = async () => {
    setBusy("testing");
    setVerdict(null);
    try {
      const next = await testConnection({ baseUrl: baseUrl ?? void 0, token });
      setVerdict(verdictLine(next));
      onChange(next);
    } finally {
      setBusy(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "details",
    {
      className: "conn",
      "data-testid": "outreach-connection",
      open,
      onToggle: (e) => onOpenChange(e.currentTarget.open),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "summary",
          {
            "data-testid": "outreach-connection-summary",
            className: summary.tone === "warn" ? "warn" : "sub",
            style: { cursor: "pointer" },
            children: summary.text
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Service address" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: TAILOR_BASE_URL,
              value: baseUrl ?? "",
              onChange: (e) => setBaseUrl(e.target.value),
              spellCheck: false,
              autoComplete: "off",
              autoCapitalize: "off",
              autoCorrect: "off"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
            "Loopback, LAN or tailnet only — ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "127.0.0.1" }),
            ", ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "192.168.x.x" }),
            ",",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "10.x.x.x" }),
            ", ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "100.64–127.x.x" }),
            " or a ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: ".ts.net" }),
            " name. Public addresses are refused."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Service token" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "password",
              placeholder: "from `make serve`",
              value: token,
              onChange: (e) => setToken(e.target.value),
              spellCheck: false,
              autoComplete: "off",
              autoCapitalize: "off",
              autoCorrect: "off"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
            "The same token the Tailor tab uses — one hub, one token. ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "make token" }),
            " prints it."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small primary", disabled: busy !== null, onClick: () => void save(), children: busy === "saving" ? "Saving…" : "Save" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn small",
              disabled: busy !== null,
              onClick: () => void test(),
              title: "Two free requests: is the hub up, and does this token work. Nothing is spent.",
              children: busy === "testing" ? "Testing…" : "Test connection"
            }
          )
        ] }),
        verdict2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: isConnected(state) ? "sub" : "note warn",
            "data-testid": "outreach-connection-verdict",
            style: { marginTop: 6 },
            children: verdict2
          }
        )
      ]
    }
  );
}
const MAX_NOTE_CHARS = 300;
const OUTREACH_TONES = ["casual", "professional"];
function asRecord$1(raw) {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
}
function pickString$1(source, ...keys) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
function readProfile(raw) {
  const outer = asRecord$1(raw);
  if (!outer) return null;
  const source = asRecord$1(outer.profile) ?? outer;
  const fullName = pickString$1(source, "fullName", "full_name", "name");
  const firstName = pickString$1(source, "firstName", "first_name");
  const linkedinUrl = pickString$1(source, "linkedinUrl", "linkedin_url", "profileUrl", "url") ?? "";
  if (!linkedinUrl && !fullName && !firstName) return null;
  return {
    linkedinUrl,
    fullName,
    firstName: firstName ?? (fullName ? fullName.split(/\s+/)[0] : null),
    lastName: pickString$1(source, "lastName", "last_name") ?? (fullName && fullName.split(/\s+/).length > 1 ? fullName.split(/\s+/).slice(-1)[0] : null),
    headline: pickString$1(source, "headline", "title"),
    company: pickString$1(source, "company", "companyName", "company_name", "currentCompany"),
    companyDomain: pickString$1(source, "companyDomain", "company_domain", "domain"),
    roleTitle: pickString$1(source, "roleTitle", "role_title", "jobTitle", "position"),
    location: pickString$1(source, "location"),
    background: pickString$1(source, "background", "about", "summary")
  };
}
const AGE_ALIASES = {
  "20": "20s",
  "30": "30s",
  "40": "40s",
  "50": "50s",
  "60": "60s",
  twenties: "20s",
  thirties: "30s",
  forties: "40s",
  fifties: "50s",
  sixties: "60s"
};
const GENDER_ALIASES = {
  male: "m",
  man: "m",
  men: "m",
  he: "m",
  female: "f",
  woman: "f",
  women: "f",
  she: "f"
};
function readSuggestion(raw, allowed, fallback, aliases = {}) {
  const source = asRecord$1(raw);
  const rawValue = typeof raw === "string" ? raw : source ? pickString$1(source, "value", "bracket", "ageBracket", "age_bracket", "gender") : null;
  const normalised = rawValue ? aliases[rawValue.toLowerCase()] ?? rawValue.toLowerCase() : null;
  const value = allowed.find((option) => option === normalised) ?? fallback;
  const why = (source ? pickString$1(source, "why", "reason", "evidence") : null) ?? (value === fallback ? "The profile did not say, so this is left unknown — nothing is guessed for you." : "The reader gave no reason for this.");
  return { value, why };
}
function readTemplates(raw) {
  var _a;
  const list = Array.isArray(raw) ? raw : (_a = asRecord$1(raw)) == null ? void 0 : _a.templates;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    const source = asRecord$1(entry);
    if (!source) continue;
    const key = pickString$1(source, "key");
    const bracket = pickString$1(source, "bracket");
    const gender = pickString$1(source, "gender");
    const tone = pickString$1(source, "tone");
    const body = pickString$1(source, "body");
    if (!key || !bracket || !gender || !tone || !body) continue;
    const skeleton = source.skeletonChars;
    out.push({ key, bracket, gender, tone, body, skeletonChars: typeof skeleton === "number" ? skeleton : body.length });
  }
  return out;
}
const EMPTY_SETTINGS = { tone: "casual", targetRole: "", targetRoles: [], skillset: "" };
function readSettings(raw) {
  const source = asRecord$1(raw);
  if (!source) return { ...EMPTY_SETTINGS };
  const toneRaw = pickString$1(source, "tone");
  const tone = OUTREACH_TONES.find((t) => t === toneRaw) ?? "casual";
  const rolesRaw = source.targetRoles ?? source.target_roles ?? source.roles;
  const roles = [];
  if (Array.isArray(rolesRaw)) {
    for (const role of rolesRaw) {
      if (typeof role === "string" && role.trim() && !roles.includes(role.trim())) roles.push(role.trim());
    }
  }
  const targetRole = pickString$1(source, "lastTargetRole", "last_target_role", "targetRole", "target_role") ?? "";
  if (targetRole && !roles.includes(targetRole)) roles.unshift(targetRole);
  return { tone, targetRole, targetRoles: roles, skillset: pickString$1(source, "skillset") ?? "" };
}
function readLeadId(raw) {
  if (typeof raw === "string") return raw.trim() || null;
  const source = asRecord$1(raw);
  if (!source) return null;
  const direct = pickString$1(source, "id", "leadId", "lead_id");
  if (direct) return direct;
  const nested = asRecord$1(source.lead);
  return nested ? pickString$1(nested, "id") : null;
}
function readGate$1(raw, fallbackText = "") {
  const outer = asRecord$1(raw) ?? {};
  const source = asRecord$1(outer.draft) ?? asRecord$1(outer.result) ?? asRecord$1(outer.gate) ?? outer;
  const reasons = [];
  if (Array.isArray(source.reasons)) {
    for (const entry of source.reasons) {
      const reason = asRecord$1(entry);
      if (!reason) continue;
      reasons.push({
        code: pickString$1(reason, "code") ?? "refused",
        detail: pickString$1(reason, "detail") ?? "the hub refused this message",
        fix: pickString$1(reason, "fix") ?? "edit the message and it will be checked again"
      });
    }
  }
  const text2 = pickString$1(source, "text") ?? fallbackText;
  const chars = typeof source.chars === "number" ? source.chars : text2.length;
  const cost = source.costUsd;
  return {
    ok: source.ok === true && reasons.length === 0,
    text: text2,
    chars,
    templateKey: pickString$1(source, "templateKey", "template_key"),
    reasons,
    costUsd: typeof cost === "number" ? cost : null
  };
}
function charCount(text2) {
  const chars = text2.length;
  const over = chars - MAX_NOTE_CHARS;
  const overLimit = over > 0;
  return {
    chars,
    over: overLimit ? over : 0,
    overLimit,
    color: overLimit ? "var(--danger)" : "var(--muted)",
    label: overLimit ? `${chars} / ${MAX_NOTE_CHARS} — ${over} over` : `${chars} / ${MAX_NOTE_CHARS}`
  };
}
const AGE_LABELS = {
  "20s": "in their 20s",
  "30s": "in their 30s",
  "40s": "in their 40s",
  "50s": "in their 50s",
  "60s": "in their 60s",
  unknown: "unknown — pick one"
};
const GENDER_LABELS = {
  m: "male",
  f: "female",
  unknown: "unknown — not guessed"
};
function ageChipLabel(bracket) {
  return AGE_LABELS[bracket] ?? String(bracket);
}
function genderChipLabel(gender) {
  return GENDER_LABELS[gender] ?? String(gender);
}
function chipClassFor(value, current) {
  if (value !== current) return "chip gray";
  return value === "unknown" ? "chip warn-chip" : "chip";
}
function chipTitleFor(value, suggestion, confirmed) {
  if (suggestion && suggestion.value === value) {
    return confirmed ? `You confirmed this. The profile suggested it: ${suggestion.why}` : `Suggested from the profile — a guess until you press it: ${suggestion.why}`;
  }
  return "Not what the profile suggested. Pressing this is your call, and it overrides the guess.";
}
function missingBeforeDraft(values, bracket, gender) {
  const missing = [];
  if (bracket === "unknown") missing.push("the age bracket — the register of the note depends on it");
  if (gender === "unknown") missing.push("the gender — the 20 notes are written per reader, and unknown has no note");
  if (!values.name.trim()) missing.push("the person's name — you type this one when the profile read gave none");
  if (!values.company.trim()) missing.push("their company — you type this one; the profile does not always say");
  if (!values.standoutSkill.trim()) missing.push("the stand-out skill — you type this one; nothing infers it");
  if (!values.targetRole.trim()) missing.push("your target role — pick one, or add a new one");
  if (!values.skillset.trim()) missing.push("your skillset");
  return missing;
}
function companyAfterRead(previous, typed, incoming) {
  return fieldAfterRead(previous, typed, incoming.linkedinUrl, incoming.company);
}
function fieldAfterRead(previous, typed, incomingUrl, incoming) {
  if (incoming) return incoming;
  const samePerson = previous !== null && incomingUrl !== "" && previous.linkedinUrl === incomingUrl;
  return samePerson ? typed : "";
}
function generateState(input) {
  const off = (why) => ({ enabled: false, why, overwrites: false });
  if (input.busy) return off("Working — wait for the current step to finish.");
  if (input.missing.length > 0) return off(`It still needs: ${input.missing.join("; ")}.`);
  if (!input.ageConfirmed || !input.genderConfirmed) {
    const which = !input.ageConfirmed && !input.genderConfirmed ? "age bracket and gender chips" : !input.ageConfirmed ? "age bracket chip" : "gender chip";
    return off(`Press the ${which} to confirm — the 20 notes are written per reader, so a guess must not pick one on your behalf.`);
  }
  if (!input.hasTemplate) {
    return off("No template for this bracket / gender / tone. Change the tone, or check data/outreach in the hub.");
  }
  const overwrites = input.edited && input.text.trim() !== "";
  return {
    enabled: true,
    overwrites,
    why: overwrites ? "Replaces the note you edited with a fresh one from the fields above, and saves this person to your outreach log. It asks first." : "Fills the template from the fields above and saves this person to your outreach log. Costs nothing."
  };
}
function tightenState(chars, busy) {
  if (busy) return { enabled: false, why: "Working — wait for the current step to finish." };
  if (chars <= MAX_NOTE_CHARS) {
    return { enabled: false, why: `Nothing to pay for: the note is within ${MAX_NOTE_CHARS} characters.` };
  }
  return {
    enabled: true,
    why: `Spends money: one short model call shortens this to ${MAX_NOTE_CHARS} characters. It asks before it spends, keeps your draft either way, and the result goes through the same checks.`
  };
}
function sendBlockers(state) {
  const blockers = [];
  if (state.sentAt) blockers.push("this note is already logged as sent");
  if (!state.text.trim()) blockers.push("there is no message yet");
  if (!state.linkedinUrl.trim()) blockers.push("no LinkedIn URL was read — press Read this profile on the person's page");
  if (!state.checked) blockers.push("the hub has not checked this message yet");
  for (const reason of state.reasons) blockers.push(`${reason.detail} — ${reason.fix}`);
  if (state.busy) blockers.push("working…");
  return blockers;
}
function errorText$1(error) {
  return error instanceof Error ? error.message : String(error);
}
function OutreachForm(props) {
  const { profile, values, count, gate, on } = props;
  const busy = props.reading || props.drafting || props.tightening || props.sending;
  const person = (profile == null ? void 0 : profile.fullName) ?? (profile == null ? void 0 : profile.firstName) ?? "this person";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-testid": "outreach-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "LinkedIn outreach" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", title: "Nothing here opens, watches, clicks or sends anything on LinkedIn.", children: "you send it, we log it" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ServiceConnection,
      {
        open: props.connectionOpen,
        onOpenChange: on.setConnectionOpen,
        state: props.connection,
        onChange: on.setConnection
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn small primary",
        disabled: busy,
        onClick: on.read,
        title: "Reads the LinkedIn profile in the active tab once. It clicks nothing and sends nothing.",
        children: props.reading ? "Reading…" : profile ? "Read this profile again" : "Read this profile"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Nothing is read from LinkedIn until you press this, and nothing on LinkedIn is ever clicked or sent by this extension. You press Send in LinkedIn yourself." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecentEntries,
      {
        testId: "outreach-recents",
        title: "The last 3 notes you drafted",
        entries: props.recents,
        busy,
        busyWhy: "Working — wait for the current step to finish.",
        hint: "Retrieve puts that person, their company, your stand-out skill and the note back in the boxes below, replacing what is in them. It spends nothing, and the note is checked again before you can log it as sent.",
        columns: [
          { label: "Person", cell: (d) => d.profile.fullName ?? d.profile.slug ?? d.profileUrl },
          { label: "Company", cell: (d) => d.company },
          { label: "Note", cell: (d) => d.text, wide: true }
        ],
        onRetrieve: on.retrieve
      }
    ),
    profile && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: person }),
        profile.roleTitle ? ` · ${profile.roleTitle}` : ""
      ] }),
      profile.headline && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: profile.headline }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
        values.company.trim() || "no company read — type it below",
        profile.location ? ` · ${profile.location}` : "",
        profile.linkedinUrl ? ` · ${profile.linkedinUrl}` : " · no profile URL read"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 6 }, children: [
        "Age bracket ",
        props.ageConfirmed ? "(you confirmed)" : "(a guess — confirm or flip it)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }, children: LEAD_AGE_BRACKET.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          style: { cursor: "pointer" },
          className: chipClassFor(option, props.bracket),
          title: chipTitleFor(option, props.ageSuggestion, props.ageConfirmed),
          onClick: () => on.chooseBracket(option),
          children: ageChipLabel(option)
        },
        option
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 6 }, children: [
        "Gender ",
        props.genderConfirmed ? "(you confirmed)" : "(a guess — confirm or flip it)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }, children: LEAD_GENDER.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          style: { cursor: "pointer" },
          className: chipClassFor(option, props.gender),
          title: chipTitleFor(option, props.genderSuggestion, props.genderConfirmed),
          onClick: () => on.chooseGender(option),
          children: genderChipLabel(option)
        },
        option
      )) }),
      props.gender === "unknown" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Unknown is an honest answer, not a coin flip — but the 20 notes are written per reader, so there is no note to fill until you say which one this is." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Their name (you can type this)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: values.name,
          placeholder: "the name the note opens with",
          onChange: (e) => on.setName(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Filled in from the profile when the read finds a name, and it does not always — a profile that had not finished rendering gives none. This box is what goes into the note, so a read that came back empty is something you can fix here rather than a wall." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Their company (you type this)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: values.company,
          placeholder: "where they work",
          onChange: (e) => on.setCompany(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Filled in from the profile when the page says so, and often it does not — the current employer is not always stated where a reader can find it. Whatever is in this box is what goes into the note and into the lead." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Stand-out skill (you type this)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: values.standoutSkill,
          placeholder: "the one thing you would say about them",
          onChange: (e) => on.setStandoutSkill(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Nothing infers this. No model fills it, and it is never read off their profile — it is the sentence you would say out loud, so you write it." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Your target role" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: values.targetRole, onChange: (e) => on.setTargetRole(e.target.value), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— pick one —" }),
        props.targetRoles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: role, children: role }, role))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: props.newRole,
          placeholder: "add a role to the list",
          onChange: (e) => on.setNewRole(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          disabled: busy || !props.newRole.trim(),
          onClick: on.addRole,
          title: "Remembered for next time, on this machine.",
          children: "Add role"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Your skillset" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: values.skillset,
          placeholder: "what you do, in the words you want in the note",
          onChange: (e) => on.setSkillset(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Saved, so you type it once." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Tone" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: props.tone, onChange: (e) => on.setTone(e.target.value), children: OUTREACH_TONES.map((tone) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: tone, children: tone }, tone)) })
    ] }),
    props.missing.length > 0 && !props.note.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "No note yet." }),
      " It still needs:",
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "4px 0 0 16px", padding: 0 }, children: props.missing.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: item }, item)) })
    ] }),
    profile && props.missing.length === 0 && !props.hasTemplate && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", children: [
      "No template for ",
      props.bracket,
      " / ",
      genderChipLabel(props.gender),
      " / ",
      props.tone,
      " — the bank has 20 notes and this combination is not one of them. Change the tone, or check data/outreach in the hub."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn primary",
          "data-testid": "outreach-generate",
          disabled: !props.generate.enabled,
          onClick: on.generate,
          title: props.generate.why,
          children: props.drafting ? "Generating…" : props.note.trim() ? "Generate message again" : "Generate message"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: props.generate.why })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", children: [
        "The note ",
        props.templateKey ? `· template ${props.templateKey}` : ""
      ] }),
      props.note.trim() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "note",
          "data-testid": "outreach-note",
          style: { whiteSpace: "pre-wrap", marginTop: 4, userSelect: "text", lineHeight: 1.45 },
          children: props.note
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note muted", "data-testid": "outreach-note-empty", style: { marginTop: 4 }, children: props.drafting ? "Generating…" : "No message yet. Fill the fields above and press Generate message." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            style: { color: count.color, fontWeight: count.overLimit ? 700 : 400, fontSize: 12 },
            "data-testid": "outreach-count",
            children: count.label
          }
        ),
        props.drafting && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", children: "checking…" }),
        props.rechecking && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", "data-testid": "outreach-rechecking", children: "re-checking your restored note with the hub…" })
      ] }),
      props.note.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
        "Select it here and copy, or press ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Copy" }),
        ". To change the wording, change a field above and press ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Generate message again" }),
        " — the hub writes it, and every rule it must pass is checked there."
      ] })
    ] }),
    gate && gate.reasons.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", "data-testid": "outreach-reasons", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Not sendable as written:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "4px 0 0 16px", padding: 0 }, children: gate.reasons.map((reason, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
        reason.detail,
        " — ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: reason.fix })
      ] }, `${reason.code}-${i}`)) })
    ] }),
    gate && gate.ok && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Passes every check. Send it in LinkedIn yourself, then press I sent it." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", disabled: !props.tighten.enabled, onClick: on.tighten, title: props.tighten.why, children: props.tightening ? "Tightening…" : "Tighten (spends money)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          "data-testid": "outreach-recheck",
          disabled: !props.note.trim() || props.checked || busy,
          onClick: on.recheck,
          title: "Asks the hub to check this note again, exactly as it stands. Costs nothing.",
          children: props.rechecking ? "Checking…" : "Check this note"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          disabled: !props.note.trim(),
          onClick: on.copy,
          title: "Copies the note so you can paste it into LinkedIn yourself.",
          children: "Copy"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small primary",
          disabled: props.blockers.length > 0,
          onClick: on.send,
          "data-testid": "outreach-sent",
          title: props.blockers.length > 0 ? `Not yet: ${props.blockers.join("; ")}` : "Records this note as sent and has the hub look their email up. It asks LinkedIn nothing — press it after you pressed Send there. This person is already in your log; this is the message, not the lead.",
          children: props.sending ? "Logging…" : props.sentAt ? "Logged as sent" : "I sent it"
        }
      )
    ] }),
    props.blockers.length > 0 && !props.sentAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", "data-testid": "outreach-blockers", children: [
      "Not sendable yet: ",
      props.blockers[0]
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Nothing here watches LinkedIn. This button is the only thing that records a send, and it records what you tell it." }),
    props.status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", "data-testid": "outreach-status", children: props.status }),
    props.wire && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "sub",
        "data-testid": "outreach-wire",
        style: { marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, opacity: 0.75, wordBreak: "break-all" },
        children: [
          "hub said → ",
          props.wire
        ]
      }
    )
  ] });
}
function OutreachPanel({ jobId = null } = {}) {
  const [profile, setProfile] = reactExports.useState(null);
  const [ageSuggestion, setAgeSuggestion] = reactExports.useState(null);
  const [genderSuggestion, setGenderSuggestion] = reactExports.useState(null);
  const [bracket, setBracket] = reactExports.useState("unknown");
  const [gender, setGender] = reactExports.useState("unknown");
  const [ageConfirmed, setAgeConfirmed] = reactExports.useState(false);
  const [genderConfirmed, setGenderConfirmed] = reactExports.useState(false);
  const [templates, setTemplates] = reactExports.useState([]);
  const [settings, setSettings] = reactExports.useState({ ...EMPTY_SETTINGS });
  const [name, setName] = reactExports.useState("");
  const [company, setCompany] = reactExports.useState("");
  const [standoutSkill, setStandoutSkill] = reactExports.useState("");
  const [newRole, setNewRole] = reactExports.useState("");
  const [text2, setText] = reactExports.useState("");
  const [gate, setGate] = reactExports.useState(null);
  const [checked, setChecked] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [drafting, setDrafting] = reactExports.useState(false);
  const [tightening, setTightening] = reactExports.useState(false);
  const [sending, setSending] = reactExports.useState(false);
  const [sentAt, setSentAt] = reactExports.useState(null);
  const [status, setStatus] = reactExports.useState(null);
  const [wire, setWire] = reactExports.useState(null);
  const [rechecking, setRechecking] = reactExports.useState(false);
  const [connection, setConnection] = reactExports.useState({ kind: "unknown" });
  const [connClosed, setConnClosed] = reactExports.useState(false);
  const [recents, setRecents] = reactExports.useState([]);
  const draftSeq = reactExports.useRef(0);
  const templateKeyRef = reactExports.useRef(null);
  const leadIdRef = reactExports.useRef(null);
  const capturedRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [loadedSettings, loadedTemplates] = await Promise.all([getOutreachSettings(), getTemplates()]);
        if (!alive) return;
        setSettings(readSettings(loadedSettings));
        setTemplates(readTemplates(loadedTemplates));
        if (loadedTemplates.status !== "sent") {
          setStatus(`${loadedTemplates.note} Nothing can be drafted until the hub answers.`);
          setConnClosed(false);
          return;
        }
        setConnection({ kind: "ok", address: "", health: null });
      } catch (e) {
        if (alive) {
          setStatus(`The template bank could not be read — ${errorText$1(e)}. Nothing was drafted.`);
          setConnClosed(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const refreshRecents = () => {
    void loadOutreachDrafts().then((list) => setRecents(list.slice(0, RECENTS_MAX))).catch(() => void 0);
  };
  reactExports.useEffect(refreshRecents, []);
  const values = reactExports.useMemo(() => ({
    // The box, not the profile: a read only ever prefills it, and what is on screen is what the
    // hub is asked to put in the note.
    name,
    standoutSkill,
    company,
    skillset: settings.skillset,
    targetRole: settings.targetRole
  }), [name, standoutSkill, company, settings.skillset, settings.targetRole]);
  const missing = reactExports.useMemo(() => missingBeforeDraft(values, bracket, gender), [values, bracket, gender]);
  const hasTemplate = reactExports.useMemo(
    () => templates.length === 0 || templates.some((t) => t.bracket === bracket && t.gender === gender && t.tone === settings.tone),
    [templates, bracket, gender, settings.tone]
  );
  const writeLead = async () => {
    const person = capturedRef.current;
    if (!(person == null ? void 0 : person.linkedinUrl)) return null;
    const outcome = await saveLead(
      {
        ...person,
        // What you typed, not what was read — the box is the truth, and it is required before a
        // draft, so it is never blank here. `companyDomain` stays the reader's: it comes from a
        // contact-info website the profile itself labelled, and nothing on this screen edits it.
        company: company.trim() || person.company
      },
      {
        // The bracket and gender that go to the database are the ones on the chips — a flipped chip
        // overrides the suggestion, and ageGenderConfirmed records whether he actually looked.
        ageBracket: bracket,
        gender,
        ageGenderConfirmed: ageConfirmed && genderConfirmed,
        standoutSkill: standoutSkill.trim(),
        ...jobId ? { jobId } : {}
      }
    );
    const id = readLeadId(outcome);
    if (id) leadIdRef.current = id;
    return outcome;
  };
  const generate = async () => {
    var _a, _b, _c, _d, _e;
    const subject = capturedRef.current;
    const seq = ++draftSeq.current;
    setDrafting(true);
    setStatus(null);
    try {
      const outcome = await draftMessage({ bracket, gender, tone: settings.tone, values });
      if (seq !== draftSeq.current) return;
      setWire(`status=${outcome.status} · textLength=${((_b = (_a = outcome.draft) == null ? void 0 : _a.text) == null ? void 0 : _b.length) ?? 0} · templateKey=${((_c = outcome.draft) == null ? void 0 : _c.templateKey) ?? "none"} · reasons=${((_e = (_d = outcome.draft) == null ? void 0 : _d.reasons) == null ? void 0 : _e.length) ?? 0} · note="${outcome.note}"`);
      if (outcome.status !== "sent" || !outcome.draft) {
        setChecked(false);
        setGate(null);
        setStatus(`${outcome.note} Nothing was written into the note.`);
        setConnClosed(false);
        return;
      }
      const result = readGate$1(outcome);
      console.info("[FlashFiller] outreach generate", {
        status: outcome.status,
        chars: result.chars,
        textLength: result.text.length,
        templateKey: result.templateKey,
        reasons: result.reasons.length
      });
      if (result.templateKey) templateKeyRef.current = result.templateKey;
      setGate(result);
      setChecked(true);
      setText(result.text);
      setStatus(outcome.note);
      if (subject) {
        void saveOutreachDraft({
          profile: subject,
          bracket,
          gender,
          ageConfirmed,
          genderConfirmed,
          company,
          standoutSkill,
          templateKey: templateKeyRef.current,
          tone: settings.tone,
          values,
          text: result.text,
          sentAt: null
        }).then(refreshRecents);
      }
      const lead = await writeLead();
      if (seq !== draftSeq.current) return;
      if (!lead) {
        setStatus(`${outcome.note} Nothing was logged — press "Read this profile" on their LinkedIn page first, and the next Generate files them.`);
      } else if (lead.status === "sent") {
        setStatus(`${outcome.note} ${lead.note}`);
      } else {
        setStatus(`${outcome.note} ${lead.note} The note above is unaffected.`);
      }
    } catch (e) {
      if (seq !== draftSeq.current) return;
      setWire(`threw: ${errorText$1(e)}`);
      console.warn("[FlashFiller] outreach generate threw", e);
      setChecked(false);
      setGate(null);
      setStatus(`No draft — ${errorText$1(e)}. The hub does the filling and the checking; start it with "make serve".`);
    } finally {
      if (seq === draftSeq.current) setDrafting(false);
    }
  };
  const recheck = async (draft) => {
    var _a, _b, _c, _d;
    if (!draft.text.trim()) return;
    setRechecking(true);
    try {
      const outcome = await draftMessage({
        bracket: draft.bracket,
        gender: draft.gender,
        tone: draft.tone,
        values: draft.values,
        text: draft.text,
        templateKey: draft.templateKey
      });
      setWire(`recheck status=${outcome.status} · textLength=${((_b = (_a = outcome.draft) == null ? void 0 : _a.text) == null ? void 0 : _b.length) ?? 0} · reasons=${((_d = (_c = outcome.draft) == null ? void 0 : _c.reasons) == null ? void 0 : _d.length) ?? 0} · note="${outcome.note}"`);
      if (outcome.status !== "sent" || !outcome.draft) {
        setConnClosed(false);
        setStatus(`Your note is back exactly as you left it — but ${outcome.note} Read it and copy it; "I sent it" stays dead until the hub has checked it. Press "Check this note" once the hub is up.`);
        return;
      }
      const result = readGate$1(outcome, draft.text);
      if (result.templateKey) templateKeyRef.current = result.templateKey;
      setGate(result);
      setChecked(true);
      setStatus(outcome.note);
    } catch (e) {
      setWire(`recheck threw: ${errorText$1(e)}`);
      setStatus(`Your note is back exactly as you left it — the hub could not check it (${errorText$1(e)}). Read it and copy it; "I sent it" stays dead until it is checked.`);
    } finally {
      setRechecking(false);
    }
  };
  reactExports.useEffect(() => {
    let alive = true;
    void (async () => {
      let stored = null;
      try {
        stored = await loadDraftForActiveProfile();
      } catch {
        return;
      }
      if (!alive || !stored) return;
      const draft = stored;
      capturedRef.current = draft.profile;
      leadIdRef.current = null;
      templateKeyRef.current = draft.templateKey;
      const age = readSuggestion(
        { value: draft.profile.suggestedBracket, why: draft.profile.bracketWhy },
        LEAD_AGE_BRACKET,
        "unknown",
        AGE_ALIASES
      );
      const sex = readSuggestion(
        { value: draft.profile.suggestedGender, why: draft.profile.genderWhy },
        LEAD_GENDER,
        "unknown",
        GENDER_ALIASES
      );
      setProfile((current) => current ?? readProfile(draft.profile));
      setAgeSuggestion((current) => current ?? age);
      setGenderSuggestion((current) => current ?? sex);
      setBracket(draft.bracket);
      setGender(draft.gender);
      setAgeConfirmed(draft.ageConfirmed);
      setGenderConfirmed(draft.genderConfirmed);
      setName((current) => {
        var _a;
        return current || ((_a = draft.values) == null ? void 0 : _a.name) || draft.profile.firstName || draft.profile.fullName || "";
      });
      setCompany((current) => current || draft.company);
      setStandoutSkill((current) => current || draft.standoutSkill);
      setText((current) => current || draft.text);
      setSentAt(draft.sentAt);
      setGate(null);
      setChecked(false);
      const who = draft.profile.fullName ?? "this person";
      if (draft.sentAt) {
        setStatus(`Restored the note you already logged as sent to ${who}. It is here to read; it is not sent again.`);
        return;
      }
      setStatus(`Restored your note for ${who} — re-checking it with the hub before "I sent it" can be pressed.`);
      if (alive) await recheck(draft);
    })();
    return () => {
      alive = false;
    };
  }, []);
  const retrieve = (draft) => {
    var _a;
    ++draftSeq.current;
    capturedRef.current = draft.profile;
    leadIdRef.current = null;
    templateKeyRef.current = draft.templateKey;
    setProfile(readProfile(draft.profile));
    setAgeSuggestion(readSuggestion(
      { value: draft.profile.suggestedBracket, why: draft.profile.bracketWhy },
      LEAD_AGE_BRACKET,
      "unknown",
      AGE_ALIASES
    ));
    setGenderSuggestion(readSuggestion(
      { value: draft.profile.suggestedGender, why: draft.profile.genderWhy },
      LEAD_GENDER,
      "unknown",
      GENDER_ALIASES
    ));
    setBracket(draft.bracket);
    setGender(draft.gender);
    setAgeConfirmed(draft.ageConfirmed);
    setGenderConfirmed(draft.genderConfirmed);
    setName(((_a = draft.values) == null ? void 0 : _a.name) || draft.profile.firstName || draft.profile.fullName || "");
    setCompany(draft.company);
    setStandoutSkill(draft.standoutSkill);
    setText(draft.text);
    setSentAt(draft.sentAt);
    setGate(null);
    setChecked(false);
    if (draft.tone !== settings.tone) persist({ tone: draft.tone });
    const who = draft.profile.fullName ?? "that person";
    if (draft.sentAt) {
      setStatus(`Retrieved the note you already logged as sent to ${who}. It is here to read; it is not sent again.`);
      return;
    }
    setStatus(`Retrieved your note for ${who} — re-checking it with the hub before "I sent it" can be pressed.`);
    void recheck({
      bracket: draft.bracket,
      gender: draft.gender,
      tone: draft.tone,
      values: draft.values,
      text: draft.text,
      templateKey: draft.templateKey
    });
  };
  const read = async () => {
    setReading(true);
    setStatus(null);
    try {
      const captured = await captureActiveTabProfile();
      const person = readProfile(captured.profile);
      if (!person) {
        setStatus(captured.note || "That tab is not a LinkedIn profile, or the page gave nothing back. Nothing was read, and nothing was changed.");
        return;
      }
      const warning = captured.status !== "sent" ? captured.note : null;
      const source = captured.profile ?? {};
      const age = readSuggestion(
        { value: source.suggestedBracket, why: source.bracketWhy },
        LEAD_AGE_BRACKET,
        "unknown",
        AGE_ALIASES
      );
      const sex = readSuggestion(
        { value: source.suggestedGender, why: source.genderWhy },
        LEAD_GENDER,
        "unknown",
        GENDER_ALIASES
      );
      setName(fieldAfterRead(profile, name, person.linkedinUrl, person.firstName ?? person.fullName ?? null));
      setCompany(companyAfterRead(profile, company, person));
      setProfile(person);
      setAgeSuggestion(age);
      setGenderSuggestion(sex);
      setBracket(age.value);
      setGender(sex.value);
      setAgeConfirmed(false);
      setGenderConfirmed(false);
      setSentAt(null);
      setText("");
      setGate(null);
      setChecked(false);
      templateKeyRef.current = null;
      ++draftSeq.current;
      capturedRef.current = captured.profile ?? null;
      leadIdRef.current = null;
      void clearOutreachDraft(person.linkedinUrl);
      setStatus(`Read ${person.fullName ?? "this profile"}. The age bracket and gender below are guesses until you press them.` + (warning ? ` ${warning}` : ""));
    } catch (e) {
      setStatus(`Nothing was read — ${errorText$1(e)}.`);
    } finally {
      setReading(false);
    }
  };
  const persist = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    const { targetRole, ...rest } = patch;
    void setOutreachSettings({ ...rest, ...targetRole !== void 0 ? { lastTargetRole: targetRole } : {} }).catch((e) => setStatus(`Not remembered — ${errorText$1(e)}.`));
  };
  const addRole = async () => {
    const role = newRole.trim();
    if (!role) return;
    try {
      const answered = readSettings(await addTargetRole(role));
      const roles = answered.targetRoles.length ? answered.targetRoles : settings.targetRoles;
      setSettings({
        ...settings,
        targetRole: role,
        targetRoles: roles.includes(role) ? roles : [...roles, role]
      });
      setNewRole("");
      void setOutreachSettings({ lastTargetRole: role }).catch(() => void 0);
    } catch (e) {
      setStatus(`"${role}" was not remembered — ${errorText$1(e)}.`);
    }
  };
  const note = text2.trim() ? text2 : (gate == null ? void 0 : gate.text) ?? "";
  const runTighten = async () => {
    const subject = capturedRef.current;
    const ok = confirm(
      `Shorten this note with one model call?

This is the only thing on this screen that spends money — a fraction of a cent, once, now. It cuts ${note.length - MAX_NOTE_CHARS} characters or more, keeps your draft if it fails, and the result is checked exactly like a note you typed yourself.`
    );
    if (!ok) return;
    setTightening(true);
    setStatus(null);
    try {
      const raw = await tightenMessage(note, values);
      if (raw.status !== "sent" || !raw.result) {
        setStatus(`${raw.note} Your draft is exactly as you left it.`);
        return;
      }
      const result = readGate$1(raw, note);
      setText(result.text);
      setGate(result);
      setChecked(true);
      setStatus(`Tightened to ${result.chars} characters${result.costUsd != null ? ` · $${result.costUsd.toFixed(4)} spent` : ""}. Read it before you send it.`);
      if (subject) {
        void saveOutreachDraft({
          profile: subject,
          bracket,
          gender,
          ageConfirmed,
          genderConfirmed,
          company,
          standoutSkill,
          templateKey: templateKeyRef.current,
          tone: settings.tone,
          values,
          text: result.text,
          sentAt: null
        }).then(refreshRecents);
      }
    } catch (e) {
      setStatus(`Not tightened — ${errorText$1(e)}. Your draft is exactly as you left it.`);
    } finally {
      setTightening(false);
    }
  };
  const copy = async () => {
    if (!note.trim()) {
      setStatus("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(note);
      setStatus("Copied. Paste it into LinkedIn yourself.");
    } catch (e) {
      setStatus(`Not copied — ${errorText$1(e)}. Select the note above and copy it by hand.`);
    }
  };
  const busy = reading || drafting || tightening || sending;
  const generate_ = generateState({
    missing,
    ageConfirmed,
    genderConfirmed,
    hasTemplate,
    busy,
    text: note,
    // No textbox, so there is nothing of his to overwrite: regenerating replaces one template
    // fill with another. `generateState` keeps the flag for its own contract; the panel says no.
    edited: false
  });
  const blockers = sendBlockers({
    text: note,
    checked,
    reasons: (gate == null ? void 0 : gate.reasons) ?? [],
    linkedinUrl: (profile == null ? void 0 : profile.linkedinUrl) ?? "",
    busy,
    sentAt
  });
  const send = async () => {
    if (blockers.length > 0 || !profile) return;
    const ok = confirm(
      `Log this note to ${profile.fullName ?? "this person"} as sent?

This person is already in your outreach log — Generate message put them there. Pressing OK records the MESSAGE as sent, stamps the time, and is what has the hub look their email up. It asks LinkedIn nothing: nothing here reads, opens, clicks or sends anything on LinkedIn, and nothing checks whether the invitation really went. Press it only after you pressed Send in LinkedIn yourself.`
    );
    if (!ok) return;
    setSending(true);
    setStatus(null);
    try {
      const lead = await writeLead();
      const leadId = readLeadId(lead) ?? leadIdRef.current;
      if (!leadId) throw new Error("the hub saved no lead id back, so the message has nowhere to hang");
      const sent = await recordSent(leadId, {
        kind: "connection_note",
        templateKey: templateKeyRef.current,
        body: note,
        charCount: note.length
      });
      const latch = (when) => {
        if (capturedRef.current) {
          void saveOutreachDraft({
            profile: capturedRef.current,
            bracket,
            gender,
            ageConfirmed,
            genderConfirmed,
            company,
            standoutSkill,
            templateKey: templateKeyRef.current,
            tone: settings.tone,
            values,
            text: note,
            sentAt: when
          }).then(refreshRecents);
        }
      };
      if (sent.status === "sent") {
        {
          const when = (/* @__PURE__ */ new Date()).toISOString();
          setSentAt(when);
          latch(when);
        }
        setStatus("Logged as sent. The hub looks this person's email up once, by itself — nothing else happens.");
      } else if (sent.status === "queued") {
        {
          const when = (/* @__PURE__ */ new Date()).toISOString();
          setSentAt(when);
          latch(when);
        }
        setStatus(`${sent.note} The email lookup happens when the hub receives it, not before.`);
      } else {
        setStatus(`${sent.note} Nothing is logged for this person yet — press it again once that is fixed.`);
      }
    } catch (e) {
      setStatus(`Not logged — ${errorText$1(e)}. Nothing was written; press it again when the hub is up.`);
    } finally {
      setSending(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    OutreachForm,
    {
      profile,
      ageSuggestion,
      genderSuggestion,
      bracket,
      gender,
      ageConfirmed,
      genderConfirmed,
      values,
      targetRoles: settings.targetRoles,
      newRole,
      tone: settings.tone,
      note,
      gate,
      templateKey: templateKeyRef.current,
      hasTemplate,
      missing,
      blockers,
      tighten: tightenState(note.length, busy),
      generate: generate_,
      count: charCount(note),
      reading,
      drafting,
      tightening,
      sending,
      sentAt,
      status,
      wire,
      rechecking,
      checked,
      connection,
      connectionOpen: shouldOpen(connection, connClosed),
      recents,
      on: {
        read: () => {
          void read();
        },
        retrieve,
        setName,
        setCompany,
        chooseBracket: (next) => {
          setBracket(next);
          setAgeConfirmed(true);
        },
        chooseGender: (next) => {
          setGender(next);
          setGenderConfirmed(true);
        },
        setStandoutSkill,
        setTargetRole: (value) => persist({ targetRole: value }),
        setNewRole,
        addRole: () => {
          void addRole();
        },
        setSkillset: (value) => persist({ skillset: value }),
        setTone: (value) => persist({ tone: value }),
        generate: () => {
          if (generate_.enabled) void generate();
        },
        recheck: () => {
          void recheck({
            bracket,
            gender,
            tone: settings.tone,
            values,
            text: note,
            templateKey: templateKeyRef.current
          });
        },
        setConnectionOpen: (open) => setConnClosed(!open),
        setConnection,
        tighten: () => {
          void runTighten();
        },
        copy: () => {
          void copy();
        },
        send: () => {
          void send();
        }
      }
    }
  );
}
const LINKEDIN_HOST_RE = /(?:^|\.)linkedin\.com$/;
const URN_RE = /urn:li:(activity|ugcpost|share):(\d{6,25})/i;
const SLUG_URN_RE = /-(activity|ugcpost|share)-(\d{6,25})/i;
const UPDATE_PATH_RE = /^\/(?:embed\/)?feed\/update\//i;
const POSTS_PATH_RE = /^\/posts\//i;
function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function urnType(raw) {
  const kind = raw.toLowerCase();
  return kind === "ugcpost" ? "ugcPost" : kind === "share" ? "share" : "activity";
}
function urnIn(value) {
  const text2 = normText(value);
  if (!text2) return null;
  const direct = URN_RE.exec(text2);
  if (direct) return `urn:li:${urnType(direct[1])}:${direct[2]}`;
  const slug = SLUG_URN_RE.exec(text2);
  if (slug) return `urn:li:${urnType(slug[1])}:${slug[2]}`;
  return null;
}
function activityUrl(urn) {
  return `https://www.linkedin.com/feed/update/${urn}`;
}
function tidyUrl(raw) {
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const path = LINKEDIN_HOST_RE.test(host) ? parsed.pathname.toLowerCase() : parsed.pathname;
    return `${parsed.protocol}//${host}${path}`.replace(/\/+$/, "");
  } catch {
    return raw;
  }
}
function postUrlOf(url) {
  const raw = normText(url);
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(parsed.protocol)) return null;
  if (!LINKEDIN_HOST_RE.test(parsed.hostname.toLowerCase().replace(/\.$/, ""))) return null;
  const path = decodePath(parsed.pathname);
  const isUpdate = UPDATE_PATH_RE.test(path);
  const isPosts = POSTS_PATH_RE.test(path);
  if (!isUpdate && !isPosts) return null;
  const urn = urnIn(path) ?? urnIn(decodePath(parsed.search));
  if (urn) return activityUrl(urn);
  if (isPosts) {
    const tidyPath = path.replace(/\/+$/, "").toLowerCase();
    return tidyPath.length > "/posts/".length ? `https://www.linkedin.com${tidyPath}` : null;
  }
  return null;
}
function clean(value, max = 300) {
  const text2 = normText(value).replace(/^[•·]\s*/, "").trim();
  return text2.length > 0 && text2.length <= max ? text2 : null;
}
function qsa(root, selector) {
  if (!root) return [];
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}
function firstIn(root, selectors) {
  for (const selector of selectors) {
    const els = qsa(root, selector);
    if (els.length) return els[0];
  }
  return null;
}
const HIDDEN_EXCLUDE = [".visually-hidden", ".sr-only", "script", "style", "svg"];
function visibleLines(el) {
  if (!el) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (raw) => {
    const text2 = clean(raw, 400);
    if (!text2) return;
    const key = text2.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text2);
  };
  const spans = qsa(el, 'span[aria-hidden="true"]');
  const outer = spans.filter((span) => !spans.some((other) => other !== span && other.contains(span)));
  for (const span of outer) push(blockText(span));
  if (out.length) return out;
  for (const line of blockTextExcluding(el, HIDDEN_EXCLUDE).split("\n")) push(line);
  return out;
}
function visibleLine(el, max = 300) {
  const lines = visibleLines(el);
  return lines.length ? clean(lines[0], max) : null;
}
function meta(doc, property, max) {
  const el = doc.querySelector(`meta[property="${property}"]`) ?? doc.querySelector(`meta[name="${property}"]`);
  return clean(el == null ? void 0 : el.getAttribute("content"), max);
}
const ROOT_HINTS = [
  ".feed-shared-update-v2",
  '[class*="feed-shared-update-v2"]',
  ".occludable-update",
  "[data-urn]",
  "[data-id]",
  "[data-activity-urn]",
  "article.main-feed-activity-card",
  ".main-feed-activity-card",
  '[data-test-id="main-feed-activity-card"]',
  '[class*="activity-card"]',
  '[class*="share-update-card"]',
  "article"
];
const CARD_PROOF = [
  '[class*="update-components-text"]',
  '[class*="commentary"]',
  '[class*="update-components-actor"]',
  '[class*="feed-shared-actor"]',
  '[class*="entity-lockup"]',
  '[class*="attributed-text-segment-list"]'
];
const URN_ATTRS = ["data-urn", "data-id", "data-activity-urn", "data-entity-urn"];
function urnAttr(el) {
  for (const name of URN_ATTRS) {
    const urn = urnIn(el.getAttribute(name));
    if (urn) return urn;
  }
  return null;
}
const COMMENT_SUBTREES = [
  ".comments-comments-list",
  '[class*="comments-comment-item"]',
  '[class*="comments-comment-entity"]',
  '[class*="comments-list"]',
  '[class*="comment-item"]',
  '[data-test-id="comments-list"]',
  ".comments-container"
];
function cardOf(doc, wantedUrn) {
  for (const hint of ROOT_HINTS) {
    const cards = qsa(doc, hint).filter((el) => urnAttr(el) !== null || firstIn(el, CARD_PROOF) !== null);
    if (!cards.length) continue;
    const named = wantedUrn ? cards.find((el) => urnAttr(el) === wantedUrn) : void 0;
    const outer = cards.filter((el) => !cards.some((other) => other !== el && other.contains(el)));
    const chosen = named ?? outer[0] ?? cards[0];
    return { el: strip(chosen), certain: true };
  }
  if (wantedUrn) {
    const main = doc.querySelector("main") ?? doc.body;
    return { el: main ? strip(main) : null, certain: false };
  }
  return { el: null, certain: false };
}
function strip(el) {
  const clone = el.cloneNode(true);
  for (const selector of COMMENT_SUBTREES) {
    for (const junk of qsa(clone, selector)) junk.remove();
  }
  return clone;
}
const ACTOR_HINTS = [
  ".update-components-actor__meta",
  ".update-components-actor",
  '[class*="update-components-actor"]',
  ".feed-shared-actor",
  '[class*="feed-shared-actor"]',
  '[data-test-id="main-feed-activity-card__entity-lockup"]',
  ".main-feed-activity-card__entity-lockup",
  '[class*="entity-lockup"]',
  "header"
];
const NAME_HINTS = [
  ".update-components-actor__title",
  '[class*="update-components-actor__title"]',
  ".feed-shared-actor__name",
  '[class*="actor__name"]',
  '[data-test-id="actor-name"]',
  'a[href*="/in/"]',
  'a[href*="/company/"]'
];
const HEADLINE_HINTS = [
  ".update-components-actor__description",
  '[class*="update-components-actor__description"]',
  ".feed-shared-actor__description",
  '[class*="actor__description"]',
  '[data-test-id="actor-description"]'
];
const GENERIC_NAME_HINTS = ["h1", "h2", "h3"];
const GENERIC_HEADLINE_HINTS = ["h4", "p"];
const AGE_HINTS = [
  ".update-components-actor__sub-description",
  '[class*="actor__sub-description"]',
  '[class*="sub-description"]',
  "time",
  '[data-test-id="main-feed-activity-card__entity-lockup"] time'
];
const AUTHOR_PATH_RE = /^\/(?:in|company|school|showcase|newsletters)\/[^/]+/i;
const ACTOR_NOISE_RE = new RegExp([
  "^\\d[\\d,.]*\\s*[kmb]?\\s*(followers?|connections?|reactions?|comments?|reposts?)$",
  "^\\d+(st|nd|rd|th)\\+?(\\s*degree)?(\\s*connection)?$",
  "^(promoted|suggested|following|follow|connect|message|more|like|comment|repost|send|see more|…see more)$",
  "^(view|see|show)\\b.*",
  "^linkedin$",
  "^\\+\\s*follow$",
  "^edited$"
].join("|"), "i");
const AGE_SHORT_RE = /^\d+\s?(?:mos|mo|mins|min|hrs|hr|secs|sec|s|m|h|d|w|y)$/i;
const AGE_LONG_RE = /^(?:an?|\d+)\s+(?:second|minute|hour|day|week|month|year)s?\s+ago$/i;
const AGE_NOW_RE = /^(?:now|just now|today|yesterday)$/i;
function parseAge(raw) {
  const text2 = clean(raw, 120);
  if (!text2) return null;
  for (const piece of text2.split(/\s*[•·|]\s*/)) {
    const part = piece.replace(/^(?:posted|reposted)\s+/i, "").replace(/\s*\(edited\)\s*$/i, "").trim();
    if (!part) continue;
    if (AGE_SHORT_RE.test(part) || AGE_LONG_RE.test(part) || AGE_NOW_RE.test(part)) return part;
  }
  return null;
}
function authorLink(scope) {
  for (const anchor of qsa(scope, "a[href]")) {
    const href = normText(anchor.getAttribute("href"));
    if (!href) continue;
    let parsed;
    try {
      parsed = new URL(href, "https://www.linkedin.com/");
    } catch {
      continue;
    }
    if (!LINKEDIN_HOST_RE.test(parsed.hostname.toLowerCase().replace(/\.$/, ""))) continue;
    const match = AUTHOR_PATH_RE.exec(decodePath(parsed.pathname));
    if (!match) continue;
    return `https://www.linkedin.com${match[0].toLowerCase().replace(/\/+$/, "")}`;
  }
  return null;
}
const BODY_HINTS = [
  ".feed-shared-update-v2__commentary",
  '[class*="feed-shared-update-v2__commentary"]',
  ".update-components-text",
  '[class*="update-components-text"]',
  '[class*="feed-shared-inline-show-more-text"]',
  '[data-test-id="main-feed-activity-card__commentary"]',
  ".main-feed-activity-card__commentary",
  '[class*="attributed-text-segment-list__content"]',
  '[class*="share-update-card__update-text"]',
  '[class*="commentary"]'
];
const BODY_EXCLUDE = [
  ...HIDDEN_EXCLUDE,
  "button",
  '[role="button"]',
  '[class*="see-more-less-toggle"]',
  '[class*="see-more"]',
  '[class*="see-less"]',
  '[class*="inline-show-more-text__button"]',
  '[class*="update-components-image"]',
  '[class*="update-components-linkedin-video"]'
];
const SEE_MORE_HINTS = [
  'button[class*="see-more"]',
  'button[class*="show-more"]',
  '[class*="see-more-less-toggle"]',
  '[class*="inline-show-more-text__button"]',
  'a[class*="see-more"]',
  '[role="button"][class*="see-more"]',
  '[data-test-id*="see-more"]'
];
const SEE_MORE_TEXT_RE = /^\s*(?:…|\.\.\.)?\s*(?:see|show|read)\s+more\s*$/i;
const SEE_MORE_TAIL_RE = /\s*(?:…|\.\.\.)?\s*(?:see|show|read)\s+more\s*$/i;
const CLAMP_MIN = 180;
const BODY_MAX = 6e3;
function endsClosed(text2) {
  return /[.!?”’"')\]:;]$/.test(text2) || new RegExp("\\p{Extended_Pictographic}$", "u").test(text2);
}
function endsUnfinished(text2) {
  const whole = text2.trimEnd();
  if (/(?:…|\.\.\.)$/.test(whole)) return true;
  const tail = whole.replace(/(?:\s*[#@][\wÀ-ɏ-]+)+$/, "").trimEnd();
  if (!tail) return false;
  return !endsClosed(tail);
}
function hasSeeMore(body, card) {
  let scope = body;
  for (let depth = 0; depth < 3 && scope; depth++) {
    if (firstIn(scope, SEE_MORE_HINTS)) return true;
    for (const el of qsa(scope, "button, span, a, div")) {
      if (SEE_MORE_TEXT_RE.test(normText(blockText(el)))) return true;
    }
    if (scope === card) break;
    scope = scope.parentElement;
  }
  return false;
}
const MEDIA_HINTS = [
  '[class*="update-components-image"]',
  '[class*="update-components-linkedin-video"]',
  '[class*="update-components-video"]',
  '[class*="update-components-document"]',
  '[class*="feed-shared-image"]',
  '[class*="feed-shared-video"]',
  '[class*="feed-shared-linkedin-video"]',
  '[class*="feed-shared-document"]',
  '[class*="feed-shared-carousel"]',
  '[class*="feed-images-content"]',
  '[data-test-id="feed-images-content"]',
  '[class*="main-feed-activity-card__feed-image"]',
  "video",
  "figure img"
];
const NOT_MEDIA_CONTEXT = [
  '[class*="actor"]',
  '[class*="avatar"]',
  '[class*="EntityPhoto"]',
  '[class*="entity-photo"]',
  '[class*="presence"]',
  '[class*="social-details"]',
  '[class*="social-action"]',
  '[class*="reaction"]',
  '[class*="comment"]',
  '[class*="icon"]',
  '[class*="article"]',
  '[class*="lockup"]',
  "header",
  "nav",
  "footer",
  "button",
  "a"
].join(", ");
function hasMedia(card) {
  if (firstIn(card, MEDIA_HINTS)) return true;
  for (const img of qsa(card, "img")) {
    let furniture = false;
    try {
      furniture = img.closest(NOT_MEDIA_CONTEXT) !== null;
    } catch {
      furniture = true;
    }
    if (!furniture) return true;
  }
  return false;
}
function substance(text2) {
  if (!text2) return 0;
  return text2.replace(/https?:\/\/\S+/g, " ").replace(/[#@][\wÀ-ɏ-]+/g, " ").replace(/\s+/g, " ").trim().length;
}
const IMAGE_ONLY_MAX = 160;
const COUNTS_HINTS = [
  ".social-details-social-counts",
  '[class*="social-details-social-counts"]',
  '[class*="social-counts"]',
  '[data-test-id="social-actions"]',
  '[class*="social-actions"]',
  '[class*="social-action"]'
];
const REACTION_HINTS = [
  ".social-details-social-counts__reactions-count",
  '[class*="reactions-count"]',
  '[class*="reaction-count"]',
  '[data-test-id="social-actions__reaction-count"]'
];
const COMMENT_COUNT_HINTS = [
  '[data-test-id="social-actions__comment-count"]',
  '[class*="comments-count"]',
  '[class*="comment-count"]'
];
const REPOST_HINTS = [
  '[data-test-id="social-actions__repost-count"]',
  '[class*="reposts-count"]',
  '[class*="repost-count"]'
];
const REACTION_WORD = "reactions?|likes?";
const COMMENT_WORD = "comments?";
const REPOST_WORD = "reposts?|shares?";
const COUNT_TOKEN = "\\d[\\d.,]*\\s*[KMB]?";
const COUNT_LEAD = "(?:(?:view|see|show)\\s+(?:all\\s+)?)?";
function parseCount(raw) {
  const text2 = normText(raw).replace(/\s+/g, "");
  if (!text2) return null;
  const m = /^(\d[\d.,]*)([KMB])?$/i.exec(text2);
  if (!m) return null;
  const body = m[1];
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix) {
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(body)) return null;
    const value = Number(body.replace(",", "."));
    if (!Number.isFinite(value)) return null;
    return Math.round(value * (suffix === "K" ? 1e3 : suffix === "M" ? 1e6 : 1e9));
  }
  if (/^\d+$/.test(body)) return Number(body);
  if (/^\d{1,3}(?:,\d{3})+$/.test(body)) return Number(body.replace(/,/g, ""));
  if (/^\d{1,3}(?:\.\d{3})+$/.test(body)) return Number(body.replace(/\./g, ""));
  return null;
}
function countStated(text2, word) {
  const line = clean(text2, 200);
  if (!line) return null;
  const before = new RegExp(`^\\s*${COUNT_LEAD}(${COUNT_TOKEN})\\s+(?:${word})\\b`, "i");
  const after = new RegExp(`^\\s*(?:${word})\\b\\s*[:\\-]?\\s*(${COUNT_TOKEN})\\s*$`, "i");
  const m = before.exec(line) ?? after.exec(line);
  return m ? parseCount(m[1]) : null;
}
function countIn(scope, bareHints, word, attr) {
  if (!scope) return null;
  for (const el of qsa(scope, `[${attr}]`)) {
    const value = parseCount(el.getAttribute(attr));
    if (value !== null) return value;
  }
  for (const el of qsa(scope, bareHints.join(", "))) {
    const label = countStated(el.getAttribute("aria-label"), word);
    if (label !== null) return label;
    const line = visibleLine(el, 200);
    const stated = countStated(line, word);
    if (stated !== null) return stated;
    const bare = parseCount(line);
    if (bare !== null) return bare;
  }
  for (const el of qsa(scope, "[aria-label]")) {
    const label = countStated(el.getAttribute("aria-label"), word);
    if (label !== null) return label;
  }
  for (const line of blockTextExcluding(scope, HIDDEN_EXCLUDE).split("\n")) {
    const stated = countStated(line, word);
    if (stated !== null) return stated;
  }
  return null;
}
const NOTHING = {
  author: null,
  authorHeadline: null,
  authorUrl: null,
  text: null,
  postedAgo: null,
  reactions: null,
  comments: null,
  reposts: null,
  isImageOnly: false,
  // Nothing was read, so nothing can be called whole.
  truncated: true
};
function parseLinkedInPost(doc, url) {
  var _a, _b;
  const tab = normText(url);
  if (!doc || typeof doc.querySelector !== "function") return { url: tab, ...NOTHING };
  const canonicalTab = postUrlOf(tab);
  const wantedUrn = canonicalTab ? urnIn(canonicalTab) : null;
  const { el: card, certain } = cardOf(doc, wantedUrn);
  const statedUrl = postUrlOf(((_a = doc.querySelector('link[rel="canonical"]')) == null ? void 0 : _a.getAttribute("href")) ?? "") ?? postUrlOf(meta(doc, "og:url", 600) ?? "");
  const cardUrn = card ? urnAttr(card) : null;
  const post = {
    url: canonicalTab ?? (cardUrn ? activityUrl(cardUrn) : null) ?? statedUrl ?? (tab ? tidyUrl(tab) : ""),
    ...NOTHING
  };
  if (!card) return post;
  const actorEl = firstIn(card, ACTOR_HINTS);
  const actor = actorEl ?? card;
  const nameHints = actorEl ? [...NAME_HINTS, ...GENERIC_NAME_HINTS] : NAME_HINTS;
  const nameEl = firstIn(actor, nameHints);
  const name = visibleLine(nameEl, 120);
  post.author = name && !ACTOR_NOISE_RE.test(name) ? name : null;
  post.authorUrl = authorLink(actor) ?? authorLink(card);
  const nameKey = (post.author ?? "").toLowerCase();
  const headlineHints = actorEl ? [...HEADLINE_HINTS, ...GENERIC_HEADLINE_HINTS] : HEADLINE_HINTS;
  for (const hint of headlineHints) {
    for (const el of qsa(actor, hint)) {
      const line = visibleLine(el, 260);
      if (!line || line.toLowerCase() === nameKey) continue;
      if (ACTOR_NOISE_RE.test(line) || parseAge(line)) continue;
      post.authorHeadline = line;
      break;
    }
    if (post.authorHeadline) break;
  }
  for (const hint of AGE_HINTS) {
    for (const el of qsa(actor, hint)) {
      const age = parseAge(visibleLine(el, 120));
      if (age) {
        post.postedAgo = age;
        break;
      }
    }
    if (post.postedAgo) break;
  }
  if (!post.postedAgo) {
    for (const line of visibleLines(actor)) {
      const age = parseAge(line);
      if (age) {
        post.postedAgo = age;
        break;
      }
    }
  }
  if (!post.author) {
    const title = meta(doc, "og:title", 400) ?? clean((_b = doc.querySelector("title")) == null ? void 0 : _b.textContent, 400);
    const m = title ? /^(.{2,80}?)\s+on\s+LinkedIn\b/i.exec(title) : null;
    post.author = m ? clean(m[1], 120) : null;
  }
  let truncated = !certain;
  const bodyEl = firstIn(card, BODY_HINTS);
  if (bodyEl) {
    if (hasSeeMore(bodyEl, card)) truncated = true;
    let body = blockTextExcluding(bodyEl, BODY_EXCLUDE).trim();
    if (SEE_MORE_TAIL_RE.test(body)) {
      body = body.replace(SEE_MORE_TAIL_RE, "").trim();
      truncated = true;
    }
    if (body.length > BODY_MAX) {
      body = body.slice(0, BODY_MAX).trim();
      truncated = true;
    }
    post.text = body.length > 0 ? body : null;
  }
  if (!post.text) {
    const described = meta(doc, "og:description", 4e3);
    if (described) {
      post.text = described.replace(SEE_MORE_TAIL_RE, "").trim() || null;
      truncated = true;
    }
  }
  if (!post.text) truncated = true;
  else if (post.text.length >= CLAMP_MIN && endsUnfinished(post.text)) truncated = true;
  post.truncated = truncated;
  post.isImageOnly = hasMedia(card) && substance(post.text) <= IMAGE_ONLY_MAX;
  const counts = firstIn(card, COUNTS_HINTS);
  post.reactions = countIn(counts, REACTION_HINTS, REACTION_WORD, "data-num-reactions");
  post.comments = countIn(counts, COMMENT_COUNT_HINTS, COMMENT_WORD, "data-num-comments");
  post.reposts = countIn(counts, REPOST_HINTS, REPOST_WORD, "data-num-reposts");
  return post;
}
const COMMENT_SETTINGS_KEY = "flashfiller_comments_v1";
const DEFAULT_SETTINGS = { lastTake: "" };
function asSettings(raw) {
  return { lastTake: typeof (raw == null ? void 0 : raw.lastTake) === "string" ? raw.lastTake : "" };
}
async function getCommentSettings() {
  try {
    const result = await chrome.storage.local.get(COMMENT_SETTINGS_KEY);
    return asSettings(result[COMMENT_SETTINGS_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
async function setCommentSettings(patch) {
  const current = await getCommentSettings();
  const next = asSettings({ ...current, ...patch });
  try {
    await chrome.storage.local.set({ [COMMENT_SETTINGS_KEY]: next });
    return { status: "sent", note: "Saved.", settings: next };
  } catch (e) {
    return { status: "error", note: `Not saved — ${e instanceof Error ? e.message : String(e)}`, settings: current };
  }
}
function rememberTake(take) {
  return setCommentSettings({ lastTake: take });
}
const POST_MIRROR_MIN_WORDS = 25;
const TEXT_MAX = 12e3;
const FEED_URN = /\/feed\/update\/(urn:li:(?:activity|share|ugcPost):(\d+))/i;
const POST_ACTIVITY = /\/posts\/[^/?#]*?-activity-(\d+)(?:-|\/|$)/i;
const POST_SLUG = /^\/posts\/([^/?#]+)/i;
const PROFILE_PATH = /^\/in\/([^/?#]+)/i;
function isLinkedInHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}
function decodedPath(parsed) {
  try {
    return decodeURIComponent(parsed.pathname);
  } catch {
    return parsed.pathname;
  }
}
function postUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(parsed.protocol) || !isLinkedInHost(parsed.hostname)) return null;
  const path = decodedPath(parsed);
  const feed = FEED_URN.exec(path);
  if (feed) return { canonical: `https://www.linkedin.com/feed/update/${feed[1].toLowerCase().replace("urn:li:ugcpost:", "urn:li:ugcPost:")}`, activityId: feed[2] };
  const activity = POST_ACTIVITY.exec(path);
  if (activity) return { canonical: `https://www.linkedin.com/feed/update/urn:li:activity:${activity[1]}`, activityId: activity[1] };
  const slug = POST_SLUG.exec(path);
  if (slug) {
    const clean2 = slug[1].trim().toLowerCase();
    if (clean2) return { canonical: `https://www.linkedin.com/posts/${clean2}`, activityId: null };
  }
  return null;
}
function authorProfileUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url, "https://www.linkedin.com");
  } catch {
    return null;
  }
  if (!isLinkedInHost(parsed.hostname)) return null;
  const match = PROFILE_PATH.exec(decodedPath(parsed));
  if (!match) return null;
  let slug;
  try {
    slug = decodeURIComponent(match[1]).trim().toLowerCase();
  } catch {
    slug = match[1].trim().toLowerCase();
  }
  return slug ? `https://www.linkedin.com/in/${slug}` : null;
}
const WORD = /[A-Za-z][A-Za-z'’-]*/g;
function countWords$1(text2) {
  var _a;
  return ((_a = (text2 ?? "").match(WORD)) == null ? void 0 : _a.length) ?? 0;
}
function text(value, max = TEXT_MAX) {
  if (typeof value !== "string") return null;
  const clean2 = value.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  if (!clean2) return null;
  return clean2.length <= max ? clean2 : clean2.slice(0, max).trim();
}
function metaOf(doc, property) {
  const el = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  return text(el == null ? void 0 : el.getAttribute("content"), TEXT_MAX);
}
function findPosting(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  const obj = node;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
  if (types.some((t) => /Posting$|^Article$|^SocialMediaPosting$|^DiscussionForumPosting$/.test(t))) return obj;
  if (obj["@graph"]) return findPosting(obj["@graph"]);
  return null;
}
function splitPostTitle(title) {
  if (!title) return { author: null, text: null };
  const stripped = title.replace(/^\(\d+\)\s*/, "").replace(/\s*\|\s*\d+\s+comments?\s*$/i, "").replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  if (!stripped || /^linkedin$/i.test(stripped)) return { author: null, text: null };
  const split = /^(.{2,80}?)\s+on\s+LinkedIn:\s*(.+)$/is.exec(stripped);
  if (split) return { author: text(split[1], 120), text: text(split[2]) };
  return { author: null, text: text(stripped) };
}
function containerText(el) {
  const clone = el.cloneNode(true);
  for (const junk of Array.from(clone.querySelectorAll('nav, aside, header, footer, button, form, [role="button"], [role="navigation"]'))) junk.remove();
  return text(clone.textContent);
}
function readPostDocument(doc, url) {
  var _a, _b;
  const layers = {};
  let posting = null;
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      posting = findPosting(JSON.parse(script.textContent ?? ""));
    } catch {
      continue;
    }
    if (posting) break;
  }
  const pageTitle = text(doc.title, 600) ?? metaOf(doc, "og:title");
  const titleParts = splitPostTitle(pageTitle);
  const author = posting == null ? void 0 : posting.author;
  let fromPage = null;
  try {
    const candidates = Array.from(doc.querySelectorAll('[data-urn*="urn:li:activity"], [data-id*="urn:li:activity"], [data-urn*="urn:li:share"], article'));
    for (const el of candidates) {
      const block = containerText(el);
      if (block && block.length > ((fromPage == null ? void 0 : fromPage.length) ?? 0)) fromPage = block;
    }
  } catch {
  }
  const put = (field, candidates) => {
    for (const [value, layer] of candidates) {
      if (value !== null && value !== void 0 && value !== "") {
        layers[field] = layer;
        return value;
      }
    }
    return null;
  };
  const body = put("text", [
    [text((posting == null ? void 0 : posting.articleBody) ?? (posting == null ? void 0 : posting.text) ?? (posting == null ? void 0 : posting.description)), "jsonld"],
    [fromPage, "page"],
    [metaOf(doc, "og:description"), "meta"],
    [titleParts.text, "title"]
  ]);
  const who = put("author", [
    [typeof author === "string" ? text(author, 120) : text(author == null ? void 0 : author.name, 120), "jsonld"],
    [titleParts.author, "title"],
    [metaOf(doc, "article:author"), "meta"]
  ]);
  const whoUrl = put("authorUrl", [
    [typeof author === "object" && author ? authorProfileUrl(author.url) ?? authorProfileUrl(author.sameAs) : null, "jsonld"],
    [authorProfileUrl((_a = doc.querySelector('a[href*="/in/"]')) == null ? void 0 : _a.getAttribute("href")), "page"]
  ]);
  let hasImage = false;
  try {
    hasImage = !!doc.querySelector('[data-urn*="urn:li:activity"] img, article img, [data-test-id*="image"]');
  } catch {
    hasImage = false;
  }
  return {
    activityId: ((_b = postUrl(url)) == null ? void 0 : _b.activityId) ?? null,
    author: who,
    authorUrl: whoUrl,
    text: body,
    hasImage,
    layers
  };
}
function toPost(partial, canonical, url) {
  var _a;
  const p = partial ?? {};
  const body = p.text ?? null;
  const words = countWords$1(body);
  const hasImage = p.hasImage === true;
  const thin = words < POST_MIRROR_MIN_WORDS;
  return {
    postUrl: canonical,
    activityId: p.activityId ?? ((_a = postUrl(url)) == null ? void 0 : _a.activityId) ?? null,
    author: p.author ?? null,
    authorUrl: p.authorUrl ?? null,
    text: body,
    words,
    thin,
    // The vision path is deferred, so the honest answer to a picture is a sentence and a text box —
    // never a guess at what the picture said, and never a comment drafted on nothing.
    thinWhy: !thin ? null : hasImage ? `This post is mostly a picture or a video — reading images is not built yet, so paste or type what it says (the page gave ${words} word${words === 1 ? "" : "s"} of text).` : `The page gave only ${words} word${words === 1 ? "" : "s"} of post text — too little to mirror. Scroll the post open and press this again, or paste the text in.`,
    hasImage,
    layers: p.layers ?? {}
  };
}
function readPostWithAdapter(doc, url) {
  const base = readPostDocument(doc, url);
  try {
    const read = parseLinkedInPost(doc, url);
    const text2 = read.text ?? base.text ?? null;
    const layers = { ...base.layers ?? {} };
    for (const [field, value] of Object.entries({ author: read.author, authorUrl: read.authorUrl, text: text2 })) {
      if (value) layers[field] = "adapter";
    }
    return {
      ...base,
      postUrl: postUrlOf(url) ?? base.postUrl,
      author: read.author ?? base.author ?? null,
      authorUrl: read.authorUrl ?? base.authorUrl ?? null,
      text: text2,
      words: countWords$1(text2),
      // The adapter's verdict wins where it has one: it saw the markup, this module saw the metadata.
      thin: read.truncated || read.isImageOnly || base.thin,
      hasImage: read.isImageOnly || Boolean(base.hasImage),
      layers
    };
  } catch {
    return base;
  }
}
async function captureActiveTabPost(parse = readPostWithAdapter) {
  const wanted = "open the post itself — its linkedin.com/posts/… or linkedin.com/feed/update/… page — and press this again.";
  let url = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    url = typeof (tab == null ? void 0 : tab.url) === "string" ? tab.url : null;
    if (!(tab == null ? void 0 : tab.id) || !url) {
      return { status: "error", post: null, pageTitle: null, url, note: `No page open — ${wanted}` };
    }
    const target = postUrl(url);
    if (!target) {
      let where = url;
      try {
        const parsed2 = new URL(url);
        where = parsed2.hostname + parsed2.pathname;
      } catch {
      }
      return {
        status: "error",
        post: null,
        pageTitle: null,
        url,
        note: `That tab is ${where} — this reads one LinkedIn post, so ${wanted}`
      };
    }
    const injections = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabPage });
    const page = injections.map((i) => i.result).find((p) => !!p && typeof p.html === "string" && p.html.length > 0);
    if (!(page == null ? void 0 : page.html)) {
      return { status: "error", post: null, pageTitle: null, url, note: "Could not read that page — reload the post and press this again." };
    }
    const pageTitle = typeof page.title === "string" && page.title ? page.title : null;
    const doc = new DOMParser().parseFromString(page.html, "text/html");
    const read = page.url ?? url;
    let parsed = null;
    try {
      parsed = parse(doc, read);
    } catch (e) {
      const fallback = toPost(readPostDocument(doc, read), target.canonical, read);
      return {
        status: "error",
        post: fallback,
        pageTitle,
        url,
        note: `The post adapter failed (${e instanceof Error ? e.message : String(e)}) — only the page’s own structured data was read. Check the post text before drafting.`
      };
    }
    const post = toPost(parsed, target.canonical, read);
    if (post.thin) {
      return { status: "sent", post, pageTitle, url, note: post.thinWhy ?? "The page gave very little post text — paste or type it in." };
    }
    return {
      status: "sent",
      post,
      pageTitle,
      url,
      note: `Read ${post.words} words${post.author ? ` from ${post.author}` : ""}.`
    };
  } catch (e) {
    return { status: "error", post: null, pageTitle: null, url, note: `Could not read the page — ${e instanceof Error ? e.message : String(e)}` };
  }
}
async function call(path, init = {}) {
  let response;
  try {
    const { baseUrl, token } = await getTailorConfig();
    assertAllowedTailorUrl(baseUrl);
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...token ? { "X-Tailor-Token": token } : {}, ...init.headers ?? {} }
    });
  } catch {
    return { ok: false, note: "The hub is not running — start it with `make serve` and try again." };
  }
  if (response.status === 401) {
    return { ok: false, note: "The hub rejected the token — set it in the Tailor tab." };
  }
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, note: `The hub answered with something that is not JSON (HTTP ${response.status}).` };
    }
  }
  if (!response.ok) {
    const message = payload == null ? void 0 : payload.error;
    return { ok: false, note: message ?? `The hub answered HTTP ${response.status}.` };
  }
  return { ok: true, body: payload };
}
function reasonsOf(body) {
  return Array.isArray(body == null ? void 0 : body.reasons) ? body.reasons : [];
}
function verdict(reasons, ready) {
  return reasons.length === 0 ? ready : `Not ready: ${reasons.map((r) => r.fix).join("; ")}.`;
}
async function checkComment(request2) {
  var _a, _b, _c, _d;
  const body = { text: request2.text ?? "", take: request2.take ?? "", postText: request2.postText ?? "" };
  const res = await call("/comments/check", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) return { status: "error", note: `Not checked — ${res.note}`, check: null };
  const check = res.body;
  if (!check || typeof check.ok !== "boolean") {
    return { status: "error", note: "The hub answered without a verdict.", check: null };
  }
  const reasons = reasonsOf(check);
  return {
    status: "sent",
    check: { ...check, reasons },
    note: verdict(reasons, `Ready — ${check.chars} characters, ${((_b = (_a = check.register) == null ? void 0 : _a.comment) == null ? void 0 : _b.level) ?? "unmeasured"} against a ${((_d = (_c = check.register) == null ? void 0 : _c.post) == null ? void 0 : _d.level) ?? "unmeasured"} post.`)
  };
}
async function draftComment(request2) {
  var _a, _b, _c, _d;
  if (!(request2.take ?? "").trim()) {
    return { status: "error", note: "Write your take first — the comment is your view, not the model’s.", draft: null };
  }
  const body = { postText: request2.postText ?? "", take: request2.take };
  if (request2.author) body.author = request2.author;
  const res = await call("/comments/draft", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    return { status: "error", note: `Not drafted, nothing was written — ${res.note}`, draft: null };
  }
  const draft = res.body;
  if (!draft || typeof draft.text !== "string" || !draft.text.trim()) {
    return { status: "error", note: "The model returned nothing — nothing was drafted.", draft: null };
  }
  const reasons = reasonsOf(draft);
  const spend = typeof draft.costUsd === "number" ? `$${draft.costUsd}` : "cost unreported";
  return {
    status: "sent",
    draft: { ...draft, reasons },
    note: verdict(reasons, `Drafted — ${draft.chars} characters, ${((_b = (_a = draft.register) == null ? void 0 : _a.comment) == null ? void 0 : _b.level) ?? "unmeasured"} against a ${((_d = (_c = draft.register) == null ? void 0 : _c.post) == null ? void 0 : _d.level) ?? "unmeasured"} post (${spend}).`)
  };
}
const COMMENT_ROWS_KEY = "flashfiller_comment_rows_v1";
const LOCAL_COMMENT_PREFIX = "local:";
function isLocalCommentKey(key) {
  return key.startsWith(LOCAL_COMMENT_PREFIX);
}
function mintLocalKey() {
  var _a, _b;
  const rand = ((_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${LOCAL_COMMENT_PREFIX}${rand}`;
}
function isRecord(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw;
  return typeof r.postUrl === "string" && typeof r.updatedAt === "number";
}
function withKey(entry, storedUnder) {
  return {
    ...entry,
    key: typeof entry.key === "string" && entry.key ? entry.key : storedUnder,
    postText: typeof entry.postText === "string" ? entry.postText : ""
  };
}
async function readEnvelope$1() {
  try {
    const result = await chrome.storage.local.get(COMMENT_ROWS_KEY);
    const raw = result[COMMENT_ROWS_KEY];
    const byPost = {};
    for (const [k, v] of Object.entries((raw == null ? void 0 : raw.byPost) ?? {})) if (isRecord(v)) byPost[k] = withKey(v, k);
    return { schemaVersion: 1, byPost };
  } catch {
    return { schemaVersion: 1, byPost: {} };
  }
}
async function writeEnvelope(env) {
  try {
    await chrome.storage.local.set({ [COMMENT_ROWS_KEY]: env });
  } catch {
  }
}
async function loadComments() {
  const env = await readEnvelope$1();
  return Object.values(env.byPost).sort((a, b) => b.updatedAt - a.updatedAt);
}
const COMMENT_COLUMNS = new Set(ENTITY_COLUMNS.comments);
function columnsKnown(draft, allowed) {
  const row = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value === null || value === void 0 || value === "") continue;
    if (!allowed.has(key)) continue;
    row[key] = value;
  }
  return row;
}
let writeChain = Promise.resolve();
function enqueue(work) {
  const run = writeChain.then(work, work);
  writeChain = run.then(() => void 0, () => void 0);
  return run;
}
async function settle(ref) {
  var _a;
  const report = await flushHubOutbox();
  const stored = (_a = report.rows) == null ? void 0 : _a[ref];
  if (stored) return { status: "sent", row: stored, note: "" };
  const died = (await getHubDeadLetters()).find((d) => d.ref === ref);
  if (died) return { status: "dead", row: null, note: died.lastError ?? `HTTP ${died.status}` };
  if ((await getHubOutbox()).some((e) => e.ref === ref)) return { status: "queued", row: null, note: report.reason ?? "not sent yet" };
  return { status: "error", row: null, note: "the hub gave no answer for this write" };
}
async function remoteId(canonical) {
  try {
    const rows = await hubQuery("comments", {
      post_url: `eq.${canonical}`,
      order: "created_at.desc",
      limit: "1",
      select: "id"
    });
    const row = Array.isArray(rows) ? rows[0] : void 0;
    return typeof (row == null ? void 0 : row.id) === "string" ? row.id : null;
  } catch {
    return null;
  }
}
function saveComment(post, fields = {}) {
  return enqueue(() => saveCommentNow(post, fields));
}
async function saveCommentNow(post, fields) {
  var _a, _b, _c;
  const canonical = ((_a = postUrl(post == null ? void 0 : post.postUrl)) == null ? void 0 : _a.canonical) ?? null;
  const identity = canonical ?? (fields.key && isLocalCommentKey(fields.key) ? fields.key : mintLocalKey());
  const env = await readEnvelope$1();
  const prev = env.byPost[identity];
  const now = Date.now();
  const record = {
    key: identity,
    postUrl: canonical ?? "",
    id: (prev == null ? void 0 : prev.id) ?? null,
    pendingRef: (prev == null ? void 0 : prev.pendingRef) ?? null,
    author: post.author ?? (prev == null ? void 0 : prev.author) ?? null,
    postText: post.text ?? (prev == null ? void 0 : prev.postText) ?? "",
    take: fields.take ?? (prev == null ? void 0 : prev.take) ?? "",
    draft: fields.draft ?? (prev == null ? void 0 : prev.draft) ?? "",
    finalText: fields.finalText ?? (prev == null ? void 0 : prev.finalText) ?? "",
    posted: fields.posted ?? (prev == null ? void 0 : prev.posted) ?? false,
    postedAt: (prev == null ? void 0 : prev.postedAt) ?? null,
    updatedAt: now,
    lastOutcome: (prev == null ? void 0 : prev.lastOutcome) ?? null
  };
  if (fields.posted === true) record.postedAt = (fields.postedAt ?? /* @__PURE__ */ new Date()).toISOString();
  if (fields.posted === false) record.postedAt = null;
  const row = columnsKnown({
    post_url: canonical ?? "",
    post_author: post.author,
    post_author_url: post.authorUrl,
    post_text: post.text,
    my_take: record.take,
    draft: record.draft,
    final_text: record.finalText
  }, COMMENT_COLUMNS);
  if (fields.posted !== void 0) {
    row.posted = fields.posted;
    row.posted_at = record.postedAt;
  }
  env.byPost[identity] = record;
  await writeEnvelope(env);
  try {
    let id = record.id;
    if (!id && record.pendingRef) {
      const landed = await settle(record.pendingRef);
      if (landed.status === "sent" && typeof ((_b = landed.row) == null ? void 0 : _b.id) === "string") {
        id = landed.row.id;
        record.id = id;
        record.pendingRef = null;
      } else if (landed.status === "queued") {
        record.lastOutcome = "queued";
        env.byPost[identity] = record;
        await writeEnvelope(env);
        return {
          status: "queued",
          commentId: null,
          row,
          record,
          note: `Your first save for this post is still waiting for the hub (${landed.note}) — this version is kept here and no second row was made. Start the hub with \`make serve\` and press Save again.`
        };
      } else {
        record.pendingRef = null;
      }
    }
    if (!id && canonical) id = await remoteId(canonical);
    const ref = id ? await hubUpdate("comments", id, row, { flush: false }) : await hubInsert("comments", row, { flush: false });
    const done = await settle(ref);
    const storedId = typeof ((_c = done.row) == null ? void 0 : _c.id) === "string" ? done.row.id : null;
    if (done.status === "sent") {
      record.id = storedId ?? id;
      record.pendingRef = null;
    } else if (done.status === "queued" && !id) {
      record.pendingRef = ref;
    } else if (done.status === "dead" && !id) {
      record.pendingRef = null;
    }
    record.lastOutcome = done.status;
    env.byPost[identity] = record;
    await writeEnvelope(env);
    const what = record.posted ? "Comment saved and marked posted" : id ? "Comment updated" : "Comment saved";
    const caveat = !canonical && !id ? " It has no post URL, so it is filed under a local id — this browser is the only thing that knows which row it is. Read the post if you want it recognised anywhere else." : "";
    if (done.status === "sent") return { status: "sent", commentId: record.id, row, record, note: `${what}.${caveat}` };
    if (done.status === "dead") return { status: "dead", commentId: null, row, record, note: `Comment refused by the hub — ${done.note}` };
    if (done.status === "queued") return { status: "queued", commentId: null, row, record, note: `Comment queued for the hub (${done.note}) — it is kept here meanwhile.` };
    return { status: "error", commentId: null, row, record, note: `Comment not saved — ${done.note}.` };
  } catch (e) {
    record.lastOutcome = "error";
    env.byPost[identity] = record;
    await writeEnvelope(env);
    return { status: "error", commentId: null, row, record, note: `Comment not saved — ${e instanceof Error ? e.message : String(e)}` };
  }
}
const MIRRORABLE_MIN_WORDS = POST_MIRROR_MIN_WORDS;
const MIN_TAKE_COVERAGE = 0.67;
const REGISTER_LEVELS = ["plain", "mixed", "technical"];
function asRecord(raw) {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
}
function pickString(source, ...keys) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
function pickNumber(source, ...keys) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
function pickBool(source, ...keys) {
  for (const key of keys) if (source[key] === true) return true;
  return false;
}
function pickStrings(source, ...keys) {
  for (const key of keys) {
    const value = source[key];
    if (!Array.isArray(value)) continue;
    return value.filter((entry) => typeof entry === "string" && !!entry.trim());
  }
  return [];
}
const GATE_KEYS = ["ok", "reasons", "register", "coverage", "chars", "text"];
function readEnvelope(raw) {
  const outer = asRecord(raw);
  if (!outer) return { status: "error", note: "", payload: null };
  const nested = asRecord(outer.draft) ?? asRecord(outer.check) ?? asRecord(outer.result) ?? asRecord(outer.gate) ?? asRecord(outer.comment);
  const flat = GATE_KEYS.some((key) => key in outer) ? outer : null;
  const payload = nested ?? flat;
  const status = pickString(outer, "status") ?? (payload ? "sent" : "error");
  return { status, note: pickString(outer, "note") ?? "", payload };
}
function readRegister(raw) {
  const source = asRecord(raw);
  if (!source) return null;
  const levelRaw = pickString(source, "level");
  const level = REGISTER_LEVELS.find((option) => option === levelRaw);
  const words = pickNumber(source, "words");
  if (!level || words === null) return null;
  return {
    words,
    sentences: pickNumber(source, "sentences") ?? 0,
    wordsPerSentence: pickNumber(source, "wordsPerSentence", "words_per_sentence") ?? 0,
    longWordShare: pickNumber(source, "longWordShare", "long_word_share") ?? 0,
    acronyms: pickNumber(source, "acronyms") ?? 0,
    numbers: pickNumber(source, "numbers") ?? 0,
    level,
    score: pickNumber(source, "score") ?? 0
  };
}
function readCoverage(raw) {
  const source = asRecord(raw);
  if (!source) return null;
  const share = pickNumber(source, "share");
  if (share === null) return null;
  return {
    terms: pickStrings(source, "terms"),
    carried: pickStrings(source, "carried"),
    dropped: pickStrings(source, "dropped"),
    share
  };
}
function readGate(raw, fallbackText = "") {
  const { payload } = readEnvelope(raw);
  const source = payload ?? {};
  const reasons = [];
  if (Array.isArray(source.reasons)) {
    for (const entry of source.reasons) {
      const reason = asRecord(entry);
      if (!reason) continue;
      reasons.push({
        code: pickString(reason, "code") ?? "refused",
        detail: pickString(reason, "detail") ?? "the hub refused this comment",
        fix: pickString(reason, "fix") ?? "edit the comment and it will be checked again"
      });
    }
  }
  const registers = asRecord(source.register);
  const text2 = pickString(source, "text") ?? fallbackText;
  return {
    ok: payload !== null && source.ok === true && reasons.length === 0,
    text: text2,
    chars: pickNumber(source, "chars") ?? text2.length,
    reasons,
    postRegister: readRegister(registers == null ? void 0 : registers.post),
    commentRegister: readRegister(registers == null ? void 0 : registers.comment),
    coverage: readCoverage(source.coverage),
    costUsd: pickNumber(source, "costUsd", "cost_usd"),
    model: pickString(source, "model")
  };
}
function readPostCapture(raw) {
  const outer = asRecord(raw);
  if (!outer) return { status: "error", note: "", post: null };
  const source = asRecord(outer.post);
  const postUrl2 = source ? pickString(source, "postUrl", "post_url", "url") ?? "" : "";
  const text2 = source ? pickString(source, "text", "postText", "post_text", "body") ?? "" : "";
  const status = pickString(outer, "status") ?? "sent";
  const note = pickString(outer, "note") ?? "";
  if (!source || !postUrl2 && !text2) return { status, note, post: null };
  return {
    status,
    note,
    post: {
      postUrl: postUrl2,
      author: pickString(source, "author", "postAuthor", "post_author", "authorName"),
      authorUrl: pickString(source, "authorUrl", "postAuthorUrl", "post_author_url"),
      text: text2,
      words: pickNumber(source, "words") ?? countWords(text2),
      // No text at all is thin whatever the reader said — that is the image-post case Bob deferred
      // the vision path for, and it has to survive to the screen intact.
      thin: pickBool(source, "thin") || !text2,
      thinWhy: pickString(source, "thinWhy", "thin_why"),
      hasImage: pickBool(source, "hasImage", "has_image", "imageOnly", "image_only")
    }
  };
}
function readOutcome(raw) {
  const outer = asRecord(raw);
  if (!outer) return { status: "error", note: "", id: null, key: null };
  const nested = asRecord(outer.row) ?? asRecord(outer.record);
  const record = asRecord(outer.record);
  return {
    status: pickString(outer, "status") ?? "error",
    note: pickString(outer, "note") ?? "",
    id: pickString(outer, "commentId", "comment_id", "id") ?? (nested ? pickString(nested, "id") : null),
    // Which row this became. For a comment with no post URL it is the ONLY handle on it, and the
    // panel hands it back on the next press so one comment stays one row.
    key: record ? pickString(record, "key") : null
  };
}
const WORD_RE = /[A-Za-z][A-Za-z'’-]*/g;
function countWords(text2) {
  var _a;
  return ((_a = (text2 || "").match(WORD_RE)) == null ? void 0 : _a.length) ?? 0;
}
function registerDistance(a, b) {
  return Math.abs(REGISTER_LEVELS.indexOf(a) - REGISTER_LEVELS.indexOf(b));
}
const REGISTER_BLURB = {
  plain: "plain — short sentences, everyday words",
  mixed: "mixed — some detail, nothing specialist",
  technical: "technical — long sentences, long words, acronyms or figures"
};
function registerLabel(level) {
  return REGISTER_BLURB[level] ?? String(level);
}
function percent(share) {
  return Math.round(share * 100);
}
function readingNumbers(reading) {
  return `${reading.wordsPerSentence} words a sentence, ${percent(reading.longWordShare)}% long words` + (reading.acronyms + reading.numbers > 0 ? `, ${reading.acronyms + reading.numbers} acronyms or figures` : "");
}
function mirrorLine(post, comment) {
  if (!post || !comment) {
    return {
      ok: null,
      text: "Register: not measured yet.",
      detail: "The hub measures the post and the comment together, free, as soon as there is a comment to measure."
    };
  }
  const detail = `The post: ${readingNumbers(post)}. This comment: ${readingNumbers(comment)}.`;
  if (post.words < MIRRORABLE_MIN_WORDS) {
    return {
      ok: null,
      text: `Register: the post is only ${post.words} words — too short to have one, so nothing is claimed about mirroring it. If the real post is longer than that, paste it above.`,
      detail
    };
  }
  const apart = registerDistance(post.level, comment.level);
  if (apart === 0) {
    return { ok: true, text: `Register: the post reads ${registerLabel(post.level)}, and so does this comment. It mirrors.`, detail };
  }
  if (apart === 1) {
    return {
      ok: true,
      text: `Register: the post reads ${post.level}, this comment reads ${comment.level} — one step apart, which passes.`,
      detail
    };
  }
  return {
    ok: false,
    text: `Register: the post reads ${post.level} and this comment reads ${comment.level} — the whole range apart. That is the mirror refusal below.`,
    detail
  };
}
function listOf(words, limit = 8) {
  if (words.length <= limit) return words.join(", ");
  return `${words.slice(0, limit).join(", ")} and ${words.length - limit} more`;
}
function coverageLine(coverage) {
  if (!coverage) {
    return {
      ok: null,
      text: "Your take in the comment: not measured yet.",
      detail: "Every distinctive word of yours that the post did not already supply is looked for in the comment."
    };
  }
  if (coverage.terms.length === 0) {
    return {
      ok: null,
      text: "Your take in the comment: your view used no distinctive words of its own beyond the post's, so there is nothing to lose.",
      detail: "Coverage only counts the words the post did NOT supply — repeating the post would otherwise score well while saying nothing of yours."
    };
  }
  const carried = `it carries ${listOf(coverage.carried)}`;
  if (coverage.dropped.length === 0) {
    return {
      ok: true,
      text: `Your take in the comment: all of it — ${carried}.`,
      detail: `Measured on the ${coverage.terms.length} words of yours the post did not already supply.`
    };
  }
  return {
    // The hub's own threshold, not a second one: it refuses below two thirds carried
    // (service/comments.py MIN_COVERAGE), so a tick here at four of six would sit directly above its
    // refusal of the same number. One rule, one line, quoted rather than re-chosen.
    ok: coverage.share >= MIN_TAKE_COVERAGE,
    text: `Your take in the comment: ${percent(coverage.share)}% — ${carried}; it leaves out ${listOf(coverage.dropped)}.`,
    detail: `Measured on the ${coverage.terms.length} words of yours the post did not already supply.`
  };
}
const PASTE_INSTEAD_OF_VISION = "Reading pictures is deliberately not built here, so nothing was guessed. Paste or type the post below and everything works normally.";
function postTextState(post, pasted) {
  const typed = (pasted || "").trim();
  if (typed) {
    const words = countWords(typed);
    return {
      text: typed,
      source: "typed",
      thin: words < MIRRORABLE_MIN_WORDS,
      why: words < MIRRORABLE_MIN_WORDS ? `This is the post text you pasted — ${words} words, which is under the ${MIRRORABLE_MIN_WORDS} the hub needs before it will claim anything about the post's register.` : "This is the post text you pasted, and it is what the comment is measured against."
    };
  }
  if (!post) {
    return {
      text: "",
      source: "none",
      thin: true,
      why: "No post has been read yet. Press Read this post on the post's own tab, or paste the post below."
    };
  }
  const page = post.text.trim();
  if (!page) {
    return {
      text: "",
      source: "none",
      thin: true,
      why: `${post.thinWhy ?? (post.hasImage ? "The page gave no text for this post — it is an image, a video or a document card." : "The page gave no text for this post.")} ${PASTE_INSTEAD_OF_VISION}`
    };
  }
  if (post.thin) {
    return {
      text: page,
      source: "page",
      thin: true,
      why: `${post.thinWhy ?? `The page gave only ${post.words} words — under the ${MIRRORABLE_MIN_WORDS} the hub needs before it will claim anything about the post's register.`} If the real post is longer than that, or the page cut it off at a "see more", paste it below and yours is used instead.`
    };
  }
  return {
    text: page,
    source: "page",
    thin: false,
    why: `Read from the page: ${post.words} words. If that is not the whole post, paste it below and yours is used instead.`
  };
}
function draftState(input) {
  if (input.busy) return { enabled: false, why: "Working — wait for the current step to finish." };
  if (!input.take.trim()) {
    return {
      enabled: false,
      why: "Type your view first. The comment is YOUR view written out — the model supplies no opinion of its own, so with nothing in that box there is nothing to write."
    };
  }
  const noPost = !input.postText.trim();
  return {
    enabled: true,
    why: "Spends money: one short model call writes your whole view as a comment on this post. It asks before it spends, keeps everything you typed either way, and the result faces the same two checks a comment you typed yourself would. Nothing is posted to LinkedIn — you copy it and post it." + (noPost ? " There is no post text yet, so there is no register to mirror: it will be written from your view alone." : "")
  };
}
function postedBlockers(state) {
  const blockers = [];
  if (state.postedAt) blockers.push("this comment is already logged as posted");
  if (!state.text.trim()) blockers.push("there is no comment yet");
  if (!state.checked) blockers.push("the hub has not checked this comment yet");
  for (const reason of state.reasons) blockers.push(`${reason.detail} — ${reason.fix}`);
  if (state.busy) blockers.push("working…");
  return blockers;
}
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
function CommentForm(props) {
  const { post, postText, gate, on } = props;
  const busy = props.reading || props.drafting || props.logging;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-testid": "comment-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "LinkedIn comment" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", title: "Nothing here opens, watches, clicks, posts or comments on LinkedIn.", children: "you post it, we log it" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn small primary",
        disabled: busy,
        onClick: on.read,
        title: "Reads the post in the active tab once. It clicks nothing, opens nothing and posts nothing.",
        children: props.reading ? "Reading…" : post ? "Read this post again" : "Read this post"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Nothing runs on LinkedIn until you press this, and then it runs once: the page is read, never written to. Nothing on LinkedIn is ever clicked, opened, watched or posted by this extension — you post the comment yourself." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecentEntries,
      {
        testId: "comment-recents",
        title: "The last 3 comments you logged",
        entries: props.recents,
        busy,
        busyWhy: "Working — wait for the current step to finish.",
        hint: "Retrieve puts that post, your view and the comment back in the boxes below, replacing what is in them. It spends nothing, and the comment is checked again before it can be logged.",
        columns: [
          { label: "Post", cell: (e) => e.postText || e.author || e.postUrl },
          { label: "Your view", cell: (e) => e.take },
          { label: "Comment", cell: (e) => e.finalText || e.draft, wide: true }
        ],
        onRetrieve: on.retrieve
      }
    ),
    post && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 8 }, "data-testid": "comment-post", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: post.author ?? "author not read" }),
        post.authorUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
          " · ",
          post.authorUrl
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: post.postUrl || "no post URL read" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
        post.words,
        " words · ",
        post.text.length,
        " characters read from the page",
        post.thin ? " · too little to mirror" : "",
        post.hasImage ? " · the page had a picture or a video" : ""
      ] }),
      post.text && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 6, maxHeight: 160, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 12 }, children: post.text })
    ] }),
    post && postText.thin && postText.source !== "typed" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", "data-testid": "comment-thin", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "The page did not give the full post." }),
      " ",
      postText.why
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
        "The post text ",
        postText.source === "typed" ? "· yours, used instead of the page's" : "· from the page"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: props.pastedPost,
          onChange: (e) => on.setPastedPost(e.target.value),
          placeholder: "Paste or type the post here. Anything you put in this box is what the comment is measured against."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: postText.source === "typed" ? postText.why : "Leave this empty to use what the page gave. Reading images is deliberately not built here, so an image post is pasted, never guessed at." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Your view — the comment is built around this whole line" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: props.take,
          onChange: (e) => on.setTake(e.target.value),
          placeholder: "What you actually think about this post, in your own words. Say all of it."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "The comment revolves around your entire view, not a convenient part of it — and the hub measures whether it did. Nothing here has an opinion of its own; the model only writes yours out. Kept on this machine as you type, so closing the popup does not lose it." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small primary",
          disabled: !props.draft.enabled,
          onClick: on.draft,
          "data-testid": "comment-draft",
          title: props.draft.why,
          children: props.drafting ? "Drafting…" : props.drafted ? "Draft it again (spends money)" : "Draft it (spends money)"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", style: { flex: 1 }, children: "The only thing on this screen that spends. Every check after it is free." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
        "The comment",
        props.edited ? " · your edit" : props.drafted ? " · as drafted" : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: props.text,
          onChange: (e) => on.setText(e.target.value),
          placeholder: props.drafting ? "Drafting…" : "The drafted comment appears here — edit it freely, or write your own."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", "data-testid": "comment-count", children: [
          props.text.length,
          " characters"
        ] }),
        props.checking && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", children: "checking…" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Every edit is re-checked here against the two rules, free. Editing costs nothing and is never sent to a model." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", "data-testid": "comment-measurements", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", "data-testid": "comment-register", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: props.mirror.ok === false ? "✕ " : props.mirror.ok === true ? "✓ " : "· " }),
        props.mirror.text,
        props.mirror.detail ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: props.mirror.detail }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 6 }, "data-testid": "comment-coverage", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: props.coverage.ok === false ? "✕ " : props.coverage.ok === true ? "✓ " : "· " }),
        props.coverage.text,
        props.coverage.detail ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: props.coverage.detail }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 6 }, children: "These two numbers are the whole rule: the comment must read like the post, and it must carry your whole view. Nothing else is refused here — no length cap, no banned words." })
    ] }),
    gate && gate.reasons.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", "data-testid": "comment-reasons", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Not ready to post as written:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "4px 0 0 16px", padding: 0 }, children: gate.reasons.map((reason, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
        reason.detail,
        " — ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: reason.fix })
      ] }, `${reason.code}-${i}`)) })
    ] }),
    gate && gate.ok && props.blockers.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", "data-testid": "comment-ok", children: "Passes both checks. Copy it, post it on LinkedIn yourself, then press I posted it." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          disabled: !props.text.trim(),
          onClick: on.copy,
          title: "Copies the comment so you can paste it into LinkedIn yourself. It posts nothing.",
          children: "Copy"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small primary",
          disabled: props.blockers.length > 0,
          onClick: on.logPosted,
          "data-testid": "comment-posted",
          title: props.blockers.length > 0 ? `Not yet: ${props.blockers.join("; ")}` : "Records this comment as posted and stamps the time. It asks LinkedIn nothing — press it after you posted the comment there yourself.",
          children: props.logging ? "Logging…" : props.postedAt ? "Logged as posted" : "I posted it"
        }
      )
    ] }),
    props.blockers.length > 0 && !props.postedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", "data-testid": "comment-blockers", children: [
      "Not loggable yet: ",
      props.blockers[0]
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Nothing here watches LinkedIn. This button asks LinkedIn nothing and checks nothing — it records what you tell it you did." }),
    props.status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", "data-testid": "comment-status", children: props.status })
  ] });
}
function CommentPanel() {
  const [post, setPost] = reactExports.useState(null);
  const [pastedPost, setPastedPost] = reactExports.useState("");
  const [take, setTake] = reactExports.useState("");
  const [text2, setText] = reactExports.useState("");
  const [gate, setGate] = reactExports.useState(null);
  const [checked, setChecked] = reactExports.useState(false);
  const [drafted, setDrafted] = reactExports.useState(false);
  const [edited, setEdited] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [drafting, setDrafting] = reactExports.useState(false);
  const [checking, setChecking] = reactExports.useState(false);
  const [logging, setLogging] = reactExports.useState(false);
  const [postedAt, setPostedAt] = reactExports.useState(null);
  const [status, setStatus] = reactExports.useState(null);
  const [recents, setRecents] = reactExports.useState([]);
  const [retrieved, setRetrieved] = reactExports.useState(0);
  const checkSeq = reactExports.useRef(0);
  const readPostRef = reactExports.useRef(null);
  const localKeyRef = reactExports.useRef(null);
  const draftedTextRef = reactExports.useRef(null);
  const lastCheckedRef = reactExports.useRef(null);
  const takeRestored = reactExports.useRef(false);
  const postText = reactExports.useMemo(() => postTextState(post, pastedPost), [post, pastedPost]);
  reactExports.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const settings = await getCommentSettings();
        if (alive && settings.lastTake) setTake((current) => current || settings.lastTake);
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  reactExports.useEffect(() => {
    let alive = true;
    void loadComments().then((list) => {
      if (alive) setRecents(list.slice(0, RECENTS_MAX));
    });
    return () => {
      alive = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!takeRestored.current) {
      takeRestored.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void rememberTake(take);
    }, 600);
    return () => clearTimeout(timer);
  }, [take]);
  reactExports.useEffect(() => {
    if (!text2.trim()) {
      setGate(null);
      setChecked(false);
      setChecking(false);
      lastCheckedRef.current = null;
      return;
    }
    const signature = `${text2} ${take} ${postText.text}`;
    if (signature === lastCheckedRef.current) return;
    setChecked(false);
    const seq = ++checkSeq.current;
    const timer = setTimeout(() => {
      setChecking(true);
      checkComment({ text: text2, take, postText: postText.text }).then((raw) => {
        if (seq !== checkSeq.current) return;
        const answered = readEnvelope(raw);
        if (!answered.payload) {
          setChecked(false);
          setGate(null);
          setStatus(`This comment was not checked — ${answered.note || "the hub answered with no verdict"}. Until it is, I posted it stays off.`);
          return;
        }
        setGate(readGate(raw, text2));
        setChecked(true);
        lastCheckedRef.current = signature;
      }).catch((e) => {
        if (seq !== checkSeq.current) return;
        setChecked(false);
        setGate(null);
        setStatus(`This comment was not checked — ${errorText(e)}. The hub does the checking; start it with "make serve". Until it answers, I posted it stays off.`);
      }).finally(() => {
        if (seq === checkSeq.current) setChecking(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [text2, take, postText.text, retrieved]);
  const read = async () => {
    setReading(true);
    setStatus(null);
    try {
      const raw = await captureActiveTabPost();
      const captured = readPostCapture(raw);
      if (!captured.post) {
        setStatus(captured.note || "That tab is not a LinkedIn post, or the page gave nothing back. Nothing was read, and nothing was changed.");
        return;
      }
      readPostRef.current = (raw == null ? void 0 : raw.post) ?? null;
      setPost(captured.post);
      setPastedPost("");
      setText("");
      setGate(null);
      setChecked(false);
      setDrafted(false);
      setEdited(false);
      setPostedAt(null);
      draftedTextRef.current = null;
      lastCheckedRef.current = null;
      const state = postTextState(captured.post, "");
      setStatus(`${captured.note || "Read the post."} ${state.thin ? state.why : `${captured.post.words} words read.`}`);
    } catch (e) {
      setStatus(`Nothing was read — ${errorText(e)}. Nothing on the page was touched.`);
    } finally {
      setReading(false);
    }
  };
  const runDraft = async () => {
    const ok = confirm(
      "Draft this comment with one model call?\n\nThis is the only thing on this screen that spends money — a fraction of a cent, once, now. It writes YOUR view as a comment on this post and mirrors the post's register, then comes back with the two measurements it was judged on.\n\n" + (postText.text.trim() ? "" : "There is no post text, so there is no register to mirror — it will be written from your view alone.\n\n") + "Nothing is posted to LinkedIn: you read the result, copy it, and post it yourself."
    );
    if (!ok) return;
    setDrafting(true);
    setStatus(null);
    try {
      const raw = await draftComment({ postText: postText.text, take, author: (post == null ? void 0 : post.author) ?? null });
      const answered = readEnvelope(raw);
      if (!answered.payload) {
        setStatus(`Nothing was drafted — ${answered.note || "the hub answered without a comment"}. Everything you typed is exactly as you left it.`);
        return;
      }
      const result = readGate(raw);
      draftedTextRef.current = result.text;
      setText(result.text);
      setGate(result);
      setChecked(true);
      setDrafted(true);
      setEdited(false);
      lastCheckedRef.current = `${result.text} ${take} ${postText.text}`;
      setStatus(`Drafted, ${result.chars} characters${result.costUsd != null ? ` · $${result.costUsd.toFixed(4)} spent` : ""}${result.reasons.length > 0 ? " — and it did not pass its own checks; the reasons are below." : ". Read it before you post it."}`);
    } catch (e) {
      setStatus(`Not drafted — ${errorText(e)}. Everything you typed is exactly as you left it.`);
    } finally {
      setDrafting(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text2);
      setStatus("Copied. Paste it into LinkedIn and post it yourself — nothing here does that for you.");
    } catch (e) {
      setStatus(`Not copied — ${errorText(e)}. Select the text in the box and copy it by hand.`);
    }
  };
  const busy = reading || drafting || logging || checking;
  const blockers = postedBlockers({
    text: text2,
    checked,
    reasons: (gate == null ? void 0 : gate.reasons) ?? [],
    busy,
    postedAt
  });
  const logPosted = async () => {
    const stored = readPostRef.current ?? {
      postUrl: "",
      activityId: null,
      author: null,
      authorUrl: null,
      text: null,
      words: 0,
      thin: true,
      thinWhy: "the post was never read — this comment was written from what you typed",
      hasImage: false,
      layers: {}
    };
    if (blockers.length > 0) return;
    const ok = confirm(
      "Log this comment as posted?\n\nPressing OK records it in your comment log, marks it posted and stamps the time.\n\nIt asks LinkedIn nothing. Nothing here reads, opens, clicks, watches or posts anything on LinkedIn, and nothing checks whether the comment is really there — this records what you tell it you did. Press it only after you posted the comment on LinkedIn yourself."
    );
    if (!ok) return;
    setLogging(true);
    setStatus(null);
    try {
      const written = readOutcome(await saveComment(
        { ...stored, text: postText.text || stored.text },
        {
          // The identity a previous save minted, when this comment has no post URL to be filed
          // under. Without it a second press would make a second row.
          key: localKeyRef.current ?? void 0,
          take: take.trim(),
          // Undefined, not '': the lib leaves a field it is not given alone, and an empty string
          // would overwrite the model's draft in the row with nothing on a comment he typed himself.
          draft: draftedTextRef.current ?? void 0,
          finalText: text2,
          posted: true,
          postedAt: /* @__PURE__ */ new Date()
        }
      ));
      if (written.key) localKeyRef.current = written.key;
      void loadComments().then((list) => setRecents(list.slice(0, RECENTS_MAX)));
      if (written.status === "sent") {
        setPostedAt((/* @__PURE__ */ new Date()).toISOString());
        setStatus(`${written.note || "Logged as posted."} Nothing else happens — nothing is sent anywhere.`);
      } else if (written.status === "queued") {
        setPostedAt((/* @__PURE__ */ new Date()).toISOString());
        setStatus(`${written.note} It reaches the log when the hub receives it, not before.`);
      } else {
        setStatus(`${written.note || "The hub did not take it."} Nothing is logged for this comment yet — press it again once that is fixed.`);
      }
    } catch (e) {
      setStatus(`Not logged — ${errorText(e)}. Nothing was written; press it again when the hub is up.`);
    } finally {
      setLogging(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CommentForm,
    {
      post,
      recents,
      postText,
      pastedPost,
      take,
      text: text2,
      gate,
      mirror: mirrorLine((gate == null ? void 0 : gate.postRegister) ?? null, (gate == null ? void 0 : gate.commentRegister) ?? null),
      coverage: coverageLine((gate == null ? void 0 : gate.coverage) ?? null),
      draft: draftState({ take, postText: postText.text, busy }),
      blockers,
      reading,
      drafting,
      checking,
      logging,
      drafted,
      edited,
      postedAt,
      status,
      on: {
        read: () => {
          void read();
        },
        setPastedPost,
        setTake,
        retrieve: (entry) => {
          setPastedPost(entry.postText);
          setTake(entry.take);
          setText(entry.finalText || entry.draft);
          draftedTextRef.current = entry.draft || null;
          setDrafted(Boolean(entry.draft));
          setEdited(Boolean(entry.finalText) && entry.finalText !== entry.draft);
          setGate(null);
          setChecked(false);
          lastCheckedRef.current = null;
          setRetrieved((n) => n + 1);
          localKeyRef.current = entry.key;
          readPostRef.current = null;
          setPost(null);
          setPostedAt(null);
          setStatus(`Retrieved the comment you logged${entry.author ? ` on ${entry.author}'s post` : ""}. It is being checked again — nothing was posted or logged by this.`);
        },
        draft: () => {
          void runDraft();
        },
        // Once he takes the pen the comment stays his: it is re-checked, never re-written.
        setText: (value) => {
          setEdited(value !== draftedTextRef.current);
          setText(value);
        },
        copy: () => {
          void copy();
        },
        logPosted: () => {
          void logPosted();
        }
      }
    }
  );
}
export {
  AppProvider as A,
  downloadCoverLetterDocument as B,
  checkHealth as C,
  listFamilies as D,
  getDraftEdits as E,
  pollCoverLetter as F,
  setTailorConfig as G,
  recordActiveTabJob as H,
  recordFormJob as I,
  startTailor as J,
  rememberTailorEntry as K,
  saveActiveRun as L,
  cancelJob as M,
  finalizeJob as N,
  FinalizeRejectedError as O,
  saveResultAsDocument as P,
  estimateCoverLetterCostUsd as Q,
  RecentEntries as R,
  STAGE_LABELS as S,
  TAILOR_BASE_URL as T,
  requestCoverLetter as U,
  V7_PRESETS as V,
  saveCoverLetterAsDocument as W,
  OutreachPanel as X,
  CommentPanel as Y,
  atsReqIdFromUrl as a,
  urlKey as b,
  clientExports as c,
  hubQuery as d,
  getTailorConfig as e,
  flushHubOutbox as f,
  getHubDeadLetters as g,
  hubUpsert as h,
  getActiveRun as i,
  jsxRuntimeExports as j,
  getJob as k,
  loadTailorEntries as l,
  measureEdits as m,
  isUnknownJobError as n,
  clearActiveRun as o,
  TailorOfflineError as p,
  pollUntilDone as q,
  reactExports as r,
  saveDraftEdits as s,
  V6_PRESETS as t,
  useApp as u,
  presetId as v,
  estimateCostUsd as w,
  estimateRedraftCostUsd as x,
  clearDraftEdits as y,
  downloadResultDocument as z
};
