/**
 * Quest Card Page — Tabs, Lightbox, Booking Modal
 */
(function () {
    'use strict';

    /* ==================== TABS ==================== */
    const tabBtns = document.querySelectorAll('.qdetail-tabs__btn');
    const tabPanels = document.querySelectorAll('.qdetail-tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('qdetail-tabs__btn--active'));
            btn.classList.add('qdetail-tabs__btn--active');

            tabPanels.forEach(panel => {
                panel.classList.toggle('qdetail-tab-panel--active', panel.dataset.panel === target);
            });
        });
    });

    /* ==================== LIGHTBOX (Gallery) ==================== */
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const thumbs = document.querySelectorAll('.qdetail-gallery__thumb');
    const images = Array.from(thumbs).map(t => t.querySelector('img').src);
    let currentIndex = 0;

    function openLightbox(index) {
        currentIndex = index;
        lightboxImg.src = images[currentIndex];
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.hidden = true;
        document.body.style.overflow = '';
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lightboxImg.src = images[currentIndex];
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        lightboxImg.src = images[currentIndex];
    }

    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            openLightbox(parseInt(thumb.dataset.index, 10));
        });
    });

    if (lightbox) {
        lightbox.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox__overlay').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox__prev').addEventListener('click', showPrev);
        lightbox.querySelector('.lightbox__next').addEventListener('click', showNext);

        document.addEventListener('keydown', (e) => {
            if (lightbox.hidden) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
        });
    }

    /* ==================== BOOKING MODAL ==================== */
    const modal = document.getElementById('bookingModal');
    const slotInfo = document.getElementById('bookingSlotInfo');
    const form = document.getElementById('bookingForm');
    const slots = document.querySelectorAll('.slot:not(.slot--booked)');

    function openBooking(slotEl) {
        const row = slotEl.closest('.schedule-row');
        const day = row.querySelector('.schedule-row__day').textContent;
        const month = row.querySelector('.schedule-row__month').textContent.trim();
        const time = slotEl.textContent.trim();

        slotInfo.textContent = day + ' ' + month + ' в ' + time;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeBooking() {
        modal.hidden = true;
        document.body.style.overflow = '';
        form.reset();
    }

    slots.forEach(slot => {
        slot.addEventListener('click', () => openBooking(slot));
    });

    if (modal) {
        modal.querySelector('.booking-modal__overlay').addEventListener('click', closeBooking);
        modal.querySelector('.booking-modal__close').addEventListener('click', closeBooking);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const name = data.get('name');
            const phone = data.get('phone');
            // В реальном проекте — отправка на сервер
            alert('Спасибо, ' + name + '! Мы свяжемся с вами по номеру ' + phone + ' для подтверждения брони.');
            closeBooking();
        });

        document.addEventListener('keydown', (e) => {
            if (!modal.hidden && e.key === 'Escape') closeBooking();
        });
    }
})();
