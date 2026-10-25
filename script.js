const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const alarmInput = document.getElementById("alarm-input");
const list = document.getElementById("todo-list");
const count = document.getElementById("count");
const clock = document.getElementById("clock");
const nextAlarm = document.getElementById("next-alarm");
const banner = document.getElementById("banner");
const bannerText = document.getElementById("banner-text");
const stopBtn = document.getElementById("stop-btn");

let todos = JSON.parse(localStorage.getItem("todos")) || [];
let audioCtx = null;
let alarmInterval = null;

function save() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

// Format milliseconds as HH:MM:SS
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h + ":" + m + ":" + s;
}

// Play 3 short beeps using the browser (no sound file needed)
function beep() {
  if (!audioCtx) return;
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const start = audioCtx.currentTime + i * 0.3;
    osc.start(start);
    osc.stop(start + 0.18);
  }
}

function ring(todo) {
  todo.rung = true;
  save();
  bannerText.textContent = "⏰ Time for: " + todo.text;
  banner.classList.remove("hidden");
  beep();
  clearInterval(alarmInterval);
  alarmInterval = setInterval(beep, 1500);
  render();
}

stopBtn.addEventListener("click", () => {
  clearInterval(alarmInterval);
  banner.classList.add("hidden");
});

function render() {
  list.innerHTML = "";
  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.className = "task flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 transition hover:bg-gray-100";

    const left = document.createElement("div");
    left.className = "flex-1 cursor-pointer";

    const span = document.createElement("span");
    span.textContent = todo.text;
    span.className = todo.done ? "line-through text-gray-400" : "text-gray-800";
    left.onclick = () => { todos[index].done = !todos[index].done; save(); render(); };
    left.appendChild(span);

    if (todo.alarmAt) {
      const info = document.createElement("div");
      info.className = "text-xs mt-1 text-purple-600";
      if (todo.rung) {
        info.textContent = "⏰ Alarm rang";
      } else {
        info.dataset.alarm = todo.alarmAt;
      }
      left.appendChild(info);
    }

    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "text-red-500 hover:text-red-700 ml-2";
    del.onclick = () => { todos.splice(index, 1); save(); render(); };

    li.append(left, del);
    list.appendChild(li);
  });
  const remaining = todos.filter(t => !t.done).length;
  count.textContent = remaining + " task(s) left";
  tick();
}

// Runs every second: clock, countdowns, alarm check
function tick() {
  const now = Date.now();
  clock.textContent = new Date().toLocaleTimeString();

  let next = null;
  todos.forEach(t => {
    if (t.alarmAt && !t.rung && !t.done) {
      if (now >= t.alarmAt) {
        ring(t);
      } else if (!next || t.alarmAt < next.alarmAt) {
        next = t;
      }
    }
  });

  document.querySelectorAll("[data-alarm]").forEach(el => {
    const diff = Number(el.dataset.alarm) - now;
    el.textContent = diff > 0 ? "⏳ " + formatTime(diff) : "⏰ Time's up";
  });

  nextAlarm.textContent = next
    ? "Next alarm: " + next.text + " in " + formatTime(next.alarmAt - now)
    : "";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") return;

  // Clicking Add allows the browser to play sound later
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  let alarmAt = null;
  if (alarmInput.value) {
    const [h, m] = alarmInput.value.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); // time passed → tomorrow
    alarmAt = d.getTime();
  }

  todos.push({ text: text, done: false, alarmAt: alarmAt, rung: false });
  input.value = "";
  alarmInput.value = "";
  save();
  render();
});

document.getElementById("export-btn").onclick = () => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "todo-backup.json";
  a.click();
};

document.getElementById("import-input").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { todos = JSON.parse(reader.result); save(); render(); }
    catch { alert("Invalid backup file"); }
  };
  reader.readAsText(file);
};

render();
setInterval(tick, 1000);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();