/**
 * pathfinder.js — модуль поиска пути (A*) для Tower Defense
 * 
 * Особенности:
 * - Кэширование путей с контролем изменений карты
 * - Обработка ошибок через исключения
 * - Два варианта поиска пути: 4 направления и 8 направлений
 * - Логирование
 * - Базовый каркас для взаимодействия с эффектами (замедление, вывод из строя)
 * 
 * Функции:
 * 1.  initPathfinder(grid) — инициализация карты и сброс состояния
 * 2.  updateGrid(newGrid) — обновление карты с проверкой изменений
 * 3.  findPath4(start, goal) — поиск пути по 4 направлениям
 * 4.  findPath8(start, goal) — поиск пути по 8 направлениям (вкл. диагонали)
 * 5.  setPathForSpawner(spawnerId, start, goal, useDiagonal=false) — сохранить путь спавна
 * 6.  getPathForSpawner(spawnerId) — получить путь спавна
 * 7.  isPathAvailable(start, goal, useDiagonal=false) — проверка наличия пути
 * 8.  getDebugOverlay(spawnerId) — маска пути для Dev Mode
 * 9.  recalcAllPaths() — пересчитать пути для всех спавнов
 * 10. addSpawner(spawnerId, start, goal, useDiagonal=false) — добавить спавн
 * 11. removeSpawner(spawnerId) — удалить спавн
 * 12. applyEffectToPosition(x, y, effect) — базовый пример применения эффекта на клетку (интеграция с эффектами)
 */

let grid = [];
let gridHash = '';
const spawners = new Map(); // spawnerId => { start, goal, useDiagonal }
const pathsCache = new Map(); // spawnerId => [{x,y}]
const LOG_PREFIX = '[Pathfinder]';

/** Простое логирование */
function log(message) {
  console.info(`${LOG_PREFIX} ${message}`);
}

/** Хэш строки карты (простая) для контроля изменений */
function hashGrid(grid) {
  try {
    return grid.map(row => row.join(',')).join('|');
  } catch {
    return '';
  }
}

/** 1. Инициализация карты */
export function initPathfinder(newGrid) {
  if (!Array.isArray(newGrid) || newGrid.length === 0) {
    throw new Error('initPathfinder: invalid grid');
  }
  grid = newGrid;
  gridHash = hashGrid(grid);
  spawners.clear();
  pathsCache.clear();
  log('Карта и состояние инициализированы');
}

/** 2. Обновление карты с проверкой изменений */
export function updateGrid(newGrid) {
  if (!Array.isArray(newGrid) || newGrid.length === 0) {
    throw new Error('updateGrid: invalid grid');
  }
  const newHash = hashGrid(newGrid);
  if (newHash === gridHash) {
    log('Карта не изменилась, пересчёт путей не требуется');
    return;
  }
  grid = newGrid;
  gridHash = newHash;
  pathsCache.clear();
  log('Карта обновлена, кэш очищен');
  recalcAllPaths();
}

/**
 * 3. Поиск пути A* 4 направления (вверх, вниз, влево, вправо)
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function findPath4(start, goal) {
  return findPathGeneric(start, goal, neighbors4);
}

/**
 * 4. Поиск пути A* 8 направлений (включая диагонали)
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function findPath8(start, goal) {
  return findPathGeneric(start, goal, neighbors8);
}

/**
 * Общий алгоритм A* с кастомной функцией получения соседей
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {(pos:{x:number,y:number})=>Array<{x:number,y:number}>} neighborsFunc 
 * @returns {Array<{x:number,y:number}>|null}
 */
function findPathGeneric(start, goal, neighborsFunc) {
  if (!isWalkable(goal.x, goal.y)) return null;

  const openSet = [];
  const closedSet = new Set();
  const cameFrom = new Map();

  const startKey = nodeKey(start);
  const goalKey = nodeKey(goal);

  const gScore = new Map();
  gScore.set(startKey, 0);

  const fScore = new Map();
  fScore.set(startKey, heuristic(start, goal));

  openSet.push({ pos: start, f: fScore.get(startKey) });

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const currentKey = nodeKey(current.pos);

    if (currentKey === goalKey) {
      return reconstructPath(cameFrom, current.pos);
    }

    closedSet.add(currentKey);

    for (const neighbor of neighborsFunc(current.pos)) {
      const neighborKey = nodeKey(neighbor);
      if (closedSet.has(neighborKey)) continue;
      if (!isWalkable(neighbor.x, neighbor.y)) continue;

      const tentativeG = gScore.get(currentKey) + movementCost(current.pos, neighbor);
      const prevG = gScore.get(neighborKey) ?? Infinity;

      if (tentativeG < prevG) {
        cameFrom.set(neighborKey, current.pos);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));
        if (!openSet.find(n => nodeKey(n.pos) === neighborKey)) {
          openSet.push({ pos: neighbor, f: fScore.get(neighborKey) });
        }
      }
    }
  }
  return null;
}

