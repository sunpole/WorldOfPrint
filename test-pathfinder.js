//test-pathfinder.js

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

const GRID_WIDTH = 15;
const GRID_HEIGHT = 15;
const CELL_SIZE = 32;

const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;

let grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
let spawners = {}; // id: { pos: {x,y}, color }
let goal = { x: 14, y: 7 };
let selectedTool = 'wall';
let currentSpawnerId = 1;
let movementMode = 4; // 4 или 8 направлений
let speed = 5;

const speedRange = document.getElementById('speedRange');
const speedInput = document.getElementById('speedInput');

function updateSpeed(val) {
  speed = Math.max(1, Math.min(10, parseInt(val)));
  speedRange.value = speed;
  speedInput.value = speed;
}

function updateMoveMode() {
  const mode = parseInt(document.getElementById('moveMode').value);
  movementMode = mode;
  const useDiagonal = (movementMode === 8);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, useDiagonal);
  }
  draw();
}

function selectTool(tool) {
  selectedTool = tool;
}

function resetGrid() {
  grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
  spawners = {};
  currentSpawnerId = 1;
  updateGrid(grid);
  draw();
}

function getRandomColor() {
  const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
      ctx.strokeStyle = '#555';
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
      const useDiagonal = (movementMode === 8);
      addSpawner(id, { x, y }, goal, useDiagonal);
      break;
  }

  updateGrid(grid);
  const useDiagonal = (movementMode === 8);
  for (const id in spawners) {
    setPathForSpawner(id, spawners[id].pos, goal, useDiagonal);
  }

  draw();
});

let orders = [];
let moveTimer = null;
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

function startOrders() {
  if (moveTimer) clearTimeout(moveTimer);
  orders = Object.keys(spawners).map(id => ({
    id,
    pos: { ...spawners[id].pos },
    index: 0
  }));
  tickMovement();
}

export {
  selectTool,
  updateSpeed,
  updateMoveMode,
  resetGrid,
  draw,
  startOrders
};
