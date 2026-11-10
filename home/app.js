const GAMES = [
  { id: "brick-breaker", title: "Brick Breaker", description: "Bounce, break, and clear the board.", path: "games/" }
];
const FAVORITES_KEY = "taravo-favorites";
const appScript = document.querySelector('script[src$="app.js"]');
const TARAVO_ROOT = new URL("../", appScript.src);

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
  catch { return []; }
}
function saveFavorites(ids) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); }

function createGameCard(game, favorites) {
  const card = document.createElement("article");
  card.className = "game-card";
  card.dataset.game = game.id;
  const art = document.createElement("div");
  art.className = "game-art";
  art.setAttribute("aria-hidden", "true");
  const details = document.createElement("div");
  details.className = "game-details";
  const title = document.createElement("h3");
  title.textContent = game.title;
  const description = document.createElement("p");
  description.textContent = game.description;
  const actions = document.createElement("div");
  actions.className = "game-actions";
  const open = document.createElement("a");
  open.className = "play-link";
  open.href = new URL(game.path, TARAVO_ROOT).href;
  open.textContent = "Play";
  const favorite = document.createElement("button");
  favorite.className = "favorite-button";
  favorite.type = "button";
  favorite.textContent = favorites.includes(game.id) ? "★" : "☆";
  favorite.setAttribute("aria-label", favorites.includes(game.id) ? "Remove from favorites" : "Add to favorites");
  favorite.setAttribute("aria-pressed", String(favorites.includes(game.id)));
  favorite.addEventListener("click", () => {
    const next = getFavorites();
    const index = next.indexOf(game.id);
    if (index === -1) next.push(game.id);
    else next.splice(index, 1);
    saveFavorites(next);
    renderGames(document.querySelector(".game-search")?.value || "");
  });
  actions.append(open, favorite);
  details.append(title, description, actions);
  card.append(art, details);
  return card;
}
function renderGames(search = "") {
  const page = document.body.dataset.page;
  const favorites = getFavorites();
  let games = page === "favorites" ? GAMES.filter(game => favorites.includes(game.id)) : GAMES;
  const query = search.trim().toLowerCase();
  if (query) games = games.filter(game => game.title.toLowerCase().includes(query) || game.description.toLowerCase().includes(query));
  const grid = document.getElementById("game-grid");
  if (!grid) return;
  grid.replaceChildren();
  if (games.length) {
    games.forEach(game => grid.append(createGameCard(game, favorites)));
    return;
  }
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const heading = document.createElement("h2");
  heading.textContent = page === "favorites" ? "No favorites yet" : "No games found";
  const message = document.createElement("p");
  message.textContent = page === "favorites" ? "Star a game to save it here." : "Try another search.";
  empty.append(heading, message);
  grid.append(empty);
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".game-search").forEach(input => input.addEventListener("input", () => renderGames(input.value)));
  renderGames();
});
