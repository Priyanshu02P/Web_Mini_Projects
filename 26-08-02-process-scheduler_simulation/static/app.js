// ============================================================================
// CPU Scheduler Simulator - frontend
// Talks to the FastAPI backend (/api/algorithms, /api/schedule) and renders
// the gantt chart, the ready-queue trace (same time axis) and metrics table.
// ============================================================================

const COLORS = ['--p0', '--p1', '--p2', '--p3', '--p4', '--p5', '--p6', '--p7'];

const state = {
  processes: [],
  nextIdNum: 1,
  algorithms: [],
};

// ---------------------------------------------------------------- utilities
function colorForProcess(pid) {
  // stable hash -> palette index, so a given process id always gets the same color
  let hash = 0;
  for (let i = 0; i < pid.length; i++) hash = (hash * 31 + pid.charCodeAt(i)) >>> 0;
  const varName = COLORS[hash % COLORS.length];
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---------------------------------------------------------- process table
function addProcess(prefill) {
  const p = prefill || {
    process_id: `P${state.nextIdNum}`,
    arrival_time: 0,
    burst_time: 4,
    priority: 1,
  };
  state.nextIdNum += 1;
  state.processes.push(p);
  renderProcessTable();
}

function removeProcess(index) {
  state.processes.splice(index, 1);
  renderProcessTable();
}

function renderProcessTable() {
  const body = document.getElementById('processTableBody');
  body.innerHTML = '';
  state.processes.forEach((p, idx) => {
    const tr = el('tr');

    const tdId = el('td');
    const inId = el('input'); inId.type = 'text'; inId.value = p.process_id;
    inId.style.setProperty('--proc-color', colorForProcess(p.process_id));
    inId.addEventListener('input', (e) => { p.process_id = e.target.value.trim(); });
    tdId.appendChild(inId);

    const tdArr = el('td');
    const inArr = el('input'); inArr.type = 'number'; inArr.min = '0'; inArr.value = p.arrival_time;
    inArr.addEventListener('input', (e) => { p.arrival_time = Number(e.target.value); });
    tdArr.appendChild(inArr);

    const tdBurst = el('td');
    const inBurst = el('input'); inBurst.type = 'number'; inBurst.min = '1'; inBurst.value = p.burst_time;
    inBurst.addEventListener('input', (e) => { p.burst_time = Number(e.target.value); });
    tdBurst.appendChild(inBurst);

    const tdPr = el('td', 'priority-col hidden');
    const inPr = el('input'); inPr.type = 'number'; inPr.min = '0'; inPr.value = p.priority ?? 1;
    inPr.addEventListener('input', (e) => { p.priority = Number(e.target.value); });
    tdPr.appendChild(inPr);

    const tdDel = el('td');
    const delBtn = el('button', 'icon-btn', '\u2715');
    delBtn.addEventListener('click', () => removeProcess(idx));
    tdDel.appendChild(delBtn);

    tr.append(tdId, tdArr, tdBurst, tdPr, tdDel);
    body.appendChild(tr);
  });
  syncPriorityColumnVisibility();
}

function syncPriorityColumnVisibility() {
  const algo = document.getElementById('algorithmSelect').value;
  const meta = state.algorithms.find((a) => a.key === algo);
  const needsPriority = meta ? meta.requires_priority : false;
  document.querySelectorAll('.priority-col').forEach((c) => c.classList.toggle('hidden', !needsPriority));
}

// -------------------------------------------------------------- algorithm ui
async function loadAlgorithms() {
  const res = await fetch('/api/algorithms');
  state.algorithms = await res.json();
  const select = document.getElementById('algorithmSelect');
  select.innerHTML = '';
  state.algorithms.forEach((a) => {
    const opt = el('option', null, a.label);
    opt.value = a.key;
    select.appendChild(opt);
  });
  select.value = 'fcfs';
  onAlgorithmChange();
}

function onAlgorithmChange() {
  const algo = document.getElementById('algorithmSelect').value;
  const meta = state.algorithms.find((a) => a.key === algo);
  document.getElementById('quantumField').hidden = !(meta && meta.requires_quantum);
  document.getElementById('priorityOrderField').hidden = !(meta && meta.requires_priority);
  syncPriorityColumnVisibility();
}

// -------------------------------------------------------------------- run
function collectPayload() {
  const algorithm = document.getElementById('algorithmSelect').value;
  const meta = state.algorithms.find((a) => a.key === algorithm);
  const payload = {
    algorithm,
    processes: state.processes.map((p) => ({
      process_id: p.process_id,
      arrival_time: p.arrival_time,
      burst_time: p.burst_time,
      priority: meta && meta.requires_priority ? p.priority : null,
    })),
    context_switch_time: Number(document.getElementById('contextSwitchTime').value) || 0,
  };
  if (meta && meta.requires_quantum) {
    payload.time_quantum = Number(document.getElementById('timeQuantum').value) || 1;
  }
  if (meta && meta.requires_priority) {
    const active = document.querySelector('#priorityOrderField .seg-btn.active');
    payload.priority_lower_is_higher = active ? active.dataset.val === 'true' : true;
  }
  return payload;
}

async function runSimulation() {
  hideError();
  const payload = collectPayload();
  const runBtn = document.getElementById('runBtn');
  runBtn.disabled = true;
  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(data.detail)
        ? data.detail.map((d) => d.msg).join(' | ')
        : (data.detail || 'Request failed');
      showError(msg);
      return;
    }
    renderResults(data);
  } catch (err) {
    showError(String(err));
  } finally {
    runBtn.disabled = false;
  }
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = msg;
  banner.classList.remove('hidden');
}
function hideError() {
  document.getElementById('errorBanner').classList.add('hidden');
}

