// test-field7.js

// === Константы ===
const BOARD_SIZE = 15;
const CELL_SIZE = 40;

const gameBoard = document.getElementById('game-board');
const status = document.getElementById('status');
const heldObjectDiv = document.getElementById('held-object');
const dragIndicator = document.getElementById('drag-indicator');
const toggleMovementButton = document.getElementById('toggle-movement');
const immortalStats = document.querySelector('.immortal-stats');

let towers = [];
let enemies = [];
let heldObject = null;
let isDragging = false;
let immortalTarget = null;
let projectiles = [];

const towerGrid = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
const enemyGrid = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);

// === Инициализация поля ===
for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.dataset.index = i;
  gameBoard.appendChild(cell);

  cell.addEventListener('click', () => {
    if (heldObject) {
      handlePlacement(i);
    } else {
      handleRemove(i);
    }
  });

  cell.addEventListener('mouseenter', () => {
    if (heldObject) cell.classList.add('hovered');
  });
  cell.addEventListener('mouseleave', () => {
    cell.classList.remove('hovered');
  });
}

// === Магазины ===
document.querySelectorAll('.shop-item').forEach(el => {
  el.addEventListener('click', () => {
    const type = el.dataset.type;
    heldObject = {
      type,
      name: el.dataset.name,
      range: +el.dataset.range || 0,
      fireRate: +el.dataset.fireRate || 0,
      damage: +el.dataset.damage || 0,
      hp: +el.dataset.hp || 0,
      speed: +el.dataset.speed || 0
    };
    updateHeldObjectDiv();
    updateStatus(`Взято в руку: ${heldObject.name}`);
  });
});

// === Отмена выбора ===
window.addEventListener('contextmenu', e => {
  e.preventDefault();
  heldObject = null;
  updateHeldObjectDiv();
  updateStatus('Отмена выбора');
});

// === Клавиша пробела ===
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    isDragging = true;
    dragIndicator.style.display = 'block';
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    isDragging = false;
    dragIndicator.style.display = 'none';
  }
});

toggleMovementButton.addEventListener('click', () => {
  isDragging = !isDragging;
  dragIndicator.style.display = isDragging ? 'block' : 'none';
});

window.addEventListener('mousemove', e => {
  if (heldObject) {
    heldObjectDiv.style.display = 'block';
    heldObjectDiv.style.left = e.pageX + 10 + 'px';
    heldObjectDiv.style.top = e.pageY + 10 + 'px';
    heldObjectDiv.textContent = heldObject.name;
    heldObjectDiv.style.backgroundColor = heldObject.type === 'tower' ? 'crimson' : 'darkgreen';
  } else {
    heldObjectDiv.style.display = 'none';
  }
});

function handlePlacement(index) {
  if (heldObject.type === 'tower') {
    if (!towerGrid[index]) placeTower(index, heldObject);
    else updateStatus('Тут уже есть башня!');
  } else if (heldObject.type === 'enemy') {
    if (!enemyGrid[index]) placeEnemy(index, heldObject);
    else updateStatus('Тут уже есть враг!');
  }
}

function handleRemove(index) {
  if (towerGrid[index]) removeTower(index);
  else if (enemyGrid[index]) removeEnemy(index);
}

function placeTower(index, obj) {
  const tower = {
    cellIndex: index,
    ...obj,
    cooldown: 0,
    lastShotTime: performance.now(),
  };
  towers.push(tower);
  towerGrid[index] = tower;
  updateCellVisual(index);
  updateStatus(`Башня "${obj.name}" установлена в клетку ${index}`);
}

