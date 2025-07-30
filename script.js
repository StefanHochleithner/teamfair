const scriptURL = "https://script.google.com/macros/s/AKfycbzMxNlPal3W6ydsgk_68uDONVLkG8jnHeWA7bCw49ua6qRhtUfUwQTuJJa5Z3JUDDK-4w/exec";

// Spieltage (Montag ab 28.07.2025)
function getNextMondays(count, startDate = new Date("2025-07-28")) {
  const mondays = [];
  let date = new Date(startDate);
  date.setHours(0, 0, 0, 0);
  // sicherstellen, dass date auf den nächsten Montag gesetzt ist
  date.setDate(date.getDate() + ((1 - date.getDay() + 7) % 7));
  for (let i = 0; i < count; i++) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return mondays;
}

function initMatchdays() {
  const select = document.getElementById("matchday");
  const mondays = getNextMondays(20);
  mondays.forEach(date => {
    const iso = date.toISOString().slice(0, 10);
    const option = document.createElement("option");
    option.value = iso;
    option.textContent = date.toLocaleDateString("de-AT", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    select.appendChild(option);
  });
  select.selectedIndex = 0;
  renderRatingInputs();
  select.addEventListener("change", renderRatingInputs);
}

async function renderRatingInputs() {
  const container = document.getElementById("bewertungContainer");
  const matchday = document.getElementById("matchday").value;

  let ratings = {};
  try {
    const response = await fetch(`${scriptURL}?matchday=${matchday}`);
    if (!response.ok) throw new Error("Netzwerkfehler");
    ratings = await response.json();
  } catch (e) {
    console.warn("Konnte Bewertungen nicht laden:", e);
  }

  container.innerHTML = "";
  allPlayers.forEach(name => {
    const div = document.createElement("div");
    div.className = "spieler";
    div.innerHTML = `
      <label>${name}</label>
      <input class="bewertung" type="number" min="0" max="10" step="0.5" value="${ratings[name] ?? ''}" data-name="${name}" />
    `;
    container.appendChild(div);
  });
}

async function saveRatings() {
  const matchday = document.getElementById("matchday").value;
  const inputs = document.querySelectorAll(".bewertung");
  const ratings = {};
  inputs.forEach(input => {
    const name = input.dataset.name;
    const val = parseFloat(input.value);
    if (!isNaN(val)) ratings[name] = val;
  });

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify({ matchday, ratings }),
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Fehler beim Speichern");
    alert("✅ Bewertungen gespeichert!");
  } catch (e) {
    alert("⚠️ Fehler beim Speichern der Bewertungen: " + e.message);
  }
}

async function generateTeams() {
  const matchday = document.getElementById("matchday").value;
  let ratings = {};
  try {
    const response = await fetch(`${scriptURL}?matchday=${matchday}`);
    if (!response.ok) throw new Error("Netzwerkfehler");
    ratings = await response.json();
  } catch (e) {
    alert("⚠️ Bewertungen konnten nicht geladen werden: " + e.message);
    return;
  }

  const bewerteteSpieler = allPlayers.filter(p => ratings[p] !== undefined);
  if (bewerteteSpieler.length < 2) {
    alert("Mindestens 2 bewertete Spieler nötig für Teamaufteilung.");
    return;
  }

  // Sortiere absteigend nach Rating (höhere Zahl = bessere Bewertung)
  bewerteteSpieler.sort((a, b) => ratings[b] - ratings[a]);

  const teamA = [];
  const teamB = [];
  let sumA = 0, sumB = 0;

  bewerteteSpieler.forEach(player => {
    if (sumA <= sumB) {
      teamA.push(player);
      sumA += ratings[player];
    } else {
      teamB.push(player);
      sumB += ratings[player];
    }
  });

  const container = document.getElementById("teamsContainer");
  container.innerHTML = `
    <div class="team"><strong>Team A (Summe: ${sumA.toFixed(1)}):</strong><br>${teamA.join(", ")}</div>
    <div class="team"><strong>Team B (Summe: ${sumB.toFixed(1)}):</strong><br>${teamB.join(", ")}</div>
  `;
}

// Exportiere Funktionen global, damit index.html sie aufrufen kann
window.initMatchdays = initMatchdays;
window.renderRatingInputs = renderRatingInputs;
window.saveRatings = saveRatings;
window.generateTeams = generateTeams;

// Initialisierung nach Laden
document.addEventListener("DOMContentLoaded", () => {
  initMatchdays();
});
