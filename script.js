const scriptURL = "https://script.google.com/macros/s/DEINE_SCRIPT_ID_HIER/exec";

// Hilfsfunktion: nächste 20 Montage ab 28.07.2025 erzeugen
function getNextMondays(count, startDate = new Date("2025-07-28")) {
  const mondays = [];
  let date = new Date(startDate);
  date.setHours(0,0,0,0);
  // Auf nächsten Montag setzen, falls startDate kein Montag ist
  date.setDate(date.getDate() + ((1 - date.getDay() + 7) % 7));
  for(let i=0; i<count; i++) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return mondays;
}

// Dropdown mit Spieltagen füllen
function initMatchdays() {
  const select = document.getElementById("matchday");
  const mondays = getNextMondays(20);
  mondays.forEach(date => {
    const iso = date.toISOString().slice(0,10);
    const option = document.createElement("option");
    option.value = iso;
    option.textContent = date.toLocaleDateString("de-AT", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
    });
    select.appendChild(option);
  });
  select.selectedIndex = 0;
  renderRatingInputs();
}

// Bewertungs-Eingabefelder rendern
async function renderRatingInputs() {
  const container = document.getElementById("bewertungContainer");
  const matchday = document.getElementById("matchday").value;

  container.innerHTML = "Lade Bewertungen...";

  try {
    const response = await fetch(`${scriptURL}?matchday=${matchday}`);
    if(!response.ok) throw new Error("Fehler beim Laden der Daten");
    const ratings = await response.json();

    container.innerHTML = "";
    allPlayers.forEach(name => {
      const div = document.createElement("div");
      div.className = "spieler";
      div.innerHTML = `
        <label for="rating-${name}">${name}</label>
        <input id="rating-${name}" class="bewertung" type="number" min="0" max="10" step="0.5" value="${ratings[name] ?? ''}" data-name="${name}" />
      `;
      container.appendChild(div);
    });
  } catch(error) {
    container.innerHTML = `<p style="color:red;">${error.message}</p>`;
  }
}

// Bewertungen speichern (POST an Google Apps Script)
async function saveRatings() {
  const matchday = document.getElementById("matchday").value;
  const inputs = document.querySelectorAll(".bewertung");
  const ratings = {};
  inputs.forEach(input => {
    const name = input.dataset.name;
    const val = parseFloat(input.value);
    if(!isNaN(val)) ratings[name] = val;
  });

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify({ matchday, ratings }),
      headers: { "Content-Type": "application/json" }
    });
    if(!response.ok) throw new Error("Fehler beim Speichern der Bewertungen");
    alert("✅ Bewertungen gespeichert!");
  } catch(error) {
    alert("❌ " + error.message);
  }
}

// Teams basierend auf Bewertungen bilden
async function generateTeams() {
  const matchday = document.getElementById("matchday").value;

  try {
    const response = await fetch(`${scriptURL}?matchday=${matchday}`);
    if(!response.ok) throw new Error("Fehler beim Laden der Bewertungen");
    const ratings = await response.json();

    // Spieler mit vorhandener Bewertung filtern und nach Wert sortieren (absteigend)
    const bewerteteSpieler = allPlayers.filter(p => ratings[p] !== undefined);
    bewerteteSpieler.sort((a,b) => ratings[b] - ratings[a]);

    const teamA = [];
    const teamB = [];
    let sumA = 0, sumB = 0;

    // Spieler abwechselnd den Teams zuordnen, Team mit niedrigerem Rating-Summe bekommt nächsten Spieler
    bewerteteSpieler.forEach(player => {
      if(sumA <= sumB) {
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
  } catch(error) {
    alert("❌ " + error.message);
  }
}

// Event Listener registrieren
window.onload = () => {
  initMatchdays();
  document.getElementById("saveBtn").addEventListener("click", saveRatings);
  document.getElementById("generateBtn").addEventListener("click", generateTeams);
  document.getElementById("matchday").addEventListener("change", renderRatingInputs);
};
