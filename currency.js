/**
 * currency.js — модуль управления валютой (репутацией) в игре
 *
 * Функции:
 * 1.  initCurrency(amount) — инициализация валюты
 * 2.  getCurrency() — получить текущий баланс
 * 3.  setCurrency(amount, reason) — установить точное значение валюты
 * 4.  addCurrency(amount, reason) — добавить валюту
 * 5.  loseCurrency(amount, reason) — списать валюту
 * 6.  canAfford(amount) — проверить хватит ли валюты
 * 7.  spendCurrency(amount, reason) — потратить валюту, если хватает
 * 8.  multiplyCurrency(multiplier) — умножить баланс на множитель
 * 9.  resetCurrency() — сбросить валюту и историю
 * 10. getCurrencyHistory() — получить историю изменений
 * 11. checkGameOver() — проверить условие проигрыша
 * 12. applyTemporaryMultiplier(multiplier, durationInWaves) — временный множитель на N волн
 * 13. updateTemporaryEffects(currentWave) — обновление эффектов по волнам (вызывать при начале волны)
 * 14. freezeCurrency() — заморозить изменения баланса
 * 15. unfreezeCurrency() — разморозить баланс
 * 16. saveCurrencyState() — сохранить валюту в localStorage
 * 17. loadCurrencyState() — загрузить валюту из localStorage
 * 18. safeSpendCurrency(amount, reason) — безопасная попытка списания без немедленного проигрыша
 * 19. subscribe(callback) — подписка на изменения валюты (для UI)
 * 20. unsubscribe(callback) — отписка
 * 21. setMinCurrencyLimit(limit) — установить минимальный лимит баланса
 * 22. getMinCurrencyLimit() — получить текущий минимальный лимит
 * 23. on(event, listener) — подписка на событие (EventEmitter)
 * 24. off(event, listener) — отписка от события
 */

let currency = 0;
let currencyHistory = [];
let isFrozen = false;
let temporaryMultipliers = [];
let subscribers = [];
let minCurrencyLimit = 0; // Минимальный баланс, ниже которого нельзя опускаться

// Событийный обработчик (EventEmitter простой)
const eventListeners = {};

/** Логгер с уровнями */
const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

function log(level, message) {
  const prefix = `[Currency][${level.toUpperCase()}]`;
  switch (level) {
    case LogLevel.INFO:
      console.info(prefix, message);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message);
      break;
    case LogLevel.ERROR:
      console.error(prefix, message);
      break;
  }
}

/** Отправляет событие подписчикам (EventEmitter) */
function emit(event, data) {
  if (!eventListeners[event]) return;
  eventListeners[event].forEach(listener => {
    try {
      listener(data);
    } catch (e) {
      log(LogLevel.ERROR, `Ошибка в обработчике события "${event}": ${e}`);
    }
  });
}

/** Вспомогательная функция — уведомляет подписчиков (callback) */
function notifySubscribers() {
  subscribers.forEach(cb => cb(currency));
  emit('change', { currency }); // событие изменения баланса
}

/** 1. Инициализирует стартовую валюту с заданным значением */
export function initCurrency(amount) {
  if (amount < minCurrencyLimit) amount = minCurrencyLimit;

  currency = Math.floor(amount);
  currencyHistory = [{
    type: 'init',
    amount: currency,
    reason: 'game start',
    timestamp: Date.now()
  }];
  temporaryMultipliers = [];
  isFrozen = false;

  notifySubscribers();
  log(LogLevel.INFO, `Инициализация валюты: ${currency}`);
}

/** 2. Возвращает текущий баланс валюты */
export function getCurrency() {
  return currency;
}

/** 3. Устанавливает точное значение валюты */
export function setCurrency(amount, reason = 'set currency') {
  if (isFrozen) {
    log(LogLevel.WARN, 'Попытка изменить валюту при заморозке');
    return;
  }
  if (amount < minCurrencyLimit) amount = minCurrencyLimit;

  currency = Math.floor(amount);
  currencyHistory.push({
    type: 'set',
    amount: currency,
    reason,
    timestamp: Date.now()
  });
  notifySubscribers();
  log(LogLevel.INFO, `Баланс установлен в ${currency} (${reason})`);
}

