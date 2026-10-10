/* ============================================================
   AVR PRO STUDIOS — Premium Drawing Suite v2.1
   ============================================================ */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// DOM
const splash = document.getElementById('splash');
const colorPicker = document.getElementById('colorPicker');
const colorHex = document.getElementById('colorHex');
const colorDisplay = document.getElementById('colorDisplay');
const sizePicker = document.getElementById('sizePicker');
const sizeLabel = document.getElementById('sizeLabel');
const opacityPicker = document.getElementById('opacityPicker');
const opacityLabel = document.getElementById('opacityLabel');
const palette = document.getElementById('palette');
const toolName = document.getElementById('toolName');
const coords = document.getElementById('coords');
const canvasSize = document.getElementById('canvasSize');
const statusText = document.getElementById('statusText');
const textPopup = document.getElementById('textPopup');
const textInput = document.getElementById('textInput');
const textOk = document.getElementById('textOk');
const sidebar = document.getElementById('sidebar');
const rightPanel = document.getElementById('rightPanel');
const zoomLevel = document.getElementById('zoomLevel');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpClose = document.getElementById('helpClose');
const themeBtn = document.getElementById('themeBtn');
const toolsToggle = document.getElementById('toolsToggle');
const settingsToggle = document.getElementById('settingsToggle');

const fileJsonInput = document.getElementById('fileJsonInput');
const fileImageInput = document.getElementById('fileImageInput');

// Tool buttons
const toolBtns = {
  brush: document.getElementById('brushBtn'),
  pencil: document.getElementById('pencilBtn'),
  marker: document.getElementById('markerBtn'),
  eraser: document.getElementById('eraserBtn'),
  spray: document.getElementById('sprayBtn'),
  neon: document.getElementById('neonBtn'),
  line: document.getElementById('lineBtn'),
  rect: document.getElementById('rectBtn'),
  circle: document.getElementById('circleBtn'),
  triangle: document.getElementById('triangleBtn'),
  star: document.getElementById('starBtn'),
  arrow: document.getElementById('arrowBtn'),
  hexagon: document.getElementById('hexagonBtn'),
  diamond: document.getElementById('diamondBtn'),
  fill: document.getElementById('fillBtn'),
  text: document.getElementById('textBtn'),
  picker: document.getElementById('pickerBtn'),
  select: document.getElementById('selectBtn'),
};

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const saveJsonBtn = document.getElementById('saveJsonBtn');
const loadJsonBtn = document.getElementById('loadJsonBtn');
const importBtn = document.getElementById('importBtn');
const shareBtn = document.getElementById('shareBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const gridBtn = document.getElementById('gridBtn');
const mirrorBtn = document.getElementById('mirrorBtn');

// State
let isDrawing = false;
let tool = 'brush';
let lastX = 0, lastY = 0;
let startX = 0, startY = 0;
let snapshot = null;
let mirrorMode = false;
let gridVisible = false;
let sprayInterval = null;
let zoom = 1;

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 40;

/* ========== SPLASH ========== */
window.addEventListener('load', () => {
  setTimeout(() => splash.classList.add('hide'), 2600);
  resizeCanvas();
  saveHistory();
});

/* ========== RESIZE ========== */
function resizeCanvas() {
  const wrapper = canvas.parentElement;
  const isMobile = window.innerWidth <= 768;

  const padX = isMobile ? 8 : 40;
  const padY = isMobile ? 8 : 40;

  const availableW = wrapper.clientWidth - padX;
  const availableH = wrapper.clientHeight - padY;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let cssW, cssH;

  if (isMobile) {
    cssW = availableW;
    cssH = availableH;
  } else {
    const ratio = 16 / 10;
    cssW = availableW;
    cssH = cssW / ratio;
    if (cssH > availableH) {
      cssH = availableH;
      cssW = cssH * ratio;
    }
  }

  const old = canvas.width > 0 ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = Math.floor(cssW) + 'px';
  canvas.style.height = Math.floor(cssH) + 'px';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (old) {
    const t = document.createElement('canvas');
    t.width = old.width;
    t.height = old.height;
    t.getContext('2d').putImageData(old, 0, 0);
    ctx.drawImage(t, 0, 0, canvas.width, canvas.height);
  }

  drawGrid();
  canvasSize.textContent = `${Math.floor(cssW)} × ${Math.floor(cssH)}`;
}

window.addEventListener('resize', () => {
  clearTimeout(window._rz);
  window._rz = setTimeout(resizeCanvas, 250);
});

/* ========== GRID ========== */
function drawGrid() {
  if (!gridVisible) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
  ctx.lineWidth = 1;
  const step = 30;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();
}

gridBtn.addEventListener('click', () => {
  gridVisible = !gridVisible;
  gridBtn.classList.toggle('active', gridVisible);
  redrawAll();
});

mirrorBtn.addEventListener('click', () => {
  mirrorMode = !mirrorMode;
  mirrorBtn.classList.toggle('active', mirrorMode);
  setStatus(mirrorMode ? 'Mirror ON' : 'Mirror OFF');
});

function redrawAll() {
  const snap = undoStack[undoStack.length - 1];
  if (!snap) return;
  restoreFrom(snap, drawGrid);
}

/* ========== STATUS ========== */
function setStatus(msg) {
  statusText.textContent = msg;
  clearTimeout(window._statusTimer);
  window._statusTimer = setTimeout(() => statusText.textContent = 'Ready', 1800);
}

/* ========== HISTORY ========== */
function saveHistory() {
  undoStack.push(canvas.toDataURL());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
}

function restoreFrom(dataURL, cb) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (cb) cb();
  };
  img.src = dataURL;
}

