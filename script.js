const scriptURL = "https://script.google.com/macros/s/AKfycbxMU3e7JAEHUZT-NJF3e1XjObNLQ--QqpkDzPOKViGuWxonr3XCSdT9UxY6NDfxMutNhw/exec";

// Steuere die UI-Phase nach Matchday-Selection
async function loadPhase() {
  const matchday = document.getElementById("matchday").value;
  const resp = await fetch(`${scriptURL}?action=getSelectedPlayers&matchday=${matchday}`);
  const selected = await resp.json();

  document.getElementById("setupContainer").classList.add("hidden");
  document.getElementById("ratingContainer").classList.add("hidden");
  document.getElementById("teamsContainer").innerHTML = "";

  if (selected.length === 0) {
    showSetupUI();
  } else {
    showRatingUI(selected);
  }
}

// SETUP-UI: Spieler-Auswahl und Team-Bildung
function showSetupUI() {
  const container = document.getElementById("checkboxContainer");
  container.innerHTML = "";
  allPlayers.forEach(name => {
    const id = `chk-${name.replace(/\s+/g, "-")}`;
    container.insertAdjacentHTML("beforeend", `
      <div>
        <input type="checkbox" id="${id}" value="${name}" />
        <label for="${id}">${name}</label>
      </div>
    `);
  });

  document.getElementById("setupContainer").classList.remove("hidden");
  document.getElementById("btnGenerateTeams").onclick = () => {
    const selected = getSelectedPlayersFromCheckbox();
    generateTeams(selected);
  };
  document.getElementById("btnSaveSelection").onclick = async () => {
    await saveSelection();
    await loadPhase();
  };
}

// RATING-UI: Nur selektierte Spieler bewerten
function showRatingUI(players) {
  const container = document.getElementById("bewertungContainer");
  container.innerHTML = "";
  players.forEach(name => {
    const id = `rating-${name.replace(/\s+/g, "-")}`;
    container.insertAdjacentHTML("beforeend", `
      <div class="spieler">
        <label for="${id}">${name}</label>
        <input class="bewertung" id="${id}" type="number" min="1" max="5" step="1" value="" data-name="${name}" />
      </div>
    `);
  });

  document.getElementById("ratingContainer").classList.remove("hidden");
  document.getElementById("btnSaveRatings").onclick = saveRatings;
}

// Helfer: Checkbox-Werte sammeln
function getSelectedPlayersFromCheckbox() {
  return Array.from(document.querySelectorAll("#checkboxContainer input:checked"))
    .map(cb => cb.value);
}

// Speicherung der Selektion (setSelectedPlayers)
async function saveSelection() {
  const matchday = document.getElementById("matchday").value;
  const players = getSelectedPlayersFromCheckbox();
  if (players.length === 0) {
    alert("Bitte mindestens einen Spieler auswählen.");
    return;
  }

  await fetch(scriptURL, {
    method: "POST",
    body: JSON.stringify({ action: "setSelectedPlayers", matchday, players }),
    headers: { "Content-Type": "application/json" }
  });
}

// Bewertungen speichern (addRatings)
async function saveRatings() {
  const matchday = document.getElementById("matchday").value;
  const inputs = document.querySelectorAll(".bewertung");
  const ratings = {};
  inputs.forEach(input => {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 5) {
      ratings[input.dataset.name] = val;
    }
  });

  if (Object.keys(ratings).length === 0) {
    alert("Bitte mindestens eine Bewertung eingeben.");
    return;
  }

  const resp = await fetch(scriptURL, {
    method: "POST",
    body: JSON.stringify({ action: "addRatings", matchday, ratings }),
    headers: { "Content-Type": "application/json" }
  });
  if (resp.ok) {
    alert("Bewertungen gespeichert!");
    // Optional: nach Speichern zurück zur Setup-Phase
  } else {
    alert("Fehler beim Speichern");
  }
}

// Team-Erstellung basierend auf historischen Durchschnittsbewertungen
async function generateTeams(selected) {
  const resp = await fetch(`${scriptURL}?action=getAllRatings`);
  const ratingsByPlayer = await resp.json();

  // Durchschnitt berechnen nur für selektierte Spieler
  const avgList = selected.map(player => {
    const arr = ratingsByPlayer[player] || [];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return { player, avg };
  }).sort((a, b) => b.avg - a.avg);

  const teamA = [], teamB = [];
  let sumA = 0, sumB = 0;
  avgList.forEach(({ player, avg }) => {
    if (sumA <= sumB) {
      teamA.push(`${player} (${avg.toFixed(1)})`);
      sumA += avg;
    } else {
      teamB.push(`${player} (${avg.toFixed(1)})`);
      sumB += avg;
    }
  });

  document.getElementById("teamsContainer").innerHTML = `
    <h2>Team Zusammenstellung</h2>
    <div><strong>Team A (Summe: ${sumA.toFixed(1)}):</strong><br>${teamA.join(", ")}</div>
    <div><strong>Team B (Summe: ${sumB.toFixed(1)}):</strong><br>${teamB.join(", ")}</div>
  `;
}

// Initialisierung beim Laden
function init() {
  // Matchday-Dropdown befüllen (aus data.js)
  const select = document.getElementById("matchday");
  getNextMondays(20).forEach(date => {
    const iso = date.toISOString().slice(0, 10);
    const txt = date.toLocaleDateString("de-AT", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
    });
    const opt = document.createElement("option");
    opt.value = iso;
    opt.textContent = txt;
    select.appendChild(opt);
  });
  select.addEventListener("change", loadPhase);
  loadPhase();
}

window.onload = init;
