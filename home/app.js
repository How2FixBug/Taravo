const GAMES = [
  { id: "brick-breaker", title: "Brick Breaker", description: "Bounce, break, and clear the board.", path: "games/?game=brick-breaker", tags: ["arcade", "skill", "action", "quick-play"] },
  { id: "stackrush", title: "Stack Rush", description: "Line up the blocks. Keep the tower going.", path: "games/?game=stackrush", tags: ["arcade", "skill", "timing", "quick-play"] },
];
const FEATURED_GAME_ID = null;
const FAVORITES_KEY = "taravo-favorites";
const appScript = document.querySelector('script[src$="app.js"]');
const TARAVO_ROOT = new URL("../", appScript.src);

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
  catch { return []; }
}
function saveFavorites(ids) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); }

function createGameCard(game, favorites, featured = false) {
  const card = document.createElement("article");
  card.className = featured ? "game-card featured-game-card" : "game-card";
  card.dataset.game = game.id;
  const art = document.createElement("div");
  art.className = "game-art";
  art.setAttribute("aria-hidden", "true");
  const details = document.createElement("div");
  details.className = "game-details";
  if (featured) {
    const eyebrow = document.createElement("span");
    eyebrow.className = "featured-eyebrow";
    eyebrow.textContent = "FEATURED GAME";
    details.append(eyebrow);
  }
  const title = document.createElement("h3");
  title.textContent = game.title;
  const description = document.createElement("p");
  description.textContent = game.description;
  const tags = document.createElement("div");
  tags.className = "game-tags";
  game.tags.forEach(tag => {
    const chip = document.createElement("span");
    chip.className = "game-tag";
    chip.textContent = tag;
    tags.append(chip);
  });
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
    renderPage(document.querySelector(".game-search")?.value || "");
  });
  actions.append(open, favorite);
  details.append(title, description, tags, actions);
  card.append(art, details);
  return card;
}

function getRecommendedGames(favorites) {
  const candidates = GAMES.filter(game => game.id !== FEATURED_GAME_ID);
  const favoriteTags = new Set(GAMES.filter(game => favorites.includes(game.id)).flatMap(game => game.tags));
  if (!favoriteTags.size) return candidates;
  return candidates
    .map(game => ({ game, score: game.tags.reduce((total, tag) => total + (favoriteTags.has(tag) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || GAMES.indexOf(a.game) - GAMES.indexOf(b.game))
    .map(item => item.game);
}

function renderHome(search, favorites) {
  const recommendedGrid = document.getElementById("recommended-grid");
  if (!recommendedGrid) return;
  const query = search.trim().toLowerCase();
  recommendedGrid.replaceChildren();
  const recommended = getRecommendedGames(favorites).filter(game =>
    !query || [game.title, game.description, ...game.tags].join(" ").toLowerCase().includes(query)
  );
  if (recommended.length) {
    recommended.forEach(game => recommendedGrid.append(createGameCard(game, favorites)));
  } else {
    const empty = document.createElement("p");
    empty.className = "subtle-empty";
    empty.textContent = "No games match that search.";
    recommendedGrid.append(empty);
  }
}

function renderGames(search = "") {
  const page = document.body.dataset.page;
  const favorites = getFavorites();
  if (page === "home") {
    renderHome(search, favorites);
    return;
  }
  let games = page === "favorites" ? GAMES.filter(game => favorites.includes(game.id)) : GAMES;
  const query = search.trim().toLowerCase();
  if (query) games = games.filter(game => [game.title, game.description, ...game.tags].join(" ").toLowerCase().includes(query));
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
function renderPage(search = "") { renderGames(search); }

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".game-search").forEach(input => input.addEventListener("input", () => renderPage(input.value)));
  renderPage();
});