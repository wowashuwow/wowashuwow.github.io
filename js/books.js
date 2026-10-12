(() => {
  'use strict';
  const shelf = document.querySelector('#reading-shelf');
  const controls = document.querySelector('.books-scroll-controls');
  if (shelf && controls) {
    const buttons = [...controls.querySelectorAll('button')];
    const update = () => {
      const max = shelf.scrollWidth - shelf.clientWidth;
      controls.hidden = max < 2;
      buttons[0].disabled = shelf.scrollLeft < 2;
      buttons[1].disabled = shelf.scrollLeft >= max - 2;
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      shelf.scrollBy({ left: Number(button.dataset.shelfDirection) * Math.max(188, shelf.clientWidth * .7), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    shelf.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  const select = document.querySelector('#book-order');
  const list = document.querySelector('#finished-list');
  if (select && list) {
    document.querySelector('.books-sort').hidden = false;
    const books = [...list.children];
    select.addEventListener('change', () => {
      const byTitle = (a, b) => a.dataset.bookTitle.localeCompare(b.dataset.bookTitle, 'en', { sensitivity: 'base' });
      books.sort((a, b) => select.value === 'rating' ? Number(b.dataset.bookRating) - Number(a.dataset.bookRating) || byTitle(a, b) : byTitle(a, b));
      list.append(...books);
      document.querySelector('#books-sort-status').textContent = `Rating-only books sorted by ${select.value === 'rating' ? 'highest rating' : 'title A to Z'}.`;
    });
  }
})();
