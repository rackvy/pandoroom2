/* ==================== ОСНОВНОЙ JS ==================== */

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация после загрузки DOM
    console.log('Pandoroom initialized');
    injectQuestCardHoverOverlay();
});

/**
 * Вставляет hover-оверлей (CTA «Игровая и кафе») в каждую .quest-card.
 * Оверлей появляется при наведении, карточка визуально «растворяется» через opacity-транзишн.
 */
function injectQuestCardHoverOverlay() {
    const overlayHTML = `
        <span class="quest-card__hover-icon" aria-hidden="true">
            <svg width="63" height="61" viewBox="0 0 63 61" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.05371 47.5676C21.6663 62.0721 39.2789 62.0721 56.8915 47.5676" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M52.2297 50.6757L46.0135 24.2568L49.1216 18.0405L55.3378 21.1486L60 16.4865L52.2297 2.5C36.5276 3.17757 33.6122 12.2377 30.473 21.1486H11.8243C9.35136 21.1486 6.97968 22.131 5.23103 23.8797C3.48238 25.6283 2.5 28 2.5 30.473M8.71622 50.6757L14.9324 21.1486" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.041 55.3379L24.2572 39.7974H36.6897L42.9059 55.3379" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
        <h3 class="quest-card__hover-title">Игровая и кафе<br>для вашего ребенка</h3>
        <p class="quest-card__hover-text">Проведите этот день максимально весело. Отдохните после квеста в наших кафе и игровой</p>
        <div class="quest-card__hover-actions">
            <a href="quests.html" class="btn btn--pink btn--full">Перейти в квест</a>
            <a href="holidays.html" class="btn btn--green btn--full">Забронировать столик</a>
        </div>
    `;

    document.querySelectorAll('.quest-card').forEach((card) => {
        if (card.classList.contains('quest-card--cta')) return;
        if (card.querySelector('.quest-card__hover')) return;
        const overlay = document.createElement('div');
        overlay.className = 'quest-card__hover';
        overlay.innerHTML = overlayHTML;
        card.appendChild(overlay);
    });
}

// ==================== УТИЛИТЫ ====================

/**
 * Проверка видимости элемента во viewport
 * Для анимаций при скролле
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Дебаунс для частых событий (resize, scroll)
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
