import { c as clientExports, j as jsxRuntimeExports, A as AppProvider, r as reactExports, X as OutreachPanel, Y as CommentPanel } from "./styles-CbmMJvxW.js";
import "./storage-DrgdSKCL.js";
import "./seed-CEX56cSr.js";
function SidePanel() {
  const [tab, setTab] = reactExports.useState("outreach");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "tabs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: tab === "outreach" ? "active" : "", onClick: () => setTab("outreach"), children: "Outreach" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: tab === "comment" ? "active" : "", onClick: () => setTab("comment"), children: "Comment" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tab-body", children: tab === "outreach" ? /* @__PURE__ */ jsxRuntimeExports.jsx(OutreachPanel, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(CommentPanel, {}) })
  ] });
}
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(AppProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SidePanel, {}) })
);
