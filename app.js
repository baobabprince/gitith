let currentLang = localStorage.getItem('tjLang') || 'he';

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('tjLang', lang);

  // Update HTML tag dir & lang attributes
  document.documentElement.lang = lang;
  if (lang === 'en') {
    document.documentElement.dir = 'ltr';
    document.getElementById('edgeTable').style.textAlign = 'left';
  } else {
    document.documentElement.dir = 'rtl';
    document.getElementById('edgeTable').style.textAlign = 'right';
  }

  // Update active style in switcher
  document.getElementById('langHe').className = lang === 'he' ? 'active-lang' : '';
  document.getElementById('langEn').className = lang === 'en' ? 'active-lang' : '';
  document.getElementById('langAr').className = lang === 'ar' ? 'active-lang' : '';

  // Update static text elements
  const dict = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      // Use innerHTML for titles with spans or hints with bold styling
      if (key === 'title' || key.startsWith('hint') || key.startsWith('log') || key.startsWith('err') || key.startsWith('tabMobile')) {
        el.innerHTML = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Update dynamic values/placeholders
  if (lang === 'en') {
    els.geminiKey.placeholder = 'AIza...';
  } else if (lang === 'ar') {
    els.geminiKey.placeholder = 'مفتاح API...';
  } else {
    els.geminiKey.placeholder = 'AIza...';
  }

  // Update zoom title translations
  const zoomInBtn = document.getElementById('btnZoomIn');
  const zoomOutBtn = document.getElementById('btnZoomOut');
  const zoomResetBtn = document.getElementById('btnZoomReset');
  const zoomPanBtn = document.getElementById('btnZoomPan');
  if (zoomInBtn) zoomInBtn.title = dict.zoomIn || 'Zoom In';
  if (zoomOutBtn) zoomOutBtn.title = dict.zoomOut || 'Zoom Out';
  if (zoomResetBtn) zoomResetBtn.title = dict.zoomReset || 'Reset View';
  if (zoomPanBtn) zoomPanBtn.title = dict.zoomPan || 'Pan Mode';

  // Reload current UI panels
  const rec = activeImg();
  if (rec) {
    els.thVal.textContent = rec.threshold;
    els.adaptSizeVal.textContent = rec.adaptSize;
    els.adaptCVal.textContent = rec.adaptC;
    els.adaptMinThVal.textContent = rec.adaptMinTh;
    els.holeSizeVal.textContent = rec.holeSize;
    els.islandSizeVal.textContent = rec.islandSize;
    els.mergeVal.textContent = rec.mergeDist;
    els.spurLenVal.textContent = rec.spurLen;
    if (rec.samGridSize !== undefined) {
      els.samGridSizeVal.textContent = rec.samGridSize;
    }
  } else {
    // Refresh Gemini select placeholder when no models loaded
    if (els.geminiModel.disabled) {
      els.geminiModel.innerHTML = `<option>${dict.optLoadModelsFirst}</option>`;
    }
  }

  // Refresh active mode descriptions
  setMode(state.mode);

  // Refresh table and stats
  updateStatsPanel();
  renderEdgeTable();

  // If tour is active, refresh the current tour step texts instantly on language change
  if (tourState.active) {
    showTourStep(tourState.currentStep);
  }
}

function changeLang(lang) {
  applyTranslations(lang);
}

function getI18nStr(key, params = {}) {
  let str = translations[currentLang][key] || translations['he'][key] || key;
  Object.keys(params).forEach(p => {
    str = str.replace(`{${p}}`, params[p]);
  });
  return str;
}

/* ===================== State ===================== */
const state = {
  images: [],      // {id,name,width,height,imgData,binary,skeleton,nodes,edges,threshold,nextNodeId,nextEdgeId}
  activeId: null,
  mode: 'select',
  selectedEdge: null,
  redraw: {active:false, points:[]},
  showBinary: false,
  hideAllMarks: false,
};

// Global Zoom & Pan State
const zoomState = {
  scale: 1,
  x: 0,
  y: 0,
  isPanning: false,
  panModeActive: false,
  spacePressed: false,
  startX: 0,
  startY: 0,
  lastTouchDistance: 0,
  lastTouchX: 0,
  lastTouchY: 0,
  didDrag: false
};

const els = {
  fileInput: document.getElementById('fileInput'),
  btnLoadExample: document.getElementById('btnLoadExample'),
  imgList: document.getElementById('imgList'),
  binMethod: document.getElementById('binMethod'),
  panelMicroSam: document.getElementById('panelMicroSam'),
  samGridSize: document.getElementById('samGridSize'),
  samGridSizeVal: document.getElementById('samGridSizeVal'),
  panelGlobal: document.getElementById('panelGlobal'),
  threshold: document.getElementById('threshold'),
  thVal: document.getElementById('thVal'),
  panelAdaptive: document.getElementById('panelAdaptive'),
  adaptSize: document.getElementById('adaptSize'),
  adaptSizeVal: document.getElementById('adaptSizeVal'),
  adaptC: document.getElementById('adaptC'),
  adaptCVal: document.getElementById('adaptCVal'),
  adaptMinTh: document.getElementById('adaptMinTh'),
  adaptMinThVal: document.getElementById('adaptMinThVal'),
  fillHoles: document.getElementById('fillHoles'),
  panelHoleSize: document.getElementById('panelHoleSize'),
  holeSize: document.getElementById('holeSize'),
  holeSizeVal: document.getElementById('holeSizeVal'),
  removeIslands: document.getElementById('removeIslands'),
  panelIslandSize: document.getElementById('panelIslandSize'),
  islandSize: document.getElementById('islandSize'),
  islandSizeVal: document.getElementById('islandSizeVal'),
  mergeDist: document.getElementById('mergeDist'),
  mergeVal: document.getElementById('mergeVal'),
  spurLenSlider: document.getElementById('spurLenSlider'),
  spurLenVal: document.getElementById('spurLenVal'),
  tabClassical: document.getElementById('tabClassical'),
  tabGemini: document.getElementById('tabGemini'),
  panelClassical: document.getElementById('panelClassical'),
  panelGemini: document.getElementById('panelGemini'),
  geminiKey: document.getElementById('geminiKey'),
  btnLoadModels: document.getElementById('btnLoadModels'),
  geminiModel: document.getElementById('geminiModel'),
  btnDetectGemini: document.getElementById('btnDetectGemini'),
  switchShowBinary: document.getElementById('switchShowBinary'),
  switchShowMarkings: document.getElementById('switchShowMarkings'),
  btnDetect: document.getElementById('btnDetect'),
  base: document.getElementById('base'),
  overlay: document.getElementById('overlay'),
  canvasWrap: document.getElementById('canvasWrap'),
  dropHint: document.getElementById('dropHint'),
  statNodes: document.getElementById('statNodes'),
  statEdges: document.getElementById('statEdges'),
  statAvg: document.getElementById('statAvg'),
  statStd: document.getElementById('statStd'),
  edgeTableBody: document.getElementById('edgeTableBody'),
  log: document.getElementById('log'),
  modeSelect: document.getElementById('modeSelect'),
  modeAddNode: document.getElementById('modeAddNode'),
  modeRemoveNode: document.getElementById('modeRemoveNode'),
  modeRedraw: document.getElementById('modeRedraw'),
  redrawControls: document.getElementById('redrawControls'),
  finishRedraw: document.getElementById('finishRedraw'),
  cancelRedraw: document.getElementById('cancelRedraw'),
  modeHint: document.getElementById('modeHint'),
  exportCurrent: document.getElementById('exportCurrent'),
  exportAll: document.getElementById('exportAll'),
  // New Open edge connect elements
  includeIncomplete: document.getElementById('includeIncomplete'),
  openEdgeRadius: document.getElementById('openEdgeRadius'),
  openEdgeRadiusVal: document.getElementById('openEdgeRadiusVal'),
  btnConnectOpen: document.getElementById('btnConnectOpen'),
};

const baseCtx = els.base.getContext('2d');
const ovCtx = els.overlay.getContext('2d');
const MAX_DIM = 1000; // working resolution cap for performance

function log(msg, tag){
  const d = document.createElement('div');
  const t = new Date().toLocaleTimeString('en-GB');
  d.innerHTML = `<span class="tag">[${t}]</span> ${msg}`;
  els.log.appendChild(d);
  els.log.scrollTop = els.log.scrollHeight;
}

function activeImg(){ return state.images.find(i=>i.id===state.activeId); }

/* ===================== Loading images ===================== */
els.fileInput.addEventListener('change', (e)=>{
  const files = Array.from(e.target.files||[]);
  files.forEach(loadFile);
  e.target.value = '';
});

['dragenter','dragover'].forEach(ev=>{
  els.canvasWrap.addEventListener(ev, e=>{e.preventDefault();});
});
els.canvasWrap.addEventListener('drop', e=>{
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files||[]).filter(f=>f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.pptx'));
  files.forEach(loadFile);
});

function loadPPTX(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target.result;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFolder = zip.folder("ppt/media");
      if (!mediaFolder) {
        log(`<span style="color:#ff6b6b">${getI18nStr('errNoImagesInPPTX')}</span>`);
        return;
      }

      const imageFiles = [];
      mediaFolder.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(zipEntry.name)) {
          imageFiles.push(zipEntry);
        }
      });

      if (imageFiles.length === 0) {
        log(`<span style="color:#ff6b6b">${getI18nStr('errNoImagesInPPTX')}</span>`);
        return;
      }

      // Sort images by name so they load in order
      imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));

      for (const zipEntry of imageFiles) {
        const blob = await zipEntry.async("blob");
        const cleanName = zipEntry.name.substring(zipEntry.name.lastIndexOf('/') + 1);
        const renamedFile = new File([blob], `${file.name} - ${cleanName}`, { type: blob.type });
        loadFile(renamedFile);
      }
    } catch (err) {
      log(`<span style="color:#ff6b6b">${getI18nStr('errPPTXLoad', {err: err.message})}</span>`);
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function setMobileTab(tabId) {
  const app = document.getElementById('app');
  // Remove all active classes on buttons
  const buttons = document.querySelectorAll('#mobileTabs button');
  buttons.forEach(btn => btn.classList.remove('active'));

  // Remove tab-classes from app
  app.classList.remove('tab-images', 'tab-settings', 'tab-view', 'tab-edit', 'tab-results');

  // Add selected tab
  if (tabId === 'images') {
    app.classList.add('tab-images');
    document.getElementById('tabMobImages').classList.add('active');
  } else if (tabId === 'settings') {
    app.classList.add('tab-settings');
    document.getElementById('tabMobSettings').classList.add('active');
  } else if (tabId === 'view') {
    app.classList.add('tab-view');
    document.getElementById('tabMobView').classList.add('active');
  } else if (tabId === 'edit') {
    app.classList.add('tab-edit');
    document.getElementById('tabMobEdit').classList.add('active');
  } else if (tabId === 'results') {
    app.classList.add('tab-results');
    document.getElementById('tabMobResults').classList.add('active');
  }

  // Defer resetZoomPan so the #center container renders fully with its true dimensions first.
  if (tabId === 'view' || tabId === 'edit') {
    setTimeout(() => {
      resetZoomPan();
    }, 50);
  }
}

// Bind mobile tab events
document.getElementById('tabMobImages').addEventListener('click', () => setMobileTab('images'));
document.getElementById('tabMobSettings').addEventListener('click', () => setMobileTab('settings'));
document.getElementById('tabMobView').addEventListener('click', () => setMobileTab('view'));
document.getElementById('tabMobEdit').addEventListener('click', () => setMobileTab('edit'));
document.getElementById('tabMobResults').addEventListener('click', () => setMobileTab('results'));


function loadFile(file){
  if (file.name.toLowerCase().endsWith('.pptx')) {
    loadPPTX(file);
    return;
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = ()=>{
    let w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAX_DIM/Math.max(w,h));
    w = Math.round(w*scale); h = Math.round(h*scale);
    const off = document.createElement('canvas');
    off.width=w; off.height=h;
    const octx = off.getContext('2d');
    octx.drawImage(img,0,0,w,h);
    let imgData;
    try {
      imgData = octx.getImageData(0,0,w,h);
    } catch(err) {
      log(`<span style="color:#ff6b6b">${getI18nStr('errTaintedCanvas')}</span>`);
      console.error(err);
      return;
    }
    const rec = {
      id: 'im'+Math.random().toString(36).slice(2,9),
      name: file.name, width:w, height:h, imgData,
      binary:null, skeleton:null, nodes:[], edges:[],
      threshold: autoThreshold(imgData),
      // Geometric merge distance for collapsing nearby branch-point blobs into
      // one logical junction. Kept fairly tight by default (dense networks
      // often have real, distinct junctions closer together than you'd think).
      mergeDist: Math.max(8, Math.min(20, Math.round(Math.min(w,h)/60))),
      // Minimum length (px) for a skeleton dead-end spur to be considered real
      // rather than noise from fibrous/uneven staining.
      spurLen: Math.max(15, Math.round(Math.min(w,h)/50)),
      nextNodeId:1, nextEdgeId:1,
      detected:false,
      binMethod: 'adaptive',
      adaptSize: 41,
      adaptC: 7,
      adaptMinTh: 15,
      fillHoles: true,
      holeSize: 50,
      removeIslands: true,
      islandSize: 100,
      samGridSize: 10,
    };
    state.images.push(rec);
    state.activeId = rec.id;
    URL.revokeObjectURL(url);
    log(getI18nStr('logLoaded', {name: file.name, w, h}));
    refreshImgList();
    setActiveImage(rec.id);
    setMobileTab('view');
  };
  img.src = url;
}

function loadImageFromUrl(url, name){
  const img = new Image();
  img.onload = ()=>{
    let w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAX_DIM/Math.max(w,h));
    w = Math.round(w*scale); h = Math.round(h*scale);
    const off = document.createElement('canvas');
    off.width=w; off.height=h;
    const octx = off.getContext('2d');
    octx.drawImage(img,0,0,w,h);
    let imgData;
    try {
      imgData = octx.getImageData(0,0,w,h);
    } catch(err) {
      log(`<span style="color:#ff6b6b">${getI18nStr('errTaintedCanvas')}</span>`);
      console.error(err);
      return;
    }
    const rec = {
      id: 'im'+Math.random().toString(36).slice(2,9),
      name: name, width:w, height:h, imgData,
      binary:null, skeleton:null, nodes:[], edges:[],
      threshold: autoThreshold(imgData),
      mergeDist: Math.max(8, Math.min(20, Math.round(Math.min(w,h)/60))),
      spurLen: Math.max(15, Math.round(Math.min(w,h)/50)),
      nextNodeId:1, nextEdgeId:1,
      detected:false,
      binMethod: 'adaptive',
      adaptSize: 41,
      adaptC: 7,
      adaptMinTh: 15,
      fillHoles: true,
      holeSize: 50,
      removeIslands: true,
      islandSize: 100,
      samGridSize: 10,
    };
    state.images.push(rec);
    state.activeId = rec.id;
    log(getI18nStr('logLoaded', {name: name, w, h}));
    refreshImgList();
    setActiveImage(rec.id);
    setMobileTab('view');
  };
  img.src = url;
}

