(function () {
  var root = document.getElementById('htmlRoot');
  var btn = document.getElementById('themeBtn');
  if (!root || !btn) return;
  if (localStorage.getItem('classgrid-dark') === '1') root.classList.add('dark');
  btn.textContent = root.classList.contains('dark') ? 'Light' : 'Dark';
  btn.addEventListener('click', function () {
    root.classList.toggle('dark');
    localStorage.setItem('classgrid-dark', root.classList.contains('dark') ? '1' : '0');
    btn.textContent = root.classList.contains('dark') ? 'Light' : 'Dark';
  });
})();
