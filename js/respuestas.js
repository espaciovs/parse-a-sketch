document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid-respuestas');

  const datos = Array.from({ length: 10 }, (_, i) => ({ id: `respuesta_${i + 1}`, numero: i + 1 }));

  const btnTodas = grid.querySelector('button');
  btnTodas.addEventListener('click', () => {
    const todasActivas = datos.every(r => configuracion.respuestas.includes(r.id));
    if (todasActivas) {
      configuracion.respuestas = [];
      grid.querySelectorAll('button[data-id]').forEach(b => b.classList.remove('activo'));
    } else {
      configuracion.respuestas = datos.map(r => r.id);
      grid.querySelectorAll('button[data-id]').forEach(b => b.classList.add('activo'));
    }
    if (configuracion.onChange) configuracion.onChange();
  });

  datos.forEach(r => {
    const btn = document.createElement('button');
    btn.textContent = r.numero;
    btn.dataset.id = r.id;
    btn.className = 'respuesta';
    btn.addEventListener('click', () => {
      const idx = configuracion.respuestas.indexOf(r.id);
      if (idx === -1) {
        configuracion.respuestas.push(r.id);
        btn.classList.add('activo');
      } else {
        configuracion.respuestas.splice(idx, 1);
        btn.classList.remove('activo');
      }
      if (configuracion.onChange) configuracion.onChange();
    });
    grid.appendChild(btn);
  });
});