els.btnLoadExample.addEventListener('click', ()=>{
  loadImageFromUrl('example/ctl+213_green.png', 'ctl+213_green.png');
});

function autoThreshold(imgData){
  // simple Otsu on green channel
  const hist = new Array(256).fill(0);
  const d = imgData.data;
  for(let i=0;i<d.length;i+=4) hist[d[i+1]]++;
  const total = imgData.width*imgData.height;
  let sum=0; for(let t=0;t<256;t++) sum += t*hist[t];
  let sumB=0, wB=0, wF=0, varMax=0, threshold=40;
  for(let t=0;t<256;t++){
    wB += hist[t]; if(wB===0) continue;
    wF = total-wB; if(wF===0) break;
    sumB += t*hist[t];
    const mB = sumB/wB, mF=(sum-sumB)/wF;
    const varBetween = wB*wF*(mB-mF)*(mB-mF);
    if(varBetween>varMax){ varMax=varBetween; threshold=t; }
  }
  return Math.max(15, Math.round(threshold*0.55)); // lean lower to keep faint junctions
}

function refreshImgList(){
  els.imgList.innerHTML = '';
  state.images.forEach(rec=>{
    const div = document.createElement('div');
    div.className = 'imgItem'+(rec.id===state.activeId?' active':'');

    // Calculate based on toggle
    const validEdges = rec.edges.filter(e => {
      if (e.includeInStats === undefined) {
        e.includeInStats = !e.incomplete;
      }
      return e.includeInStats && isFinite(e.ratio);
    });

    const avg = validEdges.length ? (validEdges.reduce((s,e)=>s+e.ratio,0)/validEdges.length).toFixed(3) : '—';
    div.innerHTML = `<span class="name" title="${rec.name}">${rec.name}</span><span class="ratio">${avg}</span><button class="btn-del-img" title="Delete Image">🗑️</button>`;
    div.querySelector('.name').onclick = (e)=> { e.stopPropagation(); setActiveImage(rec.id); };
    div.querySelector('.ratio').onclick = (e)=> { e.stopPropagation(); setActiveImage(rec.id); };
    div.onclick = ()=> setActiveImage(rec.id);

    const delBtn = div.querySelector('.btn-del-img');
    delBtn.onclick = (ev) => {
      ev.stopPropagation();
      deleteImage(rec.id);
    };

    els.imgList.appendChild(div);
  });
}

function deleteImage(id) {
  if (!confirm(getI18nStr('confirmDeleteImage'))) {
    return;
  }
  const idx = state.images.findIndex(img => img.id === id);
  if (idx === -1) return;
  state.images.splice(idx, 1);
  log(`Image removed from analysis`);

  if (state.activeId === id) {
    if (state.images.length > 0) {
      // Set to the next image or the previous one if last
      const nextActiveIdx = Math.min(idx, state.images.length - 1);
      setActiveImage(state.images[nextActiveIdx].id);
    } else {
      state.activeId = null;
      state.selectedEdge = null;
      cancelRedrawMode();
      refreshImgList();

      // Clear canvas
      baseCtx.clearRect(0,0,els.base.width, els.base.height);
      ovCtx.clearRect(0,0,els.overlay.width, els.overlay.height);
      els.dropHint.style.display = 'flex';

      // Disable UI controls
      els.binMethod.disabled = true;
      els.threshold.disabled = true;
      els.adaptSize.disabled = true;
      els.adaptC.disabled = true;
      els.adaptMinTh.disabled = true;
      els.fillHoles.disabled = true;
      els.holeSize.disabled = true;
      els.removeIslands.disabled = true;
      els.islandSize.disabled = true;
      els.switchShowBinary.disabled = true;
      els.switchShowMarkings.disabled = true;
      els.btnDetect.disabled = true;
      els.mergeDist.disabled = true;
      els.spurLenSlider.disabled = true;
      els.btnDetectGemini.disabled = true;

      updateStatsPanel();
      renderEdgeTable();
    }
  } else {
    refreshImgList();
  }
}

function resetZoomPan() {
  const rec = activeImg();
  if (!rec) {
    zoomState.scale = 1;
    zoomState.x = 0;
    zoomState.y = 0;
    applyTransform();
    return;
  }
  const viewport = document.getElementById('center');
  if (!viewport) return;
  const vw = viewport.clientWidth - 40;
  const vh = viewport.clientHeight - 40;
  const scale = Math.min(1, Math.min(vw / rec.width, vh / rec.height));
  zoomState.scale = scale;
  zoomState.x = (viewport.clientWidth - rec.width * scale) / 2;
  zoomState.y = (viewport.clientHeight - rec.height * scale) / 2;
  applyTransform();
}

function applyTransform() {
  const wrap = document.getElementById('canvasWrap');
  if (wrap) {
    wrap.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
  }
}

function setActiveImage(id){
  state.activeId = id;
  state.selectedEdge = null;
  cancelRedrawMode();
  refreshImgList();
  const rec = activeImg();
  els.dropHint.style.display = rec ? 'none' : 'flex';
  if(!rec) return;
  els.base.width = els.overlay.width = rec.width;
  els.base.height = els.overlay.height = rec.height;
  baseCtx.putImageData(rec.imgData,0,0);
  resetZoomPan();

  // Enable UI controls
  els.binMethod.disabled = false;
  els.threshold.disabled = false;
  els.adaptSize.disabled = false;
  els.adaptC.disabled = false;
  els.adaptMinTh.disabled = false;
  els.samGridSize.disabled = false;
  els.fillHoles.disabled = false;
  els.holeSize.disabled = !rec.fillHoles;
  els.removeIslands.disabled = false;
  els.islandSize.disabled = !rec.removeIslands;
  els.switchShowBinary.disabled = false;
  els.switchShowMarkings.disabled = false;
  els.btnDetect.disabled = false;
  els.mergeDist.disabled = false;
  els.spurLenSlider.disabled = false;

  // Sync state values to UI controls
  els.switchShowBinary.checked = state.showBinary;
  els.switchShowMarkings.checked = !state.hideAllMarks;
  els.binMethod.value = rec.binMethod;
  els.threshold.value = rec.threshold;
  els.thVal.textContent = rec.threshold;
  els.adaptSize.value = rec.adaptSize;
  els.adaptSizeVal.textContent = rec.adaptSize;
  els.adaptC.value = rec.adaptC;
  els.adaptCVal.textContent = rec.adaptC;
  els.adaptMinTh.value = rec.adaptMinTh;
  els.adaptMinThVal.textContent = rec.adaptMinTh;
  els.samGridSize.value = rec.samGridSize || 10;
  els.samGridSizeVal.textContent = rec.samGridSize || 10;
  els.fillHoles.checked = rec.fillHoles;
  els.holeSize.value = rec.holeSize;
  els.holeSizeVal.textContent = rec.holeSize;
  els.removeIslands.checked = rec.removeIslands;
  els.islandSize.value = rec.islandSize;
  els.islandSizeVal.textContent = rec.islandSize;
  els.mergeDist.value = rec.mergeDist;
  els.mergeVal.textContent = rec.mergeDist;
  els.spurLenSlider.value = rec.spurLen;
  els.spurLenVal.textContent = rec.spurLen;

  // Show/hide appropriate panels based on selected binarization method
  if (rec.binMethod === 'adaptive') {
    els.panelAdaptive.style.display = '';
    els.panelGlobal.style.display = 'none';
    els.panelMicroSam.style.display = 'none';
  } else if (rec.binMethod === 'global') {
    els.panelAdaptive.style.display = 'none';
    els.panelGlobal.style.display = '';
    els.panelMicroSam.style.display = 'none';
  } else {
    els.panelAdaptive.style.display = 'none';
    els.panelGlobal.style.display = 'none';
    els.panelMicroSam.style.display = '';
  }

  els.btnDetectGemini.disabled = !(els.geminiKey.value && els.geminiModel.value);
  drawOverlay();
  updateStatsPanel();
  renderEdgeTable();
}

/* ===================== Preprocessing & Threshold Controls ===================== */
els.binMethod.addEventListener('change', () => {
  const rec = activeImg(); if(!rec) return;
  rec.binMethod = els.binMethod.value;
  if (rec.binMethod === 'adaptive') {
    els.panelAdaptive.style.display = '';
    els.panelGlobal.style.display = 'none';
    els.panelMicroSam.style.display = 'none';
  } else if (rec.binMethod === 'global') {
    els.panelAdaptive.style.display = 'none';
    els.panelGlobal.style.display = '';
    els.panelMicroSam.style.display = 'none';
  } else {
    els.panelAdaptive.style.display = 'none';
    els.panelGlobal.style.display = 'none';
    els.panelMicroSam.style.display = '';
  }
  drawOverlay();
});

els.samGridSize.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.samGridSize = parseInt(els.samGridSize.value, 10);
  els.samGridSizeVal.textContent = rec.samGridSize;
});

els.threshold.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.threshold = parseInt(els.threshold.value, 10);
  els.thVal.textContent = rec.threshold;
});

els.adaptSize.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.adaptSize = parseInt(els.adaptSize.value, 10);
  els.adaptSizeVal.textContent = rec.adaptSize;
});

els.adaptC.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.adaptC = parseInt(els.adaptC.value, 10);
  els.adaptCVal.textContent = rec.adaptC;
});

els.adaptMinTh.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.adaptMinTh = parseInt(els.adaptMinTh.value, 10);
  els.adaptMinThVal.textContent = rec.adaptMinTh;
});

els.fillHoles.addEventListener('change', () => {
  const rec = activeImg(); if(!rec) return;
  rec.fillHoles = els.fillHoles.checked;
  els.holeSize.disabled = !rec.fillHoles;
});

els.holeSize.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.holeSize = parseInt(els.holeSize.value, 10);
  els.holeSizeVal.textContent = rec.holeSize;
});

els.removeIslands.addEventListener('change', () => {
  const rec = activeImg(); if(!rec) return;
  rec.removeIslands = els.removeIslands.checked;
  els.islandSize.disabled = !rec.removeIslands;
});

els.islandSize.addEventListener('input', () => {
  const rec = activeImg(); if(!rec) return;
  rec.islandSize = parseInt(els.islandSize.value, 10);
  els.islandSizeVal.textContent = rec.islandSize;
});

