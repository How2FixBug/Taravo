const FEATURED_GAME_ID = "brick-breaker";
const FAVORITES_KEY = "taravo-favorites";
const CATEGORIES = ["Arcade", "Puzzle", "Platformer", "Action", "Adventure", "Strategy", "Simulation", "Idle & Clicker", "Racing", "Sports", "Classic", "Casual", "Other"];
const appScript = document.querySelector('script[src$="app.js"]');
const TARAVO_ROOT = new URL("../", appScript.src);
let GAMES = [];
let selectedCategory = "All";
let sortMode = "name";

async function loadGames() {
  const response = await fetch(new URL("games/library/manifest.json", TARAVO_ROOT));
  if (!response.ok) throw new Error("Could not load game manifest");
  const manifest = await response.json();
  const entries = await Promise.all((manifest.games || []).map(async id => {
    if (!/^[a-z0-9-]+$/.test(id)) return null;
    const result = await fetch(new URL(`games/library/${id}/game.json`, TARAVO_ROOT));
    if (!result.ok) return null;
    const game = await result.json();
    if (game.id !== id || !game.name || !game.description || !Array.isArray(game.tags) || !game.thumbnail) return null;
    return { ...game, category: game.category || "Other", path: `games/play.html?game=${encodeURIComponent(id)}`,
      thumbnailUrl: new URL(`games/library/${id}/${game.thumbnail}?v=library-7`, TARAVO_ROOT).href };
  }));
  GAMES = entries.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
function getFavorites() {
  try { const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); return saved.map(id => id === "stackrush" ? "stack-rush" : id); }
  catch { return []; }
}
function saveFavorites(ids) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); }
function gameUrl(game) { return new URL(game.path, TARAVO_ROOT).href; }
function makeFavoriteButton(game, favorites) {
  const button = document.createElement("button");
  const active = favorites.includes(game.id);
  button.className = "favorite-button"; button.type = "button"; button.textContent = active ? "★" : "☆";
  button.setAttribute("aria-label", active ? "Remove from favorites" : "Add to favorites");
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", () => {
    const next = getFavorites(); const index = next.indexOf(game.id);
    if (index === -1) next.push(game.id); else next.splice(index, 1);
    saveFavorites(next); renderPage(document.querySelector(".game-search")?.value || "");
  });
  return button;
}
function createGameCard(game, favorites) {
  const card = document.createElement("article"); card.className = "game-card"; card.dataset.game = game.id;
  const artLink = document.createElement("a"); artLink.className = "game-art"; artLink.href = gameUrl(game); artLink.setAttribute("aria-label", `Play ${game.name}`);
  const image = document.createElement("img"); image.src = game.thumbnailUrl; image.alt = ""; image.loading = "lazy"; image.decoding = "async"; artLink.append(image);
  const details = document.createElement("div"); details.className = "game-details";
  const top = document.createElement("div"); top.className = "game-card-top";
  const info = document.createElement("div"); info.className = "game-card-info";
  const category = document.createElement("span"); category.className = "game-category-label"; category.textContent = game.category;
  const title = document.createElement("a"); title.className = "game-title-link"; title.href = gameUrl(game); title.textContent = game.name;
  info.append(category, title); top.append(info, makeFavoriteButton(game, favorites));
  const description = document.createElement("p"); description.className = "game-description"; description.textContent = game.description;
  details.append(top, description); card.append(artLink, details); return card;
}
function createFeature(game, favorites) {
  const feature = document.createElement("article"); feature.className = "feature-card";
  const art = document.createElement("a"); art.className = "feature-art"; art.href = gameUrl(game);
  const image = document.createElement("img"); image.src = game.thumbnailUrl; image.alt = ""; image.loading = "eager"; image.decoding = "async"; art.append(image);
  const details = document.createElement("div"); details.className = "feature-details";
  const category = document.createElement("span"); category.className = "feature-category"; category.textContent = game.category;
  const title = document.createElement("h2"); title.textContent = game.name;
  const description = document.createElement("p"); description.className = "feature-description"; description.textContent = game.description;
  const actions = document.createElement("div"); actions.className = "feature-actions";
  const play = document.createElement("a"); play.className = "primary-link"; play.href = gameUrl(game); play.textContent = "Play now";
  actions.append(play, makeFavoriteButton(game, favorites)); details.append(category, title, description, actions); feature.append(art, details); return feature;
}
function categoriesFor(games) { return [...new Set(games.map(game => game.category))].sort((a, b) => a.localeCompare(b)); }
function createSection(category, games, favorites, compact = false) {
  const section = document.createElement("section"); section.className = "category-section";
  const heading = document.createElement("div"); heading.className = "section-heading";
  const title = document.createElement("h2"); title.textContent = category;
  const count = document.createElement("span"); count.className = "section-count"; count.textContent = String(games.length);
  heading.append(title, count);
  const grid = document.createElement("div"); grid.className = compact ? "game-grid compact-grid" : "game-grid";
  games.forEach(game => grid.append(createGameCard(game, favorites)));
  section.append(heading, grid); return section;
}
function renderHome() {
  const favorites = getFavorites();
  const featured = GAMES.find(game => game.id === FEATURED_GAME_ID) || GAMES[0];
  const featureHost = document.getElementById("featured-game");
  const recommendedHost = document.getElementById("recommended-grid");
  const categoriesHost = document.getElementById("home-categories");
  if (!featured || !featureHost || !recommendedHost || !categoriesHost) return;
  featureHost.replaceChildren(createFeature(featured, favorites));
  recommendedHost.replaceChildren();
  const recommendations = GAMES.filter(game => game.id !== featured.id).slice(0, 4);
  if (recommendations.length) recommendations.forEach(game => recommendedHost.append(createGameCard(game, favorites)));
  else { const note = document.createElement("p"); note.className = "subtle-empty"; note.textContent = "More recommendations will appear as the library grows."; recommendedHost.append(note); }
  categoriesHost.replaceChildren();
  categoriesFor(GAMES).forEach(category => categoriesHost.append(createSection(category, GAMES.filter(game => game.category === category), favorites, true)));
}
function renderFilters(games) {
  const host = document.getElementById("category-filters"); if (!host) return;
  host.replaceChildren();
  ["All", ...CATEGORIES].forEach(category => {
    const button = document.createElement("button"); button.type = "button";
    button.className = "filter-chip" + (selectedCategory === category ? " active" : "");
    button.textContent = category; button.setAttribute("aria-pressed", String(selectedCategory === category));
    button.addEventListener("click", () => { selectedCategory = category; renderGames(document.querySelector(".game-search")?.value || ""); });
    host.append(button);
  });
}
function renderGames(search = "") {
  const page = document.body.dataset.page; const favorites = getFavorites();
  if (page === "home") { renderHome(); return; }
  if (page === "favorites") {
    let games = GAMES.filter(game => favorites.includes(game.id));
    const query = search.trim().toLowerCase();
    if (query) games = games.filter(game => [game.name, game.description, game.category, ...game.tags].join(" ").toLowerCase().includes(query));
    const grid = document.getElementById("game-grid"); if (!grid) return; grid.replaceChildren();
    if (games.length) games.forEach(game => grid.append(createGameCard(game, favorites)));
    else { const empty = document.createElement("div"); empty.className = "empty-state"; empty.innerHTML = "<h2>No favorites yet</h2><p>Star a game to save it here.</p>"; grid.append(empty); }
    return;
  }
  let games = [...GAMES]; const query = search.trim().toLowerCase();
  if (query) games = games.filter(game => [game.name, game.description, game.category, ...game.tags].join(" ").toLowerCase().includes(query));
  if (sortMode === "category") games.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  else games.sort((a,b) => a.name.localeCompare(b.name));
  renderFilters(GAMES);
  const count = document.getElementById("library-count"); if (count) count.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  const host = document.getElementById("game-categories"); if (!host) return; host.replaceChildren();
  const visible = selectedCategory === "All" ? games : games.filter(game => game.category === selectedCategory);
  categoriesFor(visible).forEach(category => host.append(createSection(category, visible.filter(game => game.category === category), favorites)));
  if (!visible.length) { const empty = document.createElement("div"); empty.className = "empty-state"; empty.innerHTML = "<h2>No games found</h2><p>Try a different search or category.</p>"; host.append(empty); }
}
function renderPage(search = "") { renderGames(search); }
document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".game-search").forEach(input => input.addEventListener("input", () => renderPage(input.value)));
  const sort = document.getElementById("game-sort");
  sort?.addEventListener("change", () => { sortMode = sort.value; renderPage(document.querySelector(".game-search")?.value || ""); });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); document.querySelector(".game-search")?.focus(); }
  });
  try { await loadGames(); renderPage(); }
  catch {
    const host = document.getElementById("game-categories") || document.getElementById("recommended-grid") || document.getElementById("game-grid");
    if (host) { const message = document.createElement("p"); message.className = "subtle-empty"; message.textContent = "The game library could not be loaded."; host.replaceChildren(message); }
  }
});