/** 4. Добавляет валюту */
export function addCurrency(amount, reason = '') {
  if (isFrozen) {
    log(LogLevel.WARN, 'Попытка добавить валюту при заморозке');
    return;
  }
  if (amount <= 0) return;

  currency += amount;
  currencyHistory.push({
    type: 'gain',
    amount,
    reason,
    timestamp: Date.now()
  });
  notifySubscribers();
  log(LogLevel.INFO, `+${amount} валюты (${reason}). Текущий баланс: ${currency}`);
}

/** 5. Списывает валюту */
export function loseCurrency(amount, reason = '') {
  if (isFrozen) {
    log(LogLevel.WARN, 'Попытка списать валюту при заморозке');
    return;
  }
  if (amount <= 0) return;

  currency -= amount;
  if (currency < minCurrencyLimit) currency = minCurrencyLimit;
  currencyHistory.push({
    type: 'loss',
    amount,
    reason,
    timestamp: Date.now()
  });
  notifySubscribers();
  log(LogLevel.INFO, `–${amount} валюты (${reason}). Текущий баланс: ${currency}`);

  checkGameOver();
}

/** 6. Проверяет, хватает ли валюты */
export function canAfford(amount) {
  return currency >= amount;
}

/** 7. Пытается потратить валюту, возвращает true при успехе */
export function spendCurrency(amount, reason = '') {
  if (isFrozen) {
    log(LogLevel.WARN, 'Попытка потратить валюту при заморозке');
    return false;
  }
  if (!canAfford(amount)) {
    log(LogLevel.WARN, `Недостаточно валюты для действия (${reason})`);
    return false;
  }
  loseCurrency(amount, reason);
  return true;
}

/** 8. Умножает текущий баланс валюты на множитель */
export function multiplyCurrency(multiplier) {
  if (isFrozen) {
    log(LogLevel.WARN, 'Попытка умножить валюту при заморозке');
    return;
  }
  if (multiplier <= 0) return;

  currency = Math.floor(currency * multiplier);
  if (currency < minCurrencyLimit) currency = minCurrencyLimit;
  currencyHistory.push({
    type: 'multiplier',
    amount: multiplier,
    reason: 'Множитель баланса',
    timestamp: Date.now()
  });
  notifySubscribers();
  log(LogLevel.INFO, `Баланс умножен на ${multiplier}. Новый баланс: ${currency}`);
}

/** 9. Сбрасывает валюту и историю */
export function resetCurrency() {
  currency = 0;
  currencyHistory = [];
  temporaryMultipliers = [];
  isFrozen = false;
  notifySubscribers();
  log(LogLevel.INFO, 'Валюта и история сброшены');
}

/** 10. Возвращает всю историю изменений валюты */
export function getCurrencyHistory() {
  return currencyHistory;
}

/** 11. Проверяет условие проигрыша (баланс <= минимального лимита) */
export function checkGameOver() {
  if (currency <= minCurrencyLimit) {
    log(LogLevel.WARN, "Репутация достигла минимального лимита — игра окончена.");
    emit('gameover', { currency });
    // Тут можно вызвать логику окончания игры
  }
}

/** 12. Добавляет временный множитель баланса на N волн */
export function applyTemporaryMultiplier(multiplier, durationInWaves) {
  if (multiplier <= 0 || durationInWaves <= 0) return;
  temporaryMultipliers.push({
    multiplier,
    wavesLeft: durationInWaves
  });
  log(LogLevel.INFO, `Добавлен временный множитель x${multiplier} на ${durationInWaves} волн`);
  emit('temporaryMultiplierAdded', { multiplier, durationInWaves });
}

/** 13. Обновляет временные множители при смене волны */
export function updateTemporaryEffects(currentWave) {
  temporaryMultipliers = temporaryMultipliers.filter(effect => {
    effect.wavesLeft--;
    return effect.wavesLeft > 0;
  });

  // Пересчитываем валюту с учётом множителей
  let baseCurrency = currency;
  let totalMultiplier = temporaryMultipliers.reduce((acc, e) => acc * e.multiplier, 1);

  currency = Math.floor(baseCurrency * totalMultiplier);
  if (currency < minCurrencyLimit) currency = minCurrencyLimit;
  notifySubscribers();
  log(LogLevel.INFO, `Обновление эффектов на волне ${currentWave}, множитель x${totalMultiplier}, баланс ${currency}`);
  emit('temporaryEffectsUpdated', { currentWave, totalMultiplier, currency });
}