undoBtn.addEventListener('click', () => {
  if (undoStack.length > 1) {
    redoStack.push(undoStack.pop());
    restoreFrom(undoStack[undoStack.length - 1]);
    setStatus('Undo');
  }
});

redoBtn.addEventListener('click', () => {
  if (redoStack.length > 0) {
    const s = redoStack.pop();
    undoStack.push(s);
    restoreFrom(s);
    setStatus('Redo');
  }
});

/* ========== POSITION ========== */
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  let cx, cy;
  if (e.touches?.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
  else if (e.changedTouches?.length) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
  else { cx = e.clientX; cy = e.clientY; }
  return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
}

/* ========== STYLE ========== */
function getStyle() {
  return {
    color: tool === 'eraser' ? '#ffffff' : colorPicker.value,
    width: parseInt(sizePicker.value),
    alpha: opacityPicker.value / 100,
  };
}

/* ========== START DRAW ========== */
function startDrawing(e) {
  e.preventDefault();
  const pos = getPos(e);

  if (tool === 'picker') {
    pickColorAt(pos.x, pos.y);
    return;
  }

  if (tool === 'text') {
    startX = pos.x; startY = pos.y;
    showTextPopup(e);
    return;
  }

  isDrawing = true;
  lastX = pos.x; lastY = pos.y;
  startX = pos.x; startY = pos.y;

  if (tool === 'fill') {
    floodFill(Math.floor(pos.x), Math.floor(pos.y), colorPicker.value);
    isDrawing = false;
    saveHistory();
    setStatus('Filled');
    return;
  }

  if (['brush', 'pencil', 'marker', 'eraser', 'neon'].includes(tool)) {
    const s = getStyle();
    const dotR = tool === 'marker' ? s.width * 0.6 : s.width / 2;
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    if (tool === 'neon') {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 20;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    if (mirrorMode) {
      ctx.beginPath();
      ctx.arc(canvas.width - pos.x, pos.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (tool === 'spray') {
    startSpray(pos);
  } else {
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

/* ========== DRAW MOVE ========== */
function draw(e) {
  const pos = getPos(e);
  coords.textContent = `${Math.floor(pos.x)}, ${Math.floor(pos.y)}`;

  if (tool === 'spray') {
    if (!isDrawing) return;
    e.preventDefault();
    sprayDot(pos.x, pos.y);
    if (mirrorMode) sprayDot(canvas.width - pos.x, pos.y);
    lastX = pos.x; lastY = pos.y;
    return;
  }

  if (!isDrawing) return;
  e.preventDefault();

  const s = getStyle();
  ctx.globalAlpha = s.alpha;
  ctx.lineCap = tool === 'pencil' ? 'butt' : 'round';
  ctx.lineJoin = tool === 'pencil' ? 'miter' : 'round';
  ctx.lineWidth = tool === 'marker' ? s.width * 1.3 : s.width;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;

  if (tool === 'neon') {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 25;
  }

  if (['brush', 'pencil', 'marker', 'eraser', 'neon'].includes(tool)) {
    drawStroke(lastX, lastY, pos.x, pos.y);
    if (mirrorMode) drawStroke(canvas.width - lastX, lastY, canvas.width - pos.x, pos.y);
    lastX = pos.x; lastY = pos.y;
  } else if (tool === 'line') {
    ctx.putImageData(snapshot, 0, 0);
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(pos.x, pos.y); ctx.stroke();
  } else if (tool === 'rect') {
    ctx.putImageData(snapshot, 0, 0);
    ctx.beginPath();
    ctx.rect(startX, startY, pos.x - startX, pos.y - startY);
    ctx.stroke();
  } else if (tool === 'circle') {
    ctx.putImageData(snapshot, 0, 0);
    const r = Math.hypot(pos.x - startX, pos.y - startY);
    ctx.beginPath(); ctx.arc(startX, startY, r, 0, Math.PI * 2); ctx.stroke();
  } else if (tool === 'triangle') {
    ctx.putImageData(snapshot, 0, 0);
    drawPolygon(3, startX, startY, pos.x, pos.y);
  } else if (tool === 'star') {
    ctx.putImageData(snapshot, 0, 0);
    drawStar(startX, startY, pos.x, pos.y);
  } else if (tool === 'hexagon') {
    ctx.putImageData(snapshot, 0, 0);
    drawPolygon(6, startX, startY, pos.x, pos.y);
  } else if (tool === 'diamond') {
    ctx.putImageData(snapshot, 0, 0);
    drawPolygon(4, startX, startY, pos.x, pos.y, Math.PI / 4);
  } else if (tool === 'arrow') {
    ctx.putImageData(snapshot, 0, 0);
    drawArrow(startX, startY, pos.x, pos.y);
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawStroke(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawPolygon(sides, x1, y1, x2, y2, offset = -Math.PI / 2) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const r = Math.hypot(x2 - x1, y2 - y1) / 2;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (Math.PI * 2 / sides) * i + offset;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawStar(x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const outerR = Math.hypot(x2 - x1, y2 - y1) / 2;
  const innerR = outerR / 2;
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawArrow(x1, y1, x2, y2) {
  const headLen = Math.max(18, parseInt(sizePicker.value) * 3);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/* ========== SPRAY ========== */
function startSpray(pos) {
  isDrawing = true;
  sprayDot(pos.x, pos.y);
  clearInterval(sprayInterval);
  sprayInterval = setInterval(() => {
    if (isDrawing) {
      sprayDot(lastX, lastY);
      if (mirrorMode) sprayDot(canvas.width - lastX, lastY);
    }
  }, 40);
}

function sprayDot(x, y) {
  const s = getStyle();
  const density = 25;
  const radius = s.width * 1.5;
  ctx.globalAlpha = s.alpha;
  ctx.fillStyle = s.color;
  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    ctx.fillRect(x + Math.cos(angle) * r, y + Math.sin(angle) * r, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/* ========== STOP ========== */
function stopDrawing() {
  if (sprayInterval) { clearInterval(sprayInterval); sprayInterval = null; }
  if (!isDrawing) return;
  isDrawing = false;
  ctx.beginPath();
  ctx.shadowBlur = 0;
  saveHistory();
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

/* ========== TOOLS ========== */
const toolNames = {
  brush: 'Brush', pencil: 'Pencil', marker: 'Marker', eraser: 'Eraser',
  spray: 'Spray', neon: 'Neon', line: 'Line', rect: 'Rectangle',
  circle: 'Circle', triangle: 'Triangle', star: 'Star', arrow: 'Arrow',
  hexagon: 'Hexagon', diamond: 'Diamond', fill: 'Fill', text: 'Text',
  picker: 'Color Picker', select: 'Select',
};

function selectTool(t) {
  tool = t;
  Object.values(toolBtns).forEach(b => b?.classList.remove('active'));
  toolBtns[t]?.classList.add('active');
  toolName.textContent = toolNames[t] || t;
  canvas.style.cursor = t === 'text' ? 'text' : 'crosshair';
  setStatus(toolNames[t]);
}

Object.entries(toolBtns).forEach(([name, btn]) => {
  btn?.addEventListener('click', () => {
    selectTool(name);
    if (window.innerWidth <= 768) {
      setTimeout(closeAllPanels, 220);
    }
  });
});

/* ========== COLOR PICKER TOOL ========== */
function pickColorAt(x, y) {
  const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  colorPicker.value = hex;
  updateColorDisplay(hex);
  setStatus('Picked ' + hex.toUpperCase());
}

/* ========== TEXT ========== */
function showTextPopup(e) {
  const rect = canvas.getBoundingClientRect();
  let cx, cy;
  if (e.touches?.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
  else { cx = e.clientX; cy = e.clientY; }
  const wrapperRect = canvas.parentElement.getBoundingClientRect();
  textPopup.style.left = Math.max(10, cx - wrapperRect.left) + 'px';
  textPopup.style.top = Math.max(10, cy - wrapperRect.top) + 'px';
  textPopup.classList.add('show');
  textInput.value = '';
  setTimeout(() => textInput.focus(), 100);
}

textOk.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (text) {
    const s = getStyle();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.font = `bold ${Math.max(18, s.width * 4)}px 'Inter', Arial`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, startX, startY);
    ctx.globalAlpha = 1;
    saveHistory();
    setStatus('Text added');
  }
  textPopup.classList.remove('show');
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') textOk.click();
  if (e.key === 'Escape') textPopup.classList.remove('show');
});

/* ========== SLIDERS ========== */
sizePicker.addEventListener('input', () => sizeLabel.textContent = sizePicker.value);
opacityPicker.addEventListener('input', () => opacityLabel.textContent = opacityPicker.value);

/* ========== COLOR ========== */
function updateColorDisplay(hex) {
  colorHex.textContent = hex.toUpperCase();
  colorDisplay.style.setProperty('--current-color', hex);
}

colorPicker.addEventListener('input', () => {
  updateColorDisplay(colorPicker.value);
  document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
});

palette.addEventListener('click', (e) => {
  const s = e.target.closest('.swatch');
  if (!s) return;
  colorPicker.value = s.dataset.color;
  updateColorDisplay(s.dataset.color);
  document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
  s.classList.add('active');
});

updateColorDisplay('#0ea5e9');

/* ========== BG COLOR ========== */
document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const color = btn.dataset.bg;
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const t = document.createElement('canvas');
    t.width = snap.width; t.height = snap.height;
    t.getContext('2d').putImageData(snap, 0, 0);
    ctx.drawImage(t, 0, 0);
    saveHistory();
  });
});

/* ========== FLOOD FILL ========== */
function hexToRgb(hex) {
  const b = parseInt(hex.slice(1), 16);
  return [(b >> 16) & 255, (b >> 8) & 255, b & 255];
}

function colorMatch(a, b, tol = 30) {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol &&
         Math.abs(a[2] - b[2]) <= tol && Math.abs(a[3] - b[3]) <= tol;
}

function floodFill(x, y, hex) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const w = canvas.width, h = canvas.height;
  const i = (y * w + x) * 4;
  const target = [d[i], d[i + 1], d[i + 2], d[i + 3]];
  const rgb = hexToRgb(hex);
  const fill = [rgb[0], rgb[1], rgb[2], 255];
  if (colorMatch(target, fill, 5)) return;
  const stack = [[x, y]];
  const visited = new Uint8Array(w * h);
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const idx = cy * w + cx;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const p = idx * 4;
    const cur = [d[p], d[p + 1], d[p + 2], d[p + 3]];
    if (!colorMatch(cur, target)) continue;
    d[p] = fill[0]; d[p + 1] = fill[1]; d[p + 2] = fill[2]; d[p + 3] = fill[3];
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  ctx.putImageData(img, 0, 0);
}

/* ========== CLEAR ========== */
clearBtn.addEventListener('click', () => {
  if (confirm('Clear entire canvas?')) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    saveHistory();
    setStatus('Cleared');
  }
});

/* ========== DOWNLOAD ========== */
downloadBtn.addEventListener('click', () => {
  const t = document.createElement('canvas');
  t.width = canvas.width; t.height = canvas.height;
  const tc = t.getContext('2d');
  tc.fillStyle = '#ffffff';
  tc.fillRect(0, 0, t.width, t.height);
  tc.drawImage(canvas, 0, 0);
  const link = document.createElement('a');
  link.download = `AVR-Pro-Studios-${Date.now()}.png`;
  link.href = t.toDataURL('image/png');
  link.click();
  setStatus('Downloaded PNG');
});

/* ========== SAVE / LOAD ========== */
saveJsonBtn.addEventListener('click', () => {
  const data = {
    app: 'AVR Pro Studios',
    version: '2.1',
    canvas: { width: canvas.width, height: canvas.height },
    image: canvas.toDataURL('image/png'),
    timestamp: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `AVR-Pro-Project-${Date.now()}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  setStatus('Project saved');
});

loadJsonBtn.addEventListener('click', () => fileJsonInput.click());

fileJsonInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveHistory();
        setStatus('Project loaded');
      };
      img.src = data.image;
    } catch { alert('Invalid project file!'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ========== IMPORT IMAGE ========== */
importBtn.addEventListener('click', () => fileImageInput.click());

fileImageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      saveHistory();
      setStatus('Image imported');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

/* ========== SHARE ========== */
shareBtn.addEventListener('click', async () => {
  try {
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'avr-drawing.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'AVR Pro Studios Drawing' });
        setStatus('Shared!');
      } else {
        alert('Sharing not supported. Downloaded instead.');
        downloadBtn.click();
      }
    });
  } catch { setStatus('Share cancelled'); }
});

/* ========== FULLSCREEN ========== */
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
  setTimeout(resizeCanvas, 400);
});

document.addEventListener('fullscreenchange', () => setTimeout(resizeCanvas, 400));

/* ========== ZOOM ========== */
zoomInBtn.addEventListener('click', () => {
  zoom = Math.min(3, zoom + 0.15);
  applyZoom();
});
zoomOutBtn.addEventListener('click', () => {
  zoom = Math.max(0.4, zoom - 0.15);
  applyZoom();
});
zoomResetBtn.addEventListener('click', () => {
  zoom = 1;
  applyZoom();
});

function applyZoom() {
  canvas.style.transform = `scale(${zoom})`;
  canvas.style.transformOrigin = 'center';
  zoomLevel.textContent = Math.round(zoom * 100) + '%';
}

/* ========== HELP MODAL ========== */
helpBtn.addEventListener('click', () => helpModal.classList.add('show'));
helpClose.addEventListener('click', () => helpModal.classList.remove('show'));
helpModal.querySelector('.modal-backdrop').addEventListener('click', () => helpModal.classList.remove('show'));

/* ========== THEME ========== */
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  setStatus(document.body.classList.contains('light') ? 'Light mode' : 'Dark mode');
});

/* ========== MOBILE PANEL TOGGLES ========== */
function closeAllPanels() {
  sidebar.classList.remove('open');
  rightPanel.classList.remove('open');
  toolsToggle?.classList.remove('active');
  settingsToggle?.classList.remove('active');
}

function toggleToolsPanel() {
  const isOpen = sidebar.classList.contains('open');
  closeAllPanels();
  if (!isOpen) {
    sidebar.classList.add('open');
    toolsToggle?.classList.add('active');
  }
}

function toggleSettingsPanel() {
  const isOpen = rightPanel.classList.contains('open');
  closeAllPanels();
  if (!isOpen) {
    rightPanel.classList.add('open');
    settingsToggle?.classList.add('active');
  }
}

toolsToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleToolsPanel();
});

settingsToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSettingsPanel();
});

// Close panels when tapping canvas (only if not drawing)
canvas.addEventListener('touchstart', () => {
  if (window.innerWidth <= 768) closeAllPanels();
}, { passive: true });

// Close on outside click
document.addEventListener('click', (e) => {
  if (window.innerWidth > 768) return;
  const inSidebar = sidebar.contains(e.target);
  const inRight = rightPanel.contains(e.target);
  const isToggle = e.target.closest('#toolsToggle') || e.target.closest('#settingsToggle');
  if (!inSidebar && !inRight && !isToggle) closeAllPanels();
});

/* ========== KEYBOARD ========== */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoBtn.click(); }
    else if (e.key === 'y' || (e.shiftKey && e.key === 'Z')) { e.preventDefault(); redoBtn.click(); }
    else if (e.key === 's') { e.preventDefault(); downloadBtn.click(); }
    return;
  }

  const k = e.key.toLowerCase();
  const map = {
    b: 'brush', n: 'pencil', m: 'marker', e: 'eraser', p: 'spray', g: 'neon',
    l: 'line', r: 'rect', c: 'circle', t: 'triangle', s: 'star', a: 'arrow',
    h: 'hexagon', d: 'diamond', f: 'fill', x: 'text', i: 'picker', v: 'select',
  };
  if (map[k]) selectTool(map[k]);
});

/* ========== INIT ========== */
selectTool('brush');
