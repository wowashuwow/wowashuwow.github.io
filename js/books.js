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
})();