/* ===================== Node & Graph Controls ===================== */
els.tabClassical.onclick = ()=>{
  els.tabClassical.classList.add('active-mode'); els.tabGemini.classList.remove('active-mode');
  els.panelClassical.style.display=''; els.panelGemini.style.display='none';
};
els.tabGemini.onclick = ()=>{
  els.tabGemini.classList.add('active-mode'); els.tabClassical.classList.remove('active-mode');
  els.panelGemini.style.display=''; els.panelClassical.style.display='none';
};
els.geminiKey.value = localStorage.getItem('tjGeminiKey') || '';
els.geminiKey.addEventListener('change', ()=> localStorage.setItem('tjGeminiKey', els.geminiKey.value));
els.geminiKey.addEventListener('input', ()=>{
  els.btnDetectGemini.disabled = !(els.geminiKey.value && els.geminiModel.value && activeImg());
});
els.mergeDist.addEventListener('input', ()=>{
  const rec = activeImg(); if(!rec) return;
  rec.mergeDist = parseInt(els.mergeDist.value,10);
  els.mergeVal.textContent = rec.mergeDist;
});
els.spurLenSlider.addEventListener('input', ()=>{
  const rec = activeImg(); if(!rec) return;
  rec.spurLen = parseInt(els.spurLenSlider.value,10);
  els.spurLenVal.textContent = rec.spurLen;
});
els.switchShowBinary.addEventListener('change', ()=>{
  const rec = activeImg(); if(!rec) return;
  state.showBinary = els.switchShowBinary.checked;
  if(state.showBinary){
    log(getI18nStr('logPreviewBinOn'));
  } else {
    log(getI18nStr('logPreviewBinOff'));
  }
  drawOverlay();
});

els.switchShowMarkings.addEventListener('change', ()=>{
  const rec = activeImg(); if(!rec) return;
  state.hideAllMarks = !els.switchShowMarkings.checked;
  if(state.hideAllMarks){
    log(getI18nStr('logToggleOverlayOn'));
  } else {
    log(getI18nStr('logToggleOverlayOff'));
  }
  drawOverlay();
});

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return;
  }
  if (state.mode === 'select' && state.selectedEdge) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteEdge(state.selectedEdge);
    }
  }
  if (e.key === ' ' || e.key === 'Spacebar') {
    zoomState.spacePressed = true;
    updateCursor();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    zoomState.spacePressed = false;
    updateCursor();
  }
});

function updateCursor() {
  const overlay = els.overlay;
  if (!overlay) return;
  if (zoomState.spacePressed || zoomState.panModeActive) {
    overlay.style.cursor = 'grab';
  } else if (state.mode === 'select') {
    overlay.style.cursor = 'crosshair';
  } else if (state.mode === 'redraw') {
    overlay.style.cursor = 'crosshair';
  } else {
    overlay.style.cursor = 'pointer';
  }
}

function smoothGreen(imgData){
  // Two-pass 3x3 box blur on the green channel (approximates a wider
  // Gaussian) to suppress jagged-edge / fibrous staining noise that
  // otherwise produces spurious skeleton branches after thinning. A single
  // 3x3 pass is too weak for noisy, fibrous ZO-1-style staining.
  const w=imgData.width, h=imgData.height, d=imgData.data;
  const g = new Float32Array(w*h);
  for(let p=0,i=0;i<d.length;i+=4,p++) g[p]=d[i+1];

  function boxBlurPass(src){
    const out = new Float32Array(w*h);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        let sum=0, cnt=0;
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
          const nx=x+dx, ny=y+dy;
          if(nx>=0&&ny>=0&&nx<w&&ny<h){ sum+=src[ny*w+nx]; cnt++; }
        }
        out[y*w+x]=sum/cnt;
      }
    }
    return out;
  }

  return boxBlurPass(boxBlurPass(g));
}

function computeIntegralImage(data, w, h) {
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      rowSum += data[idx];
      integral[idx] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
    }
  }
  return integral;
}

function getRectSum(integral, w, h, x1, y1, x2, y2) {
  x1 = Math.max(0, x1);
  y1 = Math.max(0, y1);
  x2 = Math.min(w - 1, x2);
  y2 = Math.min(h - 1, y2);

  const idxA = (y1 > 0 && x1 > 0) ? integral[(y1 - 1) * w + (x1 - 1)] : 0;
  const idxB = (y1 > 0) ? integral[(y1 - 1) * w + x2] : 0;
  const idxC = (x1 > 0) ? integral[y2 * w + (x1 - 1)] : 0;
  const idxD = integral[y2 * w + x2];

  return idxD - idxB - idxC + idxA;
}

function fillSmallHoles(bin, w, h, maxHoleSize) {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const startIdx = y * w + x;
      if (bin[startIdx] === 0 && !visited[startIdx]) {
        let head = 0, tail = 0;
        queue[tail++] = startIdx;
        visited[startIdx] = 1;
        let touchesBorder = false;

        while (head < tail) {
          const idx = queue[head++];
          const cx = idx % w;
          const cy = Math.floor(idx / w);
          if (cx === 0 || cx === w - 1 || cy === 0 || cy === h - 1) {
            touchesBorder = true;
          }
          // 4-neighbors
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (bin[nIdx] === 0 && !visited[nIdx]) {
                visited[nIdx] = 1;
                queue[tail++] = nIdx;
              }
            }
          }
        }

        if (!touchesBorder && tail <= maxHoleSize) {
          for (let i = 0; i < tail; i++) {
            bin[queue[i]] = 1;
          }
        }
      }
    }
  }
}

function removeSmallIslands(bin, w, h, maxIslandSize) {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const startIdx = y * w + x;
      if (bin[startIdx] === 1 && !visited[startIdx]) {
        let head = 0, tail = 0;
        queue[tail++] = startIdx;
        visited[startIdx] = 1;

        while (head < tail) {
          const idx = queue[head++];
          const cx = idx % w;
          const cy = Math.floor(idx / w);
          // 8-neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (bin[nIdx] === 1 && !visited[nIdx]) {
                  visited[nIdx] = 1;
                  queue[tail++] = nIdx;
                }
              }
            }
          }
        }

        if (tail <= maxIslandSize) {
          for (let i = 0; i < tail; i++) {
            bin[queue[i]] = 0;
          }
        }
      }
    }
  }
}

let samModel = null;
let samProcessor = null;

async function ensureSamLoaded() {
  if (samModel && samProcessor) return;
  log(getI18nStr('logLoadingSam'));
  const { SamModel, AutoProcessor, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.4/dist/transformers.min.js');
  env.allowLocalModels = false;
  samModel = await SamModel.from_pretrained('Xenova/slimsam-77-uniform');
  samProcessor = await AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform');
  log(getI18nStr('logSamLoaded'));
}

async function runMicroSamAsync(rec) {
  if (state.samProcessing) return;
  state.samProcessing = true;
  drawOverlay();
  try {
    await ensureSamLoaded();
    log(getI18nStr('logSamProcessing'));

    const { RawImage } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.4/dist/transformers.min.js');
    const raw_image = RawImage.fromCanvas(els.base);

    const w = rec.width;
    const h = rec.height;
    const boundaries = new Uint8Array(w * h);

    // Generate grid points
    const points = [];
    const gridSize = rec.samGridSize || 10;
    for (let i = 1; i < gridSize; i++) {
      for (let j = 1; j < gridSize; j++) {
        const px = Math.round((i / gridSize) * w);
        const py = Math.round((j / gridSize) * h);
        points.push([px, py]);
      }
    }

    log(`MicroSAM: Processing ${points.length} grid prompts...`);

    // Process in batches
    const batchSize = 16;
    for (let start = 0; start < points.length; start += batchSize) {
      const batchPoints = points.slice(start, start + batchSize);
      const inputPointsArr = batchPoints.map(p => [p]);
      const inputLabelsArr = batchPoints.map(() => [1]);

      const inputs = await samProcessor(raw_image, {
        input_points: inputPointsArr,
        input_labels: inputLabelsArr
      });

      const outputs = await samModel(inputs);

      const masks = await samProcessor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes
      );

      for (let i = 0; i < masks.length; i++) {
        const tensor = masks[i];
        const data = tensor.data;
        const size = w * h;

        let bestIdx = 0;
        let maxScore = -Infinity;
        if (outputs.iou_scores && outputs.iou_scores.data) {
          const baseScoreIdx = i * 3;
          for (let c = 0; c < 3; c++) {
            const score = outputs.iou_scores.data[baseScoreIdx + c];
            if (score > maxScore) {
              maxScore = score;
              bestIdx = c;
            }
          }
        }

        const maskOffset = bestIdx * size;

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (data[maskOffset + idx]) {
              if (!data[maskOffset + idx - 1] ||
                  !data[maskOffset + idx + 1] ||
                  !data[maskOffset + idx - w] ||
                  !data[maskOffset + idx + w]) {
                boundaries[idx] = 1;
              }
            }
          }
        }
      }
    }

    rec.microsamBinary = boundaries;
    rec.microsamBinaryGridSize = gridSize;
    log(getI18nStr('logSamComplete'));
  } catch (err) {
    log(`<span style="color:#ff6b6b">MicroSAM Error: ${err.message}</span>`);
    console.error(err);
  } finally {
    state.samProcessing = false;
    drawOverlay();
  }
}

function binarizeSync(rec) {
  if (rec.binMethod === 'microsam') {
    return rec.microsamBinary || new Uint8Array(rec.width * rec.height);
  }
  const w = rec.width, h = rec.height;
  const g = smoothGreen(rec.imgData);
  const out = new Uint8Array(w * h);

  if (rec.binMethod === 'adaptive') {
    const integral = computeIntegralImage(g, w, h);
    const S = rec.adaptSize;
    const C = rec.adaptC;
    const minTh = rec.adaptMinTh;
    const half = Math.floor(S / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (g[idx] < minTh) {
          out[idx] = 0;
          continue;
        }
        const sum = getRectSum(integral, w, h, x - half, y - half, x + half, y + half);
        const count = (Math.min(w - 1, x + half) - Math.max(0, x - half) + 1) *
                      (Math.min(h - 1, y + half) - Math.max(0, y - half) + 1);
        const mean = sum / count;
        out[idx] = g[idx] >= (mean - C) ? 1 : 0;
      }
    }
  } else {
    for (let p = 0; p < g.length; p++) {
      out[p] = g[p] >= rec.threshold ? 1 : 0;
    }
  }

  if (rec.fillHoles) {
    fillSmallHoles(out, w, h, rec.holeSize);
  }

  if (rec.removeIslands) {
    removeSmallIslands(out, w, h, rec.islandSize);
  }

  return out;
}

async function binarize(rec) {
  if (rec.binMethod === 'microsam') {
    if (rec.microsamBinary && rec.microsamBinaryGridSize === rec.samGridSize) {
      return rec.microsamBinary;
    }
    await runMicroSamAsync(rec);
    return rec.microsamBinary || new Uint8Array(rec.width * rec.height);
  }
  return binarizeSync(rec);
}

function pruneSpurs(skel, w, h, minSpurLen){
  const nb = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  function neighbors(x,y){
    const res=[];
    for(const [dx,dy] of nb){
      const nx=x+dx, ny=y+dy;
      if(nx>=0&&ny>=0&&nx<w&&ny<h&&skel[ny*w+nx]) res.push([nx,ny]);
    }
    return res;
  }
  let removedAny = true, pass=0;
  while(removedAny && pass<8){
    removedAny = false; pass++;
    const deg = degreeMap(skel, w, h);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      if(!skel[y*w+x] || deg[y*w+x]!==1) continue;
      // walk from this endpoint until reaching a branch point or exceeding minSpurLen
      const path=[[x,y]];
      let prev=null, cur=[x,y];
      let reachedBranch=false;
      for(let step=0; step<minSpurLen+1; step++){
        const neigh = neighbors(cur[0],cur[1]).filter(p=> !(prev && p[0]===prev[0]&&p[1]===prev[1]));
        if(neigh.length===0) break; // dead end shorter than threshold
        if(neigh.length>=2){ reachedBranch=true; break; } // real junction reached -> confirmed spur
        prev=cur; cur=neigh[0]; path.push(cur);
      }
      if(reachedBranch && path.length<=minSpurLen){
        path.forEach(([px,py])=>{ skel[py*w+px]=0; });
        removedAny = true;
      }
    }
  }
}

/* ===================== Zhang-Suen thinning ===================== */
function thin(binary, w, h){
  const img = new Uint8Array(binary); // copy
  const idx = (x,y)=> y*w+x;
  const get = (x,y)=> (x<0||y<0||x>=w||y>=h) ? 0 : img[idx(x,y)];
  const offsets = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]; // P2..P9
  let changed = true;
  let iter = 0;
  while(changed && iter < 60){
    changed = false; iter++;
    for(const step of [1,2]){
      const toRemove = [];
      for(let y=1;y<h-1;y++){
        for(let x=1;x<w-1;x++){
          if(!get(x,y)) continue;
          const P = offsets.map(([dx,dy])=>get(x+dx,y+dy));
          const B = P.reduce((a,b)=>a+b,0);
          if(B<2||B>6) continue;
          let A=0;
          for(let k=0;k<8;k++) if(P[k]===0 && P[(k+1)%8]===1) A++;
          if(A!==1) continue;
          if(step===1){
            if(P[0]*P[2]*P[4]!==0) continue;
            if(P[2]*P[4]*P[6]!==0) continue;
          } else {
            if(P[0]*P[2]*P[6]!==0) continue;
            if(P[0]*P[4]*P[6]!==0) continue;
          }
          toRemove.push(idx(x,y));
        }
      }
      if(toRemove.length){ changed = true; for(const p of toRemove) img[p]=0; }
    }
  }
  return img;
}

