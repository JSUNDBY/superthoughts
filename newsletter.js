
(() => {
  const form = document.querySelector('#newsletter-signup form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    if (!form.elements.website.value) return;
    event.preventDefault();
  });
})();
