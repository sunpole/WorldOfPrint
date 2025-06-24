// test-pathfinder.js

import {
  initPathfinder,
  updateGrid,
  addSpawner,
  removeSpawner,
  getPathForSpawner,
  getDebugOverlay,
  setPathForSpawner,
  applyEffectToPosition,
  getAllPaths,
  setMovementMode
} from '../core/pathfinder.js';

const GRID_WIDTH = 15;
const GRID_HEIGHT = 15;
const CELL_SIZE = 32;
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;

let grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
let spawners = {};
let goal = { x: 14, y: 7 };
let selectedTool = 'wall';
let currentSpawnerId = 1;
let movementMode = 4; // 4 или 8 направлений
let speed = 1;

const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

speedSlider.addEventListener('input', () => {
  speed = parseFloat(speedSlider.value);
  speedValue.textContent = speed;
});

// Инициализация
initPathfinder(grid);
addSpawner(currentSpawnerId, { x: 0, y: 7 });
setPathForSpawner(currentSpawnerId, { x: 0, y: 7 }, goal, movementMode);

// Обновление и отрисовка
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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
}

canvas.addEventListener('click', e => {
  const x = Math.floor(e.offsetX / CELL_SIZE);
  const y = Math.floor(e.offsetY / CELL_SIZE);

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
      spawners[id] = { pos: { x, y }, color, path: [] };
      addSpawner(id, { x, y });
      setPathForSpawner(id, { x, y }, goal, movementMode);
      break;
  }

  updateGrid(grid);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, movementMode);
  }

  draw();
});

document.getElementById('tool-wall').onclick = () => selectedTool = 'wall';
document.getElementById('tool-start').onclick = () => selectedTool = 'start';
document.getElementById('tool-goal').onclick = () => selectedTool = 'goal';
document.getElementById('mode-4').onclick = () => {
  movementMode = 4;
  setMovementMode(4);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, 4);
  }
  draw();
};
document.getElementById('mode-8').onclick = () => {
  movementMode = 8;
  setMovementMode(8);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, 8);
  }
  draw();
};

document.getElementById('reset-btn').onclick = () => {
  grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
  spawners = {};
  currentSpawnerId = 1;
  updateGrid(grid);
  draw();
};

function getRandomColor() {
  const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Пошаговое перемещение заказов
let orders = [];
function tickMovement() {
  orders.forEach(order => {
    const path = getPathForSpawner(order.id);
    if (path && order.index < path.length - 1) {
      order.index++;
      order.pos = path[order.index];
    }
  });
  drawOrders();
  setTimeout(tickMovement, 1000 / speed);
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

document.getElementById('start-move').onclick = () => {
  orders = Object.keys(spawners).map(id => ({
    id,
    pos: { ...spawners[id].pos },
    index: 0
  }));
  tickMovement();
};

draw();
