import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jkydcpnmeawgxenekvzt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreWRjcG5tZWF3Z3hlbmVrdnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzA5NzksImV4cCI6MjA5NjAwNjk3OX0.wjzyEUZZWAmnDxads4qqwT9cDQY1RmIaf2zuCdj_fV8";

const TABLE_NAME = "pookie_love_taps";
const PEOPLE = ["person_one", "person_two"];
const DEFAULT_NAMES = {
  person_one: "Cem",
  person_two: "Daisy",
};
const STORAGE_KEY = "pookie-smelly-belly-state";
const CUTE_MESSAGES = [
  "Every tap is a tiny love letter.",
  "Daisy gets bonus sparkle points today.",
  "Cem is absolutely thinking about Daisy.",
  "This button contains scientifically suspicious amounts of love.",
  "Current pookie forecast: bright, silly, and very loved.",
  "A bad day cannot defeat this much cute.",
];
const PICK_ME_UPS = [
  "Official announcement: Daisy is extremely lovely and this has been independently verified.",
  "Take a breath. I am proud of you, I love you, and you do not have to solve everything today.",
  "Cyprus was proof that even ordinary moments become my favourites when I am with you.",
  "You deserve softness, snacks, a cuddle, and absolutely no nonsense today.",
  "Your smile is still my favourite notification.",
  "You are doing better than your worried brain is giving you credit for.",
];
const GAME_SECONDS = 20;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const elements = {
  status: document.querySelector("#cloudStatus"),
  lastTap: document.querySelector("#lastTap"),
  totalCount: document.querySelector("#totalCount"),
  cuteMessage: document.querySelector("#cuteMessage"),
  sync: document.querySelector("#syncButton"),
  reset: document.querySelector("#resetButton"),
  pickMeUp: document.querySelector("#pickMeUpButton"),
  pickMeUpMessage: document.querySelector("#pickMeUpMessage"),
  gameArena: document.querySelector("#gameArena"),
  gameHeart: document.querySelector("#gameHeart"),
  gameMessage: document.querySelector("#gameMessage"),
  gameStart: document.querySelector("#gameStartButton"),
  gameTime: document.querySelector("#gameTime"),
  gameScore: document.querySelector("#gameScore"),
  gameBest: document.querySelector("#gameBest"),
  buttons: {
    person_one: document.querySelector("#personOneButton"),
    person_two: document.querySelector("#personTwoButton"),
  },
  counts: {
    person_one: document.querySelector("#personOneCount"),
    person_two: document.querySelector("#personTwoCount"),
  },
  names: {
    person_one: document.querySelector("#personOneName"),
    person_two: document.querySelector("#personTwoName"),
  },
};

let cloudReady = false;
let cloudWritable = false;
let state = loadLocalState();
let resetArmed = false;
let resetTimer = null;
let pickMeUpIndex = 0;
let gameActive = false;
let gameScore = 0;
let gameTime = GAME_SECONDS;
let gameTimer = null;

hydrateNames();
render();
attachEvents();
startRealtime();
syncFromCloud();

function attachEvents() {
  elements.buttons.person_one.addEventListener("click", (event) => {
    handleTap("person_one", event);
  });
  elements.buttons.person_two.addEventListener("click", (event) => {
    handleTap("person_two", event);
  });
  elements.sync.addEventListener("click", syncFromCloud);
  elements.reset.addEventListener("click", resetCounters);
  elements.pickMeUp.addEventListener("click", showPickMeUp);
  elements.gameStart.addEventListener("click", startGame);
  elements.gameHeart.addEventListener("click", catchHeart);

  for (const person of PEOPLE) {
    elements.names[person].addEventListener("input", () => {
      state.names[person] = elements.names[person].value.trim() || DEFAULT_NAMES[person];
      saveLocalState();
      render();
    });
  }
}

function showPickMeUp() {
  elements.pickMeUpMessage.textContent = PICK_ME_UPS[pickMeUpIndex % PICK_ME_UPS.length];
  pickMeUpIndex += 1;
  elements.pickMeUp.classList.add("is-popping");
  window.setTimeout(() => elements.pickMeUp.classList.remove("is-popping"), 180);
}

