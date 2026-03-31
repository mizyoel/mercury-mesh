const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
};

const keys = new Set();
const stars = Array.from({ length: 42 }, () => ({
  x: Math.random() * WORLD.width,
  y: Math.random() * WORLD.height,
  speed: 10 + Math.random() * 30,
  size: Math.random() > 0.8 ? 2 : 1,
}));

const state = {
  scene: "start",
  score: 0,
  best: 0,
  lives: 3,
  time: 0,
  spawnTimer: 0,
  flashTimer: 0,
  shake: 0,
  player: null,
  enemies: [],
  particles: [],
};

function createPlayer() {
  return {
    x: WORLD.width / 2,
    y: WORLD.height / 2,
    size: 6,
    speed: 105,
    hitCooldown: 0,
  };
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  const padding = 12;
  const speed = 28 + Math.random() * 32 + state.score * 0.6;
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = Math.random() * WORLD.width;
    y = -padding;
  } else if (edge === 1) {
    x = WORLD.width + padding;
    y = Math.random() * WORLD.height;
  } else if (edge === 2) {
    x = Math.random() * WORLD.width;
    y = WORLD.height + padding;
  } else {
    x = -padding;
    y = Math.random() * WORLD.height;
  }

  state.enemies.push({
    x,
    y,
    size: 6 + Math.floor(Math.random() * 4),
    speed,
    wobble: Math.random() * Math.PI * 2,
    hue: Math.random() > 0.5 ? "#ff5d73" : "#ffd05a",
  });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 75;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.25 + Math.random() * 0.4,
      age: 0,
      color,
    });
  }
}

function resetGame() {
  state.scene = "playing";
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  state.spawnTimer = 0;
  state.flashTimer = 0;
  state.shake = 0;
  state.player = createPlayer();
  state.enemies = [];
  state.particles = [];

  for (let i = 0; i < 4; i += 1) {
    spawnEnemy();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b, padding = 0) {
  return (
    Math.abs(a.x - b.x) < a.size + b.size + padding &&
    Math.abs(a.y - b.y) < a.size + b.size + padding
  );
}

function updateStars(delta) {
  for (const star of stars) {
    star.y += star.speed * delta;
    if (star.y > WORLD.height + 2) {
      star.y = -2;
      star.x = Math.random() * WORLD.width;
    }
  }
}

function getMoveAxis() {
  let dx = 0;
  let dy = 0;

  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const scale = Math.SQRT1_2;
    dx *= scale;
    dy *= scale;
  }

  return { dx, dy };
}

function updatePlaying(delta) {
  const player = state.player;
  state.time += delta;
  state.score += delta * 10;
  state.spawnTimer -= delta;

  const move = getMoveAxis();
  player.x = clamp(player.x + move.dx * player.speed * delta, 10, WORLD.width - 10);
  player.y = clamp(player.y + move.dy * player.speed * delta, 10, WORLD.height - 10);
  player.hitCooldown = Math.max(0, player.hitCooldown - delta);
  state.flashTimer = Math.max(0, state.flashTimer - delta);
  state.shake = Math.max(0, state.shake - delta * 2);

  const spawnDelay = Math.max(0.4, 1.1 - state.time * 0.025);
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = spawnDelay;
  }

  for (const enemy of state.enemies) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.wobble += delta * 5;
    enemy.x += (Math.cos(angle) * enemy.speed + Math.sin(enemy.wobble) * 10) * delta;
    enemy.y += (Math.sin(angle) * enemy.speed + Math.cos(enemy.wobble) * 10) * delta;

    if (intersects(player, enemy) && player.hitCooldown <= 0) {
      state.lives -= 1;
      player.hitCooldown = 1.25;
      state.flashTimer = 0.3;
      state.shake = 0.45;
      burst(player.x, player.y, "#fff7ce", 18);

      if (state.lives <= 0) {
        state.best = Math.max(state.best, Math.floor(state.score));
        state.scene = "gameover";
      }
    }
  }

  state.enemies = state.enemies.filter(
    (enemy) =>
      enemy.x > -24 &&
      enemy.x < WORLD.width + 24 &&
      enemy.y > -24 &&
      enemy.y < WORLD.height + 24
  );

  state.particles = state.particles.filter((particle) => {
    particle.age += delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    return particle.age < particle.life;
  });
}

