const DEFAULT_CONFIG = {
  rangeMs: 86400000, // 24h
  dataTypes: {
    cache: true,
    cookies: true,
    history: false,
    downloads: true,
    formData: false,
    localStorage: false
  },
  protectedDomains: ["google.com", "github.com"],
  scheduleMinutes: 0,
  cleanOnStartup: false
};

function domainMatches(cookieDomain, protectedList) {
  const clean = String(cookieDomain || "").replace(/^\./, "").toLowerCase();
  return protectedList.some(p => {
    const target = String(p || "").trim().toLowerCase().replace(/^\./, "");
    return target && (clean === target || clean.endsWith(`.${target}`));
  });
}

async function runSweep(override) {
  const { sc_config = DEFAULT_CONFIG, sc_log = [] } = await chrome.storage.local.get(["sc_config", "sc_log"]);
  const cfg = { ...DEFAULT_CONFIG, ...sc_config, ...(override || {}) };
  const since = cfg.rangeMs === 0 ? 0 : Date.now() - cfg.rangeMs;
  const dt = cfg.dataTypes || DEFAULT_CONFIG.dataTypes;

  let removedCookies = 0;
  let preservedCookies = 0;

  if (dt.cookies) {
    const allCookies = await chrome.cookies.getAll({});
    for (const c of allCookies) {
      if (domainMatches(c.domain, cfg.protectedDomains || [])) {
        preservedCookies++;
        continue;
      }
      const proto = c.secure ? "https://" : "http://";
      const host = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      try {
        await chrome.cookies.remove({
          url: `${proto}${host}${c.path}`,
          name: c.name,
          storeId: c.storeId
        });
        removedCookies++;
      } catch {
        // Ignore protected browser cookies
      }
    }
  }

  const removeTypes = {};
  if (dt.cache) removeTypes.cache = true;
  if (dt.history) removeTypes.history = true;
  if (dt.downloads) removeTypes.downloads = true;
  if (dt.formData) removeTypes.formData = true;
  if (dt.localStorage) removeTypes.localStorage = true;

  const clearedKeys = Object.keys(removeTypes);
  if (clearedKeys.length > 0) {
    const opts = { since };
    if (dt.localStorage && (cfg.protectedDomains || []).length) {
      opts.excludeOrigins = cfg.protectedDomains.flatMap(d => [`https://${d}`, `https://www.${d}`]);
    }
    await chrome.browsingData.remove(opts, removeTypes);
  }

  const entry = {
    at: Date.now(),
    types: [...clearedKeys, ...(dt.cookies ? ["cookies"] : [])],
    removedCookies,
    preservedCookies
  };
  await chrome.storage.local.set({ sc_log: [entry, ...sc_log].slice(0, 30) });
  return { ok: true, entry };
}

async function syncAlarm() {
  const { sc_config = DEFAULT_CONFIG, aris_pro_sweepclean } = await chrome.storage.local.get(["sc_config", "aris_pro_sweepclean"]);
  await chrome.alarms.clear("sweepclean-auto");
  if (aris_pro_sweepclean?.tier === "pro" && sc_config.scheduleMinutes > 0) {
    chrome.alarms.create("sweepclean-auto", { periodInMinutes: Number(sc_config.scheduleMinutes) });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const { sc_config } = await chrome.storage.local.get("sc_config");
  if (!sc_config) await chrome.storage.local.set({ sc_config: DEFAULT_CONFIG });
  await syncAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  const { sc_config = DEFAULT_CONFIG, aris_pro_sweepclean } = await chrome.storage.local.get(["sc_config", "aris_pro_sweepclean"]);
  if (aris_pro_sweepclean?.tier === "pro" && sc_config.cleanOnStartup) {
    await runSweep();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sweepclean-auto") {
    await runSweep();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SWEEPCLEAN_RUN") {
    runSweep(msg.override).then(sendResponse).catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg?.type === "SWEEPCLEAN_SYNC_ALARM") {
    syncAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "SWEEPCLEAN_STATS") {
    chrome.cookies.getAll({}).then(all => {
      sendResponse({ ok: true, totalCookies: all.length });
    });
    return true;
  }
});
