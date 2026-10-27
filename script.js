/* ==========================================================
   Configuration
   ========================================================== */

const API_BASE = "http://127.0.0.1:8000";
const PREDICT_URL = `${API_BASE}/predict`;
const REQUEST_TIMEOUT_MS = 15000;
const GAUGE_LENGTH = 282.74; // length of the semicircle path (PI * 90)
const MAX_SCORE = 10;        // gauge scale


const COUNTRIES = [
  "India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France",
  "Afghanistan", "Argentina", "Austria", "Bangladesh", "Belgium", "Brazil", "Chile", "China",
  "Colombia", "Czech Republic", "Denmark", "Egypt", "Finland", "Ghana", "Greece", "Hong Kong",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Kenya", "Malaysia",
  "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines",
  "Poland", "Portugal", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea",
  "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Thailand", "UAE", "Ukraine",
  "Vietnam", "Other"
];

/* Validation rules mirror the Pydantic StudentData model */
const NUMBER_RULES = {
  age:                     { label: "Age",                      min: 10, max: 100, integer: true },
  avg_daily_usage_hours:   { label: "Daily usage hours",        min: 0,  max: 24 },
  daily_unlocks:           { label: "Phone unlocks",            min: 0,  integer: true },
  study_hours:             { label: "Study hours",              min: 0,  max: 24 },
  physical_activity_hours: { label: "Physical activity hours",  min: 0,  max: 24 },
  sleep_hours_per_night:   { label: "Sleep hours",              min: 0,  max: 24 }
};

const CHOICE_FIELDS = {
  gender:         "gender",
  academic_level: "academic level",
  purpose_of_use: "main purpose",
  stress_level:   "stress level"
};

/* ==========================================================
   DOM references
   ========================================================== */
const form        = document.getElementById("predict-form");
const formAlert   = document.getElementById("form-alert");
const submitBtn   = document.getElementById("submit-btn");
const panel       = document.getElementById("result-panel");
const gaugeFill   = document.getElementById("gauge-fill");
const scoreValue  = document.getElementById("score-value");
const resultTitle = document.getElementById("result-title");
const resultText  = document.getElementById("result-text");
const errorTitle  = document.getElementById("error-title");
const errorText   = document.getElementById("error-text");

let countUpFrame = null;

/* ==========================================================
   Setup
   ========================================================== */
document.getElementById("api-url-label").textContent = PREDICT_URL;

const countryList = document.getElementById("country-list");
COUNTRIES.forEach((name) => {
  const option = document.createElement("option");
  option.value = name;
  countryList.appendChild(option);
});

form.addEventListener("submit", handleSubmit);
form.addEventListener("reset", () => {
  clearErrors();
  setState("idle");
});
form.addEventListener("input", (event) => {
  // Clear an error as soon as the person edits that field
  const name = event.target.name;
  if (name) clearFieldError(name);
});

document.getElementById("again-btn").addEventListener("click", () => {
  setState("idle");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("retry-btn").addEventListener("click", () => form.requestSubmit());

/* ==========================================================
   Form handling
   ========================================================== */
async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  const { payload, errors } = collectAndValidate();

  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    showFormAlert("Please fix the highlighted fields and try again.");
    focusFirstError(errors);
    return;
  }

  await requestPrediction(payload);
}

function collectAndValidate() {
  const data = new FormData(form);
  const payload = {};
  const errors = {};

  // Numbers
  for (const [name, rule] of Object.entries(NUMBER_RULES)) {
    const raw = String(data.get(name) ?? "").trim();
    if (raw === "") {
      errors[name] = `${rule.label} is required.`;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      errors[name] = `${rule.label} must be a number.`;
    } else if (rule.integer && !Number.isInteger(value)) {
      errors[name] = `${rule.label} must be a whole number.`;
    } else if (rule.min !== undefined && value < rule.min) {
      errors[name] = `${rule.label} must be at least ${rule.min}.`;
    } else if (rule.max !== undefined && value > rule.max) {
      errors[name] = `${rule.label} must be at most ${rule.max}.`;
    } else {
      payload[name] = value;
    }
  }

  // Country (free text)
  const country = String(data.get("country") ?? "").trim();
  if (!country) errors.country = "Country is required.";
  else payload.country = country;

  // Platform (select)
  const platform = data.get("most_used_platform");
  if (!platform) errors.most_used_platform = "Please choose a platform.";
  else payload.most_used_platform = platform;

  // Radio groups
  for (const [name, label] of Object.entries(CHOICE_FIELDS)) {
    const value = data.get(name);
    if (!value) errors[name] = `Please select your ${label}.`;
    else payload[name] = value;
  }

  return { payload, errors };
}

/* ==========================================================
   API call
   ========================================================== */