/* ===================== Node & edge detection ===================== */
function degreeMap(skel, w, h){
  const deg = new Uint8Array(w*h);
  const nb = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(!skel[y*w+x]) continue;
    let c=0;
    for(const [dx,dy] of nb){
      const nx=x+dx, ny=y+dy;
      if(nx>=0&&ny>=0&&nx<w&&ny<h&&skel[ny*w+nx]) c++;
    }
    deg[y*w+x]=c;
  }
  return deg;
}

function crossingNumberMap(skel, w, h){
  const cn = new Uint8Array(w*h);
  const offsets = [
    [1, 0],   // P1
    [1, -1],  // P2
    [0, -1],  // P3
    [-1, -1], // P4
    [-1, 0],  // P5
    [-1, 1],  // P6
    [0, 1],   // P7
    [1, 1]    // P8
  ];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      if(!skel[y*w+x]) continue;
      let pValues = [];
      for(let i=0; i<8; i++){
        const nx = x + offsets[i][0];
        const ny = y + offsets[i][1];
        if(nx>=0 && nx<w && ny>=0 && ny<h){
          pValues.push(skel[ny*w+nx] ? 1 : 0);
        } else {
          pValues.push(0);
        }
      }
      let sum = 0;
      for(let i=0; i<8; i++){
        const val1 = pValues[i];
        const val2 = pValues[(i+1)%8];
        sum += Math.abs(val2 - val1);
      }
      cn[y*w+x] = sum / 2;
    }
  }
  return cn;
}

/**
 * Collapse nearby branch-point blobs into single logical junctions, based
 * purely on physical (pixel) distance between blob centroids.
 *
 * This deliberately does NOT use a naive transitive union-find (merge A-B,
 * merge B-C => A,B,C become one group even if A and C are far apart). In a
 * dense cell network that chains together dozens of unrelated junctions into
 * one giant blob, whose average position lands nowhere real and whose edges
 * get redrawn as long straight spokes into empty space.
 *
 * Instead we repeatedly merge only the single closest pair of remaining
 * groups, and only if the resulting merged group's own pixels all still fit
 * within `radius` of its new centroid (i.e. the merge doesn't blow up into a
 * spread-out non-junction). This keeps merges local and non-transitive.
 */
function geometricMergeNodes(nodes, radius){
  let groups = nodes.map(n => ({ pixels: n.pixels.slice() }));

  function centroidOf(pixels){
    const cx = pixels.reduce((s,p)=>s+p[0],0)/pixels.length;
    const cy = pixels.reduce((s,p)=>s+p[1],0)/pixels.length;
    return [cx,cy];
  }
  function maxSpread(pixels, cx, cy){
    let m = 0;
    for(const [x,y] of pixels) m = Math.max(m, Math.hypot(x-cx,y-cy));
    return m;
  }

  let changed = true;
  let safety = 0;
  while(changed && safety++ < 20000){
    changed = false;
    const centroids = groups.map(g=>centroidOf(g.pixels));
    let bestI=-1, bestJ=-1, bestD=Infinity;
    for(let i=0;i<groups.length;i++){
      for(let j=i+1;j<groups.length;j++){
        const d = Math.hypot(centroids[i][0]-centroids[j][0], centroids[i][1]-centroids[j][1]);
        if(d < radius && d < bestD){ bestD=d; bestI=i; bestJ=j; }
      }
    }
    if(bestI===-1) break;
    const combinedPixels = groups[bestI].pixels.concat(groups[bestJ].pixels);
    const [ccx,ccy] = centroidOf(combinedPixels);
    if(maxSpread(combinedPixels, ccx, ccy) <= radius){
      groups[bestI] = { pixels: combinedPixels };
      groups.splice(bestJ, 1);
      changed = true;
    } else {
      // This closest pair can't be merged safely; since all other pairs are
      // farther apart, no further merges are possible this round.
      break;
    }
  }

  return groups.map((g,i)=>{
    const [cx,cy] = centroidOf(g.pixels);
    return { id:'n'+(i+1), x:cx, y:cy, pixels:g.pixels };
  });
}

async function detectGraph(rec){
  const modeStr = rec.binMethod === 'adaptive' ? getI18nStr('optAdaptive') : (rec.binMethod === 'global' ? `${getI18nStr('optGlobal')} (th=${rec.threshold})` : 'MicroSAM');
  log(rec.binMethod === 'adaptive' ? getI18nStr('logBinAdaptive') : (rec.binMethod === 'global' ? getI18nStr('logBinGlobal', {th: rec.threshold}) : 'Binarizing (MicroSAM)...'));
  const bin = await binarize(rec);
  log(getI18nStr('logSkel'));
  const skel = thin(bin, rec.width, rec.height);
  const w=rec.width, h=rec.height;
  const spurLen = rec.spurLen;
  pruneSpurs(skel, w, h, spurLen);
  rec.binary = bin; rec.skeleton = skel;
  const deg = degreeMap(skel, w, h);

  // remove isolated noise pixels (deg 0)
  for(let i=0;i<skel.length;i++) if(skel[i] && deg[i]===0) skel[i]=0;

  // branch pixel clustering (using Rutovitz Crossing Number >= 3 to avoid false junction spots in middle of smooth curves)
  const cn = crossingNumberMap(skel, w, h);
  const branchPixels = [];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(skel[y*w+x] && cn[y*w+x]>=3) branchPixels.push([x,y]);
  }
  const clusterRadius = 3; // tight: only merge pixels of the same contiguous branch blob.
                            // Broader consolidation of nearby-but-separate blobs happens
                            // next via geometricMergeNodes(), which works on physical
                            // distance and is safe against chain-merging across the image.
  const clusters = clusterPoints(branchPixels, clusterRadius);

  let nodes = clusters.map((pts,i)=>{
    const cx = pts.reduce((s,p)=>s+p[0],0)/pts.length;
    const cy = pts.reduce((s,p)=>s+p[1],0)/pts.length;
    return { id:'tmp'+i, x:cx, y:cy, pixels:pts };
  });
  const rawCount = nodes.length;

  // Geometric merge: collapse nearby branch-point blobs into single logical
  // junctions purely by physical distance, BEFORE tracing edges. Non-
  // transitive by construction (see geometricMergeNodes docstring above).
  nodes = geometricMergeNodes(nodes, rec.mergeDist);
  nodes.forEach((n,i)=> n.id = 'n'+(i+1));
  rec.nextNodeId = nodes.length+1;

  // map pixel -> clusterId (by nearest cluster among its own contributing pixels)
  const pixelClusterId = new Map();
  nodes.forEach((n,ci)=> n.pixels.forEach(([x,y])=> pixelClusterId.set(y*w+x, n.id)));

  // trace edges
  const edges = traceEdges(skel, w, h, deg, nodes, pixelClusterId);
  rec.nodes = nodes;
  rec.edges = edges;
  rec.nextEdgeId = edges.length+1;

  // Connect incomplete edges that end close to any existing node
  const rVal = parseInt(els.openEdgeRadius.value, 10);
  const connectedCount = connectIncompleteEdges(rec, rVal);
  if (connectedCount > 0) {
    log(getI18nStr('logAutoConnect', {count: connectedCount}));
  }

  // Any remaining pairs of nodes still connected by a very short traced edge
  // (rare after the geometric pre-merge, but possible for a real short
  // segment) are collapsed too, purely topologically. Edge paths/lengths of
  // OTHER edges are never rewritten here.
  const mergedCount = mergeCloseNodes(rec, rec.mergeDist);

  // Post-detection/post-pruning cleanup: automatically merge nodes with exactly 2 connected edges.
  // When a node is connected to exactly two edges (often because one of its branch arms got pruned),
  // it is no longer a tri-cellular junction but a redundant point in the middle of a continuous line.
  let autoMerged2EdgeNodesCount = 0;
  let hasMerged2EdgeNodes = true;
  let safetyLoop = 0;
  while(hasMerged2EdgeNodes && safetyLoop++ < 1000) {
    hasMerged2EdgeNodes = false;
    for (const node of rec.nodes) {
      const connected = rec.edges.filter(e => e.n1 === node.id || e.n2 === node.id);
      if (connected.length === 2 && connected.every(e => e.n1 && e.n2)) {
        const [e1, e2] = connected;
        const otherOf = (e) => e.n1 === node.id ? e.n2 : e.n1;
        const na = otherOf(e1), nb = otherOf(e2);

        let p1 = e1.path.slice();
        if (e1.n2 === node.id) {
          // ends at node
        } else {
          p1 = p1.reverse();
        }
        let p2 = e2.path.slice();
        if (e2.n1 === node.id) {
          // starts at node
        } else {
          p2 = p2.reverse();
        }
        const mergedPath = p1.concat(p2.slice(1));
        const n1 = rec.nodes.find(n => n.id === na);
        const n2 = rec.nodes.find(n => n.id === nb);
        const straight = (n1 && n2) ? Math.hypot(n1.x - n2.x, n1.y - n2.y) : Math.max(e1.straight, e2.straight);

        const newEdge = {
          id: 'e' + (rec.nextEdgeId++),
          n1: na,
          n2: nb,
          path: mergedPath,
          length: pathLength(mergedPath),
          straight,
          manual: false,
          incomplete: false,
          includeInStats: true
        };
        newEdge.ratio = straight > 0 ? newEdge.length / straight : NaN;

        rec.edges = rec.edges.filter(e => !connected.includes(e));
        rec.edges.push(newEdge);
        rec.nodes = rec.nodes.filter(n => n.id !== node.id);

        autoMerged2EdgeNodesCount++;
        hasMerged2EdgeNodes = true;
        break; // break the loop to re-evaluate with updated nodes/edges
      }
    }
  }

  rec.detected = true;
  log(getI18nStr('logDetected', {raw: rawCount, merged: mergedCount, nodes: rec.nodes.length, edges: rec.edges.length, dist: rec.mergeDist}));
}

function connectIncompleteEdges(rec, maxDist) {
  let connectedCount = 0;
  rec.edges.forEach(e => {
    if (!e.incomplete) return;
    const lastPt = e.path[e.path.length - 1];

    // Find closest node that is not the start node (e.n1)
    let closestNode = null;
    let closestDist = Infinity;

    rec.nodes.forEach(n => {
      if (n.id === e.n1) return;
      const d = Math.hypot(n.x - lastPt[0], n.y - lastPt[1]);
      if (d < closestDist) {
        closestDist = d;
        closestNode = n;
      }
    });

    if (closestNode && closestDist <= maxDist) {
      // Connect!
      e.n2 = closestNode.id;
      e.path.push([closestNode.x, closestNode.y]);
      e.length = pathLength(e.path);
      e.straight = Math.hypot(closestNode.x - rec.nodes.find(n=>n.id===e.n1).x, closestNode.y - rec.nodes.find(n=>n.id===e.n1).y);
      e.ratio = e.straight > 0 ? e.length / e.straight : NaN;
      e.incomplete = false;
      e.includeInStats = true;
      connectedCount++;
    }
  });
  return connectedCount;
}

function mergeCloseNodes(rec, minLen){
  // Purely topological merge: when two nodes are connected by a very short
  // traced edge (almost certainly the same real junction, split by local
  // staining texture), we relabel them as one logical node for bookkeeping.
  // Critically we NEVER rewrite an edge's path/length/straight here — each
  // edge keeps the exact coordinates it was actually traced to. Otherwise,
  // across many cascaded merges, repeatedly snapping far-away edge endpoints
  // onto a shifting "representative" node position compounds into long
  // straight jumps across the image (the bug seen in practice).
  let merges = 0, safety = 0;
  while(safety++ < 5000){
    let target = null;
    for(const e of rec.edges){
      if(!e.n1 || !e.n2 || e.n1===e.n2) continue;
      if(e.length < minLen){ if(!target || e.length < target.length) target = e; }
    }
    if(!target) break;
    merges++;
    const keep = rec.nodes.find(n=>n.id===target.n1);
    const drop = rec.nodes.find(n=>n.id===target.n2);
    rec.edges = rec.edges.filter(e=>e!==target);
    rec.edges.forEach(e=>{
      if(e.n1===drop.id) e.n1=keep.id;
      if(e.n2===drop.id) e.n2=keep.id;
    });
    // Move the visual node marker to the midpoint of the pair being merged
    // (cosmetic only - never used for length/ratio math).
    keep.x = (keep.x+drop.x)/2; keep.y = (keep.y+drop.y)/2;
    rec.nodes = rec.nodes.filter(n=>n.id!==drop.id);
    rec.edges = rec.edges.filter(e=>e.n1!==e.n2); // drop resulting self-loops (micro-loop noise)
  }
  return merges;
}

