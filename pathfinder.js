/**
 * pathfinder.js — модуль поиска пути (A*) для Tower Defense
 * 
 * Особенности:
 * - Кэширование путей с контролем изменений карты
 * - Обработка ошибок через исключения
 * - Много вариантов поиска пути: 4, 8, 16 и 32 направления
 * - Включаемая проверка диагональных проходов между препятствиями
 * - Логирование
 * - Базовый каркас для взаимодействия с эффектами (замедление, вывод из строя)
 * 
 * Функции:
 * 1.  initPathfinder(grid) — инициализация карты и сброс состояния
 * 2.  updateGrid(newGrid) — обновление карты с проверкой изменений
 * 3.  findPath4(start, goal) — поиск пути по 4 направлениям
 * 4.  findPath8(start, goal) — поиск пути по 8 направлениям (вкл. диагонали, с проверкой проходов)
 * 5.  findPath8NoCheck(start, goal) — поиск пути по 8 направлениям (без проверки диагональных проходов)
 * 6.  findPath16(start, goal) — поиск пути по 16 направлениям
 * 7.  findPath32(start, goal) — поиск пути по 32 направлениям
 * 8.  setPathForSpawner(spawnerId, start, goal, mode='4') — сохранить путь спавна (mode: '4','8','8nc','16','32')
 * 9.  getPathForSpawner(spawnerId) — получить путь спавна
 * 10. isPathAvailable(start, goal, mode='4') — проверка наличия пути
 * 11. getDebugOverlay(spawnerId) — маска пути для Dev Mode
 * 12. recalcAllPaths() — пересчитать пути для всех спавнов
 * 13. addSpawner(spawnerId, start, goal, mode='4') — добавить спавн
 * 14. removeSpawner(spawnerId) — удалить спавн
 * 15. applyEffectToPosition(x, y, effect) — базовый пример применения эффекта на клетку (интеграция с эффектами)
 * 16. setDiagonalPassCheck(enabled) — включить/выключить проверку диагональных проходов
 */

let grid = [];
let gridHash = null;  // чтобы отличать отсутствие хэша от пустой строки
const spawners = new Map(); // spawnerId => { start, goal, mode }
const pathsCache = new Map(); // spawnerId => [{x,y}]
const LOG_PREFIX = '[Pathfinder]';

let diagonalPassCheckEnabled = true;

/** Простое логирование */
function log(message) {
  console.info(`${LOG_PREFIX} ${message}`);
}

/** Хэш строки карты (простая) для контроля изменений */
async function hashGridAsync(grid) {
  try {
    const str = grid.map(row => row.join(',')).join('|');
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error(`${LOG_PREFIX} hashGridAsync error:`, e);
    return '';
  }
}



/** 1. Инициализация карты */
let diagonalPassCheckEnabled = true;
let currentMovementMode = '4';

export async function initPathfinder(newGrid, mode = '4', allowDiagonalPass = true) {
  if (!Array.isArray(newGrid) || newGrid.length === 0) {
    throw new Error('initPathfinder: invalid grid');
  }

  // Проверяем валидность: все строки одинаковой длины и содержат только 0 или 1
  const width = newGrid[0].length;
  for (const row of newGrid) {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error('initPathfinder: inconsistent row length in grid');
    }
    for (const cell of row) {
      if (cell !== 0 && cell !== 1) {
        throw new Error('initPathfinder: grid cells must be 0 or 1');
      }
    }
  }

  grid = newGrid;
  gridHash = await hashGridAsync(grid); // асинхронно

  spawners.clear();
  pathsCache.clear();
  diagonalPassCheckEnabled = allowDiagonalPass;
  currentMovementMode = mode;

  log(`Карта и состояние инициализированы (режим: ${mode}, диагональ: ${allowDiagonalPass})`);
}

