// test-pathfinder.js

import {
  initPathfinder,
  updateGrid,
  addSpawner,
  removeSpawner,
  getPathForSpawner,
  getDebugOverlay,
  setPathForSpawner,
  applyEffectToPosition
} from '../core/pathfinder.js';

const GRID_WIDTH = 15;
const GRID_HEIGHT = 15;
const CELL_SIZE = 32;
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;

let grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
let selectedTool = 'wall'; // или 'start', 'goal'
let spawnerId = 'S1';
let start = { x: 0, y: 7 };
let goal = { x: 14, y: 7 };

// Инициализация
initPathfinder(grid);
setPathForSpawner(spawnerId, start, goal, false);

// ===== ОБРАБОТЧИКИ КЛИКОВ ПО КАНВАСУ =====
canvas.addEventListener('click', e => {
  const x = Math.floor(e.offsetX / CELL_SIZE);
  const y = Math.floor(e.offsetY / CELL_SIZE);

  switch (selectedTool) {
    case 'wall':
      grid[y][x] = grid[y][x] === 1 ? 0 : 1;
      break;
    case 'start':
      start = { x, y };
      break;
    case 'goal':
      goal = { x, y };
      break;
  }

  updateGrid(grid);
  setPathForSpawner(spawnerId, start, goal, false);
  draw();
});

// ====== ОТРИСОВКА СЕТКИ ======
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Клетки
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  // Старт / Финиш
  ctx.fillStyle = 'green';
  ctx.fillRect(start.x * CELL_SIZE, start.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  ctx.fillStyle = 'red';
  ctx.fillRect(goal.x * CELL_SIZE, goal.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

  // Отладочная отрисовка пути
  const path = getPathForSpawner(spawnerId);
  if (path) {
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const { x, y } = path[i];
      const cx = x * CELL_SIZE + CELL_SIZE / 2;
      const cy = y * CELL_SIZE + CELL_SIZE / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

draw();