async function requestPrediction(payload) {
  setLoading(true);
  setState("loading");
  scrollToResultOnSmallScreens();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(PREDICT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const body = await safeJson(response);

    if (response.status === 422) {
      // FastAPI / Pydantic validation error
      const fieldErrors = parseValidationErrors(body);
      showFieldErrors(fieldErrors.byField);
      showFormAlert("The server rejected some of your answers. Please check the highlighted fields.");
      showError("Some answers are invalid", fieldErrors.summary || "Check your answers and try again.");
      focusFirstError(fieldErrors.byField);
      return;
    }

    if (!response.ok) {
      showError(
        `Server error (${response.status})`,
        "The prediction service ran into a problem. Please try again in a moment."
      );
      return;
    }

    const score = body && body.predicted_mental_health_score;
    if (typeof score !== "number" || Number.isNaN(score)) {
      showError("Unexpected response", "The server replied, but no score was included.");
      return;
    }

    showResult(score);
  } catch (err) {
    if (err.name === "AbortError") {
      showError("The request timed out", "The server took too long to respond. Please try again.");
    } else {
      showError(
        "Cannot reach the server",
        `Make sure the API is running at ${API_BASE} (python -m uvicorn main:app --reload --port 2200), then try again.`
      );
    }
  } finally {
    clearTimeout(timeoutId);
    setLoading(false);
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/* Turns FastAPI's {detail: [{loc: ["body","age"], msg: "..."}]} into field messages */
function parseValidationErrors(body) {
  const byField = {};
  const lines = [];

  if (body && Array.isArray(body.detail)) {
    body.detail.forEach((item) => {
      const loc = Array.isArray(item.loc) ? item.loc : [];
      const field = loc[loc.length - 1];
      const message = item.msg || "Invalid value.";
      if (typeof field === "string" && document.getElementById(`error-${field}`)) {
        byField[field] = capitalize(message);
      }
      lines.push(`${field ?? "input"}: ${message}`);
    });
  } else if (body && typeof body.detail === "string") {
    lines.push(body.detail);
  }

  return { byField, summary: lines.join("; ") };
}

/* ==========================================================
   UI state
   ========================================================== */
function setState(state) {
  panel.dataset.state = state;
  if (state !== "success") delete panel.dataset.tone;

  if (state === "idle" || state === "error") {
    cancelCountUp();
    gaugeFill.style.strokeDashoffset = GAUGE_LENGTH;
    scoreValue.textContent = "--";
  }
  if (state === "loading") {
    cancelCountUp();
    gaugeFill.style.strokeDashoffset = "";
    scoreValue.textContent = "...";
  }
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
  submitBtn.querySelector(".btn-label").textContent = isLoading ? "Predicting..." : "Predict my score";
}

function showResult(score) {
  const { title, text, tone } = interpretScore(score);
  resultTitle.textContent = title;
  resultText.textContent = text;
  panel.dataset.tone = tone;
  setState("success");

  // Animate the gauge and count up the number
  const ratio = Math.min(Math.max(score / MAX_SCORE, 0), 1);
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = GAUGE_LENGTH * (1 - ratio);
  });
  countUp(score);
}

function interpretScore(score) {
  // Assumes a 0-10 scale where a higher score means better mental health
  if (score >= 7) {
    return {
      tone: "good",
      title: "Healthy range",
      text: "Your habits point to a good mental health score. Keep up your sleep and activity routines."
    };
  }
  if (score >= 5) {
    return {
      tone: "moderate",
      title: "Moderate range",
      text: "Your score sits in the middle. Small changes to screen time, sleep or activity could help."
    };
  }
  return {
    tone: "low",
    title: "Needs attention",
    text: "Your score is on the lower side. Consider reducing screen time and talking to someone you trust."
  };
}

function showError(title, message) {
  errorTitle.textContent = title;
  errorText.textContent = message;
  setState("error");
}

function countUp(target) {
  const duration = 1000;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    scoreValue.textContent = (target * eased).toFixed(2);
    if (progress < 1) countUpFrame = requestAnimationFrame(tick);
  }
  countUpFrame = requestAnimationFrame(tick);
}

function cancelCountUp() {
  if (countUpFrame) cancelAnimationFrame(countUpFrame);
  countUpFrame = null;
}

/* ==========================================================
   Error display helpers
   ========================================================== */
function showFieldErrors(errors) {
  Object.entries(errors).forEach(([name, message]) => {
    const el = document.getElementById(`error-${name}`);
    if (!el) return;
    el.textContent = message;
    const field = el.closest(".field");
    if (field) field.classList.add("invalid");
  });
}

function clearFieldError(name) {
  const el = document.getElementById(`error-${name}`);
  if (!el) return;
  el.textContent = "";
  const field = el.closest(".field");
  if (field) field.classList.remove("invalid");
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".field.invalid").forEach((el) => el.classList.remove("invalid"));
  formAlert.hidden = true;
  formAlert.textContent = "";
}

function showFormAlert(message) {
  formAlert.textContent = message;
  formAlert.hidden = false;
}

function focusFirstError(errors) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  const target = form.querySelector(`[name="${first}"]`);
  if (target) {
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function scrollToResultOnSmallScreens() {
  if (window.matchMedia("(max-width: 900px)").matches) {
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
