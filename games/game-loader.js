(() => {
  "use strict";
  const games = {
    "brick-breaker": { title: "Brick Breaker", src: "library/brick-breaker/" },
    "stackrush": { title: "Stack Rush", src: "library/stack-rush/" }
  };
  const params = new URLSearchParams(location.search);
  const id = params.get("game");
  const game = games[id];
  const title = document.getElementById("game-title");
  const frame = document.getElementById("game-frame");
  const shell = document.getElementById("game-frame-shell");
  const fullscreen = document.getElementById("fullscreen-button");
  if (!game) {
    title.textContent = "Choose a game";
    shell.hidden = true;
    document.getElementById("game-empty").hidden = false;
    return;
  }
  title.textContent = game.title;
  document.title = game.title + " — taravo";
  frame.src = game.src;
  frame.title = game.title;
  fullscreen.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  });
})();