function clusterPoints(points, radius){
  const n = points.length;
  const parent = Array.from({length:n},(_,i)=>i);
  function find(a){ while(parent[a]!==a){parent[a]=parent[parent[a]]; a=parent[a];} return a; }
  function union(a,b){ const ra=find(a),rb=find(b); if(ra!==rb) parent[ra]=rb; }
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      const dx=points[i][0]-points[j][0], dy=points[i][1]-points[j][1];
      if(Math.abs(dx)<=radius && Math.abs(dy)<=radius) union(i,j);
    }
  }
  const groups = new Map();
  for(let i=0;i<n;i++){
    const r = find(i);
    if(!groups.has(r)) groups.set(r,[]);
    groups.get(r).push(points[i]);
  }
  return Array.from(groups.values());
}

function traceEdges(skel, w, h, deg, nodes, pixelClusterId){
  const nb = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const visited = new Uint8Array(w*h); // chain pixels consumed
  const nodeById = new Map(nodes.map(n=>[n.id,n]));
  const edges = [];
  let edgeCounter = 1;
  const visitedDirection = new Set(); // key: nodeId+'_'+x+'_'+y to avoid double trace

  function neighborsOf(x,y){
    const res=[];
    for(const [dx,dy] of nb){
      const nx=x+dx, ny=y+dy;
      if(nx>=0&&ny>=0&&nx<w&&ny<h&&skel[ny*w+nx]) res.push([nx,ny]);
    }
    return res;
  }

  for(const node of nodes){
    for(const [px,py] of node.pixels){
      const startNeighbors = neighborsOf(px,py);
      for(const [nx,ny] of startNeighbors){
        const key = node.id+'_'+nx+'_'+ny;
        if(pixelClusterId.has(ny*w+nx)) continue; // neighbor already belongs to a node cluster (adjacent nodes / self)
        if(visited[ny*w+nx]) continue;
        if(visitedDirection.has(key)) continue;
        // trace chain
        const path = [[px,py]];
        let prev = [px,py], cur = [nx,ny];
        let steps=0, arrivedNode=null, incomplete=false;
        while(true){
          steps++;
          if(steps>100000){ incomplete=true; break; }
          path.push(cur);
          visited[cur[1]*w+cur[0]]=1;
          const [cx,cy]=cur;
          const cid = pixelClusterId.get(cy*w+cx);
          if(cid){ arrivedNode = cid; break; }
          const neigh = neighborsOf(cx,cy).filter(p=> !(p[0]===prev[0]&&p[1]===prev[1]));
          // prefer neighbor that's a node pixel
          const nodeNeigh = neigh.find(p=> pixelClusterId.has(p[1]*w+p[0]));
          if(nodeNeigh){ prev=cur; cur=nodeNeigh; continue; }
          const unvisited = neigh.filter(p=> !visited[p[1]*w+p[0]]);
          if(unvisited.length===1){ prev=cur; cur=unvisited[0]; continue; }
          if(unvisited.length===0){ incomplete = true; break; }
          // Multiple candidates: this is a minor branch point that wasn't
          // pre-clustered into a node (common with the Gemini pathway, or
          // fine texture the classical clustering radius didn't catch).
          // Keep following the straightest (most collinear) continuation and
          // silently drop the side branch, rather than aborting the trace.
          {
            const dirx = cx-prev[0], diry = cy-prev[1];
            let best=null, bestScore=-Infinity;
            for(const cand of unvisited){
              const vx = cand[0]-cx, vy = cand[1]-cy;
              const mag = (Math.hypot(vx,vy)*Math.hypot(dirx,diry)) || 1;
              const score = (dirx*vx+diry*vy)/mag;
              if(score>bestScore){ bestScore=score; best=cand; }
            }
            prev=cur; cur=best; continue;
          }
        }
        if(arrivedNode && arrivedNode!==node.id){
          const n2 = nodeById.get(arrivedNode);
          path.push([n2.x,n2.y]);
          const fullPath = [[node.x,node.y], ...path.slice(1)];
          registerEdge(node, n2, fullPath);
        } else if(arrivedNode===node.id){
          // self loop, skip (rare artifact)
        } else if(incomplete && path.length>3){
          // dangling spur - record as incomplete edge (dead end), user can delete or extend
          registerEdge(node, null, [[node.x,node.y], ...path.slice(1)], true);
        }
        visitedDirection.add(key);
      }
    }
  }

  function registerEdge(n1, n2, path, incomplete){
    const straight = n2 ? dist(n1.x,n1.y,n2.x,n2.y) : dist(n1.x,n1.y, path[path.length-1][0], path[path.length-1][1]);
    const actual = pathLength(path);
    edges.push({
      id: 'e'+(edgeCounter++),
      n1: n1.id, n2: n2? n2.id : null,
      path, length: actual, straight, ratio: straight>0? actual/straight : NaN,
      manual:false, incomplete: !!incomplete,
      includeInStats: !incomplete,
    });
  }

  return edges;
}

function dist(x1,y1,x2,y2){ return Math.hypot(x2-x1,y2-y1); }
function pathLength(path){
  let L=0;
  for(let i=1;i<path.length;i++) L += dist(path[i-1][0],path[i-1][1],path[i][0],path[i][1]);
  return L;
}

els.btnDetect.addEventListener('click', ()=>{
  const rec = activeImg(); if(!rec) return;
  els.btnDetect.disabled = true;
  log(getI18nStr('logDetecting'));
  setTimeout(async ()=>{ // let UI update before heavy compute
    try{
      await detectGraph(rec);
    } catch(err){
      log(`<span style="color:#ff6b6b">${getI18nStr('errDetect', {err: err.message})}</span>`);
      console.error(err);
    }
    els.btnDetect.disabled = false;
    drawOverlay();
    updateStatsPanel();
    renderEdgeTable();
    refreshImgList();
  }, 30);
});

/* ===================== Gemini node detection ===================== */
els.btnLoadModels.addEventListener('click', async ()=>{
  const key = els.geminiKey.value.trim();
  if(!key){ log(`<span style="color:#ff6b6b">${getI18nStr('errGeminiKey')}</span>`); return; }
  localStorage.setItem('tjGeminiKey', key);
  els.btnLoadModels.disabled = true;
  log(getI18nStr('logLoadingModels'));
  try{
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = (data.models||[]).filter(m=> (m.supportedGenerationMethods||[]).includes('generateContent'));
    if(!models.length) throw new Error('No compatible generateContent models found');
    els.geminiModel.innerHTML = '';
    models.forEach(m=>{
      const opt = document.createElement('option');
      opt.value = m.name; // e.g. "models/gemini-2.5-flash"
      opt.textContent = m.displayName || m.name;
      els.geminiModel.appendChild(opt);
    });
    // prefer a fast/flash model as default if present
    const flashIdx = models.findIndex(m=> /flash/i.test(m.name));
    if(flashIdx>=0) els.geminiModel.selectedIndex = flashIdx;
    els.geminiModel.disabled = false;
    log(getI18nStr('logModelsLoaded', {count: models.length}));
    els.btnDetectGemini.disabled = !(activeImg());
  } catch(err){
    log(`<span style="color:#ff6b6b">${getI18nStr('errGeminiLoadModel', {err: err.message})}</span>`);
  }
  els.btnLoadModels.disabled = false;
});

async function callGeminiForNodes(rec, apiKey, modelName){
  const canvas = document.createElement('canvas');
  canvas.width = rec.width; canvas.height = rec.height;
  const cctx = canvas.getContext('2d');
  cctx.putImageData(rec.imgData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];

  const prompt = `You are analyzing a high-resolution fluorescence microscopy image of cell boundaries / tight junctions (staining such as ZO-1, Occludin, Phalloidin, etc.). The bright lines depict cell-cell borders, which form a polygon-like mesh representing cell boundaries.

Your task is to identify every single TRI-CELLULAR JUNCTION (TJ) in the image with maximum recall and precision.
A tri-cellular junction is a point where three or more cells meet. Visually, this is an intersection where three or more green lines (borders) converge (typically shaped like a Y, T, or asterisk *).

Guidelines:
1. Identify all genuine junctions where three or more cell boundaries intersect.
2. Search carefully for blurry, faint, or dim junctions. If you see converging borders that fade near their intersection, trace their directions to locate the exact meeting point.
3. Do NOT identify false junctions:
   - Do NOT place a junction in the middle of a continuous, curving cell border where only two cells meet.
   - Do NOT place a junction at dangling or free endpoints of an incomplete border.
   - Do NOT mark fluorescent noise specks or isolated bright dots as junctions.
4. If two junctions are extremely close to each other, output both with their distinct coordinates.

The image has a working resolution of exactly ${rec.width}x${rec.height} pixels. The coordinate system origin (0,0) is at the top-left corner. x increases to the right, and y increases downward.
Provide the identified junctions as a highly accurate list of pixel coordinates.

Return ONLY a strict JSON array (without any markdown code block formatting, markdown backticks, or any conversational text) of objects in this exact schema:
[{"x": <integer 0-${rec.width}>, "y": <integer 0-${rec.height}>}, ...]`;

  const body = {
    contents: [{ parts: [ {text: prompt}, {inlineData:{mimeType:'image/png', data: base64}} ] }],
    generationConfig: { temperature: 0 }
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if(!res.ok){
    const t = await res.text().catch(()=> '');
    throw new Error(`HTTP ${res.status} ${t.slice(0,200)}`);
  }
  const data = await res.json();
  const text = (data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts.map(p=>p.text||'').join('')) || '';
  const s = text.indexOf('['), e = text.lastIndexOf(']');
  if(s===-1 || e===-1 || e<s) throw new Error('No valid JSON returned from Gemini: '+text.slice(0,200));
  let points;
  try{ points = JSON.parse(text.slice(s, e+1)); }
  catch(err){ throw new Error('JSON parse error: '+err.message); }
  return points.filter(p=> typeof p.x==='number' && typeof p.y==='number');
}

function snapPointToSkeleton(skel, w, h, gx, gy, maxRadius, degMap){
  gx = Math.round(gx); gy = Math.round(gy);

  // 1. Try to find the closest junction/branch point pixel (degree >= 3) first.
  // This guarantees that if Gemini points to a junction, we snap to its actual physical intersection.
  let bestBranch = null, bestBranchDist = Infinity;
  for (let dy = -maxRadius; dy <= maxRadius; dy++) {
    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      const nx = gx + dx, ny = gy + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && skel[ny * w + nx]) {
        if (degMap[ny * w + nx] >= 3) {
          const d = Math.hypot(dx, dy);
          if (d < bestBranchDist) {
            bestBranchDist = d;
            bestBranch = [nx, ny];
          }
        }
      }
    }
  }
  if (bestBranch) return bestBranch;

  // 2. Fall back to finding the closest skeleton pixel.
  let bestSkel = null, bestSkelDist = Infinity;
  for (let dy = -maxRadius; dy <= maxRadius; dy++) {
    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      const nx = gx + dx, ny = gy + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && skel[ny * w + nx]) {
        const d = Math.hypot(dx, dy);
        if (d < bestSkelDist) {
          bestSkelDist = d;
          bestSkel = [nx, ny];
        }
      }
    }
  }
  return bestSkel;
}

function localBlobAround(skel, w, h, sx, sy, radius){
  const nb=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const visited = new Set(); const stack=[[sx,sy]]; const pixels=[];
  visited.add(sy*w+sx);
  while(stack.length){
    const [x,y] = stack.pop();
    pixels.push([x,y]);
    for(const [dx,dy] of nb){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h) continue;
      if(Math.abs(nx-sx)>radius || Math.abs(ny-sy)>radius) continue;
      const key = ny*w+nx;
      if(visited.has(key)) continue;
      if(!skel[ny*w+nx]) continue;
      visited.add(key); stack.push([nx,ny]);
    }
  }
  return pixels;
}

