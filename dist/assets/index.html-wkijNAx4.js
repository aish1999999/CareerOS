import { u as useApp, r as reactExports, j as jsxRuntimeExports, c as clientExports, A as AppProvider } from "./styles-CbmMJvxW.js";
import { P as ProfileTab, T as TrainingTab, A as App } from "./App-Bpm8rFge.js";
import "./storage-DrgdSKCL.js";
import "./seed-CEX56cSr.js";
import "./validation-report-CTSZ6ve_.js";
import "./eeo-C8X2VxtH.js";
function Onboarding({ onExit }) {
  const { patchSettings } = useApp();
  const [step, setStep] = reactExports.useState(0);
  const finish = async () => {
    await patchSettings({ onboardingCompleted: true });
    onExit();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "steps", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `step-dot ${i <= step ? "done" : ""}` }, i)) }),
    step === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Welcome to FlashFiller ⚡" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        "FlashFiller fills job applications from answers ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "you" }),
        " write — it never invents anything, never submits a form for you, and all your data stays on this device."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Two quick steps: fill in your basic profile (covers name, contact, links and more automatically), then answer 10 common application questions." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", onClick: () => setStep(1), children: "Let’s go" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void finish(), children: "Skip for now" })
      ] })
    ] }),
    step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "1 · Your profile" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Everything here is matched automatically to standard fields — each filled entry is one less question to type." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ProfileTab, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", onClick: () => setStep(2), children: "Continue → answer 10 questions" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void finish(), children: "Finish later" })
      ] })
    ] }),
    step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "2 · Answer 10 questions to get started" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "The most common free-text application questions. Save, skip, or mark not applicable — you can always continue in the Training tab." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TrainingTab, { limit: 10, onDone: () => void finish() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void finish(), children: "Finish onboarding" }) })
    ] })
  ] });
}
function OptionsRoot() {
  const { store } = useApp();
  const wantsOnboarding = location.hash === "#onboarding" && !store.settings.onboardingCompleted;
  const [showOnboarding, setShowOnboarding] = reactExports.useState(wantsOnboarding);
  if (showOnboarding) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Onboarding,
      {
        onExit: () => {
          location.hash = "";
          setShowOnboarding(false);
        }
      }
    );
  }
  const initialTab = location.hash === "#Training" ? "Training" : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(App, { mode: "options", initialTab });
}
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(AppProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(OptionsRoot, {}) })
);