/** 2. Обновление карты с проверкой изменений */
export async function updateGrid(newGrid) {
  if (!Array.isArray(newGrid) || newGrid.length === 0) {
    throw new Error('updateGrid: invalid grid');
  }
  const newHash = await hashGridAsync(newGrid);
  if (newHash === gridHash) {
    log('Карта не изменилась, пересчёт путей не требуется');
    return;
  }
  // Создаём копию, чтобы избежать мутаций исходного массива
  grid = newGrid.map(row => row.slice());
  gridHash = newHash;
  pathsCache.clear();
  log('Карта обновлена, кэш очищен');
  recalcAllPaths(); // или await recalcAllPaths(), если она асинхронна
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
 * 4. Поиск пути A* 8 направлений (включая диагонали с проверкой проходов)
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function findPath8(start, goal) {
  return findPathGeneric(start, goal, neighbors8WithCheck);
}

/**
 * 5. Поиск пути A* 8 направлений (без проверки проходов между диагональными стенами)
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function findPath8NoCheck(start, goal) {
  return findPathGeneric(start, goal, neighbors8NoCheck);
}

/**
 * 6. Поиск пути A* 16 направлений
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function findPath16(start, goal) {
  return findPathGeneric(start, goal, neighbors16);
}

/**
 * 7. Поиск пути A* 32 направлений
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function findPath32(start, goal) {
  return findPathGeneric(start, goal, neighbors32);
}

/**
 * 8. Сохраняет путь для спавна, учитывая режим движения
 * @param {string} spawnerId 
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {'4'|'8'|'8nc'|'16'|'32'} mode — режим поиска пути
 */
export function setPathForSpawner(spawnerId, start, goal, mode = currentMovementMode) {
  let path = null;
  switch (mode) {
    case '4': path = findPath4(start, goal); break;
    case '8': path = findPath8(start, goal); break;
    case '8nc': path = findPath8NoCheck(start, goal); break;
    case '16': path = findPath16(start, goal); break;
    case '32': path = findPath32(start, goal); break;
    default: throw new Error(`setPathForSpawner: неизвестный режим "${mode}"`);
  }
  if (path) {
    spawners.set(spawnerId, { start, goal, mode });
    pathsCache.set(spawnerId, path);
    log(`Путь сохранён для спавна "${spawnerId}" длиной ${path.length} (режим: ${mode})`);
  } else {
    log(`Путь не найден для спавна "${spawnerId}" (режим: ${mode})`);
    pathsCache.delete(spawnerId);
  }
}

/**
 * 9. Возвращает путь для спавна или null
 * @param {string} spawnerId 
 * @returns {Array<{x:number,y:number}>|null}
 */
export function getPathForSpawner(spawnerId) {
  return pathsCache.get(spawnerId) || null;
}

/**
 * 10. Проверка доступности пути
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {'4'|'8'|'8nc'|'16'|'32'} mode 
 * @returns {boolean}
 */
export function isPathAvailable(start, goal, mode = '4') {
  try {
    switch (mode) {
      case '4': return findPath4(start, goal) !== null;
      case '8': return findPath8(start, goal) !== null;
      case '8nc': return findPath8NoCheck(start, goal) !== null;
      case '16': return findPath16(start, goal) !== null;
      case '32': return findPath32(start, goal) !== null;
      default: throw new Error(`isPathAvailable: неизвестный режим "${mode}"`);
    }
  } catch {
    return false;
  }
}

/**
 * 11. Получить маску пути для Dev Mode
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
 * 12. Пересчитывает пути для всех спавнов
 */
export function recalcAllPaths() {
  for (const [id, { start, goal, mode }] of spawners.entries()) {
    setPathForSpawner(id, start, goal, mode);
  }
  log('Все пути пересчитаны');
}

/**
 * 13. Добавляет новый спавн и рассчитывает путь
 * @param {string} spawnerId 
 * @param {{x:number,y:number}} start 
 * @param {{x:number,y:number}} goal 
 * @param {'4'|'8'|'8nc'|'16'|'32'} mode 
 */
function isValidPos(pos) {
  return pos && typeof pos.x === 'number' && typeof pos.y === 'number' && isInsideGrid(pos);
}

export function addSpawner(spawnerId, start, goal, mode = '4') {
  if (!isValidPos(start) || !isValidPos(goal)) {
    throw new Error(`addSpawner: некорректные координаты start или goal`);
  }
  spawners.set(spawnerId, { start, goal, mode });
  setPathForSpawner(spawnerId, start, goal, mode);
  log(`Спавн "${spawnerId}" добавлен (режим: ${mode})`);
}


/**
 * 14. Удаляет спавн и путь
 * @param {string} spawnerId 
 */
export function removeSpawner(spawnerId) {
  spawners.delete(spawnerId);
  pathsCache.delete(spawnerId);
  log(`Спавн "${spawnerId}" удалён`);
}

/**
 * 15. Базовый пример применения эффекта на клетку (например, замедление)
 * В реальности эффекты лучше реализовать в отдельном модуле с логикой врагов
 * @param {number} x 
 * @param {number} y 
 * @param {string} effect — тип эффекта, например 'slow', 'disable'
 */
export function applyEffectToPosition(x, y, effect) {
  // Заглушка — здесь может быть интеграция с внешним модулем эффектов
  log(`Применён эффект "${effect}" на позицию (${x},${y})`);
  return true; // или false, если эффект не применим
}


/**
 * 16. Включить/выключить проверку диагональных проходов между препятствиями
 * @param {boolean} enabled
 */
export function setDiagonalPassCheck(enabled) {
  diagonalPassCheckEnabled = !!enabled;
  log(`Проверка диагональных проходов ${enabled ? 'включена' : 'выключена'}`);
}

// ———————————————————————
// Вспомогательные функции

export function getCurrentMovementMode() {
  return currentMovementMode;
}

export function isDiagonalPassCheckEnabled() {
  return diagonalPassCheckEnabled;
}



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

/** Манхэттен для 4-направлений, диагональный обход чуть дороже */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Стоимость перемещения (1 для прямых, ~1.4 для диагоналей, более сложная для 16/32) */
function movementCost(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx === 1 && dy === 1) return 1.4; // диагональ
  if ((dx === 2 && dy === 0) || (dx === 0 && dy === 2)) return 2; // двойной шаг
  if (dx === 2 && dy === 2) return 2.8; // диагональ двойного шага (приблизительно)
  if (dx === 1 && dy === 2) return 2.24; // примерно sqrt(1²+2²)
  if (dx === 2 && dy === 1) return 2.24;
  return 1; // прямая
}

