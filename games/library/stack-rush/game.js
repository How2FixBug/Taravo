(() => {
  "use strict";

  const canvas = document.getElementById("stackrush");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const bestNode = document.getElementById("best");
  const comboNode = document.getElementById("combo");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const startButton = document.getElementById("start-button");
  const settingsMenuButton = document.getElementById("settings-menu-button");
  const restartButton = document.getElementById("restart-button");
  const settingsBackdrop = document.getElementById("settings-backdrop");
  const menuButton = document.getElementById("menu-button");
  const closeSettings = document.getElementById("close-settings");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const particlesToggle = document.getElementById("particles-toggle");
  const shakeToggle = document.getElementById("shake-toggle");
  const resetBestButton = document.getElementById("reset-best");

  const W = 1100;
  const H = 720;
  const BLOCK_HEIGHT = 0.58;
  const COLORS = ["#ff5964", "#ff9f1c", "#ffd43b", "#73c94b", "#20bea0", "#35a9f4", "#8067e8", "#df62b7", "#ff7950"];
  const SETTINGS_KEY = "taravo-stackrush-settings";
  const BEST_KEY = "taravo-stackrush-best";

  let blocks = [];
  let active = null;
  let falling = [];
  let particles = [];
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let combo = 1;
  let running = false;
  let frame = 0;
  let lastTime = 0;
  let viewAngle = 0;
  let shake = 0;
  let settings = { particles: true, shake: true };

  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    settings = { ...settings, ...saved };
  } catch {}
  particlesToggle.checked = settings.particles;
  shakeToggle.checked = settings.shake;
  bestNode.textContent = best;

  const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function project(x, z, y) {
    const angle = viewAngle * Math.PI / 2;
    const rx = x * Math.cos(angle) - z * Math.sin(angle);
    const rz = x * Math.sin(angle) + z * Math.cos(angle);
    const cameraLift = Math.max(0, blocks.length - 7) * 27;
    return {
      x: W / 2 + (rx - rz) * 47,
      y: 520 + (rx + rz) * 23 - y * 35 + cameraLift
    };
  }

  function polygon(points, fill, stroke = "rgba(20,35,26,.10)") {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function shade(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const r = clamp(((value >> 16) & 255) * amount, 0, 255);
    const g = clamp(((value >> 8) & 255) * amount, 0, 255);
    const b = clamp((value & 255) * amount, 0, 255);
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }

  function drawBlock(block, y, alpha = 1) {
    const x1 = block.x - block.width / 2;
    const x2 = block.x + block.width / 2;
    const z1 = block.z - block.depth / 2;
    const z2 = block.z + block.depth / 2;
    const h = BLOCK_HEIGHT;
    const p00 = project(x1, z1, y);
    const p10 = project(x2, z1, y);
    const p11 = project(x2, z2, y);
    const p01 = project(x1, z2, y);
    const t00 = project(x1, z1, y + h);
    const t10 = project(x2, z1, y + h);
    const t11 = project(x2, z2, y + h);
    const t01 = project(x1, z2, y + h);

    ctx.save();
    ctx.globalAlpha = alpha;
    polygon([p01, p11, t11, t01], shade(block.color, .70));
    polygon([p10, p11, t11, t10], shade(block.color, .54));
    polygon([t00, t10, t11, t01], block.color, "rgba(255,255,255,.5)");
    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = "#edf1ee";
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const a = project(i * 1.1, -8, 0);
      const b = project(i * 1.1, 8, 0);
      const c = project(-8, i * 1.1, 0);
      const d = project(8, i * 1.1, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    ctx.restore();

    const floor = project(0, 0, 0);
    ctx.fillStyle = "rgba(20,35,26,.07)";
    ctx.beginPath();
    ctx.ellipse(floor.x, floor.y + 7, 245, 65, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScene() {
    drawBackground();
    blocks.forEach((block, index) => drawBlock(block, index * BLOCK_HEIGHT));
    if (active) {
      const base = blocks[blocks.length - 1];
      const x = active.axis === "x" ? base.x + active.offset : base.x;
      const z = active.axis === "z" ? base.z + active.offset : base.z;
      drawBlock({ x, z, width: base.width, depth: base.depth, color: active.color }, blocks.length * BLOCK_HEIGHT);
    }
    falling.forEach(piece => drawBlock(piece, piece.y, piece.life));
    drawParticles();
  }

  function spawn() {
    const base = blocks[blocks.length - 1];
    const axis = blocks.length % 2 ? "x" : "z";
    const range = Math.max(3.4, (axis === "x" ? base.width : base.depth) / 2 + 3.1);
    active = { axis, offset: -range, direction: 1, range, speed: 4.1 + Math.min(score * .055, 5.2), color: randomColor() };
  }

  function addBurst(x, z, y, color, count = 18) {
    if (!settings.particles) return;
    const origin = project(x, z, y);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 170;
      particles.push({
        x: origin.x, y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 75,
        size: 2 + Math.random() * 4,
        life: .45 + Math.random() * .45,
        maxLife: .9,
        color
      });
    }
  }

  function addFalling(block, axis, side, amount, y) {
    if (amount < .035) return;
    const piece = { ...block, y, life: 1, vy: 0, drift: side * .35 };
    if (axis === "x") {
      piece.width = amount;
      piece.x += side * (block.width / 2 + amount / 2);
    } else {
      piece.depth = amount;
      piece.z += side * (block.depth / 2 + amount / 2);
    }
    falling.push(piece);
  }

  function place() {
    if (!running || !active) return;
    const base = blocks[blocks.length - 1];
    const axis = active.axis;
    const delta = active.offset;
    const dimension = axis === "x" ? base.width : base.depth;
    const overlap = dimension - Math.abs(delta);

    if (overlap <= .04) {
      finish();
      return;
    }

    const perfect = Math.abs(delta) < .13;
    const next = { ...base, color: active.color };
    if (axis === "x") {
      const left = Math.max(base.x - base.width / 2, base.x + delta - base.width / 2);
      const right = Math.min(base.x + base.width / 2, base.x + delta + base.width / 2);
      next.x = (left + right) / 2;
      next.width = right - left;
      addFalling({ ...base, x: base.x + delta, z: base.z }, "x", Math.sign(delta), Math.abs(delta), blocks.length * BLOCK_HEIGHT);
    } else {
      const near = Math.max(base.z - base.depth / 2, base.z + delta - base.depth / 2);
      const far = Math.min(base.z + base.depth / 2, base.z + delta + base.depth / 2);
      next.z = (near + far) / 2;
      next.depth = far - near;
      addFalling({ ...base, x: base.x, z: base.z + delta }, "z", Math.sign(delta), Math.abs(delta), blocks.length * BLOCK_HEIGHT);
    }

    blocks.push(next);
    score += perfect ? 3 : 1;
    combo = perfect ? combo + 1 : 1;
    if (perfect) score += Math.min(combo, 8);
    scoreNode.textContent = score;
    comboNode.textContent = "×" + combo;
    if (score > best) {
      best = score;
      bestNode.textContent = best;
      localStorage.setItem(BEST_KEY, String(best));
    }
    addBurst(next.x, next.z, blocks.length * BLOCK_HEIGHT, next.color, perfect ? 34 : 16);
    if (perfect && settings.shake) shake = 5;
    spawn();
  }

  function showMenu(mode = "menu") {
    running = false;
    overlayTitle.textContent = mode === "gameover" ? "Game over" : mode === "pause" ? "Paused" : "Stack Rush";
    startButton.textContent = mode === "pause" ? "Resume" : mode === "gameover" ? "Play again" : "Play";
    restartButton.hidden = mode !== "pause";
    overlay.classList.remove("hidden");
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    drawScene();
  }

  function finish() {
    active = null;
    showMenu("gameover");
  }

  function reset() {
    blocks = [{ x: 0, z: 0, width: 5.4, depth: 5.4, color: "#62e6b5" }];
    falling = [];
    particles = [];
    score = 0;
    combo = 1;
    viewAngle = 0;
    shake = 0;
    scoreNode.textContent = "0";
    comboNode.textContent = "×1";
    overlayTitle.textContent = "Stack Rush";
    startButton.textContent = "Play";
    restartButton.hidden = true;
    overlay.classList.add("hidden");
    running = true;
    lastTime = 0;
    spawn();
    if (!frame) frame = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (active) {
      active.offset += active.direction * active.speed * dt;
      if (active.offset > active.range) { active.offset = active.range; active.direction = -1; }
      if (active.offset < -active.range) { active.offset = -active.range; active.direction = 1; }
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const piece = falling[i];
      piece.vy += 15 * dt;
      piece.y -= piece.vy * dt;
      piece.life -= dt * 1.25;
      if (piece.life <= 0 || piece.y < -2) falling.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vy += 250 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    shake *= .86;
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  function loop(time) {
    frame = 0;
    if (!running && !falling.length && !particles.length) {
      drawScene();
      return;
    }
    const dt = Math.min((time - (lastTime || time)) / 1000, .035);
    lastTime = time;
    update(dt);
    ctx.save();
    if (shake > .2) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawScene();
    ctx.restore();
    if (running || falling.length || particles.length) frame = requestAnimationFrame(loop);
  }

  function rotateView(direction) {
    viewAngle = (viewAngle + direction + 4) % 4;
    drawScene();
  }

  function openSettings() {
    if (running) showMenu("pause");
    settingsBackdrop.classList.remove("hidden");
    settingsBackdrop.setAttribute("aria-hidden", "false");
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function closeSettingsPanel() {
    settingsBackdrop.classList.add("hidden");
    settingsBackdrop.setAttribute("aria-hidden", "true");
    // Keep the game paused behind the menu/settings overlay.
  }

  startButton.addEventListener("click", () => {
    if (startButton.textContent === "Resume" && active) {
      running = true; lastTime = 0; overlay.classList.add("hidden");
      if (!frame) frame = requestAnimationFrame(loop);
    } else reset();
  });
  restartButton.addEventListener("click", reset);
  settingsMenuButton.addEventListener("click", openSettings);
  let pointerStart = null;
  canvas.addEventListener("pointerdown", event => {
    if (!running) return;
    event.preventDefault();
    pointerStart = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointerup", event => {
    if (!running || !pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) rotateView(dx > 0 ? 1 : -1);
    else place();
  });
  canvas.addEventListener("pointercancel", () => { pointerStart = null; });
  menuButton.addEventListener("click", () => showMenu(running ? "pause" : "menu"));
  closeSettings.addEventListener("click", closeSettingsPanel);
  settingsBackdrop.addEventListener("pointerdown", event => {
    if (event.target === settingsBackdrop) closeSettingsPanel();
  });
  particlesToggle.addEventListener("change", () => {
    settings.particles = particlesToggle.checked;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  });
  shakeToggle.addEventListener("change", () => {
    settings.shake = shakeToggle.checked;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  });
  resetBestButton.addEventListener("click", () => {
    if (!confirm("Reset your Stack Rush best score?")) return;
    best = 0;
    bestNode.textContent = "0";
    localStorage.removeItem(BEST_KEY);
  });
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.getElementById("game-shell").requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  });
  document.addEventListener("keydown", event => {
    if (event.code === "Escape" && !settingsBackdrop.classList.contains("hidden")) {
      closeSettingsPanel();
      return;
    }
    if (event.code === "Escape" && running) { showMenu("pause"); return; }
    if (event.code === "Space") {
      event.preventDefault();
      if (!running && overlay.classList.contains("hidden") === false) {
        if (startButton.textContent === "Resume" && active) { running = true; lastTime = 0; overlay.classList.add("hidden"); if (!frame) frame = requestAnimationFrame(loop); }
        else reset();
      } else place();
    }
    if (event.code === "ArrowLeft" || event.code === "KeyA") rotateView(-1);
    if (event.code === "ArrowRight" || event.code === "KeyD") rotateView(1);
  });

  drawScene();
})();