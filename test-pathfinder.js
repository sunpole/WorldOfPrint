// test-pathfinder.js — UI для тестирования pathfinder.js

import {
  initPathfinder,
  updateGrid,
  addSpawner,
  removeSpawner,
  getPathForSpawner,
  getDebugOverlay,
  setPathForSpawner,
  applyEffectToPosition,
} from './pathfinder.js';

// === Константы ===
const GRID_WIDTH = 15;
const GRID_HEIGHT = 15;
const CELL_SIZE = 32;

// === DOM элементы ===
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;

const speedRange = document.getElementById('speedRange');
const speedInput = document.getElementById('speedInput');
const moveModeSelect = document.getElementById('moveMode');

// === Состояния ===
let grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
let spawners = {}; // ключ: id спавнера, значение: { pos, color }
let goal = { x: 14, y: 7 };
let selectedTool = 'wall';
let currentSpawnerId = 1;
let movementMode = '4';
let speed = 5;
let orders = [];
let moveTimer = null;

// === UI Функции ===
function updateSpeed(val) {
  speed = Math.max(1, Math.min(10, parseInt(val)));
  speedRange.value = speed;
  speedInput.value = speed;
  console.log('[⚙️] Установлена скорость:', speed);
}

function isCornerCuttingAllowed(mode) {
  return mode !== '8nc';
}

function updateMoveMode() {
  movementMode = moveModeSelect.value; // строка: '4', '8', '8nc', '16', '32'

  const allowCornerCutting = isCornerCuttingAllowed(movementMode);

  // Инициализация pathfinder заново с новыми параметрами
  initPathfinder(GRID_WIDTH, GRID_HEIGHT, movementMode, allowCornerCutting);

  console.log('[🧭] Режим перемещения:', movementMode);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, movementMode, allowCornerCutting);
  }
  draw();
}




function selectTool(tool) {
  selectedTool = tool;
  console.log('[🛠️] Выбран инструмент:', tool);
}

function resetGrid() {
  grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
  spawners = {};
  currentSpawnerId = 1;

  initPathfinder(GRID_WIDTH, GRID_HEIGHT, movementMode, isCornerCuttingAllowed(movementMode));

  updateGrid(grid);
  draw();
  console.log('[🔄] Сброс сетки и спавнеров');
}


function getRandomColor() {
  const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function drawOrders() {
  orders.forEach(order => {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(
      order.pos.x * CELL_SIZE + CELL_SIZE / 2,
      order.pos.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 4,
      0, 2 * Math.PI
    );
    ctx.fill();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
      ctx.strokeStyle = '#aaa';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  ctx.fillStyle = 'red';
  ctx.fillRect(goal.x * CELL_SIZE, goal.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

  for (const id in spawners) {
    const s = spawners[id];
    ctx.fillStyle = s.color;
    ctx.fillRect(s.pos.x * CELL_SIZE, s.pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    const path = getPathForSpawner(id);
    if (path) {
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      path.forEach((p, i) => {
        const cx = p.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = p.y * CELL_SIZE + CELL_SIZE / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }
  }

  drawOrders();
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

  if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return;

  const allowCornerCutting = isCornerCuttingAllowed(movementMode);

  switch (selectedTool) {
    case 'wall':
      grid[y][x] = grid[y][x] === 1 ? 0 : 1;
      break;
    case 'goal':
      goal = { x, y };
      break;
    case 'start':
      const id = `S${currentSpawnerId++}`;
      const color = getRandomColor();
      spawners[id] = { pos: { x, y }, color };
      addSpawner(id, { x, y }, goal, movementMode, allowCornerCutting);
      break;
  }

  updateGrid(grid);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, movementMode, allowCornerCutting);
  }

  draw();
});



function tickMovement() {
  let stillMoving = false;
  orders.forEach(order => {
    const path = getPathForSpawner(order.id);
    if (path && order.index < path.length - 1) {
      order.index++;
      order.pos = path[order.index];
      stillMoving = true;
    }
  });
  draw();
  if (stillMoving) moveTimer = setTimeout(tickMovement, 1000 / speed);
  else moveTimer = null;
}

function startOrders() {
  if (moveTimer) clearTimeout(moveTimer);
  orders = Object.keys(spawners).map(id => ({
    id,
    pos: { ...spawners[id].pos },
    index: 0
  }));
  console.log('[🚀] Запуск заказов:', orders);
  tickMovement();
}

function initUI() {
  // Инициализация pathfinder при загрузке UI
  initPathfinder(GRID_WIDTH, GRID_HEIGHT, movementMode, isCornerCuttingAllowed(movementMode));

  document.getElementById('resetBtn')?.addEventListener('click', resetGrid);
  document.getElementById('runBtn')?.addEventListener('click', startOrders);

  ['wall', 'goal', 'start'].forEach(tool => {
    document.getElementById(`tool-${tool}`)?.addEventListener('click', () => selectTool(tool));
  });

  moveModeSelect?.addEventListener('change', updateMoveMode);
  speedRange?.addEventListener('input', e => updateSpeed(e.target.value));
  speedInput?.addEventListener('change', e => updateSpeed(e.target.value));

  updateSpeed(speed);
  updateMoveMode();
  resetGrid();

  console.log('[✅] UI инициализирован');
}


(function verifyFunctions() {
  const log = console.log;
  const tests = {
    selectTool,
    updateSpeed,
    updateMoveMode,
    resetGrid,
    draw,
    startOrders,
    addSpawner,
    setPathForSpawner,
    updateGrid,
    getPathForSpawner
  };
  for (const name in tests) {
    if (typeof tests[name] !== 'function') log(`[❌] Функция \`${name}()\` не определена`);
    else log(`[✅] \`${name}()\` готова`);
  }
})();


// === Экспорт для отладки ===
export {
  selectTool,
  updateSpeed,
  updateMoveMode,
  resetGrid,
  draw,
  startOrders,
  addSpawner,
  setPathForSpawner,
  updateGrid,
  getPathForSpawner
};

// === Запуск ===
initUI();