// ----------------------------------------------------------------- render
function renderResults(data) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('resultsWrap').classList.remove('hidden');

  const totalTime = data.total_time || 1;
  const unitWidth = Math.max(20, Math.min(56, Math.round(900 / totalTime)));

  renderLegend(data.process_results);
  renderRuler(totalTime, unitWidth);
  renderGantt(data.gantt_chart, unitWidth);
  renderReadyQueue(data.ready_queue_snapshots, totalTime, unitWidth);
  renderCsStats(data);
  renderMetrics(data.process_results, data.averages);

  document.getElementById('clockReadout').textContent = `t = ${totalTime}`;
}

function renderLegend(processResults) {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  processResults.forEach((p) => {
    const chip = el('div', 'legend-chip');
    const dot = el('span', 'legend-dot');
    dot.style.background = colorForProcess(p.process_id);
    chip.append(dot, document.createTextNode(p.process_id));
    legend.appendChild(chip);
  });
}

function renderRuler(totalTime, unitWidth) {
  const ruler = document.getElementById('ruler');
  ruler.innerHTML = '';
  ruler.style.width = `${totalTime * unitWidth}px`;
  const step = totalTime > 40 ? 5 : totalTime > 20 ? 2 : 1;
  for (let t = 0; t <= totalTime; t++) {
    const tick = el('div', 'ruler-tick');
    tick.style.width = `${unitWidth}px`;
    tick.textContent = (t % step === 0) ? t : '';
    ruler.appendChild(tick);
  }
}

function renderGantt(blocks, unitWidth) {
  const gantt = document.getElementById('gantt');
  gantt.innerHTML = '';
  blocks.forEach((b) => {
    const width = (b.end - b.start) * unitWidth;
    const div = el('div', 'gantt-block');
    div.style.width = `${width}px`;
    div.title = `${b.label}  [${b.start} \u2192 ${b.end}]`;

    if (b.label === 'IDLE') {
      div.classList.add('idle');
      if (width > 26) div.appendChild(el('span', 'gb-label', 'idle'));
    } else if (b.label === 'CS') {
      div.classList.add('cs');
      if (width > 20) div.appendChild(el('span', 'gb-label', 'switch'));
    } else {
      div.style.background = colorForProcess(b.label);
      if (width > 18) div.appendChild(el('span', 'gb-label', b.label));
    }
    gantt.appendChild(div);
  });
}

