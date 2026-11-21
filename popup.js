import { BillingManager } from "./lib/billing.js";
import { BILLING_CONFIG } from "./lib/billing-config.js";

const FREE_PROTECT_LIMIT = 5;
const DEFAULT_CONFIG = {
  rangeMs: 86400000,
  dataTypes: { cache: true, cookies: true, history: false, downloads: true, formData: false, localStorage: false },
  protectedDomains: ["google.com", "github.com"],
  scheduleMinutes: 0,
  cleanOnStartup: false
};

const PROFILES = {
  dev: { rangeMs: 3600000, dataTypes: { cache: true, cookies: false, history: false, downloads: false, localStorage: true, formData: false } },
  deep: { rangeMs: 0, dataTypes: { cache: true, cookies: true, history: true, downloads: true, localStorage: true, formData: true } },
  work: { rangeMs: 86400000, dataTypes: { cache: true, cookies: true, history: false, downloads: true, localStorage: false, formData: false } }
};

const billing = new BillingManager(BILLING_CONFIG);
let config = structuredClone(DEFAULT_CONFIG);
let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
}

function requirePro(label) {
  if (billing.isPro()) return true;
  showToast(`${label} requires SweepClean Pro.`);
  switchTab("pro");
  return false;
}

async function save() {
  await chrome.storage.local.set({ sc_config: config });
  await chrome.runtime.sendMessage({ type: "SWEEPCLEAN_SYNC_ALARM" });
  render();
}

async function refreshStats() {
  const res = await chrome.runtime.sendMessage({ type: "SWEEPCLEAN_STATS" });
  if (res?.ok) document.getElementById("cookieCount").textContent = String(res.totalCookies);
  const { sc_log = [] } = await chrome.storage.local.get("sc_log");
  const logEl = document.getElementById("logList");
  logEl.innerHTML = sc_log.length ? "" : `<div class="muted">No sweeps recorded yet.</div>`;
  for (const item of sc_log.slice(0, 8)) {
    const row = document.createElement("div");
    row.className = "list-item";
    const t = new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    row.innerHTML = `<div class="list-item-main"><div style="font-weight:600;">${item.types.join(", ")}</div><div class="muted">${t} · ${item.removedCookies} cookies cleared, ${item.preservedCookies} protected</div></div>`;
    logEl.appendChild(row);
  }
}

function render() {
  const pill = document.getElementById("tierPill");
  pill.textContent = billing.isPro() ? "PRO" : "FREE";
  pill.classList.toggle("pro", billing.isPro());

  document.getElementById("rangeSelect").value = String(config.rangeMs);
  document.getElementById("scheduleSelect").value = String(config.scheduleMinutes || 0);
  document.getElementById("startupToggle").checked = !!config.cleanOnStartup;
  document.getElementById("protectedCount").textContent = String(config.protectedDomains.length);

  document.querySelectorAll("[data-dt]").forEach(cb => {
    cb.checked = !!config.dataTypes[cb.dataset.dt];
  });

  const list = document.getElementById("protectedList");
  list.innerHTML = config.protectedDomains.length ? "" : `<div class="muted" style="text-align:center;padding:12px;">No protected domains yet.</div>`;
  for (const dom of config.protectedDomains) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<div class="list-item-main truncate">🛡️ ${dom}</div><button class="btn btn-danger btn-sm">Remove</button>`;
    item.querySelector("button").addEventListener("click", () => {
      config.protectedDomains = config.protectedDomains.filter(d => d !== dom);
      save();
    });
    list.appendChild(item);
  }
}

async function init() {
  await billing.init();
  const { sc_config } = await chrome.storage.local.get("sc_config");
  if (sc_config) config = { ...DEFAULT_CONFIG, ...sc_config, dataTypes: { ...DEFAULT_CONFIG.dataTypes, ...(sc_config.dataTypes || {}) } };

  document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  document.getElementById("tierPill").addEventListener("click", () => switchTab("pro"));
  billing.mountProPanel(document.getElementById("panel-pro"), { onToast: showToast, onTierChange: render });

  document.getElementById("rangeSelect").addEventListener("change", e => {
    config.rangeMs = Number(e.target.value);
    save();
  });
  document.querySelectorAll("[data-dt]").forEach(cb => {
    cb.addEventListener("change", () => {
      config.dataTypes[cb.dataset.dt] = cb.checked;
      save();
    });
  });

  document.getElementById("sweepNowBtn").addEventListener("click", async () => {
    const btn = document.getElementById("sweepNowBtn");
    btn.disabled = true;
    btn.textContent = "Sweeping...";
    const res = await chrome.runtime.sendMessage({ type: "SWEEPCLEAN_RUN" });
    btn.disabled = false;
    btn.textContent = "Sweep Selected Data Now";
    if (res?.ok) {
      showToast(`Cleaned! ${res.entry.removedCookies} cookies removed, ${res.entry.preservedCookies} kept safe.`);
      await refreshStats();
    } else {
      showToast(res?.error || "Sweep failed.");
    }
  });

  async function addProtected(raw) {
    const dom = String(raw || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    if (!dom || !dom.includes(".")) return showToast("Enter a valid domain (e.g. github.com).");
    if (config.protectedDomains.includes(dom)) return showToast("Already protected.");
    if (!billing.isPro() && config.protectedDomains.length >= FREE_PROTECT_LIMIT) {
      return requirePro(`More than ${FREE_PROTECT_LIMIT} protected domains`);
    }
    config.protectedDomains.unshift(dom);
    await save();
    showToast(`Protected ${dom}`);
  }

  document.getElementById("addDomainBtn").addEventListener("click", () => {
    const inp = document.getElementById("domainInput");
    addProtected(inp.value);
    inp.value = "";
  });

  document.getElementById("protectCurrentBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const host = new URL(tab.url).hostname;
      addProtected(host);
    } catch {
      showToast("Open an HTTP/HTTPS tab to protect its domain.");
    }
  });

  document.querySelectorAll("[data-profile]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!requirePro("Quick Cleaning Profiles")) return;
      const res = await chrome.runtime.sendMessage({ type: "SWEEPCLEAN_RUN", override: PROFILES[btn.dataset.profile] });
      if (res?.ok) {
        showToast(`Ran ${btn.dataset.profile} profile!`);
        refreshStats();
      }
    });
  });

  document.getElementById("scheduleSelect").addEventListener("change", e => {
    const mins = Number(e.target.value);
    if (mins > 0 && !requirePro("Scheduled Auto-Sweep")) {
      e.target.value = "0";
      return;
    }
    config.scheduleMinutes = mins;
    save();
  });

  document.getElementById("startupToggle").addEventListener("change", e => {
    if (e.target.checked && !requirePro("Clean on Startup")) {
      e.target.checked = false;
      return;
    }
    config.cleanOnStartup = e.target.checked;
    save();
  });

  render();
  refreshStats();
}

init();
