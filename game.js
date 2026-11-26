'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const distToSegment = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1,
    ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

// ── Power-up Velocidad ────────────────────────────────────────────────────────
const POWERUP_CHANCE = 0.12;  // probabilidad de que un asteroide suelte el power-up
const SPEED_DURATION = 5;     // segundos de duración del efecto de velocidad
const SPEED_MULT     = 2;     // multiplicador de empuje
const TRIPLE_DURATION = 5;    // segundos de duración del triple disparo
const TRIPLE_SPREAD   = 10;   // separación lateral entre balas (px)

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_POINTS = 150;
const STAR_TTL    = 4;         // segundos antes de desvanecerse
const STAR_SPEED  = [300, 420]; // px/s, 3-5x un asteroide grande
const STAR_SPAWN_INTERVAL = 15; // segundos entre apariciones
const STAR_HEAD_RADIUS    = 10; // 4x el radio original de la cabeza (2.5)

// ── Enemigos y escudo ─────────────────────────────────────────────────────────
const ENEMY_RADIUS       = 14;
const ENEMY_SPEED        = 70;
const ENEMY_FIRE_INTERVAL = 2.2;  // segundos entre disparos
const ENEMY_BULLET_SPEED = 220;   // px/s
const ENEMY_BULLET_TTL   = 3;     // segundos
const ENEMY_POINTS       = 200;