async function detectGraphWithGemini(rec, apiKey, modelName){
  const modeStr = rec.binMethod === 'adaptive' ? getI18nStr('optAdaptive') : (rec.binMethod === 'global' ? `${getI18nStr('optGlobal')} (th=${rec.threshold})` : 'MicroSAM');
  log(rec.binMethod === 'adaptive' ? getI18nStr('logBinAdaptive') : (rec.binMethod === 'global' ? getI18nStr('logBinGlobal', {th: rec.threshold}) : 'Binarizing (MicroSAM)...'));
  const bin = await binarize(rec);
  const skel = thin(bin, rec.width, rec.height);
  const spurLen = rec.spurLen;
  pruneSpurs(skel, rec.width, rec.height, spurLen);
  rec.binary = bin; rec.skeleton = skel;

  log(getI18nStr('logGeminiSending'));
  let points = await callGeminiForNodes(rec, apiKey, modelName);
  log(getI18nStr('logGeminiReceived', {count: points.length}));

  // Deduplicate points returned by Gemini that are very close to each other (e.g., within 15px)
  const deduped = [];
  points.forEach(p => {
    const isClose = deduped.some(dp => Math.hypot(dp.x - p.x, dp.y - p.y) < 15);
    if (!isClose) deduped.push(p);
  });
  if (points.length !== deduped.length) {
    log(getI18nStr('logGeminiDedup', {before: points.length, after: deduped.length}));
    points = deduped;
  }

  const w=rec.width, h=rec.height;
  const deg = degreeMap(skel, w, h);
  let nodes = [];
  let skipped = 0;

  points.forEach((p,i)=>{
    const snapped = snapPointToSkeleton(skel, w, h, p.x, p.y, 25, deg);
    if(!snapped){ skipped++; return; }
    const blob = localBlobAround(skel, w, h, snapped[0], snapped[1], 10);
    const cx = blob.reduce((s,q)=>s+q[0],0)/blob.length;
    const cy = blob.reduce((s,q)=>s+q[1],0)/blob.length;
    nodes.push({ id:'tmp'+i, x:cx, y:cy, pixels:blob });
  });
  if(skipped) log(`<span style="color:#ff6b6b">${getI18nStr('logGeminiSkipped', {count: skipped})}</span>`);

  // Same non-transitive geometric merge used in the classical path, in case
  // Gemini (or the dedup step above) still left two candidate points close
  // enough to be the same physical junction.
  nodes = geometricMergeNodes(nodes, rec.mergeDist);
  nodes.forEach((n,i)=> n.id = 'n'+(i+1));
  rec.nextNodeId = nodes.length+1;

  const pixelClusterId = new Map();
  nodes.forEach(n=> n.pixels.forEach(([x,y])=> pixelClusterId.set(y*w+x, n.id)));

  const edges = traceEdges(skel, w, h, deg, nodes, pixelClusterId);
  rec.nodes = nodes;
  rec.edges = edges;
  rec.nextEdgeId = edges.length+1;

  // Connect incomplete edges that end close to any existing node
  const rVal = parseInt(els.openEdgeRadius.value, 10);
  const connectedCount = connectIncompleteEdges(rec, rVal);
  if (connectedCount > 0) {
    log(getI18nStr('logAutoConnectGemini', {count: connectedCount}));
  }

  // Post-detection/post-pruning cleanup for Gemini pipeline as well: automatically merge nodes with exactly 2 connected edges
  let autoMergedGemini2EdgeNodesCount = 0;
  let hasMergedGemini2EdgeNodes = true;
  let safetyLoopGemini = 0;
  while(hasMergedGemini2EdgeNodes && safetyLoopGemini++ < 1000) {
    hasMergedGemini2EdgeNodes = false;
    for (const node of rec.nodes) {
      const connected = rec.edges.filter(e => e.n1 === node.id || e.n2 === node.id);
      if (connected.length === 2 && connected.every(e => e.n1 && e.n2)) {
        const [e1, e2] = connected;
        const otherOf = (e) => e.n1 === node.id ? e.n2 : e.n1;
        const na = otherOf(e1), nb = otherOf(e2);

        let p1 = e1.path.slice();
        if (e1.n2 === node.id) {
          // ends at node
        } else {
          p1 = p1.reverse();
        }
        let p2 = e2.path.slice();
        if (e2.n1 === node.id) {
          // starts at node
        } else {
          p2 = p2.reverse();
        }
        const mergedPath = p1.concat(p2.slice(1));
        const n1 = rec.nodes.find(n => n.id === na);
        const n2 = rec.nodes.find(n => n.id === nb);
        const straight = (n1 && n2) ? Math.hypot(n1.x - n2.x, n1.y - n2.y) : Math.max(e1.straight, e2.straight);

        const newEdge = {
          id: 'e' + (rec.nextEdgeId++),
          n1: na,
          n2: nb,
          path: mergedPath,
          length: pathLength(mergedPath),
          straight,
          manual: false,
          incomplete: false,
          includeInStats: true
        };
        newEdge.ratio = straight > 0 ? newEdge.length / straight : NaN;

        rec.edges = rec.edges.filter(e => !connected.includes(e));
        rec.edges.push(newEdge);
        rec.nodes = rec.nodes.filter(n => n.id !== node.id);

        autoMergedGemini2EdgeNodesCount++;
        hasMergedGemini2EdgeNodes = true;
        break;
      }
    }
  }

  rec.detected = true;
  log(getI18nStr('logGeminiSuccess', {nodes: nodes.length, edges: edges.length}));
}

els.btnDetectGemini.addEventListener('click', async ()=>{
  const rec = activeImg(); if(!rec) return;
  const key = els.geminiKey.value.trim();
  const modelName = els.geminiModel.value;
  if(!key || !modelName){ log(`<span style="color:#ff6b6b">${getI18nStr('errGeminiKey')}</span>`); return; }
  els.btnDetectGemini.disabled = true;
  try{
    await detectGraphWithGemini(rec, key, modelName);
  } catch(err){
    log(`<span style="color:#ff6b6b">${getI18nStr('errGeminiDetect', {err: err.message})}</span>`);
    console.error(err);
  }
  els.btnDetectGemini.disabled = false;
  drawOverlay();
  updateStatsPanel();
  renderEdgeTable();
  refreshImgList();
});