/** 14. Замораживает изменения валюты */
export function freezeCurrency() {
  isFrozen = true;
  log(LogLevel.INFO, 'Валюта заморожена — изменения запрещены');
  emit('frozen');
}

/** 15. Размораживает валюту */
export function unfreezeCurrency() {
  isFrozen = false;
  log(LogLevel.INFO, 'Валюта разморожена — изменения разрешены');
  emit('unfrozen');
}

/** 16. Сохраняет состояние валюты в localStorage */
export function saveCurrencyState() {
  try {
    const state = {
      currency,
      currencyHistory,
      temporaryMultipliers,
      isFrozen,
      minCurrencyLimit
    };
    localStorage.setItem('gameCurrencyState', JSON.stringify(state));
    log(LogLevel.INFO, 'Состояние валюты сохранено');
  } catch (e) {
    log(LogLevel.ERROR, `Ошибка сохранения валюты: ${e}`);
  }
}

/** 17. Загружает состояние валюты из localStorage */
export function loadCurrencyState() {
  try {
    const stateStr = localStorage.getItem('gameCurrencyState');
    if (!stateStr) return false;

    const state = JSON.parse(stateStr);
    currency = state.currency || 0;
    currencyHistory = state.currencyHistory || [];
    temporaryMultipliers = state.temporaryMultipliers || [];
    isFrozen = state.isFrozen || false;
    minCurrencyLimit = state.minCurrencyLimit || 0;
    notifySubscribers();
    log(LogLevel.INFO, 'Состояние валюты загружено');
    emit('loaded', { currency });
    return true;
  } catch (e) {
    log(LogLevel.ERROR, `Ошибка загрузки валюты: ${e}`);
    return false;
  }
}

/** 18. Безопасная попытка списания валюты без немедленного проигрыша */
export function safeSpendCurrency(amount, reason = '') {
  if (isFrozen) {
    log(LogLevel.WARN, 'Попытка безопасно потратить валюту при заморозке');
    return false;
  }
  if (!canAfford(amount)) {
    log(LogLevel.WARN, `Недостаточно валюты для действия (${reason}), но игра не окончена`);
    // Здесь можно реализовать альтернативное поведение: штрафы, предупреждения и т.п.
    return false;
  }
  loseCurrency(amount, reason);
  return true;
}

/** 19. Подписка на изменения валюты (callback получает новый баланс) */
export function subscribe(callback) {
  if (typeof callback === 'function') {
    subscribers.push(callback);
  }
}

/** 20. Отписка от изменений */
export function unsubscribe(callback) {
  subscribers = subscribers.filter(cb => cb !== callback);
}

/** 21. Устанавливает минимальный лимит баланса */
export function setMinCurrencyLimit(limit) {
  if (typeof limit !== 'number' || limit < 0) {
    log(LogLevel.WARN, 'Попытка установить некорректный минимальный лимит');
    return;
  }
  minCurrencyLimit = limit;
  log(LogLevel.INFO, `Минимальный лимит баланса установлен: ${minCurrencyLimit}`);
  if (currency < minCurrencyLimit) {
    setCurrency(minCurrencyLimit, 'adjust min limit');
  }
}

/** 22. Возвращает текущий минимальный лимит баланса */
export function getMinCurrencyLimit() {
  return minCurrencyLimit;
}

/** 23. Подписка на событие EventEmitter */
export function on(event, listener) {
  if (typeof listener !== 'function') return;
  if (!eventListeners[event]) eventListeners[event] = [];
  eventListeners[event].push(listener);
}

/** 24. Отписка от события EventEmitter */
export function off(event, listener) {
  if (!eventListeners[event]) return;
  eventListeners[event] = eventListeners[event].filter(l => l !== listener);
}