const SHIELD_RADIUS   = 22;       // mayor que el radio de la nave (12)
const SHIELD_DURATION = 2.5;      // segundos activo
const SHIELD_COOLDOWN = 6;        // segundos desde la activación

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Proyectil enemigo ─────────────────────────────────────────────────────────
class EnemyBullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * ENEMY_BULLET_SPEED;
    this.vy = Math.sin(angle) * ENEMY_BULLET_SPEED;
    this.ttl  = ENEMY_BULLET_TTL;
    this.radius = 3;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#ff5b5b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Enemigo ───────────────────────────────────────────────────────────────────
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = ENEMY_RADIUS;
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(angle) * ENEMY_SPEED;
    this.vy = Math.sin(angle) * ENEMY_SPEED;
    this.fireTimer = rand(0.6, ENEMY_FIRE_INTERVAL);
  }

  update(dt, target) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);

    if (!target || target.dead) return [];
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return [];

    this.fireTimer = ENEMY_FIRE_INTERVAL;
    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const nose = this.radius + 4;
    return [new EnemyBullet(
      this.x + Math.cos(angle) * nose,
      this.y + Math.sin(angle) * nose,
      angle
    )];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.strokeStyle = '#ff5b5b';
    ctx.fillStyle   = 'rgba(255, 91, 91, 0.18)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo( 14,   0);
    ctx.lineTo(-10, -10);
    ctx.lineTo( -5,   0);
    ctx.lineTo(-10,  10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar {
  constructor() {
    // Entra por un borde y cruza hacia el lado opuesto con un desvío aleatorio.
    const edge   = randInt(0, 3);
    const margin = 30;
    if (edge === 0) {              // izquierda
      this.x  = -margin;
      this.y  = rand(0, H);
      this.tx = W + margin;
      this.ty = rand(0, H);
    } else if (edge === 1) {       // derecha
      this.x  = W + margin;
      this.y  = rand(0, H);
      this.tx = -margin;
      this.ty = rand(0, H);
    } else if (edge === 2) {       // arriba
      this.x  = rand(0, W);
      this.y  = -margin;
      this.tx = rand(0, W);
      this.ty = H + margin;
    } else {                       // abajo
      this.x  = rand(0, W);
      this.y  = H + margin;
      this.tx = rand(0, W);
      this.ty = -margin;
    }

    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = rand(STAR_SPEED[0], STAR_SPEED[1]);
    this.vx = (dx / len) * speed;
    this.vy = (dy / len) * speed;
    this.px = this.x;
    this.py = this.y;
    this.radius = 9;
    this.ttl  = STAR_TTL;
    this.dead = false;
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    const m = 40;
    if (this.ttl <= 0 ||
        this.x < -m || this.x > W + m || this.y < -m || this.y > H + m)
      this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.ttl / STAR_TTL));
    const tail = 0.16; // segundos de estela
    const tx = this.x - this.vx * tail;
    const ty = this.y - this.vy * tail;
    const grad = ctx.createLinearGradient(tx, ty, this.x, this.y);
    grad.addColorStop(0, 'rgba(0,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, STAR_HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKINS = [
  { id: 'clasico',  name: 'CLÁSICO',  stroke: '#fff',     fill: null,                        flame: 'rgba(255, 130, 0, 0.85)',   glow: 0,  dashed: false },
  { id: 'neon',     name: 'NEÓN',     stroke: '#0ff',     fill: 'rgba(0, 255, 255, 0.14)',   flame: 'rgba(0, 255, 255, 0.9)',   glow: 12, dashed: false },
  { id: 'caza',     name: 'CAZA',     stroke: '#ff5a5a',  fill: 'rgba(255, 60, 60, 0.18)',   flame: 'rgba(255, 210, 60, 0.9)',  glow: 0,  dashed: false },
  { id: 'dorado',   name: 'DORADO',   stroke: '#ffd54a',  fill: 'rgba(255, 190, 40, 0.22)',  flame: 'rgba(255, 110, 20, 0.9)',  glow: 8,  dashed: false },
  { id: 'fantasma', name: 'FANTASMA', stroke: '#b9a7ff',  fill: 'rgba(185, 167, 255, 0.12)', flame: 'rgba(185, 167, 255, 0.8)', glow: 0,  dashed: true  },
];

const SKIN_KEY = 'asteroids.skin';

function loadSkin() {
  try {
    const id = localStorage.getItem(SKIN_KEY);
    const idx = SKINS.findIndex(s => s.id === id);
    return idx >= 0 ? idx : 0;
  } catch (e) {
    return 0;
  }
}

function saveSkin() {
  try {
    localStorage.setItem(SKIN_KEY, SKINS[currentSkin].id);
  } catch (e) {
    // Almacenamiento no disponible (p. ej. algunas configuraciones de file://)
  }
}

let currentSkin = loadSkin();

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedTimer    = 0;
    this.tripleTimer   = 0;
    this.shieldTimer   = 0;
    this.shieldCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible     > 0) this.invincible     -= dt;
    if (this.shootCooldown  > 0) this.shootCooldown  -= dt;
    if (this.speedTimer     > 0) this.speedTimer     -= dt;
    if (this.tripleTimer    > 0) this.tripleTimer    -= dt;
    if (this.shieldTimer    > 0) this.shieldTimer    -= dt;
    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const thrust = THRUST * (this.speedTimer > 0 ? SPEED_MULT : 1);

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleTimer > 0) {
      // Tres balas paralelas: misma dirección, desplazadas lateralmente.
      const px = -Math.sin(this.angle) * TRIPLE_SPREAD;
      const py =  Math.cos(this.angle) * TRIPLE_SPREAD;
      return [
        new Bullet(ox + px, oy + py, this.angle),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox - px, oy - py, this.angle),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[currentSkin];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.shadowColor = skin.stroke;
    ctx.shadowBlur  = skin.glow;
    if (skin.dashed) ctx.setLineDash([4, 3]);

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    if (skin.fill) {
      ctx.fillStyle = skin.fill;
      ctx.fill();
    }
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups (velocidad / triple disparo) ────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 45);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 13;
    this.ttl  = 9;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = Math.min(1, this.ttl); // parpadeo al desaparecer
    const isTriple = this.type === 'triple';
    const color = isTriple ? '255,80,255' : '0,255,255';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = `rgba(${color},${alpha.toFixed(2)})`;
    ctx.fillStyle   = `rgba(${color},${alpha.toFixed(2)})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isTriple ? '>>>' : '>>', 0, 1);
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, enemyBullets, asteroids, enemies, particles, powerUps, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer, shootingStarTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnEnemies(count) {
  const SAFE_DIST = 180;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    enemies.push(new Enemy(x, y));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  enemyBullets = [];
  asteroids = [];
  enemies   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  shootingStarTimer = STAR_SPAWN_INTERVAL;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
  spawnEnemies(1 + Math.floor(level / 2));
}

function nextLevel() {
  level++;
  bullets   = [];
  enemyBullets = [];
  enemies   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  shootingStarTimer = STAR_SPAWN_INTERVAL;
  ship.reset();
  spawnAsteroids(3 + level);
  spawnEnemies(1 + Math.floor(level / 2));
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedTimer = 0;
  ship.tripleTimer = 0;
  ship.shieldTimer = 0;
  enemyBullets = []; // reaparición sin disparos en vuelo
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin disponible en cualquier estado
  if (pressed('KeyC')) {
    currentSkin = (currentSkin + 1) % SKINS.length;
    saveSkin();
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Escudo (X)
  if (pressed('KeyX') && !ship.dead &&
      ship.shieldTimer <= 0 && ship.shieldCooldown <= 0) {
    ship.shieldTimer = SHIELD_DURATION;
    ship.shieldCooldown = SHIELD_COOLDOWN;
  }

  // Estrella fugaz
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    shootingStars.push(new ShootingStar());
    shootingStarTimer = STAR_SPAWN_INTERVAL;
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  enemies.forEach(e => enemyBullets.push(...e.update(dt, ship)));
  enemyBullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  powerUps.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));

  shootingStars = shootingStars.filter(s => !s.dead);
  bullets   = bullets.filter(b => !b.dead);
  enemies   = enemies.filter(e => !e.dead);
  enemyBullets = enemyBullets.filter(b => !b.dead);
  powerUps  = powerUps.filter(p => !p.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (Math.random() < POWERUP_CHANCE) {
          const type = Math.random() < 0.5 ? 'speed' : 'triple';
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs enemigo
  for (const b of bullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (!e.dead && dist(b, e) < e.radius + b.radius) {
        b.dead = true;
        e.dead = true;
        score += ENEMY_POINTS;
        explode(e.x, e.y, 10);
        break;
      }
    }
  }
  enemies = enemies.filter(e => !e.dead);
  bullets = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz (no se parte, solo suma puntos)
  for (const s of shootingStars) {
    if (s.dead) continue;
    for (const b of bullets) {
      if (!b.dead && dist(b, s) < s.radius + b.radius) {
        b.dead = true;
        s.dead = true;
        score += STAR_POINTS;
        explode(s.x, s.y, 10);
        break;
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead);
  bullets = bullets.filter(b => !b.dead);

  // Nave vs power-up (velocidad / triple disparo)
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple') ship.tripleTimer = TRIPLE_DURATION;
      else ship.speedTimer = SPEED_DURATION;
      explode(p.x, p.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Proyectil enemigo vs nave / escudo
  for (const b of enemyBullets) {
    if (b.dead) continue;
    const d = dist(ship, b);

    if (ship.shieldTimer > 0 && d < SHIELD_RADIUS + b.radius) {
      b.dead = true;
      explode(b.x, b.y, 4); // el escudo absorbe el impacto
      continue;
    }
    if (d < ship.radius + b.radius) {
      b.dead = true;
      if (!ship.dead && ship.invincible <= 0) {
        killShip();
        break;
      }
    }
  }
  enemyBullets = enemyBullets.filter(b => !b.dead);
  if (ship.dead) return; // killShip() ya cambió el estado

  // Nave vs asteroide / estrella fugaz
  if (ship.invincible <= 0 && !ship.dead) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    if (!ship.dead) {
      for (const s of shootingStars) {
        if (!s.dead && distToSegment(ship, { x: s.px, y: s.py }, s) < ship.radius + s.radius) {
          killShip();
          break;
        }
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[currentSkin];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.shadowColor = skin.stroke;
  ctx.shadowBlur  = skin.glow;
  if (skin.dashed) ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  if (skin.fill) {
    ctx.fillStyle = skin.fill;
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.speedTimer > 0) {
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.fillText(`VELOCIDAD x${SPEED_MULT}  ${ship.speedTimer.toFixed(1)}s`, W / 2, 48);
  }
  if (ship.tripleTimer > 0) {
    ctx.fillStyle = '#f5f';
    ctx.textAlign = 'center';
    ctx.fillText(`TRIPLE x3  ${ship.tripleTimer.toFixed(1)}s`,
                 W / 2, ship.speedTimer > 0 ? 70 : 48);
  }

  ctx.textAlign = 'center';
  if (ship.shieldTimer > 0) {
    ctx.fillStyle = '#0ff';
    ctx.fillText(`ESCUDO ${ship.shieldTimer.toFixed(1)}s`, W / 2, 92);
  } else if (ship.shieldCooldown > 0) {
    ctx.fillStyle = 'rgba(0,255,255,0.5)';
    ctx.fillText(`ESCUDO RECARGANDO ${ship.shieldCooldown.toFixed(1)}s`, W / 2, 92);
  }

  const skin = SKINS[currentSkin];
  ctx.save();
  ctx.fillStyle   = skin.stroke;
  ctx.globalAlpha = 0.85;
  ctx.textAlign   = 'left';
  ctx.fillText(`SKIN: ${skin.name}   [C] CAMBIAR`, 14, H - 16);
  ctx.restore();
}

function drawShield() {
  if (ship.dead || ship.shieldTimer <= 0) return;
  const pulse = 0.65 + Math.sin(performance.now() / 100) * 0.2;
  ctx.save();
  ctx.strokeStyle = `rgba(0,255,255,${pulse.toFixed(2)})`;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, SHIELD_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  shootingStars.forEach(s => s.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  enemies.forEach(e => e.draw());
  bullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());
  ship.draw();
  drawShield();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
