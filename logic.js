function getTodayKey() {
  return "ratings_" + new Date().toISOString().slice(0, 10);
}

function getRatings() {
  const key = getTodayKey();
  return JSON.parse(localStorage.getItem(key) || "{}");
}

function saveRatings(ratings) {
  const key = getTodayKey();
  localStorage.setItem(key, JSON.stringify(ratings));
}

function resetRatings() {
  localStorage.clear();
  alert("Alle Bewertungen gelöscht.");
  location.reload();
}

// 🟩 index.html (Spieler bewertet)
function renderRatingForm() {
  const form = document.getElementById("ratingForm");
  const container = document.getElementById("ratingContainer");
  players.forEach(player => {
    const label = document.createElement("label");
    label.innerHTML = `
      ${player}: 
      <input type="number" name="${player}" min="1" max="5" value="3" />
      <br/>
    `;
    container.appendChild(label);
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const ratings = {};
    players.forEach(player => {
      const value = form.elements[player].value;
      ratings[player] = Number(value);
    });
    saveRatings(ratings);
    document.getElementById("status").textContent = "Bewertung gespeichert ✅";
  });
}

// 🟨 admin.html (Bewertungen + Teams)
window.onload = () => {
  const ratings = getRatings();
  const display = document.getElementById("ratingsDisplay");
  const selectionDiv = document.getElementById("playerSelection");
  const teamResults = document.getElementById("teamResults");

  if (display) {
    for (const [player, rating] of Object.entries(ratings)) {
      const p = document.createElement("p");
      p.textContent = `${player}: ${rating}`;
      display.appendChild(p);
    }
  }

  if (selectionDiv) {
    // Checkboxen anzeigen
    players.forEach(name => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = name;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + name));
      selectionDiv.appendChild(label);
      selectionDiv.appendChild(document.createElement("br"));
    });

    document.getElementById("teamForm").addEventListener("submit", e => {
      e.preventDefault();
      const selected = Array.from(document.querySelectorAll("#playerSelection input:checked"))
        .map(cb => cb.value);

      if (selected.length < 2) {
        alert("Bitte mindestens 2 Spieler auswählen.");
        return;
      }

      // Spieler mit Bewertungen filtern
      const ratedPlayers = selected.map(name => ({
        name,
        rating: ratings[name] !== undefined ? Number(ratings[name]) : 3
      }));

      // Nach Zufall mischen
      ratedPlayers.sort(() => Math.random() - 0.5);

      // Teams balancieren
      const teamA = [];
      const teamB = [];
      let sumA = 0;
      let sumB = 0;

      for (const player of ratedPlayers) {
        if (sumA <= sumB) {
          teamA.push(player);
          sumA += player.rating;
        } else {
          teamB.push(player);
          sumB += player.rating;
        }
      }

      // Anzeige
      teamResults.innerHTML = `
        <div class="team">
          <h3>🏆 Team A (Ø ${avg(teamA).toFixed(2)})</h3>
          ${teamA.map(p => `<p>${p.name} (${p.rating})</p>`).join("")}
        </div>
        <div class="team">
          <h3>⚽ Team B (Ø ${avg(teamB).toFixed(2)})</h3>
          ${teamB.map(p => `<p>${p.name} (${p.rating})</p>`).join("")}
        </div>
      `;
    });
  }
};

function avg(team) {
  return team.reduce((sum, p) => sum + p.rating, 0) / team.length;
}
