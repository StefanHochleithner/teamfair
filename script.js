const scriptURL = "https://script.google.com/macros/s/AKfycbxMU3e7JAEHUZT-NJF3e1XjObNLQ--QqpkDzPOKViGuWxonr3XCSdT9UxY6NDfxMutNhw/exec";

function getNextMondays(count, startDate = new Date("2025-07-28")) {
  const mondays = [];
  let date = new Date(startDate);
  date.setHours(0,0,0,0);
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
  container.innerHTML = "";

  allPlayers.forEach(name => {
    const div = document.createElement("div");
    div.className = "spieler";
    div.innerHTML = `
      <label>${name}</label>
      <input class="bewertung" type="number" min="1" max="5" step="1" value="" data-name="${name}" />
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
    const val = parseInt(input.value);
    if (!isNaN(val) && val >=1 && val <=5) {
      ratings[name] = val;
    }
  });

  if (Object.keys(ratings).length === 0) {
    alert("Bitte mindestens eine Bewertung von 1 bis 5 eingeben.");
    return;
  }

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify({ matchday, ratings }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (response.ok) {
      alert("Bewertungen gespeichert!");
    } else {
      alert("Fehler beim Speichern der Bewertungen");
    }
  } catch (err) {
    alert("Fehler: " + err.message);
  }
}

async function generateTeams() {
  try {
    const response = await fetch(`${scriptURL}?action=getAllRatings`);
    const ratingsByPlayer = await response.text();
    // Die Antwort kommt als HTML-Output -> Parsen
    const ratings = JSON.parse(ratingsByPlayer);

    const avgRatings = {};
    for (const player in ratings) {
      const arr = ratings[player];
      const sum = arr.reduce((a, b) => a + b, 0);
      avgRatings[player] = sum / arr.length;
    }

    // Sortiere Spieler absteigend nach Durchschnittsbewertung
    const sortedPlayers = Object.keys(avgRatings).sort((a, b) => avgRatings[b] - avgRatings[a]);

    const teamA = [];
    const teamB = [];
    let sumA = 0;
    let sumB = 0;

    sortedPlayers.forEach(player => {
      if (sumA <= sumB) {
        teamA.push(player);
        sumA += avgRatings[player];
      } else {
        teamB.push(player);
        sumB += avgRatings[player];
      }
    });

    const container = document.getElementById("teamsContainer");
    container.innerHTML = `
      <h2>Team Zusammenstellung</h2>
      <div><strong>Team A (Summe Bewertung: ${sumA.toFixed(2)}):</strong><br>${teamA.join(", ")}</div>
      <div><strong>Team B (Summe Bewertung: ${sumB.toFixed(2)}):</strong><br>${teamB.join(", ")}</div>
    `;
  } catch (err) {
    alert("Fehler beim Laden der Bewertungen: " + err.message);
  }
}

window.onload = () => {
  initMatchdays();
};