function startGame() {
  if (gameActive) {
    return;
  }

  gameActive = true;
  gameScore = 0;
  gameTime = GAME_SECONDS;
  elements.gameScore.textContent = "0";
  elements.gameTime.textContent = String(gameTime);
  elements.gameMessage.textContent = "Go, go, go!";
  elements.gameStart.textContent = "Love is flying";
  elements.gameStart.disabled = true;
  elements.gameArena.classList.add("is-playing");
  moveGameHeart();

  gameTimer = window.setInterval(() => {
    gameTime -= 1;
    elements.gameTime.textContent = String(gameTime);

    if (gameTime <= 0) {
      finishGame();
    }
  }, 1000);
}

function catchHeart() {
  if (!gameActive) {
    return;
  }

  gameScore += 1;
  elements.gameScore.textContent = String(gameScore);
  elements.gameHeart.classList.add("is-caught");
  window.setTimeout(() => elements.gameHeart.classList.remove("is-caught"), 120);
  moveGameHeart();
}

function moveGameHeart() {
  const padding = 18;
  const maxX = Math.max(padding, elements.gameArena.clientWidth - elements.gameHeart.offsetWidth - padding);
  const maxY = Math.max(padding, elements.gameArena.clientHeight - elements.gameHeart.offsetHeight - padding);
  const x = padding + Math.random() * (maxX - padding);
  const y = padding + Math.random() * (maxY - padding);

  elements.gameHeart.style.left = `${x}px`;
  elements.gameHeart.style.top = `${y}px`;
}

function finishGame() {
  window.clearInterval(gameTimer);
  gameTimer = null;
  gameActive = false;
  elements.gameArena.classList.remove("is-playing");
  elements.gameStart.disabled = false;
  elements.gameStart.textContent = "Play again";

  if (gameScore > state.gameBest) {
    state.gameBest = gameScore;
    saveLocalState();
    elements.gameBest.textContent = String(state.gameBest);
    elements.gameMessage.textContent = `New best: ${gameScore}! Daisy has elite heart-catching skills.`;
    return;
  }

  elements.gameMessage.textContent = `You caught ${gameScore} hearts. Very impressive pookie work.`;
}

async function resetCounters() {
  if (!resetArmed) {
    resetArmed = true;
    elements.reset.textContent = "Press again";
    setStatus("Reset ready", "loading");
    resetTimer = window.setTimeout(disarmReset, 3500);
    return;
  }

  disarmReset();

  state.counts = { person_one: 0, person_two: 0 };
  state.lastTap = null;
  saveLocalState();
  render();
  setStatus("Resetting memory", "loading");

  const { error } = await supabase.from(TABLE_NAME).delete().in("person", PEOPLE);

  if (error) {
    cloudReady = false;
    cloudWritable = false;
    setStatus("Reset on this device", "local");
    return;
  }

  cloudReady = true;
  cloudWritable = true;
  setStatus("Cloud reset done", "cloud");
}

function disarmReset() {
  resetArmed = false;
  elements.reset.textContent = "Reset";

  if (resetTimer) {
    window.clearTimeout(resetTimer);
    resetTimer = null;
  }
}

async function handleTap(person, event) {
  const button = elements.buttons[person];
  state.counts[person] += 1;
  state.lastTap = {
    person,
    at: new Date().toISOString(),
  };
  saveLocalState();
  render();
  popButton(button);
  burstHeart(event);
  maybeCelebrateMilestone();

  const { error } = await supabase.from(TABLE_NAME).insert({
    person,
    label: state.names[person],
  });

  if (error) {
    cloudReady = false;
    cloudWritable = false;
    setStatus("Saved on this device", "local");
    return;
  }

  cloudReady = true;
  cloudWritable = true;
  setStatus("Cloud memory on", "cloud");
  await syncFromCloud({ quiet: true, preserveStatus: true });
  setStatus("Cloud memory on", "cloud");
}

