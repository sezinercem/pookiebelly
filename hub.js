import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jkydcpnmeawgxenekvzt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreWRjcG5tZWF3Z3hlbmVrdnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzA5NzksImV4cCI6MjA5NjAwNjk3OX0.wjzyEUZZWAmnDxads4qqwT9cDQY1RmIaf2zuCdj_fV8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TAP_TABLE = "pookie_love_taps";
const MESSAGE_TABLE = "pookie_messages";
const MISSIONS = [
  "Send one photo from your day and one sentence about why it made you think of each other.",
  "Plan a Cyprus-style evening: warm food, no stress, and one memory each.",
  "Pick a film, bring snacks, and agree that pausing for cuddles is allowed.",
  "Each leave a message in the postbox that the other person can find later.",
  "Go for a little walk and choose one future trip you want to take together.",
  "Make a tiny playlist with three songs that feel like us.",
];

const elements = {
  cemCount: document.querySelector("#hubCemCount"),
  daisyCount: document.querySelector("#hubDaisyCount"),
  totalCount: document.querySelector("#hubTotalCount"),
  messageList: document.querySelector("#hubMessageList"),
  form: document.querySelector("#hubMessageForm"),
  from: document.querySelector("#hubMessageFrom"),
  text: document.querySelector("#hubMessageText"),
  missionText: document.querySelector("#dateMissionText"),
  missionButton: document.querySelector("#dateMissionButton"),
};

let missionIndex = Number(localStorage.getItem("pookie-mission-index")) || 0;

elements.form.addEventListener("submit", sendHubMessage);
elements.missionButton.addEventListener("click", pickMission);

await Promise.all([loadCounts(), loadMessages()]);
startRealtime();

async function loadCounts() {
  const [cem, daisy] = await Promise.all([countTaps("person_one"), countTaps("person_two")]);
  const localState = loadLocalState();
  const cemCount = Math.max(cem, localState.counts.person_one);
  const daisyCount = Math.max(daisy, localState.counts.person_two);

  elements.cemCount.textContent = cemCount.toLocaleString();
  elements.daisyCount.textContent = daisyCount.toLocaleString();
  elements.totalCount.textContent = (cemCount + daisyCount).toLocaleString();
}

async function countTaps(person) {
  const { count, error } = await supabase
    .from(TAP_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("person", person);

  if (error) {
    return 0;
  }

  return count || 0;
}

async function loadMessages() {
  const { data, error } = await supabase
    .from(MESSAGE_TABLE)
    .select("from_name, to_name, body, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    renderMessages(loadLocalMessages());
    return;
  }

  localStorage.setItem("pookie-messages", JSON.stringify(data || []));
  renderMessages(data || []);
}

async function sendHubMessage(event) {
  event.preventDefault();
  const body = elements.text.value.trim();

  if (!body) {
    elements.text.focus();
    return;
  }

  const fromName = elements.from.value;
  const toName = fromName === "Cem" ? "Daisy" : "Cem";
  const message = {
    from_name: fromName,
    to_name: toName,
    body,
    created_at: new Date().toISOString(),
  };
  const messages = [message, ...loadLocalMessages()].slice(0, 12);
  localStorage.setItem("pookie-messages", JSON.stringify(messages));
  renderMessages(messages);
  elements.text.value = "";

  const { error } = await supabase.from(MESSAGE_TABLE).insert({
    from_name: fromName,
    to_name: toName,
    body,
  });

  if (!error) {
    await loadMessages();
  }
}

function renderMessages(messages) {
  if (!messages.length) {
    elements.messageList.innerHTML = '<p class="empty-message">No messages yet.</p>';
    return;
  }

  elements.messageList.innerHTML = messages
    .slice(0, 8)
    .map((message) => {
      const date = new Date(message.created_at).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return `<article class="hub-message-card">
        <div><strong>${escapeHtml(message.from_name)}</strong><span>to ${escapeHtml(message.to_name)}</span></div>
        <p>${escapeHtml(message.body)}</p>
        <time>${date}</time>
      </article>`;
    })
    .join("");
}

function pickMission() {
  elements.missionText.textContent = MISSIONS[missionIndex % MISSIONS.length];
  missionIndex += 1;
  localStorage.setItem("pookie-mission-index", String(missionIndex));
}

function startRealtime() {
  supabase
    .channel("hub-love-taps")
    .on("postgres_changes", { event: "*", schema: "public", table: TAP_TABLE }, loadCounts)
    .subscribe();

  supabase
    .channel("hub-messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: MESSAGE_TABLE }, loadMessages)
    .subscribe();
}

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem("pookie-smelly-belly-state"));
    return {
      counts: {
        person_one: Number(saved?.counts?.person_one) || 0,
        person_two: Number(saved?.counts?.person_two) || 0,
      },
    };
  } catch {
    return { counts: { person_one: 0, person_two: 0 } };
  }
}

function loadLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem("pookie-messages")) || [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
