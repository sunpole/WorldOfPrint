//test-field7.js

// Обновить ХП бар врага  
function updateHealthBar(cell, hp) {  
    const hpBar = cell.querySelector('.hp-bar');  
    if (hpBar) {  
        hpBar.remove(); // Удаляем предыдущий бар  
    }  

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

        // Если нашли врага, стреляем
        if (nearestEnemy) {  
            shootProjectile(towerX, towerY, nearestEnemy);  
            tower.lastShotTime = now;  
        }  
    });

    moveProjectiles();  
    // Обновляем статистику бессмертной цели
    if (immortalTarget) {
        updateImmortalTargetStats();
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
    // Также обрабатываем урон для бессмертной цели
    if (targetEnemy === immortalTarget) {
        immortalTarget.onHit(projectile.damage);
    }
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
            updateHealthBar(gameBoard.children[p.target.cellIndex], p.target.hp); // Обновляем бар

            if (p.target.hp <= 0 && p.target !== immortalTarget) {  
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

// Функция обновления статистики бессмертной цели
let damageHistory = []; // глобально
let lastDamage = 0;
let firstHitTime = null;

function updateImmortalTargetStats() {
    const lastDamageElem = document.getElementById('last-damage');
    const damagePerSecElem = document.getElementById('damage-per-sec');
    const totalDamage10sElem = document.getElementById('total-damage-10s');

    // Удаление старых записей
    const now = Date.now();
    damageHistory = damageHistory.filter(entry => now - entry.timestamp < 10000);

    // Подсчеты
    const total = damageHistory.reduce((acc, e) => acc + e.value, 0);
    const elapsedTime = (now - firstHitTime) / 1000;
    const dps = elapsedTime > 0 ? total / elapsedTime : 0;

    lastDamageElem.innerText = lastDamage;
    damagePerSecElem.innerText = dps.toFixed(2);
    totalDamage10sElem.innerText = total;
}

// Метод получения урона бессмертной целью
immortalTarget.onHit = function(damage) {
    lastDamage = damage;
    const now = Date.now();
    if (!firstHitTime) firstHitTime = now;
    damageHistory.push({ value: damage, timestamp: now });
};

// Начинаем игровой цикл
requestAnimationFrame(gameLoop);

// Кнопка для включения/выключения функции перемещения
toggleMovementButton.addEventListener('click', () => {
    movementEnabled = !movementEnabled;
    toggleMovementButton.textContent = movementEnabled ? 'Выключить перемещение' : 'Включить перемещение';
    updateStatus(`Перемещение ${movementEnabled ? 'включено' : 'выключено'}`);
});

// Обработка клавиш пробела
window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        movementEnabled = true;
        toggleMovementButton.textContent = 'Выключить перемещение';
    }
});
window.addEventListener('keyup', e => {
    if (e.code === 'Space') {
        movementEnabled = false;
        toggleMovementButton.textContent = 'Включить перемещение';
    }
});

// Функция для обновления отображения выбранного объекта
function updateHeldObjectDiv() {
    if (heldObject) {
        heldObjectDiv.style.display = 'block';
        heldObjectDiv.innerText = heldObject.name;
    } else {
        heldObjectDiv.style.display = 'none';
    }
}
