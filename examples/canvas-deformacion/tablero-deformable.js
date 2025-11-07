// ============================================
// LÓGICA DE DEFORMACIÓN DEL CANVAS
// ============================================

// Las variables canvas y canvasSize ya están disponibles globalmente desde el HTML

// Obtener referencias a los elementos del DOM
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');
const cornerIndicator = document.getElementById('cornerIndicator');
const configSelect = document.getElementById('configSelect');
const changeCornerBtn = document.getElementById('changeCorner');
const cornerNameSpan = document.getElementById('cornerName');
const resetCornerBtn = document.getElementById('resetCorner');
const copyValuesBtn = document.getElementById('copyValues');

// Estado de la aplicación
let menuVisible = false;
let currentCorner = 0; // 0: top-left, 1: top-right, 2: bottom-right, 3: bottom-left
const cornerNames = ['Superior Izquierda', 'Superior Derecha', 'Inferior Derecha', 'Inferior Izquierda'];

// Posiciones de las esquinas (en coordenadas de pantalla)
let corners = [
    { x: window.innerWidth / 2 - canvasSize / 2, y: window.innerHeight / 2 - canvasSize / 2 }, // top-left
    { x: window.innerWidth / 2 + canvasSize / 2, y: window.innerHeight / 2 - canvasSize / 2 }, // top-right
    { x: window.innerWidth / 2 + canvasSize / 2, y: window.innerHeight / 2 + canvasSize / 2 }, // bottom-right
    { x: window.innerWidth / 2 - canvasSize / 2, y: window.innerHeight / 2 + canvasSize / 2 }  // bottom-left
];

// Configuraciones predefinidas
const configurations = {
    pantalla1: [
    { x: 524, y: -52 }, // Top-Left
    { x: 1396, y: 48 }, // Top-Right
    { x: 1396, y: 920 }, // Bottom-Right
    { x: 524, y: 920 }  // Bottom-Left
],
pantalla2: [
    { x: 524, y: 48 }, // Top-Left
    { x: 1396, y: -152 }, // Top-Right
    { x: 1396, y: 920 }, // Bottom-Right
    { x: 524, y: 920 }  // Bottom-Left
],
    centrado: [
        { x: window.innerWidth / 2 - canvasSize / 2, y: window.innerHeight / 2 - canvasSize / 2 },
        { x: window.innerWidth / 2 + canvasSize / 2, y: window.innerHeight / 2 - canvasSize / 2 },
        { x: window.innerWidth / 2 + canvasSize / 2, y: window.innerHeight / 2 + canvasSize / 2 },
        { x: window.innerWidth / 2 - canvasSize / 2, y: window.innerHeight / 2 + canvasSize / 2 }
    ]
};

// Calcular matriz de transformación de perspectiva
// Transforma un cuadrado unitario (0,0 1,0 1,1 0,1) a un cuadrilátero arbitrario
function calculatePerspectiveMatrix(tl, tr, br, bl) {
    // Coordenadas del cuadrado original (canvas)
    const x0 = 0, y0 = 0;
    const x1 = canvasSize, y1 = 0;
    const x2 = canvasSize, y2 = canvasSize;
    const x3 = 0, y3 = canvasSize;
    
    // Coordenadas destino (las esquinas que queremos)
    const x0p = tl.x, y0p = tl.y;
    const x1p = tr.x, y1p = tr.y;
    const x2p = br.x, y2p = br.y;
    const x3p = bl.x, y3p = bl.y;
    
    // Calcular la transformación proyectiva (homografía)
    // Esto mapea el cuadrado original al cuadrilátero deseado
    
    const dx1 = x1p - x2p;
    const dx2 = x3p - x2p;
    const dx3 = x0p - x1p + x2p - x3p;
    const dy1 = y1p - y2p;
    const dy2 = y3p - y2p;
    const dy3 = y0p - y1p + y2p - y3p;
    
    const det = dx1 * dy2 - dx2 * dy1;
    
    if (Math.abs(det) < 0.0001) {
        // Matriz singular, usar identidad
        return 'none';
    }
    
    const g = (dx3 * dy2 - dx2 * dy3) / det;
    const h = (dx1 * dy3 - dx3 * dy1) / det;
    
    const a = x1p - x0p + g * x1p;
    const b = x3p - x0p + h * x3p;
    const c = x0p;
    const d = y1p - y0p + g * y1p;
    const e = y3p - y0p + h * y3p;
    const f = y0p;
    
    // Normalizar para el tamaño del canvas
    const matrix = [
        a / canvasSize, d / canvasSize, 0, g / canvasSize,
        b / canvasSize, e / canvasSize, 0, h / canvasSize,
        0, 0, 1, 0,
        c, f, 0, 1
    ];
    
    return `matrix3d(${matrix.join(',')})`;
}

