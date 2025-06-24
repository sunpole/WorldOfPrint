const BOARD_SIZE = 15;  
const CELL_SIZE = 30;  

const gameBoard = document.getElementById('game-board');  
const status = document.getElementById('status');  
const heldObjectDiv = document.getElementById('held-object');  
const dragIndicator = document.getElementById('drag-indicator');  
const deleteButton = document.getElementById('delete-button');  
const immortalStats = document.querySelector('.immortal-stats');  

let towers = [];  
let enemies = [];  
let heldObject = null;  
let isDragging = false;  
let immortalTarget = null;  

// Состояние клеток  
const towerGrid = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);  
const enemyGrid = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);  

// Создание игрового поля  
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
        if (heldObject) {  
            cell.classList.add('hovered');  
        }  
    });  

    cell.addEventListener('mouseleave', () => {  
        cell.classList.remove('hovered');  
    });  
}  

// Обработка клика по предметам в магазине  
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

// Удаление объекта по ПКМ  
window.addEventListener('contextmenu', e => {  
    e.preventDefault();  
    if (heldObject) {  
        heldObject = null;  
        updateHeldObjectDiv();  
        updateStatus('Отмена выбора');  
    }  
});  

// Перемещение объектов при удерживании пробела  
window.addEventListener('keydown', (e) => {  
    if (e.code === 'Space') {  
        isDragging = true;  
        dragIndicator.style.display = 'block';  
    }  
});  

window.addEventListener('keyup', (e) => {  
    if (e.code === 'Space') {  
        isDragging = false;  
        dragIndicator.style.display = 'none';  
    }  
});  

// Отображение выбранного объекта
window.addEventListener('mousemove', e => {
    if (heldObject) {
        heldObjectDiv.style.display = 'block';
        heldObjectDiv.style.left = (e.pageX + 10) + 'px';
        heldObjectDiv.style.top = (e.pageY + 10) + 'px';
        heldObjectDiv.textContent = heldObject.name;
        heldObjectDiv.style.backgroundColor = heldObject.type === 'tower' ? 'crimson' : 'darkgreen';
    } else {
        heldObjectDiv.style.display = 'none';
    }
});

// Обработка установки объектов
function handlePlacement(index) {
    if (heldObject.type === 'tower') {
        if (towerGrid[index] === null) {
            placeTower(index, heldObject);
        } else {
            updateStatus('Тут уже есть башня!');
        }
    } else if (heldObject.type === 'enemy') {
        if (enemyGrid[index] === null) {
            placeEnemy(index, heldObject);
        } else {
            updateStatus('Тут уже есть враг!');
        }
    }
}

// Обработка удаления объектов
function handleRemove(index) {
    if (towerGrid[index]) {
        removeTower(index);
    } else if (enemyGrid[index]) {
        removeEnemy(index);
    }
}

// Установка башни
function placeTower(index, obj) {
    const tower = {
        cellIndex: index,
        ...obj,
        cooldown: 0,
        lastShotTime: performance.now(),
    };
    towers.push(tower);
    towerGrid[index] = obj;
    updateCellVisual(index);
    updateStatus(`Башня "${obj.name}" установлена в клетку ${index}`);
}

