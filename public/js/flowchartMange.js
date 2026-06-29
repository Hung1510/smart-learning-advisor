// ═══════════════════════════════════════════════════════════════════════
// MOBILE SIDEBAR TOGGLE
// ═══════════════════════════════════════════════════════════════════════
(function () {
  const btnSidebar = document.getElementById('btnSidebar');
  const sidebar    = document.getElementById('sidebar');
  const rpanel     = document.getElementById('rpanel');

  function isMobile() { return window.innerWidth <= 768; }

  btnSidebar.addEventListener('click', e => {
    e.stopPropagation();
    if (isMobile()) {
      sidebar.classList.toggle('open');
      document.body.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
    }
  });

  document.addEventListener('click', e => {
    if (!isMobile()) return;
    if (!sidebar.contains(e.target) && e.target !== btnSidebar) {
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }
    if (!rpanel.contains(e.target)) {
      rpanel.classList.remove('panel-open');
      document.body.classList.remove('panel-open');
    }
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open', 'panel-open');
    }
  });

  // Gọi hàm này mỗi khi chọn node/edge để mở panel trên mobile
  window.openMobilePanel = function () {
    if (!isMobile()) return;
    rpanel.classList.add('panel-open');
    document.body.classList.add('panel-open');
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
const X_START = 80;
const Y_START = 100;
const GAP_COL = 170;
const GAP_ROW = 130;
const W = 80;
const H = 40;

const NS = 'http://www.w3.org/2000/svg';

const GROUP_STYLE = {
  GENED:     {fill:'var(--gened-fill)',    stroke:'var(--gened-stroke)',    text:'var(--gened-text)'},
  SPEC:      {fill:'var(--spec-fill)',     stroke:'var(--spec-stroke)',     text:'var(--spec-text)'},
  SPEC_ELEC: {fill:'var(--spec-elec-fill)',stroke:'var(--spec-elec-stroke)',text:'var(--spec-elec-text)'},
  CAPSTONE:  {fill:'var(--cap-fill)',      stroke:'var(--cap-stroke)',      text:'var(--cap-text)'},
  ELEC:      {fill:'var(--elec-fill)',     stroke:'var(--elec-stroke)',     text:'var(--elec-text)'},
  '':        {fill:'var(--empty-fill)',    stroke:'var(--empty-stroke)',    text:'var(--empty-text)'},
};

const GROUP_COLOR = {
  GENED:     {fill:'#EEF6FF',    stroke:'#7BB3E8',  text:'#1A4F8A'},
  SPEC:      {fill:'#EDFAF2',    stroke:'#6DC98A',  text:'#1A6B3A'},
  SPEC_ELEC: {fill:'#FFF8EC',    stroke:'#E8B84B',  text:'#7A4E10'},
  CAPSTONE:  {fill:'#F3F0FF',    stroke:'#9E87E8',  text:'#3D2A8A'},
  ELEC:      {fill:'#FFF0F0',    stroke:'#E88080',  text:'#8A1F1F'},
  '':        {fill:'#F4F3EF',    stroke:'#CCCAB8',  text:'#888675'},
};

const GRP_KEYS  = ['GENED','SPEC','SPEC_ELEC','CAPSTONE','ELEC',''];
const GRP_LABEL = {GENED:'GENED',SPEC:'SPEC',SPEC_ELEC:'SPEC_ELEC',CAPSTONE:'CAPSTONE',ELEC:'ELEC','':"(empty)"};

// ═══════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════
let DATA     = {};
let ACTIVE   = null;
let SEL      = null;
let CONN     = false;
let CONN_SRC = null;
let PAN      = {x:0,y:0};
let PANNING  = false, PAN_START = null;
let DRAG_IDX = null, DRAG_OFF = {x:0,y:0};

// ═══════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════
function seedData() {
  const container = document.getElementById('flowchart-container');
  DATA = JSON.parse(container.getAttribute('data-drawdata'));
}

// ═══════════════════════════════════════════════════════════════════════
// GRID POSITION ENGINE
// ═══════════════════════════════════════════════════════════════════════
const SLOTS  = 5;
const SLOT_H = GAP_ROW;

function buildNodePositions(nodes) {
  const yearSlotCounter = {};
  nodes.forEach(nd => {
    if (nd.slot === undefined || nd.slot === null) {
      if (!yearSlotCounter[nd.year]) yearSlotCounter[nd.year] = 1;
      nd.slot = yearSlotCounter[nd.year]++;
    }
  });

  const allYears = [...new Set(nodes.map(nd => nd.year).filter(Boolean))].sort((a, b) => a - b);
  const yearX = {};
  allYears.forEach((yr, ci) => { yearX[yr] = X_START + ci * GAP_COL; });

  return nodes.map(nd => {
    if (nd._pos) return { x: nd._pos.x, y: nd._pos.y };
    const x = yearX[nd.year] ?? X_START;
    const y = Y_START + (nd.slot - 1) * SLOT_H;
    return { x, y };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// PATH BUILDER
// ═══════════════════════════════════════════════════════════════════════
function buildPath(srcPos, tgtPos, direction) {
  const gap_c = (GAP_COL - W) / 4;
  const gap_r = (GAP_ROW - H) / 4;

  const raw = (direction || 'right').trim();
  const groups = raw.split(',').map(item => {
    const t = item.trim();
    const dash = t.indexOf('-');
    let dir, value;
    if (dash === -1) { dir = t; value = ''; }
    else { dir = t.slice(0, dash).trim(); value = t.slice(dash + 1).trim(); }
    const digits = value.replace(/[^0-9]/g,'').split('').map(Number);
    return { dir, firstDigit: digits[0] || 0, secondDigit: digits[1] || 0 };
  }).filter(g => g.dir);

  if (!groups.length) return '';

  let x = srcPos.x, y = srcPos.y;
  switch(groups[0].dir) {
    case 'right': x += W/2; break;
    case 'up':    y -= H/2; break;
    case 'down':  y += H/2; break;
    case 'left':  x -= W/2; break;
  }
  let path = `M${x.toFixed(1)},${y.toFixed(1)}`;

  let firstDone = false;
  function applyFirst() {
    if (firstDone || groups.length < 2) return;
    switch(groups[1].dir) {
      case 'right': x += W/2; break;
      case 'up':    y -= H/2; break;
      case 'down':  y += H/2; break;
      case 'left':  x -= W/2; break;
    }
    firstDone = true;
  }

  groups.forEach((g) => {
    const {dir, firstDigit, secondDigit} = g;
    switch(dir) {
      case 'right': x += GAP_COL * firstDigit + gap_c * secondDigit; break;
      case 'up':    y -= GAP_ROW * firstDigit + gap_r * secondDigit; break;
      case 'down':  y += GAP_ROW * firstDigit + gap_r * secondDigit; break;
      case 'left':  x -= GAP_COL * firstDigit + gap_c * secondDigit; break;
    }
    path += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    if (groups.length > 1) applyFirst();
  });

  const tx = tgtPos.x, ty = tgtPos.y;
  if      (y < ty - H/2) path += ` L${tx.toFixed(1)},${y.toFixed(1)} L${tx.toFixed(1)},${(ty-H/2).toFixed(1)}`;
  else if (y > ty + H/2) path += ` L${tx.toFixed(1)},${y.toFixed(1)} L${tx.toFixed(1)},${(ty+H/2).toFixed(1)}`;
  else if (x < tx - W/2) path += ` L${x.toFixed(1)},${ty.toFixed(1)} L${(tx-W/2).toFixed(1)},${ty.toFixed(1)}`;
  else if (x > tx + W/2) path += ` L${x.toFixed(1)},${ty.toFixed(1)} L${(tx+W/2).toFixed(1)},${ty.toFixed(1)}`;

  return path;
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function renderSidebar() {
  const list = document.getElementById('sbList');
  list.innerHTML = '';
  Object.keys(DATA).sort().forEach(key => {
    const f = DATA[key];
    const major = key.slice(0,-2).toUpperCase();
    const cohort = key.slice(-2);
    const type = major.toLowerCase().startsWith('swe') ? 'swe' : 'cndc';
    const nodeCount = (f.nodes||[]).filter(n=>n.id&&n.id.trim()).length;
    const linkCount = (f.links||[]).length;

    const div = document.createElement('div');
    div.className = 'fi' + (key === ACTIVE ? ' active' : '');
    div.innerHTML = `
      <div class="fi-dot ${type}">${major.slice(0,3)}</div>
      <div class="fi-body">
        <div class="fi-name">${major} '${cohort}</div>
        <div class="fi-meta">${f.years||4}yr · ${nodeCount}n · ${linkCount}e</div>
      </div>
      <button class="fi-del" data-k="${key}" title="Delete">×</button>`;
    div.addEventListener('click', e => {
      if (!e.target.closest('.fi-del')) {
        loadFlow(key);
        // Đóng sidebar sau khi chọn trên mobile
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('open');
          document.body.classList.remove('sidebar-open');
        }
      }
    });
    div.querySelector('.fi-del').addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Delete "${key}"?`)) {
        delete DATA[key];
        if (ACTIVE === key) showEmpty();
        renderSidebar();
      }
    });
    list.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// LOAD / EMPTY
// ═══════════════════════════════════════════════════════════════════════
function showEmpty() {
  ACTIVE = null; SEL = null;
  document.getElementById('mainSvg').style.display = 'none';
  document.getElementById('emptyMsg').style.display = 'flex';
  document.getElementById('tbActions').style.display = 'none';
  document.getElementById('tbTitle').textContent = 'Select a flowchart to edit';
  document.getElementById('legendBox').style.display = 'none';
  renderRPanel(null);
}

function loadFlow(key) {
  ACTIVE = key; SEL = null; PAN = {x:0,y:0};
  document.getElementById('mainSvg').style.display = 'block';
  document.getElementById('emptyMsg').style.display = 'none';
  document.getElementById('tbActions').style.display = 'flex';
  document.getElementById('legendBox').style.display = 'block';
  renderSidebar();
  renderGraph();
  renderRPanel(null);
  updateToolbar();
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER GRAPH
// ═══════════════════════════════════════════════════════════════════════
let DRAG_SNAP_POS = null;

function renderGraph() {
  if (!ACTIVE) return;
  const f = DATA[ACTIVE];
  const gEdge    = document.getElementById('gEdge');
  const gNode    = document.getElementById('gNode');
  const gBands   = document.getElementById('gBands');
  const gHandles = document.getElementById('gEdgeHandles');
  const gSnap    = document.getElementById('gSnapPreview');
  gEdge.innerHTML = ''; gNode.innerHTML = ''; gBands.innerHTML = '';
  gHandles.innerHTML = ''; gSnap.innerHTML = '';

  document.getElementById('gPan').setAttribute('transform', `translate(${PAN.x},${PAN.y})`);
  gBands.setAttribute('transform', `translate(${PAN.x},${PAN.y})`);

  const posArr = buildNodePositions(f.nodes || []);
  const idPos = {};
  (f.nodes||[]).forEach((nd,i) => {
    if (nd.id && nd.id.trim() && !idPos[nd.id]) idPos[nd.id] = posArr[i];
  });

  const allYears = [...new Set((f.nodes||[]).map(n => n.year).filter(Boolean))].sort((a,b) => a-b);
  const yearX = {};
  allYears.forEach((yr, ci) => { yearX[yr] = X_START + ci * GAP_COL; });

  // ── Year/term bands ──
  allYears.forEach(yr => {
    const cx = yearX[yr];
    const minX = cx - W/2 - 8;
    const minY = Y_START - H/2 - 10;
    const maxX = cx + W/2 + 8;
    const maxY = Y_START + (SLOTS - 1) * SLOT_H + H/2 + 10;

    const rect = document.createElementNS(NS,'rect');
    rect.setAttribute('x', minX); rect.setAttribute('y', minY);
    rect.setAttribute('width', maxX - minX); rect.setAttribute('height', maxY - minY);
    rect.setAttribute('rx', 8); rect.setAttribute('class','year-band');
    gBands.appendChild(rect);

    const termInt = Math.round((yr % 1) * 10);
    const termName = termInt === 4 ? 'Summer' : `Q${termInt}`;
    const lbl = document.createElementNS(NS,'text');
    lbl.setAttribute('x', minX + 6); lbl.setAttribute('y', minY - 3);
    lbl.setAttribute('class','term-label');
    lbl.textContent = `Y${Math.floor(yr)} ${termName}`;
    gBands.appendChild(lbl);

    for (let s = 1; s <= SLOTS; s++) {
      const sy = Y_START + (s - 1) * SLOT_H;
      const hasNode = (f.nodes||[]).some(n => n.year === yr && n.slot === s && n.id && n.id.trim());
      if (!hasNode) {
        const sr = document.createElementNS(NS,'rect');
        sr.setAttribute('x', cx - W/2 - 2);
        sr.setAttribute('y', sy - H/2 - 2);
        sr.setAttribute('width', W + 4);
        sr.setAttribute('height', H + 4);
        sr.setAttribute('rx', 6);
        sr.setAttribute('fill', 'rgba(0,0,0,.015)');
        sr.setAttribute('stroke', 'rgba(0,0,0,.08)');
        sr.setAttribute('stroke-width', '1');
        sr.setAttribute('stroke-dasharray', '4 3');
        gBands.appendChild(sr);
      }
    }
  });

  // ── Snap preview ──
  if (DRAG_IDX !== null && DRAG_SNAP_POS) {
    const sr = document.createElementNS(NS,'rect');
    sr.setAttribute('x', DRAG_SNAP_POS.x - W/2 - 4);
    sr.setAttribute('y', DRAG_SNAP_POS.y - H/2 - 4);
    sr.setAttribute('width', W + 8); sr.setAttribute('height', H + 8);
    sr.setAttribute('rx', 7); sr.setAttribute('class','snap-preview');
    gSnap.appendChild(sr);

    const si = document.createElementNS(NS,'text');
    si.setAttribute('x', DRAG_SNAP_POS.x);
    si.setAttribute('y', DRAG_SNAP_POS.y - H/2 - 8);
    si.setAttribute('text-anchor','middle');
    si.setAttribute('font-size','9');
    si.setAttribute('fill','#2D5BE3');
    si.setAttribute('font-family',"'JetBrains Mono',monospace");
    si.textContent = `slot ${DRAG_SNAP_POS.slot}`;
    gSnap.appendChild(si);
  }

  // ── Edges + handles ──
  (f.links||[]).forEach((lk,i) => {
    const sp = idPos[lk.source], tp = idPos[lk.target];
    if (!sp || !tp) return;
    const isSel = SEL && SEL.type==='edge' && SEL.idx===i;
    const d = buildPath(sp, tp, lk.direction || 'right');
    if (!d) return;

    const path = document.createElementNS(NS,'path');
    path.setAttribute('d', d);
    path.setAttribute('class','link-path'+(isSel?' sel':''));

    const hit = document.createElementNS(NS,'path');
    hit.setAttribute('d', d);
    hit.setAttribute('stroke','transparent');
    hit.setAttribute('stroke-width','10');
    hit.setAttribute('fill','none');
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', e => { e.stopPropagation(); selectEdge(i); });

    gEdge.appendChild(path);
    gEdge.appendChild(hit);

    if (isSel) {
      const segs = parseDirection(lk.direction || 'right');
      const gap_c = (GAP_COL-W)/4, gap_r = (GAP_ROW-H)/4;

      let x = sp.x, y = sp.y;
      switch(segs[0]?.dir) {
        case'right':x+=W/2;break; case'up':y-=H/2;break;
        case'down':y+=H/2;break; case'left':x-=W/2;break;
      }
      let firstDone = false;
      function applyFirst2() {
        if (firstDone || segs.length < 2) return;
        switch(segs[1].dir) {
          case'right':x+=W/2;break; case'up':y-=H/2;break;
          case'down':y+=H/2;break; case'left':x-=W/2;break;
        }
        firstDone = true;
      }

      const verts = [{x, y}];
      segs.forEach(g => {
        switch(g.dir) {
          case'right':x+=GAP_COL*g.firstDigit+gap_c*g.secondDigit;break;
          case'up':   y-=GAP_ROW*g.firstDigit+gap_r*g.secondDigit;break;
          case'down': y+=GAP_ROW*g.firstDigit+gap_r*g.secondDigit;break;
          case'left': x-=GAP_COL*g.firstDigit+gap_c*g.secondDigit;break;
        }
        if(segs.length>1) applyFirst2();
        verts.push({x, y});
      });

      const tx = tp.x, ty2 = tp.y;
      const last = verts[verts.length-1];
      const snapPts = [];
      if (last.y < ty2-H/2) {
        snapPts.push({x:tx,y:last.y}); snapPts.push({x:tx,y:ty2});
      } else if (last.y > ty2+H/2) {
        snapPts.push({x:tx,y:last.y}); snapPts.push({x:tx,y:ty2});
      } else if (last.x < tx-W/2) {
        snapPts.push({x:last.x,y:ty2}); snapPts.push({x:tx,y:ty2});
      } else if (last.x > tx+W/2) {
        snapPts.push({x:last.x,y:ty2}); snapPts.push({x:tx,y:ty2});
      }
      const allVerts = [...verts, ...snapPts];

      for (let si = 0; si < allVerts.length - 1; si++) {
        const p1 = allVerts[si], p2 = allVerts[si+1];
        const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
        const segLen = Math.sqrt((p2.x-p1.x)**2+(p2.y-p1.y)**2);
        if (segLen < 12) continue;

        const isHorizSeg = Math.abs(p1.y-p2.y) < 1;

        const circ = document.createElementNS(NS,'circle');
        circ.setAttribute('cx', mx); circ.setAttribute('cy', my);
        circ.setAttribute('r', '5');
        circ.setAttribute('fill', '#fff');
        circ.setAttribute('stroke', '#2D5BE3');
        circ.setAttribute('stroke-width', '1.5');
        circ.style.cursor = isHorizSeg ? 'ns-resize' : 'ew-resize';

        circ.addEventListener('mouseenter', () => { circ.setAttribute('fill','#EDF2FF'); circ.setAttribute('r','6'); });
        circ.addEventListener('mouseleave', () => { circ.setAttribute('fill','#fff'); circ.setAttribute('r','5'); });
        circ.addEventListener('mousedown', ev => {
          ev.stopPropagation(); ev.preventDefault();
          const dirSegIdx = Math.min(si, segs.length - 1);
          const dir = si < segs.length ? segs[si].dir : (isHorizSeg ? 'right' : 'down');
          startEdgeDrag(ev, i, dirSegIdx, dir);
        });

        gHandles.appendChild(circ);
      }

      for (let vi = 1; vi < verts.length - 1; vi++) {
        const vdot = document.createElementNS(NS,'circle');
        vdot.setAttribute('cx', verts[vi].x);
        vdot.setAttribute('cy', verts[vi].y);
        vdot.setAttribute('r', '3');
        vdot.setAttribute('fill', '#2D5BE3');
        vdot.setAttribute('stroke', 'none');
        vdot.style.pointerEvents = 'none';
        gHandles.appendChild(vdot);
      }
    }
  });

  // ── Nodes ──
  (f.nodes||[]).forEach((nd,i) => {
    if (!nd.id || !nd.id.trim()) return;
    const p = posArr[i];
    const col = GROUP_COLOR[nd.group] || GROUP_COLOR[''];
    const isSel  = SEL && SEL.type==='node' && SEL.idx===i;
    const isCSrc = CONN && CONN_SRC && CONN_SRC.idx===i;

    const g = document.createElementNS(NS,'g');
    g.setAttribute('class','node-g'+(isSel?' sel':''));
    g.setAttribute('transform',`translate(${p.x - W/2},${p.y - H/2})`);
    g.setAttribute('data-i', i);

    const sh = document.createElementNS(NS,'rect');
    sh.setAttribute('width',W); sh.setAttribute('height',H); sh.setAttribute('rx',5);
    sh.setAttribute('fill','rgba(0,0,0,.07)'); sh.setAttribute('transform','translate(1,2)');
    sh.style.pointerEvents = 'none';

    const rect = document.createElementNS(NS,'rect');
    rect.setAttribute('class','node-rect');
    rect.setAttribute('width',W); rect.setAttribute('height',H); rect.setAttribute('rx',5);
    rect.setAttribute('fill', isCSrc ? '#DBEAFE' : col.fill);
    rect.setAttribute('stroke', (isSel||isCSrc) ? '#2D5BE3' : col.stroke);
    rect.setAttribute('stroke-width', (isSel||isCSrc) ? 2 : 1.5);

    const strip = document.createElementNS(NS,'rect');
    strip.setAttribute('x', W-4); strip.setAttribute('y', 2);
    strip.setAttribute('width', 3); strip.setAttribute('height', H-4);
    strip.setAttribute('rx', 2); strip.setAttribute('fill', col.stroke); strip.setAttribute('opacity','.55');
    strip.style.pointerEvents = 'none';

    const txt = document.createElementNS(NS,'text');
    txt.setAttribute('x', (W-3)/2); txt.setAttribute('y', H/2);
    txt.setAttribute('text-anchor','middle'); txt.setAttribute('dominant-baseline','middle');
    txt.setAttribute('font-size','10'); txt.setAttribute('font-weight','600');
    txt.setAttribute('fill', isCSrc ? '#1D4ED8' : col.text);
    txt.setAttribute('font-family',"'JetBrains Mono',monospace");
    txt.style.pointerEvents = 'none';
    txt.textContent = nd.id;

    g.appendChild(sh); g.appendChild(rect); g.appendChild(strip); g.appendChild(txt);

    if (isCSrc) {
      const ring = document.createElementNS(NS,'rect');
      ring.setAttribute('class','conn-ring');
      ring.setAttribute('x',-3); ring.setAttribute('y',-3);
      ring.setAttribute('width', W+6); ring.setAttribute('height', H+6);
      ring.setAttribute('rx',8); ring.style.pointerEvents = 'none';
      g.appendChild(ring);
    }

    g.addEventListener('mousedown', e => { if (!CONN) startDrag(e, i); });
    g.addEventListener('click', e => {
      e.stopPropagation();
      if (CONN) { handleConnClick(i); return; }
      selectNode(i);
    });
    gNode.appendChild(g);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SELECTION
// ═══════════════════════════════════════════════════════════════════════
function selectNode(idx) {
  SEL = {type:'node',idx};
  document.getElementById('btnDel').style.display='flex';
  document.getElementById('delHint').style.display='block';
  renderGraph(); renderRPanel(idx);
  window.openMobilePanel?.();
}
function selectEdge(idx) {
  SEL = {type:'edge',idx};
  document.getElementById('btnDel').style.display='flex';
  document.getElementById('delHint').style.display='block';
  renderGraph(); renderEdgePanel(idx);
  window.openMobilePanel?.();
}
function deselect() {
  SEL = null;
  document.getElementById('btnDel').style.display='none';
  document.getElementById('delHint').style.display='none';
  // Đóng panel trên mobile khi bỏ chọn
  if (window.innerWidth <= 768) {
    document.getElementById('rpanel').classList.remove('panel-open');
    document.body.classList.remove('panel-open');
  }
  renderGraph(); renderRPanel(null);
}
function deleteSel() {
  if (!SEL || !ACTIVE) return;
  const f = DATA[ACTIVE];
  if (SEL.type === 'node') {
    const nd = f.nodes[SEL.idx];
    f.links = (f.links||[]).filter(l => l.source !== nd.id && l.target !== nd.id);
    f.nodes.splice(SEL.idx, 1);
  } else {
    f.links.splice(SEL.idx, 1);
  }
  SEL = null;
  document.getElementById('btnDel').style.display='none';
  document.getElementById('delHint').style.display='none';
  renderGraph(); renderRPanel(null); updateToolbar();
}

// ═══════════════════════════════════════════════════════════════════════
// PARSE / SERIALIZE DIRECTION
// ═══════════════════════════════════════════════════════════════════════
function parseDirection(raw) {
  return (raw || 'right').trim().split(',').map(item => {
    const t = item.trim();
    const dash = t.indexOf('-');
    let dir, value;
    if (dash === -1) { dir = t; value = ''; }
    else { dir = t.slice(0, dash).trim(); value = t.slice(dash + 1).trim(); }
    const numMatch = value.match(/^(\d+)(?:\.(\d))?$/);
    const firstDigit  = numMatch ? parseInt(numMatch[1]) : 0;
    const secondDigit = numMatch && numMatch[2] ? parseInt(numMatch[2]) : 0;
    return { dir, firstDigit, secondDigit };
  }).filter(g => g.dir);
}

function serializeDirection(segs) {
  return segs.map(g => {
    if (g.firstDigit === 0 && g.secondDigit === 0) return g.dir;
    if (g.secondDigit === 0) return `${g.dir}-${g.firstDigit}`;
    return `${g.dir}-${g.firstDigit}.${g.secondDigit}`;
  }).join(',');
}

// ═══════════════════════════════════════════════════════════════════════
// EDGE DRAG
// ═══════════════════════════════════════════════════════════════════════
function startEdgeDrag(e, linkIdx, dirSegIdx, segDir) {
  const f = DATA[ACTIVE];
  const lk = f.links[linkIdx];
  const origDir  = lk.direction || 'right';
  const origSegs = parseDirection(origDir);
  const isHoriz  = segDir === 'right' || segDir === 'left';
  const unitPx   = isHoriz ? (GAP_ROW - H) / 4 : (GAP_COL - W) / 4;
  const startX   = e.clientX, startY = e.clientY;
  const isSnapSeg = dirSegIdx >= origSegs.length - 1;

  function onMove(ev) {
    const delta  = isHoriz ? (ev.clientY - startY) : (ev.clientX - startX);
    const tenths = Math.round(delta / unitPx);
    if (tenths === 0) { lk.direction = origDir; renderGraph(); const inp=document.getElementById('eDir'); if(inp) inp.value=lk.direction; return; }

    const segs    = origSegs.map(s => ({...s}));
    const absT    = Math.abs(tenths);
    const perpPos = isHoriz ? (delta > 0 ? 'down' : 'up') : (delta > 0 ? 'right' : 'left');
    const perpNeg = isHoriz ? (delta > 0 ? 'up' : 'down') : (delta > 0 ? 'left' : 'right');
    const isPerp  = d => isHoriz ? (d==='up'||d==='down') : (d==='left'||d==='right');

    const prev    = dirSegIdx > 0 ? segs[dirSegIdx - 1] : null;
    const next    = dirSegIdx < segs.length - 1 ? segs[dirSegIdx + 1] : null;
    const hasPrev = prev && isPerp(prev.dir);
    const hasNext = next && isPerp(next.dir);

    function adjustPerp(seg) {
      let cur = seg.firstDigit * 10 + seg.secondDigit;
      let neu = (seg.dir === perpPos) ? cur + absT : cur - absT;
      if (neu >= 0) return { ...seg, firstDigit: Math.floor(neu/10), secondDigit: neu % 10 };
      return { dir: perpNeg, firstDigit: Math.floor(Math.abs(neu)/10), secondDigit: Math.abs(neu) % 10 };
    }

    if (isSnapSeg || hasPrev) {
      if (hasPrev) {
        segs[dirSegIdx - 1] = adjustPerp(prev);
      } else {
        segs.splice(dirSegIdx, 0, { dir: perpPos, firstDigit: Math.floor(absT/10), secondDigit: absT % 10 });
      }
    } else if (!hasPrev && !hasNext) {
      segs.splice(dirSegIdx, 0, { dir: perpPos, firstDigit: Math.floor(absT/10), secondDigit: absT % 10 });
    } else {
      segs.splice(dirSegIdx, 0, { dir: perpPos, firstDigit: Math.floor(absT/10), secondDigit: absT % 10 });
    }

    lk.direction = serializeDirection(segs);
    renderGraph();
    const inp = document.getElementById('eDir');
    if (inp) inp.value = lk.direction;
  }

  function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ═══════════════════════════════════════════════════════════════════════
// NODE DRAG
// ═══════════════════════════════════════════════════════════════════════
function startDrag(e, idx) {
  e.stopPropagation(); e.preventDefault();
  const f = DATA[ACTIVE];
  const svgEl   = document.getElementById('mainSvg');
  const svgRect = svgEl.getBoundingClientRect();
  const posArr  = buildNodePositions(f.nodes);
  const p       = posArr[idx];
  DRAG_IDX = idx;
  DRAG_OFF = { x: e.clientX - svgRect.left - PAN.x - p.x, y: e.clientY - svgRect.top - PAN.y - p.y };
  DRAG_SNAP_POS = null;

  const allYears  = [...new Set((f.nodes||[]).map(n => n.year).filter(Boolean))].sort((a,b) => a-b);
  const snapCols  = allYears.map((yr, ci) => ({ year: yr, x: X_START + ci * GAP_COL }));

  function onMove(ev) {
    if (DRAG_IDX === null) return;
    const svgX = ev.clientX - svgRect.left - PAN.x - DRAG_OFF.x;
    const svgY = ev.clientY - svgRect.top  - PAN.y - DRAG_OFF.y;

    let bestCol = null, bestD = Infinity;
    snapCols.forEach(sc => { const d = Math.abs(svgX - sc.x); if (d < bestD) { bestD = d; bestCol = sc; } });

    const rawSlot  = Math.round((svgY - Y_START) / SLOT_H) + 1;
    const snapSlot = Math.max(1, Math.min(SLOTS, rawSlot));
    const snapY    = Y_START + (snapSlot - 1) * SLOT_H;

    if (bestCol && bestD < GAP_COL * 0.55) {
      DRAG_SNAP_POS = { x: bestCol.x, y: snapY, year: bestCol.year, slot: snapSlot };
      f.nodes[DRAG_IDX]._pos = { x: bestCol.x, y: snapY };
    } else {
      DRAG_SNAP_POS = null;
      f.nodes[DRAG_IDX]._pos = { x: svgX, y: svgY };
    }
    renderGraph();
  }

  function onUp() {
    if (DRAG_IDX === null) { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); return; }

    if (DRAG_SNAP_POS) {
      const { year: targetYear, slot: targetSlot } = DRAG_SNAP_POS;
      const occupant = f.nodes.find((n, i) => i !== DRAG_IDX && n.year === targetYear && n.slot === targetSlot);
      if (occupant) {
        occupant.slot = f.nodes[DRAG_IDX].slot;
        occupant.year = f.nodes[DRAG_IDX].year;
      }
      f.nodes[DRAG_IDX].year = targetYear;
      f.nodes[DRAG_IDX].slot = targetSlot;
      delete f.nodes[DRAG_IDX]._pos;
    }

    DRAG_SNAP_POS = null;
    selectNode(DRAG_IDX);
    DRAG_IDX = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ═══════════════════════════════════════════════════════════════════════
// PAN
// ═══════════════════════════════════════════════════════════════════════
document.getElementById('cWrap').addEventListener('mousedown', e => {
  if (e.target.closest('.node-g')) return;
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    PANNING = true;
    PAN_START = { x: e.clientX - PAN.x, y: e.clientY - PAN.y };
    e.preventDefault();
  }
});
window.addEventListener('mousemove', e => {
  if (!PANNING) return;
  PAN.x = e.clientX - PAN_START.x;
  PAN.y = e.clientY - PAN_START.y;
  if (ACTIVE) renderGraph();
});
window.addEventListener('mouseup', () => { PANNING = false; });
document.getElementById('cWrap').addEventListener('wheel', e => {
  e.preventDefault();
  PAN.x -= e.deltaX; PAN.y -= e.deltaY;
  if (ACTIVE) renderGraph();
  else {
    document.getElementById('gPan').setAttribute('transform', `translate(${PAN.x},${PAN.y})`);
    document.getElementById('gBands').setAttribute('transform', `translate(${PAN.x},${PAN.y})`);
  }
}, {passive:false});

// Touch pan trên mobile
(function () {
  let lastTouch = null;
  const cWrap = document.getElementById('cWrap');
  cWrap.addEventListener('touchstart', e => {
    if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  cWrap.addEventListener('touchmove', e => {
    if (e.touches.length !== 1 || !lastTouch) return;
    const dx = e.touches[0].clientX - lastTouch.x;
    const dy = e.touches[0].clientY - lastTouch.y;
    PAN.x += dx; PAN.y += dy;
    lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (ACTIVE) renderGraph();
  }, { passive: true });
  cWrap.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });
})();

// ═══════════════════════════════════════════════════════════════════════
// CONNECTION MODE
// ═══════════════════════════════════════════════════════════════════════
function enterConn() {
  CONN = true; CONN_SRC = null;
  document.getElementById('connBar').style.display='flex';
  document.getElementById('hint').style.display='none';
  renderGraph();
}
function exitConn() {
  CONN = false; CONN_SRC = null;
  document.getElementById('connBar').style.display='none';
  document.getElementById('hint').style.display='block';
  renderGraph();
}
function handleConnClick(idx) {
  if (!CONN_SRC) { CONN_SRC = {idx}; renderGraph(); return; }
  const f   = DATA[ACTIVE];
  const src = f.nodes[CONN_SRC.idx].id;
  const tgt = f.nodes[idx].id;
  if (src && tgt && src !== tgt && !(f.links||[]).find(l => l.source===src && l.target===tgt)) {
    f.links = f.links || [];
    f.links.push({ source: src, target: tgt, direction: 'right' });
  }
  CONN_SRC = null; exitConn(); updateToolbar();
}

// ═══════════════════════════════════════════════════════════════════════
// RIGHT PANEL — NODE
// ═══════════════════════════════════════════════════════════════════════
function renderRPanel(idx) {
  
  const panel  = document.getElementById('rpanel');
  let toggle   = panel.querySelector('.rp-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'rp-toggle'; toggle.id = 'rpToggle'; toggle.title = 'Toggle panel';
    toggle.textContent = '◀ Properties';
    toggle.addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    panel.classList.remove('panel-open');
    document.body.classList.remove('panel-open');
  } else {
    const collapsed = panel.classList.toggle('collapsed');
    toggle.textContent = collapsed ? '▶' : '◀ Properties';
  }
});
    panel.insertBefore(toggle, panel.firstChild);
  }

  [...panel.children].forEach(c => { if (c !== toggle) c.remove(); });
  const content = document.createElement('div');
  content.className = 'rp-content';
  content.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;min-width:0';
  panel.appendChild(content);

  if (idx === null) {
    content.innerHTML = `<div class="rp-empty"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg><span>Click a node or edge<br>to edit its properties</span></div>`;
    return;
  }

  const f      = DATA[ACTIVE];
  const nd     = f.nodes[idx];
  const isElec = nd.id && (nd.group==='ELEC' || nd.group==='SPEC_ELEC' || nd.id.startsWith('ELEC'));
  const elecItems = (f.ELEC||[]).filter(e => e.id === nd.id);

  content.innerHTML = `
    <div class="rp-sec">
      <h3>Node</h3>
      <div class="field"><label>Course ID</label><input type="text" id="pId" value="${esc(nd.id)}"><div class="help">e.g. CSE 101 · ELEC SPEC</div></div>
      <div class="field"><label>Year.Term</label><input type="text" id="pYear" value="${nd.year||''}" placeholder="2.1"><div class="help">Year.Term (e.g. 1.1=Y1Q1, 1.4=Y1 Summer)</div></div>
    </div>
    <div class="rp-sec">
      <h3>Group</h3>
      <div class="grp-grid">${GRP_KEYS.map(g=>`<button class="grp-btn g-${g||'EMPTY'}${nd.group===g?' on':''}" data-g="${g}">${GRP_LABEL[g]}</button>`).join('')}</div>
    </div>
    <div class="rp-sec">
      <h3>Tooltip</h3>
      <div class="field"><textarea id="pTip" rows="2">${esc(nd.tooltip||'')}</textarea></div>
    </div>
    ${isElec ? `
    <div class="rp-sec">
      <h3>Elective options</h3>
      <div class="elec-list" id="elecList">${elecItems.map((e,i)=>`<div class="elec-item"><span>${esc(e.name)}</span><button class="elec-del" data-ei="${i}">×</button></div>`).join('')}</div>
      <div class="elec-add"><input type="text" id="elecNew" placeholder="CSE 490"><button class="btn btn-accent" style="padding:4px 8px;font-size:11px" id="elecAdd">+</button></div>
    </div>` : ''}
    <div class="rp-sec" style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-ghost" style="font-size:10px" id="pResetPos">↺ Reset pos</button>
      <button class="btn btn-warn" style="font-size:10px;flex:1;justify-content:center" id="pDel">✕ Delete node</button>
    </div>`;

  content.querySelector('#pId').addEventListener('input', e => { nd.id=e.target.value; renderGraph(); updateToolbar(); });
  content.querySelector('#pYear').addEventListener('input', e => { const v=parseFloat(e.target.value); if(!isNaN(v)){nd.year=v;delete nd._pos;renderGraph();} });
  content.querySelector('#pTip').addEventListener('input', e => { nd.tooltip=e.target.value; });
  content.querySelectorAll('.grp-btn').forEach(b => {
    b.addEventListener('click', () => {
      nd.group = b.dataset.g;
      content.querySelectorAll('.grp-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); renderGraph();
    });
  });
  content.querySelector('#pResetPos').addEventListener('click', () => { delete nd._pos; renderGraph(); });
  content.querySelector('#pDel').addEventListener('click', () => { SEL={type:'node',idx}; deleteSel(); });

  if (isElec) {
    content.querySelectorAll('.elec-del').forEach(b => {
      b.addEventListener('click', () => {
        const ei   = parseInt(b.dataset.ei);
        const idxs = (f.ELEC||[]).map((e,ri) => e.id===nd.id ? ri : -1).filter(x => x>=0);
        if (idxs[ei] !== undefined) { f.ELEC.splice(idxs[ei],1); renderRPanel(idx); }
      });
    });
    const addBtn = content.querySelector('#elecAdd');
    const addInp = content.querySelector('#elecNew');
    addBtn.addEventListener('click', () => {
      const name = addInp.value.trim(); if (!name) return;
      if (!f.ELEC) f.ELEC = [];
      f.ELEC.push({ id: nd.id, name, tooltip: '' });
      addInp.value = ''; renderRPanel(idx);
    });
    addInp.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// RIGHT PANEL — EDGE
// ═══════════════════════════════════════════════════════════════════════
function renderEdgePanel(idx) {
  const panel = document.getElementById('rpanel');
  let toggle  = panel.querySelector('.rp-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'rp-toggle'; toggle.id = 'rpToggle'; toggle.title = 'Toggle panel';
    toggle.textContent = '◀ Properties';
    toggle.addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    panel.classList.remove('panel-open');
    document.body.classList.remove('panel-open');
  } else {
    const collapsed = panel.classList.toggle('collapsed');
    toggle.textContent = collapsed ? '▶' : '◀ Properties';
  }
});
    panel.insertBefore(toggle, panel.firstChild);
  }

  [...panel.children].forEach(c => { if (c !== toggle) c.remove(); });
  const content = document.createElement('div');
  content.className = 'rp-content';
  content.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;min-width:0';
  panel.appendChild(content);

  const f  = DATA[ACTIVE];
  const lk = f.links[idx];
  content.innerHTML = `
    <div class="rp-sec">
      <h3>Edge ${idx}</h3>
      <div class="field"><label>Source</label><input type="text" id="eSrc" value="${esc(lk.source)}"></div>
      <div class="field"><label>Target</label><input type="text" id="eTgt" value="${esc(lk.target)}"></div>
      <div class="field">
        <label>Direction string</label>
        <input type="text" id="eDir" value="${esc(lk.direction||'right')}">
        <div class="help">right · right-1.3 · up-0.2,right-1.4,down<br>Format: dir-X.Y where X=full cols, Y=quarter gaps</div>
      </div>
    </div>
    <div class="rp-sec"><button class="btn btn-warn" style="width:100%;justify-content:center" id="eDel">✕ Delete edge</button></div>`;

  content.querySelector('#eSrc').addEventListener('input', e => { lk.source=e.target.value; renderGraph(); });
  content.querySelector('#eTgt').addEventListener('input', e => { lk.target=e.target.value; renderGraph(); });
  content.querySelector('#eDir').addEventListener('input', e => { lk.direction=e.target.value; renderGraph(); });
  content.querySelector('#eDel').addEventListener('click', () => { SEL={type:'edge',idx}; deleteSel(); });
}

// ═══════════════════════════════════════════════════════════════════════
// SVG CLICK = DESELECT
// ═══════════════════════════════════════════════════════════════════════
document.getElementById('mainSvg').addEventListener('click', e => {
  if (e.target === e.currentTarget || e.target.id === 'mainSvg') deselect();
});

// ═══════════════════════════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════════════════════════
window.addEventListener('keydown', e => {
  const tg = document.activeElement;
  if (tg.tagName==='INPUT' || tg.tagName==='TEXTAREA') return;
  if (e.key==='Delete' || e.key==='Backspace') deleteSel();
  if (e.key==='Escape') { if (CONN) exitConn(); else deselect(); }
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveJSON(); }
});

// ═══════════════════════════════════════════════════════════════════════
// IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════════════════
async function saveJSON() {
  const b    = document.getElementById('btnSave');
  const orig = b.innerHTML;
  b.innerHTML = '...'; b.disabled = true;

  const clean = JSON.parse(JSON.stringify(DATA));
  Object.values(clean).forEach(f => { (f.nodes||[]).forEach(nd => { delete nd._pos; }); });

  try {
    const res  = await fetch('/flowchartManager/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean)
    });
    const json = await res.json();
    if (json.ok) {
      b.innerHTML = '✓ Saved';
      setTimeout(() => { b.innerHTML = orig; b.disabled = false; }, 1500);
    } else {
      alert('Save failed: ' + json.error);
      b.innerHTML = orig; b.disabled = false;
    }
  } catch (err) {
    alert('Save error: ' + err.message);
    b.innerHTML = orig; b.disabled = false;
  }
}

document.getElementById('fileImport').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (imported.nodes && imported.links) {
        const key = prompt('Enter program key for imported flowchart (e.g. swe24):', 'swe24');
        if (!key) return;
        DATA[key.trim().toLowerCase()] = imported;
      } else {
        Object.assign(DATA, imported);
      }
      renderSidebar();
      if (!ACTIVE && Object.keys(DATA).length) loadFlow(Object.keys(DATA)[0]);
    } catch(err) { alert('Invalid JSON: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ═══════════════════════════════════════════════════════════════════════
// TOOLBAR
// ═══════════════════════════════════════════════════════════════════════
function updateToolbar() {
  if (!ACTIVE) return;
  const f      = DATA[ACTIVE];
  const major  = ACTIVE.slice(0,-2).toUpperCase();
  document.getElementById('tbTitle').textContent = `${major} '${ACTIVE.slice(-2)} — ${f.years||4}-year program`;
  document.getElementById('tbBadge').textContent = `${(f.nodes||[]).filter(n=>n.id&&n.id.trim()).length} nodes · ${(f.links||[]).length} edges`;
}
document.getElementById('btnConn').addEventListener('click', enterConn);
document.getElementById('btnExitConn').addEventListener('click', exitConn);
document.getElementById('btnDel').addEventListener('click', deleteSel);
document.getElementById('btnSave').addEventListener('click', saveJSON);
document.getElementById('btnAddNode').addEventListener('click', () => {
  if (!ACTIVE) return;
  const f    = DATA[ACTIVE];
  const allY = [...new Set((f.nodes||[]).map(n=>n.year).filter(Boolean))].sort((a,b)=>a-b);
  const lastY = allY[allY.length-1] || 1.1;
  f.nodes.push({ id: `NEW ${Date.now()%9999}`, year: lastY, group: 'SPEC', tooltip: '' });
  renderGraph(); selectNode(f.nodes.length-1); updateToolbar();
});

// ═══════════════════════════════════════════════════════════════════════
// NEW MODAL
// ═══════════════════════════════════════════════════════════════════════
document.getElementById('btnNew').onclick = function(e) {
  e.stopPropagation();
  document.getElementById('nKey').value = '';
  document.querySelectorAll('#nDur .pill').forEach(x => x.classList.remove('on'));
  document.querySelector('#nDur .pill[data-v="4"]').classList.add('on');
  document.getElementById('newModal').style.display = 'flex';
  setTimeout(() => document.getElementById('nKey').focus(), 50);
};
document.getElementById('newModal').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};
document.getElementById('btnCancelNew').onclick = function(e) {
  e.stopPropagation();
  document.getElementById('newModal').style.display = 'none';
};
document.getElementById('btnConfirmNew').onclick = function(e) {
  e.stopPropagation();
  const key = document.getElementById('nKey').value.trim().toLowerCase().replace(/\s+/g,'');
  if (!key) { alert('Enter a program key'); return; }
  if (DATA[key]) { alert(`"${key}" already exists`); return; }
  const yrs     = parseInt(document.querySelector('#nDur .pill.on')?.dataset.v||'4');
  const majorUp = key.slice(0,-2).toUpperCase();
  DATA[key] = { years: yrs, nodes: [
    { year:1.1, id:`${majorUp} 101`, tooltip:'', group:'SPEC' },
    { year:1.1, id:'', tooltip:'', group:'' },
    { year:1.2, id:'MATH 101', tooltip:'', group:'GENED' },
  ], links:[], ELEC:[] };
  document.getElementById('newModal').style.display = 'none';
  renderSidebar();
  loadFlow(key);
};
document.getElementById('nKey').onkeydown = function(e) {
  if (e.key === 'Enter') document.getElementById('btnConfirmNew').click();
};
document.getElementById('nDur').onclick = function(e) {
  const t = e.target.closest('.pill'); if (!t) return;
  document.querySelectorAll('#nDur .pill').forEach(x => x.classList.remove('on'));
  t.classList.add('on');
};

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════
seedData();

document.getElementById('rpToggle').addEventListener('click', () => {
  const p = document.getElementById('rpanel');
  const collapsed = p.classList.toggle('collapsed');
  document.getElementById('rpToggle').textContent = collapsed ? '◀' : '▶ Properties';
});

renderSidebar();