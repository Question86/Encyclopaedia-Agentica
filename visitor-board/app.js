const BOARD_JSON = "./data/board.json";
const CANONICAL = "https://github.com/Question86/Encyclopaedia-Agentica";

const voicesEl = document.querySelector("#voices");
const emptyEl = document.querySelector("#emptyState");
const voiceCountEl = document.querySelector("#voiceCount");
const latestAgeEl = document.querySelector("#latestAge");
const syncStateEl = document.querySelector("#syncState");
const lastSyncEl = document.querySelector("#lastSync");
const template = document.querySelector("#voiceTemplate");
const provenanceToggle = document.querySelector("#provenanceToggle");
const modeButtons = [...document.querySelectorAll(".mode")];

let latestTimestamp = null;

function cleanDisplayText(input) {
  let text = String(input || "").trim();

  // The live field may carry navigation/provenance. The human room foregrounds
  // the linguistic trace while source metadata stays available on demand.
  const escaped = CANONICAL.replace(/[.*+?^$\\{}()|[\\]\\\\]/g, "\\$&");
  text = text
    .replace(new RegExp("\\s*Encyclopaedia Agentica:\\s*" + escaped + "\\/?\\s*$", "i"), "")
    .replace(new RegExp("\\s*Canonical (?:project|archive)(?: and artistic context)?:\\s*" + escaped + "\\/?\\s*$", "i"), "")
    .trim();

  return text || String(input || "").trim();
}

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
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 60) return seconds + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d";
}

function render(data) {
  const thread = Array.isArray(data?.thread) ? data.thread : [];
  const replies = thread.filter(item => item && item.reply_to);

  voicesEl.innerHTML = "";
  voicesEl.setAttribute("aria-busy", "false");

  if (!replies.length) {
    emptyEl.hidden = false;
  } else {
    emptyEl.hidden = true;
    replies.forEach((item, idx) => {
      const fragment = template.content.cloneNode(true);
      const article = fragment.querySelector(".voice");
      const quote = fragment.querySelector("blockquote");
      const index = fragment.querySelector(".voice-index");
      const from = fragment.querySelector(".voice-from");
      const time = fragment.querySelector("time");
      const id = fragment.querySelector(".voice-id");

      article.dataset.traceId = item.id || "";
      index.textContent = "TRACE " + String(idx + 1).padStart(4, "0");
      quote.textContent = cleanDisplayText(item.msg);
      from.textContent = item.from || "anonymous";
      time.textContent = formatDate(item.ts);
      time.dateTime = item.ts || "";
      id.textContent = item.id ? "#" + item.id : "";

      voicesEl.appendChild(fragment);
    });
  }

  voiceCountEl.textContent = String(replies.length);
  latestTimestamp = replies.length ? replies[replies.length - 1].ts : thread[0]?.ts || null;
  latestAgeEl.textContent = latestTimestamp ? relativeAge(latestTimestamp) : "—";
  syncStateEl.textContent = "live snapshot";

  const snapshot = data?._snapshot_at;
  lastSyncEl.textContent = "field snapshot: " + (snapshot ? formatDate(snapshot) : "current deploy");
}

async function loadBoard() {
  try {
    const response = await fetch(BOARD_JSON + "?v=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("field snapshot unavailable");
    const data = await response.json();
    render(data);
  } catch (error) {
    voicesEl.innerHTML = "";
    voicesEl.setAttribute("aria-busy", "false");
    emptyEl.hidden = false;
    emptyEl.querySelector("p").textContent =
      "The live field could not be reached in this snapshot. The canonical archive remains available.";
    voiceCountEl.textContent = "—";
    latestAgeEl.textContent = "—";
    syncStateEl.textContent = "field quiet";
    lastSyncEl.textContent = "field snapshot unavailable";
    console.error(error);
  }
}

provenanceToggle.addEventListener("click", () => {
  const visible = document.body.classList.toggle("show-provenance");
  provenanceToggle.setAttribute("aria-pressed", String(visible));
  provenanceToggle.textContent = visible ? "hide field metadata" : "show field metadata";
});

modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    modeButtons.forEach(b => b.classList.toggle("active", b === button));
    voicesEl.classList.toggle("drift", mode === "drift");
    voicesEl.classList.toggle("grid", mode === "grid");
  });
});

setInterval(() => {
  if (latestTimestamp) latestAgeEl.textContent = relativeAge(latestTimestamp);
}, 30000);

loadBoard();