/** Общий алгоритм A* с кастомной функцией получения соседей */
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

/** Восстановление пути по cameFrom */
function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(nodeKey(current))) {
    current = cameFrom.get(nodeKey(current));
    path.push(current);
  }
  return path.reverse();
}

/** 4 направления (вверх, вниз, влево, вправо) */
function neighbors4(pos) {
  return [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x - 1, y: pos.y },
  ].filter(p => isInsideGrid(p) && isWalkable(p.x, p.y));
}

/**
 * 8 направлений с проверкой проходов между диагональными стенами (если включена)
 * Проверяет, чтобы при движении по диагонали между стенами не пройти.
 */
function neighbors8WithCheck(pos) {
  const directions = [
    [0, -1],  [1, -1],  [1, 0],  [1, 1],
    [0, 1],   [-1, 1],  [-1, 0], [-1, -1]
  ];

  const result = [];

  for (const [dx, dy] of directions) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;

    if (!isInsideGrid({x: nx, y: ny}) || !isWalkable(nx, ny)) continue;

    if (dx !== 0 && dy !== 0 && diagonalPassCheckEnabled) {
      // Проверка "сквозь стену"
      if (!canPassDiagonal(pos.x, pos.y, dx, dy)) continue;
    }

    result.push({ x: nx, y: ny });
  }

  return result;
}

/** 8 направлений без проверки проходов (свободные диагонали) */
function neighbors8NoCheck(pos) {
  const directions = [
    [0, -1],  [1, -1],  [1, 0],  [1, 1],
    [0, 1],   [-1, 1],  [-1, 0], [-1, -1]
  ];

  const result = [];

  for (const [dx, dy] of directions) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (!isInsideGrid({x: nx, y: ny}) || !isWalkable(nx, ny)) continue;
    result.push({ x: nx, y: ny });
  }

  return result;
}

/** 16 направлений — 8 основных + 8 между ними (шаги в 2 клетки и диагонали с двойным шагом) */
function neighbors16(pos) {
  const directions = [
    [0, -1],  [1, -1],  [1, 0],  [1, 1],
    [0, 1],   [-1, 1],  [-1, 0], [-1, -1],
    [2, 0],   [-2, 0],  [0, 2],  [0, -2],
    [2, 2],   [2, -2],  [-2, 2], [-2, -2]
  ];

  const result = [];

  for (const [dx, dy] of directions) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (!isInsideGrid({x: nx, y: ny}) || !isWalkable(nx, ny)) continue;

    // Для диагоналей с двойным шагом — можно сделать проверки, но сейчас считаем, что проходимы
    result.push({ x: nx, y: ny });
  }

  return result;
}

/** 32 направления — включает соседей в пределах радиуса 2 вокруг клетки */
function neighbors32(pos) {
  const result = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (!isInsideGrid({x: nx, y: ny}) || !isWalkable(nx, ny)) continue;

      // Дополнительно можно реализовать проверку диагональных проходов для диагоналей >1 клетки,
      // но пока считаем все соседями
      result.push({ x: nx, y: ny });
    }
  }
  return result;
}

/** Проверка, находится ли позиция внутри сетки */
function isInsideGrid(pos) {
  return pos.y >= 0 && pos.y < grid.length && pos.x >= 0 && pos.x < grid[0].length;
}

/**
 * Проверка прохода по диагонали между препятствиями.
 * Разрешает проход, если обе клетки по бокам диагонали проходимы.
 * 
 * @param {number} x - текущая X
 * @param {number} y - текущая Y
 * @param {number} dx - смещение по X (±1)
 * @param {number} dy - смещение по Y (±1)
 * @returns {boolean}
 */
function canPassDiagonal(x, y, dx, dy) {
  if (!isInsideGrid({x: x + dx, y: y}) || !isInsideGrid({x: x, y: y + dy})) return false;
  const side1 = grid[y][x + dx];
  const side2 = grid[y + dy][x];
  return side1 === 0 && side2 === 0;
}
