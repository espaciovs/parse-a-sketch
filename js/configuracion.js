// Estado compartido de la configuración seleccionada
const configuracion = {
  planta: null,
  pregunta: null,
  respuestas: [],
  onChange: null, // callback para visualizacion.js
};

async function cargarPlantas() {
  const res = await fetch('examples/canvas-experiments/json/plantas.json');
  const data = await res.json();

  const grid = document.querySelector('.grid-plantas');
  grid.innerHTML = '';

  // Filtramos las que tienen titulo "TEST"
  const plantasFiltradas = data.plantas.filter(p => p.titulo !== 'TEST');

  plantasFiltradas.forEach((planta, index) => {
    const btn = document.createElement('button');
    btn.className = 'planta';
    btn.textContent = index + 1;
    btn.dataset.id = planta.id;
    btn.dataset.imagen = planta.imagen;
    btn.dataset.titulo = planta.titulo;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.planta').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      configuracion.planta = { id: planta.id, titulo: planta.titulo, imagen: planta.imagen };
      if (configuracion.onChange) configuracion.onChange();
    });

    grid.appendChild(btn);
  });
}

async function cargarPreguntas() {
  const res = await fetch('examples/canvas-experiments/json/preguntas.json');
  const data = await res.json();

  const select = document.querySelector('.preguntas');
  select.innerHTML = '';

  // Opción vacía por defecto
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seleccionar pregunta';
  select.appendChild(placeholder);

  // Saltamos la primera (pregunta_0)
  data.preguntas.slice(1).forEach(pregunta => {
    const option = document.createElement('option');
    option.value = pregunta.id;
    option.textContent = pregunta.texto;
    select.appendChild(option);
  });

  configuracion.pregunta = null;

  select.addEventListener('change', () => {
    const seleccionada = data.preguntas.find(p => p.id === select.value);
    configuracion.pregunta = seleccionada ? { ...seleccionada } : null;
    if (configuracion.onChange) configuracion.onChange();
  });
}

async function iniciarConfiguracion() {
  await Promise.all([cargarPlantas(), cargarPreguntas()]);
}

iniciarConfiguracion();