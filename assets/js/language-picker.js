/* Native disclosure and ordinary links work without JavaScript.
 * Enhancement only dismisses the desktop picker; locale-navigation owns reading position.
 */
(() => {
  const picker = document.querySelector('[data-language-picker]');
  if (!picker) return;
  const trigger = picker.querySelector('summary');
  const close = (restoreFocus = false) => {
    if (!picker.open) return;
    picker.open = false;
    if (restoreFocus) trigger.focus({preventScroll: true});
  };
  document.addEventListener('pointerdown', event => {
    if (!picker.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !picker.open) return;
    event.preventDefault(); close(true);
  });
  picker.addEventListener('click', event => {
    if (event.target.closest('a[data-locale-link]')) close(event.defaultPrevented);
  });
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) close();
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', () => close());
  window.addEventListener('pagehide', () => close());
})();