async function syncFromCloud(options = {}) {
  if (!options.quiet) {
    setStatus("Checking cloud", "loading");
  }

  const nextCounts = {};

  for (const person of PEOPLE) {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select("id", { count: "exact", head: true })
      .eq("person", person);

    if (error) {
      cloudReady = false;
      cloudWritable = false;
      setStatus("Local memory on", "local");
      render();
      return;
    }

    nextCounts[person] = count ?? 0;
  }

  const { data: latestTap } = await supabase
    .from(TABLE_NAME)
    .select("person, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  state.counts = {
    person_one: Math.max(nextCounts.person_one, state.counts.person_one),
    person_two: Math.max(nextCounts.person_two, state.counts.person_two),
  };

  if (latestTap?.person && latestTap?.created_at) {
    const localTapTime = state.lastTap ? new Date(state.lastTap.at).getTime() : 0;
    const cloudTapTime = new Date(latestTap.created_at).getTime();

    if (cloudTapTime >= localTapTime) {
      state.lastTap = {
        person: latestTap.person,
        at: latestTap.created_at,
      };
    }
  }

  cloudReady = true;
  saveLocalState();
  if (!options.preserveStatus) {
    setStatus(cloudWritable ? "Cloud memory on" : "Cloud counts loaded", "cloud");
  }
  render();
}

function startRealtime() {
  supabase
    .channel("pookie-love-taps")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE_NAME },
      () => syncFromCloud({ quiet: true }),
    )
    .subscribe();
}

function render() {
  const total = state.counts.person_one + state.counts.person_two;
  elements.totalCount.textContent = total.toLocaleString();
  elements.cuteMessage.textContent = CUTE_MESSAGES[total % CUTE_MESSAGES.length];
  elements.gameBest.textContent = String(state.gameBest);

  for (const person of PEOPLE) {
    const displayName = state.names[person] || DEFAULT_NAMES[person];
    elements.buttons[person].querySelector(".circle-name").textContent = displayName;
    elements.names[person].value = displayName;
    elements.counts[person].textContent = state.counts[person].toLocaleString();
    elements.counts[person].classList.toggle("is-large", state.counts[person] >= 1000);
    elements.counts[person].classList.toggle("is-huge", state.counts[person] >= 100000);
  }

  if (!state.lastTap) {
    elements.lastTap.textContent = "No taps yet today";
    return;
  }

  const name = state.names[state.lastTap.person] || DEFAULT_NAMES[state.lastTap.person];
  const date = new Date(state.lastTap.at);
  elements.lastTap.textContent = `${name} last tapped ${date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function maybeCelebrateMilestone() {
  const total = state.counts.person_one + state.counts.person_two;

  if (total > 0 && total % 10 === 0) {
    const banner = document.createElement("div");
    banner.className = "milestone-toast";
    banner.textContent = `${total.toLocaleString()} love taps. You and Daisy are unstoppable.`;
    document.body.append(banner);
    window.setTimeout(() => banner.remove(), 2400);
  }
}

function hydrateNames() {
  for (const person of PEOPLE) {
    state.names[person] ||= DEFAULT_NAMES[person];
  }
}

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      counts: {
        person_one: Number(saved?.counts?.person_one) || 0,
        person_two: Number(saved?.counts?.person_two) || 0,
      },
      names: {
        person_one: migrateSavedName(saved?.names?.person_one, "Me", DEFAULT_NAMES.person_one),
        person_two: migrateSavedName(
          saved?.names?.person_two,
          "My Pookie",
          DEFAULT_NAMES.person_two,
        ),
      },
      lastTap: saved?.lastTap || null,
      gameBest: Number(saved?.gameBest) || 0,
    };
  } catch {
    return {
      counts: { person_one: 0, person_two: 0 },
      names: { ...DEFAULT_NAMES },
      lastTap: null,
      gameBest: 0,
    };
  }
}

function migrateSavedName(savedName, oldDefault, newDefault) {
  if (!savedName || savedName === oldDefault) {
    return newDefault;
  }

  return savedName;
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setStatus(text, mode) {
  elements.status.textContent = text;
  elements.status.dataset.mode = mode;
  elements.status.setAttribute(
    "aria-label",
    cloudReady ? "Cloud memory is connected" : "Cloud memory is not connected",
  );
}

function popButton(button) {
  button.classList.add("is-popping");
  window.setTimeout(() => button.classList.remove("is-popping"), 180);
}

function burstHeart(event) {
  const heart = document.createElement("span");
  heart.className = "heart-burst";
  heart.textContent = "♥";
  heart.setAttribute("aria-hidden", "true");
  heart.style.left = `${event.clientX}px`;
  heart.style.top = `${event.clientY}px`;
  document.body.append(heart);
  window.setTimeout(() => heart.remove(), 900);
}