function renderReadyQueue(snapshots, totalTime, unitWidth) {
  const rq = document.getElementById('readyQueue');
  rq.innerHTML = '';
  rq.style.width = `${totalTime * unitWidth}px`;

  const byTime = new Map(snapshots.map((s) => [s.time, s.queue]));
  for (let t = 0; t < totalTime; t++) {
    const cell = el('div', 'rq-cell');
    cell.style.width = `${unitWidth}px`;
    const queue = byTime.get(t) || [];
    if (queue.length === 0) {
      cell.appendChild(el('span', 'rq-empty'));
    } else {
      cell.title = `t=${t}: [${queue.join(', ')}]`;
      queue.slice(0, 4).forEach((pid) => {
        const dot = el('span', 'rq-dot');
        dot.style.background = colorForProcess(pid);
        cell.appendChild(dot);
      });
    }
    rq.appendChild(cell);
  }
}

function renderCsStats(data) {
  const wrap = document.getElementById('csStat');
  wrap.innerHTML = '';
  const items = [
    ['context switches', data.context_switches],
    ['total switch time', data.total_context_switch_time],
    ['total time', data.total_time],
  ];
  items.forEach(([label, value]) => {
    const card = el('div', 'stat-card');
    card.append(el('div', 'label', label), el('div', 'value mono', String(value)));
    wrap.appendChild(card);
  });
}

function renderMetrics(processResults, averages) {
  const body = document.getElementById('metricsTableBody');
  body.innerHTML = '';
  const showPriority = processResults.some((p) => p.priority !== null && p.priority !== undefined);
  document.querySelectorAll('#metricsTable .priority-col').forEach((c) => c.classList.toggle('hidden', !showPriority));

  processResults.forEach((p) => {
    const tr = el('tr');
    const idCell = el('td', null, p.process_id);
    idCell.style.color = colorForProcess(p.process_id);
    idCell.style.fontWeight = '600';
    tr.appendChild(idCell);
    tr.appendChild(el('td', null, p.arrival_time));
    tr.appendChild(el('td', null, p.burst_time));
    const prTd = el('td', 'priority-col', p.priority ?? '\u2013');
    if (!showPriority) prTd.classList.add('hidden');
    tr.appendChild(prTd);
    tr.appendChild(el('td', null, p.completion_time));
    tr.appendChild(el('td', null, p.turnaround_time));
    tr.appendChild(el('td', null, p.waiting_time));
    tr.appendChild(el('td', null, p.response_time));
    body.appendChild(tr);
  });

  const foot = document.getElementById('metricsTableFoot');
  const tr = el('tr');
  tr.appendChild(el('td', null, 'average'));
  tr.appendChild(el('td'));
  tr.appendChild(el('td'));
  const prTd = el('td', 'priority-col');
  if (!showPriority) prTd.classList.add('hidden');
  tr.appendChild(prTd);
  tr.appendChild(el('td'));
  tr.appendChild(el('td', null, averages.avg_turnaround_time));
  tr.appendChild(el('td', null, averages.avg_waiting_time));
  tr.appendChild(el('td', null, averages.avg_response_time));
  foot.innerHTML = '';
  foot.appendChild(tr);
}

// --------------------------------------------------------------------- init
function initSegmentedControls() {
  document.querySelectorAll('.segmented').forEach((group) => {
    group.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });
}

async function init() {
  await loadAlgorithms();
  document.getElementById('algorithmSelect').addEventListener('change', onAlgorithmChange);
  document.getElementById('addProcessBtn').addEventListener('click', () => addProcess());
  document.getElementById('runBtn').addEventListener('click', runSimulation);
  initSegmentedControls();

  // seed with a friendly default example
  addProcess({ process_id: 'P1', arrival_time: 0, burst_time: 5, priority: 2 });
  addProcess({ process_id: 'P2', arrival_time: 1, burst_time: 3, priority: 1 });
  addProcess({ process_id: 'P3', arrival_time: 2, burst_time: 8, priority: 3 });
  addProcess({ process_id: 'P4', arrival_time: 3, burst_time: 6, priority: 2 });
}

document.addEventListener('DOMContentLoaded', init);