/* ===================== Drawing overlay ===================== */
function ratioColor(ratio){
  if(!isFinite(ratio)) return '#888';
  const t = Math.max(0, Math.min(1, (ratio-1)/0.5)); // 1.0 -> 1.5+
  // stops: cyan -> green -> yellow -> red
  const stops = [
    [0.00,[58,209,255]],
    [0.33,[57,255,158]],
    [0.66,[255,225,74]],
    [1.00,[255,107,107]],
  ];
  for(let i=0;i<stops.length-1;i++){
    const [t0,c0]=stops[i], [t1,c1]=stops[i+1];
    if(t>=t0 && t<=t1){
      const f=(t-t0)/(t1-t0);
      const c = c0.map((v,k)=> Math.round(v+(c1[k]-v)*f));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return '#ff6b6b';
}

function drawOverlay(){
  const rec = activeImg();
  ovCtx.clearRect(0,0,els.overlay.width, els.overlay.height);
  if(!rec) return;

  if (state.hideAllMarks) {
    return;
  }

  // If binary display toggle is on, draw binary overlay as a semi-transparent, subtle mask first
  if (state.showBinary) {
    const bin = binarizeSync(rec);
    const img = ovCtx.createImageData(rec.width, rec.height);
    for(let i=0;i<bin.length;i++){
      if(bin[i]){
        // light-green translucent mask for binarized boundaries
        img.data[i*4] = 57;
        img.data[i*4+1] = 255;
        img.data[i*4+2] = 158;
        img.data[i*4+3] = 100; // opacity ~39%
      } else {
        img.data[i*4] = 0;
        img.data[i*4+1] = 0;
        img.data[i*4+2] = 0;
        img.data[i*4+3] = 0; // transparent
      }
    }
    ovCtx.putImageData(img,0,0);
  }

  let selectedEdgeObj = null;

  // draw non-selected edges first
  rec.edges.forEach(edge=>{
    if(edge.id === state.selectedEdge) {
      selectedEdgeObj = edge;
      return;
    }
    ovCtx.beginPath();
    edge.path.forEach((p,i)=> i===0? ovCtx.moveTo(p[0],p[1]) : ovCtx.lineTo(p[0],p[1]));
    ovCtx.strokeStyle = edge.incomplete ? ratioColor(edge.ratio) : ratioColor(edge.ratio);
    ovCtx.lineWidth = 2;
    ovCtx.setLineDash(edge.incomplete? [4,3] : []);
    ovCtx.stroke();
    ovCtx.setLineDash([]);
  });

  // draw selected edge on top with extreme highlight
  if(selectedEdgeObj) {
    // 1. Draw an outer pink dashed highlight halo offset by about 5px
    ovCtx.beginPath();
    selectedEdgeObj.path.forEach((p,i)=> i===0? ovCtx.moveTo(p[0],p[1]) : ovCtx.lineTo(p[0],p[1]));
    ovCtx.strokeStyle = '#ff4dd8'; // Vivid Pink/Magenta
    ovCtx.lineWidth = 10;
    ovCtx.setLineDash([6, 4]);
    ovCtx.stroke();
    ovCtx.setLineDash([]);

    // 2. Draw a black masking separator line to leave space between the pink halo and the center color
    ovCtx.beginPath();
    selectedEdgeObj.path.forEach((p,i)=> i===0? ovCtx.moveTo(p[0],p[1]) : ovCtx.lineTo(p[0],p[1]));
    ovCtx.strokeStyle = '#000000';
    ovCtx.lineWidth = 4;
    ovCtx.stroke();

    // 3. Draw the original undulation heatmap color at the very center to keep its measurement visible
    ovCtx.beginPath();
    selectedEdgeObj.path.forEach((p,i)=> i===0? ovCtx.moveTo(p[0],p[1]) : ovCtx.lineTo(p[0],p[1]));
    ovCtx.strokeStyle = ratioColor(selectedEdgeObj.ratio);
    ovCtx.lineWidth = 2;
    ovCtx.stroke();
  }

  // nodes
  rec.nodes.forEach(n=>{
    ovCtx.beginPath();
    ovCtx.arc(n.x, n.y, 4.5, 0, Math.PI*2);
    ovCtx.fillStyle = '#ffd54a';
    ovCtx.fill();
    ovCtx.strokeStyle = '#3a2c00'; ovCtx.lineWidth=1; ovCtx.stroke();
  });
  // redraw preview
  if(state.redraw.active && state.redraw.points.length){
    ovCtx.beginPath();
    state.redraw.points.forEach((p,i)=> i===0? ovCtx.moveTo(p[0],p[1]) : ovCtx.lineTo(p[0],p[1]));
    ovCtx.strokeStyle = '#ff4dd8'; ovCtx.lineWidth=2; ovCtx.setLineDash([2,2]);
    ovCtx.stroke(); ovCtx.setLineDash([]);
    state.redraw.points.forEach(p=>{
      ovCtx.beginPath(); ovCtx.arc(p[0],p[1],2.5,0,Math.PI*2);
      ovCtx.fillStyle='#ff4dd8'; ovCtx.fill();
    });
  }

  if (state.samProcessing) {
    ovCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ovCtx.fillRect(0, 0, rec.width, rec.height);
    ovCtx.fillStyle = "#39ff9e";
    ovCtx.font = "bold 16px sans-serif";
    ovCtx.textAlign = "center";
    ovCtx.fillText(getI18nStr('logSamProcessing') || "Processing MicroSAM Cell Segmentation...", rec.width / 2, rec.height / 2);
  }
}

/* ===================== Stats panel & table ===================== */
function updateStatsPanel(){
  const rec = activeImg();
  if(!rec){ els.statNodes.textContent='0'; els.statEdges.textContent='0';
    els.statAvg.textContent='—'; els.statStd.textContent='—'; return; }

  const valid = rec.edges.filter(e => {
    if (e.includeInStats === undefined) {
      e.includeInStats = !e.incomplete;
    }
    return e.includeInStats && isFinite(e.ratio);
  });

  els.statNodes.textContent = rec.nodes.length;
  els.statEdges.textContent = rec.edges.length;
  if(valid.length){
    const avg = valid.reduce((s,e)=>s+e.ratio,0)/valid.length;
    const variance = valid.reduce((s,e)=>s+(e.ratio-avg)**2,0)/valid.length;
    els.statAvg.textContent = avg.toFixed(3);
    els.statStd.textContent = Math.sqrt(variance).toFixed(3);
  } else {
    els.statAvg.textContent='—'; els.statStd.textContent='—';
  }
}

function renderEdgeTable(){
  const rec = activeImg();
  els.edgeTableBody.innerHTML='';
  if(!rec) return;
  rec.edges.forEach((e,i)=>{
    if (e.includeInStats === undefined) {
      e.includeInStats = !e.incomplete;
    }
    const tr = document.createElement('tr');
    if(e.id===state.selectedEdge) {
      tr.className='sel';
      setTimeout(() => {
        tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }

    const displayStraight = e.n2 ? e.straight.toFixed(1) : e.straight.toFixed(1);
    const displayRatio = isFinite(e.ratio) ? e.ratio.toFixed(3) : '—';
    const deleteText = currentLang === 'en' ? 'Delete' : (currentLang === 'ar' ? 'حذف' : 'מחק');
    const isChecked = e.includeInStats ? 'checked' : '';

    tr.innerHTML = `<td>${i+1}${e.incomplete?' ⚠':''}${e.manual?' ✎':''}</td>
      <td>${e.length.toFixed(1)}</td>
      <td>${displayStraight}</td>
      <td>${displayRatio}</td>
      <td style="text-align:center;"><input type="checkbox" class="include-chk" ${isChecked}></td>
      <td><a class="linklike" data-del="${e.id}">${deleteText}</a></td>`;
    tr.querySelector('td').onclick = ()=> selectEdge(e.id);
    tr.querySelectorAll('td')[1].onclick = ()=> selectEdge(e.id);
    tr.querySelectorAll('td')[2].onclick = ()=> selectEdge(e.id);
    tr.querySelectorAll('td')[3].onclick = ()=> selectEdge(e.id);
    const chk = tr.querySelector('.include-chk');
    chk.onclick = (ev)=> ev.stopPropagation();
    chk.onchange = ()=>{
      e.includeInStats = chk.checked;
      updateStatsPanel();
      refreshImgList();
      drawOverlay();
    };
    tr.querySelector('[data-del]').onclick = (ev)=>{ ev.stopPropagation(); deleteEdge(e.id); };
    els.edgeTableBody.appendChild(tr);
  });
}

function selectEdge(id){
  state.selectedEdge = (state.selectedEdge===id) ? null : id;
  drawOverlay();
  renderEdgeTable();
}

function deleteEdge(id){
  const rec = activeImg(); if(!rec) return;
  rec.edges = rec.edges.filter(e=>e.id!==id);
  log(getI18nStr('logManualEdgeDelete', {id}));
  if(state.selectedEdge===id) state.selectedEdge=null;
  drawOverlay(); updateStatsPanel(); renderEdgeTable(); refreshImgList();
}

/* ===================== Modes & manual editing ===================== */
function setMode(mode){
  state.mode = mode;
  [els.modeSelect,els.modeAddNode,els.modeRemoveNode,els.modeRedraw].forEach(b=>b.classList.remove('active-mode'));
  ({select:els.modeSelect, addnode:els.modeAddNode, removenode:els.modeRemoveNode, redraw:els.modeRedraw})[mode].classList.add('active-mode');

  const modeKeyMap = {
    select: 'hintSelect',
    addnode: 'hintAddNode',
    removenode: 'hintRemoveNode',
    redraw: 'hintRedraw'
  };
  els.modeHint.innerHTML = getI18nStr(modeKeyMap[mode]);
  els.redrawControls.style.display = 'none';
  cancelRedrawMode(true);
}
els.modeSelect.onclick = ()=> setMode('select');
els.modeAddNode.onclick = ()=> setMode('addnode');
els.modeRemoveNode.onclick = ()=> setMode('removenode');
els.modeRedraw.onclick = ()=>{
  if(!state.selectedEdge){ log(`<span style="color:#ff6b6b">${getI18nStr('errSelectEdgeFirst')}</span>`); setMode('select'); return; }
  setMode('redraw');
  state.redraw.active = true; state.redraw.points = [];
  els.redrawControls.style.display='flex';
};

function cancelRedrawMode(silent){
  state.redraw.active=false; state.redraw.points=[];
  if(!silent) drawOverlay();
}
els.cancelRedraw.onclick = ()=>{ cancelRedrawMode(); drawOverlay(); setMode('select'); log(getI18nStr('logManualRedrawCancel')); };
els.finishRedraw.onclick = ()=>{
  const rec = activeImg(); if(!rec) return;
  const edge = rec.edges.find(e=>e.id===state.selectedEdge);
  if(!edge || state.redraw.points.length<2){ log(`<span style="color:#ff6b6b">${getI18nStr('errDrawMinPoints')}</span>`); return; }
  const n1 = rec.nodes.find(n=>n.id===edge.n1);
  const n2 = edge.n2 ? rec.nodes.find(n=>n.id===edge.n2) : null;
  const newPath = [[n1.x,n1.y], ...state.redraw.points, n2? [n2.x,n2.y] : state.redraw.points[state.redraw.points.length-1]];
  edge.path = newPath;
  edge.length = pathLength(newPath);
  edge.manual = true;
  edge.straight = n2 ? dist(n1.x,n1.y,n2.x,n2.y) : dist(n1.x,n1.y, newPath[newPath.length-1][0], newPath[newPath.length-1][1]);
  edge.ratio = edge.straight > 0 ? edge.length / edge.straight : NaN;
  log(getI18nStr('logManualRedrawSuccess', {id: edge.id, len: edge.length.toFixed(1), ratio: edge.ratio.toFixed(3)}));
  cancelRedrawMode(); setMode('select');
  drawOverlay(); updateStatsPanel(); renderEdgeTable(); refreshImgList();
};

// Click / touch coordinate conversion considering zoomState transform
function getCanvasCoords(clientX, clientY) {
  const wrap = document.getElementById('canvasWrap');
  if (!wrap) return { x: 0, y: 0 };
  const rect = wrap.getBoundingClientRect();
  const x = (clientX - rect.left) * (els.overlay.width / rect.width);
  const y = (clientY - rect.top) * (els.overlay.height / rect.height);
  return { x, y };
}

els.overlay.addEventListener('click', (e)=>{
  // Ignore clicks if we are panning or if a drag gesture just finished
  if (zoomState.didDrag) {
    zoomState.didDrag = false;
    return;
  }
  if (zoomState.spacePressed || zoomState.panModeActive) {
    return;
  }

  const rec = activeImg(); if(!rec) return;
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);

  if(state.mode==='select'){
    const hit = findNearestEdge(rec, x, y, 8);
    if(hit) selectEdge(hit.id);
    return;
  }
  if(state.mode==='addnode'){
    addNodeOnEdge(rec, x, y);
    return;
  }
  if(state.mode==='removenode'){
    const hit = findNearestNode(rec, x, y, 10);
    if(hit) removeNode(rec, hit.id);
    return;
  }
  if(state.mode==='redraw'){
    state.redraw.points.push([x,y]);
    drawOverlay();
    return;
  }
});

function findNearestEdge(rec, x, y, maxDist){
  let best=null, bestD=maxDist;
  rec.edges.forEach(edge=>{
    for(let i=1;i<edge.path.length;i++){
      const d = pointToSegDist(x,y, edge.path[i-1], edge.path[i]);
      if(d<bestD){ bestD=d; best=edge; }
    }
  });
  return best;
}
function findAbsoluteNearestEdge(rec, x, y){
  let best=null, bestD=Infinity;
  rec.edges.forEach(edge=>{
    for(let i=1;i<edge.path.length;i++){
      const d = pointToSegDist(x,y, edge.path[i-1], edge.path[i]);
      if(d<bestD){ bestD=d; best=edge; }
    }
  });
  return best;
}
function pointToSegDist(px,py,a,b){
  const [ax,ay]=a,[bx,by]=b;
  const dx=bx-ax, dy=by-ay;
  const len2 = dx*dx+dy*dy;
  let t = len2? ((px-ax)*dx+(py-ay)*dy)/len2 : 0;
  t = Math.max(0,Math.min(1,t));
  const cx=ax+t*dx, cy=ay+t*dy;
  return Math.hypot(px-cx, py-cy);
}
function pointToSegProj(px,py,a,b){
  const [ax,ay]=a,[bx,by]=b;
  const dx=bx-ax, dy=by-ay;
  const len2 = dx*dx+dy*dy;
  let t = len2? ((px-ax)*dx+(py-ay)*dy)/len2 : 0;
  t = Math.max(0,Math.min(1,t));
  const cx=ax+t*dx, cy=ay+t*dy;
  return [cx, cy, t];
}
function findNearestNode(rec, x, y, maxDist){
  let best=null, bestD=maxDist;
  rec.nodes.forEach(n=>{
    const d = Math.hypot(n.x-x, n.y-y);
    if(d<bestD){ bestD=d; best=n; }
  });
  return best;
}

function addNodeOnEdge(rec, x, y){
  const edge = findAbsoluteNearestEdge(rec, x, y);
  if(!edge){ log(`<span style="color:#ff6b6b">${getI18nStr('errAddNodeNoEdge')}</span>`); return; }

  // find nearest segment on the edge path
  let bestSegIdx = -1;
  let bestDist = Infinity;
  for (let i = 1; i < edge.path.length; i++) {
    const d = pointToSegDist(x, y, edge.path[i - 1], edge.path[i]);
    if (d < bestDist) {
      bestDist = d;
      bestSegIdx = i;
    }
  }
  if (bestSegIdx === -1) return;

  const [projX, projY] = pointToSegProj(x, y, edge.path[bestSegIdx - 1], edge.path[bestSegIdx]);

  // check distance to endpoints
  const distToStart = Math.hypot(edge.path[0][0] - projX, edge.path[0][1] - projY);
  const distToEnd = Math.hypot(edge.path[edge.path.length - 1][0] - projX, edge.path[edge.path.length - 1][1] - projY);
  if (distToStart < 5 || distToEnd < 5) {
    log(`<span style="color:#ff6b6b">${getI18nStr('errAddNodeTooClose')}</span>`);
    return;
  }

  const newNode = { id:'n'+(rec.nextNodeId++), x:projX, y:projY, pixels:[] };
  rec.nodes.push(newNode);

  const path1 = edge.path.slice(0, bestSegIdx);
  path1.push([projX, projY]);

  const path2 = [[projX, projY]].concat(edge.path.slice(bestSegIdx));

  const n1 = rec.nodes.find(n=>n.id===edge.n1);
  const n2 = edge.n2 ? rec.nodes.find(n=>n.id===edge.n2) : null;
  const e1 = { id:'e'+(rec.nextEdgeId++), n1:edge.n1, n2:newNode.id, path:path1,
    length:pathLength(path1), straight: n1? Math.hypot(n1.x-newNode.x,n1.y-newNode.y):0, manual:true, incomplete:false, includeInStats:true };
  e1.ratio = e1.straight>0? e1.length/e1.straight : NaN;
  const e2 = { id:'e'+(rec.nextEdgeId++), n1:newNode.id, n2:edge.n2, path:path2,
    length:pathLength(path2), straight: n2? Math.hypot(n2.x-newNode.x,n2.y-newNode.y): (edge.incomplete? edge.straight-e1.straight:0),
    manual:true, incomplete: edge.incomplete, includeInStats: edge.includeInStats !== undefined ? edge.includeInStats : !edge.incomplete };
  e2.ratio = e2.straight>0? e2.length/e2.straight : NaN;
  rec.edges = rec.edges.filter(e=>e.id!==edge.id);
  rec.edges.push(e1,e2);
  log(getI18nStr('logManualNodeAdd', {nodeId: newNode.id, edgeId: edge.id, e1: e1.id, e2: e2.id}));
  drawOverlay(); updateStatsPanel(); renderEdgeTable(); refreshImgList();
}

function removeNode(rec, nodeId){
  const connected = rec.edges.filter(e=> e.n1===nodeId || e.n2===nodeId);
  if(connected.length===2 && connected.every(e=>e.n1 && e.n2)){
    const [e1,e2] = connected;
    const otherOf = (e)=> e.n1===nodeId? e.n2 : e.n1;
    const na = otherOf(e1), nb = otherOf(e2);
    // build merged path: order path1 so it ends at the shared node, path2 starts at shared node
    let p1 = e1.path.slice(); if(e1.n2===nodeId){/* already ends at node*/} else { p1 = p1.slice().reverse(); }
    let p2 = e2.path.slice(); if(e2.n1===nodeId){ /* already starts at node */ } else { p2 = p2.slice().reverse(); }
    const merged = p1.concat(p2.slice(1));
    const n1 = rec.nodes.find(n=>n.id===na), n2 = rec.nodes.find(n=>n.id===nb);
    const straight = (n1&&n2)? Math.hypot(n1.x-n2.x,n1.y-n2.y) : Math.max(e1.straight,e2.straight);
    const newEdge = { id:'e'+(rec.nextEdgeId++), n1:na, n2:nb, path:merged,
      length:pathLength(merged), straight, manual:true, incomplete:false, includeInStats:true };
    newEdge.ratio = straight>0? newEdge.length/straight : NaN;
    rec.edges = rec.edges.filter(e=>!connected.includes(e));
    rec.edges.push(newEdge);
    rec.nodes = rec.nodes.filter(n=>n.id!==nodeId);
    log(getI18nStr('logManualNodeRemoveMerge', {nodeId, edgeId: newEdge.id}));
  } else {
    if(!confirm(getI18nStr('confirmRemoveNode', {count: connected.length}))) return;
    rec.edges = rec.edges.filter(e=> !connected.includes(e));
    rec.nodes = rec.nodes.filter(n=>n.id!==nodeId);
    log(getI18nStr('logManualNodeRemoveDelete', {nodeId, count: connected.length}));
  }
  state.selectedEdge=null;
  drawOverlay(); updateStatsPanel(); renderEdgeTable(); refreshImgList();
}

/* ===================== Export ===================== */
function csvEscape(v){ return `"${String(v).replace(/"/g,'""')}"`; }

function buildCSVRows(images){
  const rows = [['image','edge_id','node1','node2','path_length_px','straight_distance_px','ratio','manual_edit','incomplete','included_in_stats']];
  images.forEach(rec=>{
    rec.edges.forEach(e=>{
      if (e.includeInStats === undefined) {
        e.includeInStats = !e.incomplete;
      }
      rows.push([rec.name, e.id, e.n1, e.n2||'', e.length.toFixed(2), e.straight.toFixed(2),
        isFinite(e.ratio)? e.ratio.toFixed(4):'', e.manual?'yes':'no', e.incomplete?'yes':'no', e.includeInStats?'yes':'no']);
    });
  });
  rows.push([]);
  rows.push(['image','n_edges','mean_ratio_single_measurement','std_ratio']);
  images.forEach(rec=>{
    const valid = rec.edges.filter(e => {
      if (e.includeInStats === undefined) {
        e.includeInStats = !e.incomplete;
      }
      return e.includeInStats && isFinite(e.ratio);
    });

    if(valid.length){
      const avg = valid.reduce((s,e)=>s+e.ratio,0)/valid.length;
      const sd = Math.sqrt(valid.reduce((s,e)=>s+(e.ratio-avg)**2,0)/valid.length);
      rows.push([rec.name, valid.length, avg.toFixed(4), sd.toFixed(4)]);
    } else {
      rows.push([rec.name, 0, '', '']);
    }
  });
  return rows;
}

function downloadCSV(rows, filename){
  const csv = rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

els.exportCurrent.onclick = ()=>{
  const rec = activeImg(); if(!rec){ log(getI18nStr('logNoImage')); return; }
  downloadCSV(buildCSVRows([rec]), `tj_undulation_${rec.name.replace(/\.[^.]+$/,'')}.csv`);
  log(getI18nStr('logExportingCurrent', {name: rec.name}));
};
els.exportAll.onclick = ()=>{
  if(!state.images.length){ log(getI18nStr('logNoImagesLoaded')); return; }
  downloadCSV(buildCSVRows(state.images), `tj_undulation_all_images.csv`);
  log(getI18nStr('logExportingAll', {count: state.images.length}));
};

/* ===================== Open edge auto-connect ===================== */
els.openEdgeRadius.addEventListener('input', () => {
  els.openEdgeRadiusVal.textContent = els.openEdgeRadius.value;
});

els.btnConnectOpen.addEventListener('click', () => {
  const rec = activeImg(); if(!rec) return;
  const maxD = parseInt(els.openEdgeRadius.value, 10);
  const connectedCount = connectIncompleteEdges(rec, maxD);
  log(getI18nStr('logAutoConnect', {count: connectedCount}));
  if (connectedCount > 0) {
    drawOverlay();
    updateStatsPanel();
    renderEdgeTable();
    refreshImgList();
  }
});

/* ===================== Guided Tour System ===================== */
const tourState = {
  active: false,
  currentStep: 0,
  steps: [
    {
      elementId: 'btnLoadExample',
      titleKey: 'tourTitle1',
      descKey: 'tourDesc1',
      position: 'bottom-center' // Positions relative to the highlighted element
    },
    {
      elementId: 'binMethod',
      titleKey: 'tourTitle2',
      descKey: 'tourDesc2',
      position: 'bottom-center'
    },
    {
      elementId: 'btnDetect',
      titleKey: 'tourTitle3',
      descKey: 'tourDesc3',
      position: 'bottom-center'
    },
    {
      elementId: 'modeSelect',
      titleKey: 'tourTitle4',
      descKey: 'tourDesc4',
      position: 'bottom-center'
    },
    {
      elementId: 'right',
      titleKey: 'tourTitle5',
      descKey: 'tourDesc5',
      position: 'left-center'
    }
  ]
};

function startTour() {
  tourState.active = true;
  tourState.currentStep = 0;
  document.getElementById('tourHighlight').style.display = 'block';
  document.getElementById('tourTooltip').style.display = 'flex';

  // Load example image on start of the tour if there's no active image
  if (!activeImg()) {
    loadImageFromUrl('example/ctl+213_green.png', 'ctl+213_green.png');
  }

  showTourStep(0);
}

function endTour() {
  tourState.active = false;
  document.getElementById('tourHighlight').style.display = 'none';
  document.getElementById('tourTooltip').style.display = 'none';
  localStorage.setItem('tjTourCompleted', 'true');
}

function showTourStep(index) {
  if (index < 0 || index >= tourState.steps.length) {
    endTour();
    return;
  }
  tourState.currentStep = index;
  const step = tourState.steps[index];
  const target = document.getElementById(step.elementId);

  // Update text content and translations
  document.getElementById('tourTitle').innerHTML = getI18nStr(step.titleKey);
  document.getElementById('tourStepNum').textContent = `${index + 1}/${tourState.steps.length}`;
  document.getElementById('tourDesc').innerHTML = getI18nStr(step.descKey);

  // Buttons text & visibility
  const nextBtn = document.getElementById('tourNextBtn');
  const prevBtn = document.getElementById('tourPrevBtn');

  prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
  if (index === tourState.steps.length - 1) {
    nextBtn.textContent = getI18nStr('tourDone');
  } else {
    nextBtn.textContent = getI18nStr('tourNext');
  }

  if (target) {
    // Scroll element into view if needed
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // Position highlight and tooltip
    setTimeout(() => {
      positionTourElements(target, step.position);
    }, 150);
  }
}

function positionTourElements(target, placement) {
  const rect = target.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  const highlight = document.getElementById('tourHighlight');
  const tooltip = document.getElementById('tourTooltip');

  // Set highlight box coords with some padding
  const padding = 6;
  const top = rect.top + scrollY - padding;
  const left = rect.left + scrollX - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  highlight.style.top = `${top}px`;
  highlight.style.left = `${left}px`;
  highlight.style.width = `${width}px`;
  highlight.style.height = `${height}px`;

  // Position tooltip relative to highlight
  let tTop = 0;
  let tLeft = 0;
  const tRect = tooltip.getBoundingClientRect();
  const tWidth = 340; // Defined in CSS

  if (placement === 'bottom-center') {
    tTop = top + height + 10;
    tLeft = left + (width / 2) - (tWidth / 2);
  } else if (placement === 'left-center') {
    // Left of the element (for right sidebar)
    tTop = top + (height / 2) - (tRect.height / 2 || 120);
    // If layout is RTL, 'left' of target is actually towards the center. In LTR, left of target is outside.
    // Let's position it to left with offset to avoid overlap
    tLeft = left - tWidth - 15;
  }

  // Bound checks to ensure tooltip stays inside viewport
  if (tLeft < 10) tLeft = 10;
  if (tLeft + tWidth > window.innerWidth - 10) tLeft = window.innerWidth - tWidth - 10;
  if (tTop < 10) tTop = 10;

  tooltip.style.top = `${tTop}px`;
  tooltip.style.left = `${tLeft}px`;
}

// Bind tour UI controls
document.getElementById('btnStartTour').onclick = startTour;
document.getElementById('tourSkipBtn').onclick = endTour;
document.getElementById('tourPrevBtn').onclick = () => {
  if (tourState.currentStep > 0) {
    showTourStep(tourState.currentStep - 1);
  }
};
document.getElementById('tourNextBtn').onclick = () => {
  if (tourState.currentStep < tourState.steps.length - 1) {
    showTourStep(tourState.currentStep + 1);
  } else {
    endTour();
  }
};

// Handle window resizing
window.addEventListener('resize', () => {
  if (tourState.active) {
    const step = tourState.steps[tourState.currentStep];
    const target = document.getElementById(step.elementId);
    if (target) {
      positionTourElements(target, step.position);
    }
  }
});

/* ===================== Zoom and Pan Mouse/Touch Event Listeners ===================== */
function initZoomPanEvents() {
  const center = document.getElementById('center');
  const overlay = els.overlay;
  if (!center || !overlay) return;

  // Zoom In / Out click triggers
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    zoomAtCenter(1.2);
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    zoomAtCenter(1 / 1.2);
  });
  document.getElementById('btnZoomReset').addEventListener('click', () => {
    resetZoomPan();
  });

  const panBtn = document.getElementById('btnZoomPan');
  panBtn.addEventListener('click', () => {
    zoomState.panModeActive = !zoomState.panModeActive;
    if (zoomState.panModeActive) {
      panBtn.classList.add('active-panning');
    } else {
      panBtn.classList.remove('active-panning');
    }
    updateCursor();
  });

  // Mouse wheel zoom centered on cursor
  center.addEventListener('wheel', (e) => {
    const rec = activeImg();
    if (!rec) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAtPoint(e.clientX, e.clientY, zoomFactor);
  }, { passive: false });

  // Panning with mouse (when Spacebar or Pan Mode is active)
  overlay.addEventListener('mousedown', (e) => {
    const rec = activeImg();
    if (!rec) return;
    if (zoomState.spacePressed || zoomState.panModeActive || e.button === 1) {
      zoomState.isPanning = true;
      zoomState.startX = e.clientX - zoomState.x;
      zoomState.startY = e.clientY - zoomState.y;
      zoomState.didDrag = false;
      overlay.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (zoomState.isPanning) {
      const dx = e.clientX - zoomState.startX;
      const dy = e.clientY - zoomState.startY;
      if (Math.hypot(dx - zoomState.x, dy - zoomState.y) > 3) {
        zoomState.didDrag = true;
      }
      zoomState.x = dx;
      zoomState.y = dy;
      applyTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    if (zoomState.isPanning) {
      zoomState.isPanning = false;
      updateCursor();
    }
  });

  // Mobile pinch-to-zoom and multi-touch panning
  overlay.addEventListener('touchstart', (e) => {
    const rec = activeImg();
    if (!rec) return;
    zoomState.didDrag = false;
    if (e.touches.length === 1) {
      // Single finger panning (either Pan Mode or fallback)
      zoomState.isPanning = true;
      zoomState.startX = e.touches[0].clientX - zoomState.x;
      zoomState.startY = e.touches[0].clientY - zoomState.y;
      zoomState.lastTouchX = e.touches[0].clientX;
      zoomState.lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Two finger pinch to zoom + drag pan
      zoomState.isPanning = false;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      zoomState.lastTouchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      zoomState.lastTouchX = (touch1.clientX + touch2.clientX) / 2;
      zoomState.lastTouchY = (touch1.clientY + touch2.clientY) / 2;
    }
  }, { passive: true });

  overlay.addEventListener('touchmove', (e) => {
    const rec = activeImg();
    if (!rec) return;
    if (e.touches.length === 1 && zoomState.isPanning) {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const dx = touchX - zoomState.startX;
      const dy = touchY - zoomState.startY;
      if (Math.hypot(touchX - zoomState.lastTouchX, touchY - zoomState.lastTouchY) > 4) {
        zoomState.didDrag = true;
      }
      zoomState.x = dx;
      zoomState.y = dy;
      applyTransform();
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;

      zoomState.didDrag = true;

      // Pinch zoom calculation
      if (zoomState.lastTouchDistance > 0) {
        const factor = dist / zoomState.lastTouchDistance;
        zoomAtPoint(midX, midY, factor);
      }

      // Simultaneously pan with the center midpoint displacement
      const dx = midX - zoomState.lastTouchX;
      const dy = midY - zoomState.lastTouchY;
      zoomState.x += dx;
      zoomState.y += dy;
      applyTransform();

      zoomState.lastTouchDistance = dist;
      zoomState.lastTouchX = midX;
      zoomState.lastTouchY = midY;
    }
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      zoomState.isPanning = false;
      zoomState.lastTouchDistance = 0;
    } else if (e.touches.length === 1) {
      // Re-initialize panning with the remaining finger
      zoomState.isPanning = true;
      zoomState.startX = e.touches[0].clientX - zoomState.x;
      zoomState.startY = e.touches[0].clientY - zoomState.y;
      zoomState.lastTouchDistance = 0;
    }
  }, { passive: true });
}

function zoomAtCenter(factor) {
  const center = document.getElementById('center');
  if (!center) return;
  const rect = center.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  const midY = rect.top + rect.height / 2;
  zoomAtPoint(midX, midY, factor);
}

function zoomAtPoint(clientX, clientY, factor) {
  const rec = activeImg();
  if (!rec) return;
  const center = document.getElementById('center');
  if (!center) return;
  const centerRect = center.getBoundingClientRect();

  const wrap = document.getElementById('canvasWrap');
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();

  // Calculate coordinates relative to the #canvasWrap origin prior to scaling
  const mouseX = clientX - wrapRect.left;
  const mouseY = clientY - wrapRect.top;

  const oldScale = zoomState.scale;
  let newScale = oldScale * factor;
  newScale = Math.max(0.1, Math.min(20, newScale)); // set scale limit constraints

  const actualFactor = newScale / oldScale;

  // Reposition translation anchor to center zoom on pointer
  zoomState.scale = newScale;
  zoomState.x = clientX - centerRect.left - (clientX - wrapRect.left - zoomState.x) * actualFactor;
  zoomState.y = clientY - centerRect.top - (clientY - wrapRect.top - zoomState.y) * actualFactor;

  applyTransform();
}

/* ===================== init ===================== */
initZoomPanEvents();
applyTranslations(currentLang);
log(getI18nStr('logReady'));

// Auto launch on first visit
if (!localStorage.getItem('tjTourCompleted')) {
  setTimeout(() => {
    startTour();
  }, 600);
}