// Установка врага
function placeEnemy(index, obj) {
    const enemy = {
        cellIndex: index,
        ...obj,
        hp: obj.hp,
        x: (index % BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2,
        y: Math.floor(index / BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2,
    };
    enemies.push(enemy);
    enemyGrid[index] = obj;
    updateCellVisual(index);
    updateStatus(`Враг "${obj.name}" установлен в клетку ${index}`);
    if (obj.name === "Бессмертная Цель") {
        immortalTarget = enemy; // Устанавливаем бессмертную цель
        immortalStats.style.display = 'block'; // Показываем статистику бессмертной цели
    }
}

// Удаление башни
function removeTower(index) {
    const towerIndex = towers.findIndex(t => t.cellIndex === index);
    if (towerIndex >= 0) {
        towers.splice(towerIndex, 1);
        towerGrid[index] = null;
        updateCellVisual(index);
        updateStatus(`Башня в клетке ${index} удалена.`);
    }
}

// Удаление врага
function removeEnemy(index) {
    const enemyIndex = enemies.findIndex(e => e.cellIndex === index);
    if (enemyIndex >= 0) {
        const enemy = enemies[enemyIndex];
        enemies.splice(enemyIndex, 1);
        enemyGrid[index] = null;
        updateCellVisual(index);
        updateStatus(`Враг "${enemy.name}" удален.`);
        if (enemy.name === "Бессмертная Цель") {
            immortalTarget = null; // Сбрасываем бессмертную цель
            immortalStats.style.display = 'none'; // Скрываем статистику бессмертной цели
        }
    }
}

// Обновить визуал клетки
function updateCellVisual(index) {
    const cell = gameBoard.children[index];
    cell.classList.remove('tower', 'enemy');

    if (towerGrid[index]) {
        cell.classList.add('tower');
        cell.title = `Башня: ${towerGrid[index].name}`;
    } else if (enemyGrid[index]) {
        cell.classList.add('enemy');
        cell.title = `Враг: ${enemyGrid[index].name}`;
        updateHealthBar(cell, enemyGrid[index].hp); // Обновляем ХП бар врага
    } else {
        cell.title = '';
    }
}

// Обновить статус внизу
function updateStatus(msg) {
    status.textContent = msg;
}

// Обновить ХП бар врага
function updateHealthBar(cell, hp) {
    const bar = document.createElement('div');
    bar.classList.add('hp-bar');
    bar.style.width = `${hp}%`;
    bar.style.backgroundColor = hp > 30 ? 'green' : 'red'; // Зеленый при более чем 30%
    cell.appendChild(bar);

    const hpText = document.createElement('div');
    hpText.classList.add('hp-text');
    hpText.innerText = `${hp}`;
    cell.appendChild(hpText);
}

// Стрелять по ближайшему врагу
function gameLoop() {
    const now = performance.now();

    towers.forEach(tower => {
        if (now - tower.lastShotTime < tower.fireRate) return;

        // Найти ближайшего врага в радиусе
        const towerX = (tower.cellIndex % BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;
        const towerY = Math.floor(tower.cellIndex / BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;

        let nearestEnemy = null;
        let nearestDist = Infinity;

        enemies.forEach(enemy => {
            const dx = enemy.x - towerX;
            const dy = enemy.y - towerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= tower.range && dist < nearestDist) {
                nearestEnemy = enemy;
                nearestDist = dist;
            }
        });

        if (nearestEnemy) {
            shootProjectile(towerX, towerY, nearestEnemy);
            tower.lastShotTime = now;
        }
    });

    moveProjectiles();

    // Обновление бессмертной цели
    if (immortalTarget) {
        updateImmortalTargetStats(immortalTarget);
    }

    requestAnimationFrame(gameLoop);
}

// Перемещение снарядов
let projectiles = [];
function shootProjectile(sx, sy, targetEnemy) {
    const projectile = {
        x: sx,
        y: sy,
        target: targetEnemy,
        speed: 300, // пикселей в секунду
        damage: 10
    };
    projectiles.push(projectile);
}

// Движение снарядов
function moveProjectiles() {
    const now = performance.now();
    const dt = 16 / 1000; // ~16ms

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.target) {
            projectiles.splice(i, 1);
            continue;
        }

        // Вектор к цели
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            // Попадание
            p.target.hp -= p.damage;
            if (p.target.hp <= 0) {
                // Убиваем врага
                removeEnemy(p.target.cellIndex);
                updateStatus(`Враг "${p.target.name}" уничтожен!`);
            }
            projectiles.splice(i, 1);
            continue;
        }

        // Движение снаряда к цели
        const vx = (dx / dist) * p.speed * dt;
        const vy = (dy / dist) * p.speed * dt;
        p.x += vx;
        p.y += vy;
    }

    renderProjectiles();
}

// Отрисовка снарядов
function renderProjectiles() {
    // Удаляем старые
    document.querySelectorAll('.projectile').forEach(el => el.remove());

    projectiles.forEach(p => {
        const el = document.createElement('div');
        el.classList.add('projectile');
        el.style.left = `${p.x - 4}px`;
        el.style.top = `${p.y - 4}px`;
        gameBoard.appendChild(el);
    });
}

// Обновление статистики бессмертной цели
function updateImmortalTargetStats(target) {
    const damageStats = {
        lastDamage: 0, // Урон последнего удара
        damagePerSec: 0, // Урон в секунду
        totalDamage10s: 0, // Общий урон за 10 секунд
        damageHistory: [], // Для отслеживания истории урона
        firstHit: null // Первый удар для отслеживания времени
    };

    target.onHit = function(damage) {
        lastDamage = damage;
        if (!firstHit) {
            firstHit = Date.now();
        }
        damageHistory.push(damage);

        // Удаление старых записей
        const now = Date.now();
        damageHistory = damageHistory.filter(time => now - time < 10000);

        updateStats();
    };

    // Обновляем статистику
    function updateStats() {
        // Обновить урон последнего удара
        document.getElementById('last-damage').innerText = lastDamage;

        // Урон в секунду
        damagePerSec = damageHistory.length / ((Date.now() - firstHit) / 1000);
        document.getElementById('damage-per-sec').innerText = damagePerSec.toFixed(2);

        // Общий урон за 10 секунд
        totalDamage10s = damageHistory.reduce((acc, dmg) => acc + dmg, 0);
        document.getElementById('total-damage-10s').innerText = totalDamage10s;
    }
}

// Начинаем игровой цикл
requestAnimationFrame(gameLoop);
