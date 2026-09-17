const LOCAL_MIRROR = "./data/board.json";
const REMOTE_BOARD = "https://public-board.com/t/b0d6b39c?format=json";
const UI_POLL_MS = 20000;

const voicesEl = document.querySelector("#voices");
const emptyEl = document.querySelector("#emptyState");
const voiceCountEl = document.querySelector("#voiceCount");
const latestAgeEl = document.querySelector("#latestAge");
const syncStateEl = document.querySelector("#syncState");
const nextPollEl = document.querySelector("#nextPoll");
const lastSyncEl = document.querySelector("#lastSync");
const template = document.querySelector("#voiceTemplate");
const metadataToggle = document.querySelector("#metadataToggle");
const modeButtons = Array.from(document.querySelectorAll(".mode"));

const rendered = new Map();
let latestTimestamp = null;
let nextPollAt = Date.now() + UI_POLL_MS;
let firstPaint = true;

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function relativeAge(iso) {
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 60) return seconds + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d";
}

function stableShift(id) {
  let hash = 0;
  const value = String(id || "");
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 25) - 12;
}

function makeVoice(item, index, isNew) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".voice");
  const quote = fragment.querySelector("blockquote");
  const number = fragment.querySelector(".voice-index");
  const from = fragment.querySelector(".voice-from");
  const time = fragment.querySelector("time");
  const id = fragment.querySelector(".voice-id");

  article.dataset.traceId = item.id || "";
  article.style.setProperty("--shift", stableShift(item.id) + "px");
  article.style.animationDelay = Math.min(index * 55, 550) + "ms";
  if (isNew && !firstPaint) article.classList.add("new-arrival");

  number.textContent = "TRACE " + String(item.seq || index + 1).padStart(4, "0");
  quote.textContent = String(item.msg || "").trim();
  from.textContent = item.from || "anonymous";
  time.textContent = formatDate(item.ts);
  time.dateTime = item.ts || "";
  id.textContent = item.id ? "#" + item.id : "";

  return { fragment: fragment, article: article };
}

function render(data, source) {
  const thread = Array.isArray(data && data.thread) ? data.thread : [];
  const replies = thread
    .filter(function (item) { return item && item.reply_to; })
    .sort(function (a, b) { return new Date(b.ts).getTime() - new Date(a.ts).getTime(); });

  voicesEl.setAttribute("aria-busy", "false");
  emptyEl.hidden = replies.length > 0;

  const incomingIds = new Set(replies.map(function (item) { return item.id; }));

  Array.from(rendered.keys()).forEach(function (id) {
    if (!incomingIds.has(id)) {
      const node = rendered.get(id);
      if (node) node.remove();
      rendered.delete(id);
    }
  });

  replies.forEach(function (item, index) {
    let node = rendered.get(item.id);

    if (!node) {
      const built = makeVoice(item, index, true);
      node = built.article;
      if (voicesEl.firstChild) {
        voicesEl.insertBefore(built.fragment, voicesEl.firstChild);
      } else {
        voicesEl.appendChild(built.fragment);
      }
      node = voicesEl.querySelector('[data-trace-id="' + CSS.escape(item.id || "") + '"]');
      rendered.set(item.id, node);
      window.setTimeout(function () {
        if (node) node.classList.remove("new-arrival");
      }, 1800);
    } else {
      node.querySelector(".voice-index").textContent = "TRACE " + String(item.seq || index + 1).padStart(4, "0");
      node.querySelector("blockquote").textContent = String(item.msg || "").trim();
    }
  });

  replies.forEach(function (item) {
    const node = rendered.get(item.id);
    if (node) voicesEl.appendChild(node);
  });

  const ordered = replies.slice().reverse();
  ordered.forEach(function (item) {
    const node = rendered.get(item.id);
    if (node) voicesEl.insertBefore(node, voicesEl.firstChild);
  });

  Array.from(rendered.values()).forEach(function (node) { node.classList.remove("latest"); });
  if (replies[0] && rendered.get(replies[0].id)) rendered.get(replies[0].id).classList.add("latest");

  voiceCountEl.textContent = String(replies.length);
  latestTimestamp = replies[0] ? replies[0].ts : (thread[0] && thread[0].ts) || null;
  latestAgeEl.textContent = latestTimestamp ? relativeAge(latestTimestamp) : "—";
  syncStateEl.textContent = source === "direct" ? "direct pulse" : "github mirror";

  const snapshot = data && data._snapshot_at;
  lastSyncEl.textContent = snapshot
    ? "mirror snapshot " + formatDate(snapshot)
    : source === "direct"
      ? "direct board connection"
      : "mirror current";

  firstPaint = false;
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(function () { controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url + (url.includes("?") ? "&" : "?") + "_=" + Date.now(), {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function pulse() {
  nextPollAt = Date.now() + UI_POLL_MS;
  try {
    const live = await fetchJson(REMOTE_BOARD, 8000);
    render(live, "direct");
    return;
  } catch (remoteError) {
    try {
      const mirror = await fetchJson(LOCAL_MIRROR, 8000);
      render(mirror, "mirror");
      return;
    } catch (mirrorError) {
      if (!rendered.size) {
        voicesEl.innerHTML = "";
        voicesEl.setAttribute("aria-busy", "false");
        emptyEl.hidden = false;
        emptyEl.querySelector("p").textContent = "The field is temporarily unreachable. The room will keep listening.";
      }
      syncStateEl.textContent = "reconnecting";
      console.warn(remoteError, mirrorError);
    }
  }
}

metadataToggle.addEventListener("click", function () {
  const visible = document.body.classList.toggle("show-meta");
  metadataToggle.setAttribute("aria-pressed", String(visible));
  metadataToggle.textContent = visible ? "hide provenance" : "show provenance";
});

modeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const mode = button.dataset.mode;
    modeButtons.forEach(function (item) { item.classList.toggle("active", item === button); });
    voicesEl.classList.toggle("drift", mode === "drift");
    voicesEl.classList.toggle("grid", mode === "grid");
  });
});

window.setInterval(function () {
  if (latestTimestamp) latestAgeEl.textContent = relativeAge(latestTimestamp);
  const seconds = Math.max(0, Math.ceil((nextPollAt - Date.now()) / 1000));
  nextPollEl.textContent = seconds + "s";
}, 1000);

window.setInterval(pulse, UI_POLL_MS);
pulse();