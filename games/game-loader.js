(async () => {
  "use strict";
  const id = new URLSearchParams(location.search).get("game");
  const title = document.getElementById("game-title");
  const frame = document.getElementById("game-frame");
  const shell = document.getElementById("game-frame-shell");
  const fullscreen = document.getElementById("fullscreen-button");
  const header = document.getElementById("game-page-header");
  const error = document.getElementById("game-error");
  function showNotFound() {
    document.body.dataset.state = "not-found";
    header.hidden = true; shell.hidden = true; error.hidden = false;
    document.title = "Game not found — taravo";
  }
  if (!id || !/^[a-z0-9-]+$/.test(id)) { showNotFound(); return; }
  try {
    const response = await fetch(`library/${id}/game.json`);
    if (!response.ok) throw new Error("Game not found");
    const game = await response.json();
    if (game.id !== id || !game.name) throw new Error("Invalid game metadata");
    title.textContent = game.name; document.title = game.name + " — taravo";
    frame.src = `library/${id}/`; frame.title = game.name;
    fullscreen.addEventListener("click", async () => {
      try { if (!document.fullscreenElement) await shell.requestFullscreen(); else await document.exitFullscreen(); } catch {}
    });
  } catch { showNotFound(); }
})();