const tbody = document.querySelector('#sites');
const results = new Map();
let domains = [];

function cell(text, className = '') {
  const td = document.createElement('td');
  td.textContent = text;
  td.className = className;
  return td;
}

function updateStats() {
  const all = [...results.values()];
  document.querySelector('#count-checked').firstChild.textContent = String(all.filter(x => x.kind !== 'request-error').length);
  for (const kind of ['redirect', 'mixed', 'nohttps']) {
    document.querySelector(`#count-${kind}`).textContent = String(all.filter(x => x.kind === kind).length);
  }
  if (all.length) document.querySelector('#last-check').textContent = `Última comprobación: ${new Date().toLocaleString('es-PE')}`;
}

function render() {
  tbody.replaceChildren();
  for (const item of domains) {
    const result = results.get(item.host);
    const tr = document.createElement('tr');
    tr.append(cell(item.label), cell(item.host, 'domain'));
    const status = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${result?.kind || ''}`;
    badge.textContent = result?.label || 'Pendiente';
    if (result?.detail) badge.title = result.detail;
    status.append(badge);
    tr.append(status);
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'check-one';
    button.textContent = result ? 'Actualizar ↗' : 'Comprobar ↗';
    button.addEventListener('click', () => check(item.host, button));
    action.append(button);
    tr.append(action);
    tbody.append(tr);
  }
  updateStats();
}

async function check(host, button) {
  button.disabled = true;
  button.textContent = 'Comprobando…';
  try {
    const response = await fetch(`/api/check?host=${encodeURIComponent(host)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error de comprobación');
    results.set(host, data);
  } catch (error) {
    results.set(host, { kind: 'request-error', label: 'Consulta no disponible', detail: 'El navegador no pudo consultar el servicio. Revisa sus extensiones o prueba otro navegador.' });
  }
  render();
}

async function init() {
  try {
    const response = await fetch('/domains.json');
    if (!response.ok) throw new Error('Catálogo no disponible');
    domains = await response.json();
    document.querySelector('.denom').textContent = ` / ${domains.length}`;
    document.querySelector('.hero-meta strong').textContent = String(domains.length);
    render();
  } catch {
    tbody.replaceChildren();
    const tr = document.createElement('tr');
    tr.append(cell('No se pudo cargar el catálogo.', 'loading'));
    tbody.append(tr);
  }
}

document.querySelector('#scan-all').addEventListener('click', async event => {
  const master = event.currentTarget;
  master.disabled = true;
  for (const [index, item] of domains.entries()) {
    master.firstChild.textContent = `Comprobando ${index + 1}/${domains.length} `;
    const rowButton = [...tbody.querySelectorAll('.check-one')][index];
    await check(item.host, rowButton);
  }
  master.firstChild.textContent = 'Volver a comprobar ';
  master.disabled = false;
});

init();