/**
 * 5. Сохраняет путь для спавна, учитывая тип движения
 * @param {string} spawnerId 
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {boolean} useDiagonal — использовать 8-направлений (по умолчанию false)
 */
export function setPathForSpawner(spawnerId, start, goal, useDiagonal = false) {
  const path = useDiagonal ? findPath8(start, goal) : findPath4(start, goal);
  if (path) {
    spawners.set(spawnerId, { start, goal, useDiagonal });
    pathsCache.set(spawnerId, path);
    log(`Путь сохранён для спавна "${spawnerId}" длиной ${path.length}`);
  } else {
    log(`Путь не найден для спавна "${spawnerId}"`);
    pathsCache.delete(spawnerId);
  }
}

/**
 * 6. Возвращает путь для спавна или null
 * @param {string} spawnerId 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function getPathForSpawner(spawnerId) {
  return pathsCache.get(spawnerId) || null;
}

/**
 * 7. Проверка доступности пути
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {boolean} useDiagonal 
 * @returns {boolean}
 */
export function isPathAvailable(start, goal, useDiagonal = false) {
  return (useDiagonal ? findPath8(start, goal) : findPath4(start, goal)) !== null;
}

/**
 * 8. Получить маску пути для Dev Mode
 * @param {string} spawnerId 
 * @returns {number[][]} 0/1 маска
 */
export function getDebugOverlay(spawnerId) {
  const path = pathsCache.get(spawnerId);
  if (!path) return [];

  const overlay = grid.map(row => row.map(() => 0));
  for (const pos of path) {
    if (overlay[pos.y] && typeof overlay[pos.y][pos.x] !== 'undefined') {
      overlay[pos.y][pos.x] = 1;
    }
  }
  return overlay;
}

/**
 * 9. Пересчитывает пути для всех спавнов
 */
export function recalcAllPaths() {
  for (const [id, { start, goal, useDiagonal }] of spawners.entries()) {
    setPathForSpawner(id, start, goal, useDiagonal);
  }
  log('Все пути пересчитаны');
}

/**
 * 10. Добавляет новый спавн и рассчитывает путь
 * @param {string} spawnerId 
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {boolean} useDiagonal 
 */
export function addSpawner(spawnerId, start, goal, useDiagonal = false) {
  spawners.set(spawnerId, { start, goal, useDiagonal });
  setPathForSpawner(spawnerId, start, goal, useDiagonal);
  log(`Спавн "${spawnerId}" добавлен`);
}

/**
 * 11. Удаляет спавн и путь
 * @param {string} spawnerId 
 */
export function removeSpawner(spawnerId) {
  spawners.delete(spawnerId);
  pathsCache.delete(spawnerId);
  log(`Спавн "${spawnerId}" удалён`);
}

/**
 * 12. Базовый пример применения эффекта на клетку (например, замедление)
 * В реальности эффекты лучше реализовать в отдельном модуле с логикой врагов
 * @param {number} x 
 * @param {number} y 
 * @param {string} effect — тип эффекта, например 'slow', 'disable'
 */
export function applyEffectToPosition(x, y, effect) {
  // Заглушка: здесь можно интегрировать взаимодействие с врагами или полем
  log(`Применён эффект "${effect}" на позицию (${x},${y})`);
}

// ———————————————————————
// Вспомогательные функции

function isWalkable(x, y) {
  return (
    y >= 0 && y < grid.length &&
    x >= 0 && x < grid[0].length &&
    grid[y][x] === 0
  );
}

function nodeKey(pos) {
  return `${pos.x},${pos.y}`;
}

/** Манхэттен для 4-направлений, диагональный обход слегка дороже */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Стоимость перемещения (1 для прямых, 1.4 для диагоналей) */
function movementCost(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx === 1 && dy === 1) return 1.4; // диагональ
  return 1; // прямая
}

/** Соседи по 4 направлениям */
function neighbors4(pos) {
  return [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x - 1, y: pos.y },
  ].filter(p => p.y >= 0 && p.y < grid.length && p.x >= 0 && p.x < grid[0].length);
}

/** Соседи по 8 направлениям */
function neighbors8(pos) {
  const directions = [
    [0, -1],  [1, -1],  [1, 0],  [1, 1],
    [0, 1],   [-1, 1],  [-1, 0], [-1, -1]
  ];

  const result = [];

  for (const [dx, dy] of directions) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;

    if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
    if (grid[ny][nx] !== 0) continue; // нельзя идти в стену

    // Для диагоналей — проверка "сквозь стену"
    if (dx !== 0 && dy !== 0) {
      const neighbor1 = grid[pos.y][pos.x + dx]; // горизонталь
      const neighbor2 = grid[pos.y + dy][pos.x]; // вертикаль
      if (neighbor1 !== 0 || neighbor2 !== 0) continue; // блокируем диагональ, если хотя бы одна сторона — стена
    }

    result.push({ x: nx, y: ny });
  }

  return result;
}

/** Восстановление пути по cameFrom */
function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(nodeKey(current))) {
    current = cameFrom.get(nodeKey(current));
    path.push(current);
  }
  return path.reverse();
}