function placeEnemy(index, obj) {
  const enemy = {
    cellIndex: index,
    ...obj,
    hp: obj.hp,
    x: (index % BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2,
    y: Math.floor(index / BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2
  };
  enemies.push(enemy);
  enemyGrid[index] = enemy;
  updateCellVisual(index);
  updateStatus(`Враг "${obj.name}" установлен в клетку ${index}`);
  if (obj.name === 'Бессмертная Цель') {
    immortalTarget = enemy;
    immortalStats.style.display = 'block';
  }
}

function removeTower(index) {
  const i = towers.findIndex(t => t.cellIndex === index);
  if (i >= 0) {
    towers.splice(i, 1);
    towerGrid[index] = null;
    updateCellVisual(index);
    updateStatus(`Башня в клетке ${index} удалена.`);
  }
}

function removeEnemy(index) {
  const i = enemies.findIndex(e => e.cellIndex === index);
  if (i >= 0) {
    const enemy = enemies[i];
    enemies.splice(i, 1);
    enemyGrid[index] = null;
    updateCellVisual(index);
    updateStatus(`Враг "${enemy.name}" удален.`);
    if (enemy === immortalTarget) {
      immortalTarget = null;
      immortalStats.style.display = 'none';
    }
  }
}

function updateCellVisual(index) {
  const cell = gameBoard.children[index];
  cell.classList.remove('tower', 'enemy');
  if (towerGrid[index]) {
    cell.classList.add('tower');
    cell.title = `Башня: ${towerGrid[index].name}`;
  } else if (enemyGrid[index]) {
    cell.classList.add('enemy');
    cell.title = `Враг: ${enemyGrid[index].name}`;
    updateHealthBar(cell, enemyGrid[index].hp);
  } else {
    cell.title = '';
  }
}

function updateHealthBar(cell, hp) {
  const bar = document.createElement('div');
  bar.classList.add('hp-bar');
  bar.style.width = `${hp}%`;
  bar.style.backgroundColor = hp > 30 ? 'green' : 'red';
  cell.appendChild(bar);
  const hpText = document.createElement('div');
  hpText.classList.add('hp-text');
  hpText.textContent = hp;
  cell.appendChild(hpText);
}

function updateHeldObjectDiv() {
  if (heldObject) {
    heldObjectDiv.textContent = heldObject.name;
    heldObjectDiv.style.display = 'block';
  } else {
    heldObjectDiv.style.display = 'none';
  }
}

function updateStatus(msg) {
  status.textContent = msg;
}

function shootProjectile(sx, sy, target) {
  const projectile = {
    x: sx,
    y: sy,
    target,
    speed: 300,
    damage: 10
  };
  projectiles.push(projectile);
}

function moveProjectiles() {
  const dt = 16 / 1000;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.target) {
      projectiles.splice(i, 1);
      continue;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) {
      p.target.hp -= p.damage;
      if (p.target === immortalTarget && p.target.onHit) {
        p.target.onHit(p.damage);
      }
      if (p.target.hp <= 0 && p.target !== immortalTarget) {
        removeEnemy(p.target.cellIndex);
        updateStatus(`Враг "${p.target.name}" уничтожен!`);
      }
      projectiles.splice(i, 1);
      continue;
    }
    const vx = (dx / dist) * p.speed * dt;
    const vy = (dy / dist) * p.speed * dt;
    p.x += vx;
    p.y += vy;
  }
  renderProjectiles();
}

function renderProjectiles() {
  document.querySelectorAll('.projectile').forEach(el => el.remove());
  projectiles.forEach(p => {
    const el = document.createElement('div');
    el.classList.add('projectile');
    el.style.left = `${p.x - 4}px`;
    el.style.top = `${p.y - 4}px`;
    gameBoard.appendChild(el);
  });
}

function updateImmortalTargetStats(target) {
  if (!target.stats) {
    target.stats = {
      damageHistory: [],
      firstHit: null,
      lastDamage: 0
    };
  }
  target.onHit = function (damage) {
    const now = Date.now();
    this.stats.lastDamage = damage;
    if (!this.stats.firstHit) this.stats.firstHit = now;
    this.stats.damageHistory.push({ damage, time: now });
    this.stats.damageHistory = this.stats.damageHistory.filter(d => now - d.time <= 10000);

    const damage10s = this.stats.damageHistory.reduce((a, d) => a + d.damage, 0);
    const dps = damage10s / 10;

    document.getElementById('last-damage').textContent = this.stats.lastDamage;
    document.getElementById('damage-per-sec').textContent = dps.toFixed(2);
    document.getElementById('total-damage-10s').textContent = damage10s;
  };
}

function gameLoop() {
  const now = performance.now();
  towers.forEach(tower => {
    if (now - tower.lastShotTime < tower.fireRate) return;
    const towerX = (tower.cellIndex % BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    const towerY = Math.floor(tower.cellIndex / BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;

    let nearest = null;
    let minDist = Infinity;
    enemies.forEach(e => {
      const dx = e.x - towerX;
      const dy = e.y - towerY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < tower.range && d < minDist) {
        minDist = d;
        nearest = e;
      }
    });
    if (nearest) {
      shootProjectile(towerX, towerY, nearest);
      tower.lastShotTime = now;
    }
  });
  moveProjectiles();
  if (immortalTarget) updateImmortalTargetStats(immortalTarget);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
