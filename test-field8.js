//test-field8.js

// === Константы ===
const BOARD_SIZE = 15;
const CELL_SIZE = 40;

const gameBoard = document.getElementById('game-board');
const status = document.getElementById('status');
const heldObjectDiv = document.getElementById('held-object');
const dragIndicator = document.getElementById('drag-indicator');
const toggleMovementButton = document.getElementById('toggle-movement');
const immortalStats = document.querySelector('.immortal-stats');
const deleteButton = document.getElementById('delete-button');

let towers = [];
let enemies = [];
let heldObject = null;
let isDragging = false;
let immortalTarget = null;
let projectiles = [];
let currentSelectedIndex = null;

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
      selectObject(i);
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
      hp: el.dataset.hp === "Infinity" ? Infinity : +el.dataset.hp || 0,
      speed: +el.dataset.speed || 0
    };
    currentSelectedIndex = null;
    updateHeldObjectDiv();
    updateStatus(`Взято в руку: ${heldObject.name}`);
  });
});

window.addEventListener('contextmenu', e => {
  e.preventDefault();
  heldObject = null;
  updateHeldObjectDiv();
  updateStatus('Отмена выбора');
});

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    isDragging = true;
    dragIndicator.style.display = 'block';
    dragIndicator.style.backgroundColor = 'yellow';
    dragIndicator.textContent = 'Режим перемещения активен';
  }
  if (e.code === 'Delete' && currentSelectedIndex !== null) {
    handleRemove(currentSelectedIndex);
    currentSelectedIndex = null;
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
  dragIndicator.style.backgroundColor = isDragging ? 'yellow' : '';
  dragIndicator.textContent = isDragging ? 'Режим перемещения активен' : '';
});

deleteButton.addEventListener('click', () => {
  if (currentSelectedIndex !== null) {
    handleRemove(currentSelectedIndex);
    currentSelectedIndex = null;
  }
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

function selectObject(index) {
  if (towerGrid[index] || enemyGrid[index]) {
    currentSelectedIndex = index;
    updateStatus(`Выбрана клетка ${index}`);
  } else {
    currentSelectedIndex = null;
    updateStatus('Пустая клетка');
  }
}

function handlePlacement(index) {
  const cellRect = gameBoard.getBoundingClientRect();
  if (!isDragging || (event.pageX >= cellRect.left && event.pageX <= cellRect.right && event.pageY >= cellRect.top && event.pageY <= cellRect.bottom)) {
    if (heldObject.type === 'tower') {
      if (!towerGrid[index]) placeTower(index, heldObject);
      else updateStatus('Тут уже есть башня!');
    } else if (heldObject.type === 'enemy') {
      if (!enemyGrid[index]) placeEnemy(index, heldObject);
      else updateStatus('Тут уже есть враг!');
    }
  }
}

function handleRemove(index) {
  if (towerGrid[index]) removeTower(index);
  else if (enemyGrid[index]) removeEnemy(index);
}

function placeTower(index, data) {
  towerGrid[index] = { ...data, index };
  updateStatus(`Башня установлена в клетку ${index}`);
  heldObject = null;
  updateHeldObjectDiv();
}

function placeEnemy(index, data) {
  const enemy = { ...data, hp: data.hp, maxHp: data.hp, index };
  if (data.name === 'Бессмертная Цель') {
    immortalStats.style.display = 'block';
    updateImmortalTargetStats(enemy);
    immortalTarget = enemy;
  }
  enemyGrid[index] = enemy;
  const cell = gameBoard.children[index];
  updateHealthDisplay(cell, enemy);
  updateStatus(`Враг установлен в клетку ${index}`);
  heldObject = null;
  updateHeldObjectDiv();
}

function removeTower(index) {
  towerGrid[index] = null;
  gameBoard.children[index].innerHTML = '';
  updateStatus(`Башня удалена с клетки ${index}`);
}

function removeEnemy(index) {
  if (enemyGrid[index]?.name === 'Бессмертная Цель') {
    immortalStats.style.display = 'none';
    immortalTarget = null;
  }
  enemyGrid[index] = null;
  gameBoard.children[index].innerHTML = '';
  updateStatus(`Враг удалён с клетки ${index}`);
}

function updateHeldObjectDiv() {
  heldObjectDiv.style.display = heldObject ? 'block' : 'none';
}

function updateStatus(msg) {
  status.innerHTML = `Выбран объект: <i>${msg}</i>`;
}

function updateHealthDisplay(cell, enemy) {
  cell.innerHTML = '';
  const bar = document.createElement('div');
  bar.classList.add('hp-bar');
  const percent = enemy.hp === Infinity ? 100 : Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  bar.style.width = `${percent}%`;
  bar.style.backgroundColor = percent > 30 ? 'green' : 'red';
  const text = document.createElement('div');
  text.classList.add('hp-text');
  text.textContent = enemy.hp === Infinity ? '∞' : Math.round(enemy.hp);
  cell.appendChild(bar);
  cell.appendChild(text);
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
    const damage1s = this.stats.damageHistory.filter(d => now - d.time <= 1000).reduce((a, d) => a + d.damage, 0);
    const elapsed = (now - this.stats.firstHit) / 1000;

    document.getElementById('last-damage').textContent = this.stats.lastDamage;
    document.getElementById('damage-per-sec').textContent = (elapsed < 10 ? `${(damage10s / elapsed).toFixed(2)} (за ${elapsed.toFixed(2)}с)` : (damage10s / 10).toFixed(2));
    document.getElementById('total-damage-10s').textContent = damage10s;
  };
}

// ❗ Дополнительно: чтобы обновлять HP бар бессмертной цели — можно вызывать updateHealthDisplay(enemy) в game loop при уроне.
