document.addEventListener('DOMContentLoaded', () => {
  const pre = document.querySelector('pre');
  const hPlanta = document.getElementById('planta');
  const hPregunta = document.getElementById('pregunta');
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  // Modo visualización: "una" o "varias"
  let modoVisual = 'varias';
  document.querySelectorAll('.config-visual-grid').forEach(btn => {
    btn.addEventListener('click', () => {
      modoVisual = btn.textContent.trim().toLowerCase() === 'una' ? 'una' : 'varias';
      document.querySelectorAll('.config-visual-grid').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      actualizarCanvas();
    });
  });

  async function actualizarCanvas() {
    if (!configuracion.planta) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

    const num = configuracion.planta.id.replace('planta_', '');
    const base = await obtenerCapaConBbox(num);
    if (!base) return;

    let plantas = [];

    if (modoVisual === 'una' || !configuracion.respuestas.length) {
      // Una sola planta centrada
      plantas = [base];
    } else {
      // Una planta por cada respuesta activa (todas la misma capa por ahora)
      plantas = configuracion.respuestas.map(() => base);
    }

    dibujarTodo(ctx, canvas, plantas);
    // aquí irán las capas de overlay
  }

  function actualizarVista() {
    hPlanta.textContent = configuracion.planta ? configuracion.planta.titulo : 'Seleccionar planta';
    hPregunta.textContent = configuracion.pregunta ? configuracion.pregunta.texto : 'Seleccionar pregunta';

    pre.textContent = JSON.stringify(configuracion, (key, value) => {
      if (key === 'onChange') return undefined;
      return value;
    }, 2);

    actualizarCanvas();
  }

  function ajustarCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    actualizarVista();
  }

  window.addEventListener('resize', ajustarCanvas);
  ajustarCanvas();

  configuracion.onChange = actualizarVista;
  setTimeout(actualizarVista, 100);
});