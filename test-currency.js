// test-currency.js

import {
  initCurrency,
  getCurrency,
  setCurrency,
  addCurrency,
  loseCurrency,
  canAfford,
  spendCurrency,
  multiplyCurrency,
  resetCurrency,
  getCurrencyHistory,
  checkGameOver,
  applyTemporaryMultiplier,
  updateTemporaryEffects,
  freezeCurrency,
  unfreezeCurrency,
  saveCurrencyState,
  loadCurrencyState,
  safeSpendCurrency,
  subscribe,
  unsubscribe,
  setMinCurrencyLimit,
  getMinCurrencyLimit,
  on,
  off
} from './currency.js';

console.log('🔁 ТЕСТ ИНИЦИАЛИЗАЦИИ И МИНИМАЛЬНОГО ЛИМИТА');
setMinCurrencyLimit(50);
console.log('Минимальный лимит:', getMinCurrencyLimit());
initCurrency(30); // Должно подняться до 50

console.log('🔁 ТЕКУЩИЙ БАЛАНС:', getCurrency());

console.log('🔁 ДОБАВЛЕНИЕ ВАЛЮТЫ');
addCurrency(100, 'награда за победу');

console.log('🔁 ПРОВЕРКА ДОСТАТОЧНОСТИ И ТРАТА');
if (canAfford(30)) {
  spendCurrency(30, 'покупка башни');
}

console.log('🔁 УМНОЖЕНИЕ ВАЛЮТЫ');
multiplyCurrency(2);

console.log('🔁 ИСТОРИЯ ВАЛЮТЫ:', getCurrencyHistory());

console.log('🔁 ВРЕМЕННЫЙ МНОЖИТЕЛЬ');
applyTemporaryMultiplier(1.5, 2);
updateTemporaryEffects(1); // волна 1
updateTemporaryEffects(2); // волна 2 (истечёт)

console.log('🔁 ЗАМОРОЗКА И ИЗМЕНЕНИЯ ПРИ НЕЙ');
freezeCurrency();
addCurrency(100, 'не должно добавиться');
unfreezeCurrency();

console.log('🔁 БЕЗОПАСНАЯ ТРАТА');
safeSpendCurrency(999, 'слишком дорого'); // недостаточно, но не геймовер

console.log('🔁 ПРОВЕРКА GAME OVER');
loseCurrency(9999, 'тест завершения игры'); // должно вызвать событие

console.log('🔁 СОХРАНЕНИЕ И ЗАГРУЗКА');
saveCurrencyState();
resetCurrency(); // сбрасываем
loadCurrencyState(); // возвращаем

console.log('🔁 ПОДПИСКА И ОТПИСКА (subscribe)');
function uiCallback(balance) {
  console.log(`UI получил обновлённый баланс: ${balance}`);
}
subscribe(uiCallback);
addCurrency(10, 'UI проверка');
unsubscribe(uiCallback);
addCurrency(10, 'UI не должен сработать');

console.log('🔁 ПОДПИСКА НА СОБЫТИЯ (EventEmitter)');
function onChange({ currency }) {
  console.log(`[EVENT] Баланс изменён: ${currency}`);
}
function onGameOver({ currency }) {
  console.log(`[EVENT] GAME OVER при балансе ${currency}`);
}
on('change', onChange);
on('gameover', onGameOver);

loseCurrency(9999, 'ещё раз в 0 для проверки событий');

off('change', onChange);
off('gameover', onGameOver);