// Actualizar posición y deformación del canvas
function updateCanvas() {
    const [tl, tr, br, bl] = corners;
    
    // Debug: mostrar posiciones de las esquinas
    console.log('=== DEBUG CANVAS ===');
    console.log('Top-Left:', tl);
    console.log('Top-Right:', tr);
    console.log('Bottom-Right:', br);
    console.log('Bottom-Left:', bl);
    
    // Calcular bounding box para posicionar el canvas
    const minX = Math.min(tl.x, tr.x, br.x, bl.x);
    const minY = Math.min(tl.y, tr.y, br.y, bl.y);
    const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
    const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
    
    console.log('Bounding Box:', {minX, minY, maxX, maxY});
    console.log('Canvas Size:', canvasSize);
    
    // Posicionar el canvas en la esquina superior izquierda del bounding box
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.style.transformOrigin = '0 0';
    
    // Ajustar las coordenadas de las esquinas relativas al canvas en (0,0)
    const tlAdjusted = { x: tl.x, y: tl.y };
    const trAdjusted = { x: tr.x, y: tr.y };
    const brAdjusted = { x: br.x, y: br.y };
    const blAdjusted = { x: bl.x, y: bl.y };
    
    console.log('Adjusted corners:', {tlAdjusted, trAdjusted, brAdjusted, blAdjusted});
    
    // Calcular y aplicar la transformación de perspectiva
    const transform = calculatePerspectiveMatrix(tlAdjusted, trAdjusted, brAdjusted, blAdjusted);
    
    console.log('Transform:', transform);
    console.log('===================\n');
    
    canvas.style.transform = transform;
}

// Actualizar indicador de esquina
function updateCornerIndicator() {
    if (!menuVisible) {
        cornerIndicator.style.display = 'none';
        return;
    }
    
    const corner = corners[currentCorner];
    
    // Limitar al borde de la pantalla
    const x = Math.max(10, Math.min(window.innerWidth - 10, corner.x));
    const y = Math.max(10, Math.min(window.innerHeight - 10, corner.y));
    
    cornerIndicator.style.left = (x - 10) + 'px';
    cornerIndicator.style.top = (y - 10) + 'px';
    cornerIndicator.style.display = 'block';
    
    cornerNameSpan.textContent = cornerNames[currentCorner];
}

// Toggle menú
menuBtn.addEventListener('click', () => {
    menuVisible = !menuVisible;
    menu.classList.toggle('visible');
    updateCornerIndicator();
});

// Cambiar esquina
changeCornerBtn.addEventListener('click', () => {
    currentCorner = (currentCorner + 1) % 4;
    updateCornerIndicator();
});

// Mover esquina con cruceta
document.querySelectorAll('.cruceta button[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        const step = 10;
        
        switch(dir) {
            case 'up': corners[currentCorner].y -= step; break;
            case 'down': corners[currentCorner].y += step; break;
            case 'left': corners[currentCorner].x -= step; break;
            case 'right': corners[currentCorner].x += step; break;
        }
        
        updateCanvas();
        updateCornerIndicator();
    });
});

// Reset esquina actual
resetCornerBtn.addEventListener('click', () => {
    corners[currentCorner] = { ...configurations.centrado[currentCorner] };
    updateCanvas();
    updateCornerIndicator();
});

// Cargar configuración
configSelect.addEventListener('change', (e) => {
    const config = e.target.value;
    if (configurations[config]) {
        corners = configurations[config].map(c => ({ ...c }));
        updateCanvas();
        updateCornerIndicator();
    }
});

// Copiar valores actuales al portapapeles
copyValuesBtn.addEventListener('click', async () => {
    // Generar el nombre de la configuración (usar el valor actual del select o "custom")
    const configName = configSelect.value;
    
    // Formatear los valores como código JavaScript
    const configCode = `${configName}: [
    { x: ${Math.round(corners[0].x)}, y: ${Math.round(corners[0].y)} }, // Top-Left
    { x: ${Math.round(corners[1].x)}, y: ${Math.round(corners[1].y)} }, // Top-Right
    { x: ${Math.round(corners[2].x)}, y: ${Math.round(corners[2].y)} }, // Bottom-Right
    { x: ${Math.round(corners[3].x)}, y: ${Math.round(corners[3].y)} }  // Bottom-Left
]`;
    
    try {
        await navigator.clipboard.writeText(configCode);
        
        // Feedback visual temporal
        const originalText = copyValuesBtn.textContent;
        copyValuesBtn.textContent = '✅ Copiado!';
        copyValuesBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
            copyValuesBtn.textContent = originalText;
            copyValuesBtn.style.background = '';
        }, 2000);
        
        console.log('Valores copiados al portapapeles:');
        console.log(configCode);
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar al portapapeles');
    }
});

// Inicializar la deformación
updateCanvas();