function update(delta) {
  updateStars(delta);

  if (state.scene === "playing") {
    updatePlaying(delta);
  } else {
    state.flashTimer = Math.max(0, state.flashTimer - delta);
    state.shake = Math.max(0, state.shake - delta * 2);
  }
}

function drawBackground() {
  ctx.fillStyle = "#09060f";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  for (const star of stars) {
    ctx.fillStyle = star.size === 2 ? "#6af7a3" : "#4f3d77";
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }

  ctx.strokeStyle = "rgba(248, 244, 227, 0.08)";
  for (let x = 0; x <= WORLD.width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
}

function drawPlayer(player) {
  const blink = player.hitCooldown > 0 && Math.floor(player.hitCooldown * 10) % 2 === 0;
  if (blink) return;

  ctx.fillStyle = "#6af7a3";
  ctx.fillRect(player.x - 4, player.y - 6, 8, 12);
  ctx.fillStyle = "#fff7ce";
  ctx.fillRect(player.x - 2, player.y - 8, 4, 2);
  ctx.fillStyle = "#120c1b";
  ctx.fillRect(player.x - 2, player.y - 2, 1, 1);
  ctx.fillRect(player.x + 1, player.y - 2, 1, 1);
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.fillStyle = enemy.hue;
    ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size, enemy.size * 2, enemy.size * 2);
    ctx.fillStyle = "#120c1b";
    ctx.fillRect(enemy.x - 2, enemy.y - 2, 1, 1);
    ctx.fillRect(enemy.x + 1, enemy.y - 2, 1, 1);
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = 1 - particle.age / particle.life;
    ctx.fillStyle = `${particle.color}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
  }
}

function drawHud() {
  ctx.fillStyle = "#f8f4e3";
  ctx.font = '10px "Courier New", monospace';
  ctx.textBaseline = "top";
  ctx.fillText(`SCORE ${Math.floor(state.score).toString().padStart(4, "0")}`, 10, 10);
  ctx.fillText(`BEST ${state.best.toString().padStart(4, "0")}`, 118, 10);
  ctx.fillText(`LIVES ${state.lives}`, 244, 10);
}

function drawPanel(title, lines, accent) {
  ctx.fillStyle = "rgba(18, 12, 27, 0.86)";
  ctx.fillRect(46, 62, 228, 116);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(46, 62, 228, 116);

  ctx.fillStyle = accent;
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.fillText(title, WORLD.width / 2, 82);

  ctx.fillStyle = "#f8f4e3";
  ctx.font = '10px "Courier New", monospace';
  lines.forEach((line, index) => {
    ctx.fillText(line, WORLD.width / 2, 110 + index * 16);
  });
  ctx.textAlign = "left";
}

function render() {
  ctx.save();
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * 6 * state.shake : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * 6 * state.shake : 0;
  ctx.translate(shakeX, shakeY);

  drawBackground();

  if (state.player) {
    drawPlayer(state.player);
  }

  drawEnemies();
  drawParticles();
  drawHud();

  if (state.scene === "start") {
    drawPanel(
      "PIXEL PANIC",
      [
        "MOVE WITH ARROWS OR WASD",
        "DODGE THE GLITCH SWARM",
        "PRESS ENTER OR SPACE TO START",
      ],
      "#ffd05a"
    );
  } else if (state.scene === "gameover") {
    drawPanel(
      "GAME OVER",
      [
        `FINAL SCORE ${Math.floor(state.score).toString().padStart(4, "0")}`,
        `HIGH SCORE ${state.best.toString().padStart(4, "0")}`,
        "PRESS ENTER OR SPACE TO TRY AGAIN",
      ],
      "#ff5d73"
    );
  }

  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 247, 206, ${state.flashTimer * 0.45})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  ctx.restore();
}

let lastFrame = performance.now();

function frame(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  update(delta);
  render();
  requestAnimationFrame(frame);
}

function handleActionKey() {
  if (state.scene === "start" || state.scene === "gameover") {
    resetGame();
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter"].includes(key)) {
    event.preventDefault();
  }

  keys.add(key);

  if (key === " " || key === "enter") {
    handleActionKey();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

state.player = createPlayer();
requestAnimationFrame(frame);
