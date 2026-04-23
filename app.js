const DATA_URL = 'data.csv';

/* -------- CSV parser -------- */
function parseCSV(text) {
  const rows = [];
  let cur = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cur[cur.length - 1] += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur[cur.length - 1] += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(''); }
      else if (ch === '\n') { rows.push(cur); cur = ['']; }
      else if (ch === '\r') { /* skip */ }
      else { cur[cur.length - 1] += ch; }
    }
  }
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v && v.trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
}

/* -------- Загрузка данных -------- */
let _dataCache = null;
async function loadData() {
  if (_dataCache) return _dataCache;
  const res = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Не удалось загрузить ' + DATA_URL);
  _dataCache = parseCSV(await res.text());
  return _dataCache;
}

/* -------- Группировка: модель → массив принтов -------- */
function groupByModel(rows) {
  const map = new Map();
  for (const row of rows) {
    const model = row.cp_model;
    if (!model) continue;
    if (!map.has(model)) map.set(model, []);
    map.get(model).push(row);
  }
  return map;
}

/* -------- URL-ы для картинки и маркетплейсов -------- */
function printImageUrl(row) {
  if (row.art_print_ozon)
    return `https://shift.casecreate.ru/public/storage/PRINTS/pp1/${row.art_print_ozon}.webp`;
  return `https://shift.casecreate.ru/public/storage/PRINTS/pp2/${row.art_print_wb}.webp`;
}
function ozonUrl(sku) { return `https://www.ozon.ru/product/${sku}`; }
function wbUrl(nm)    { return `https://www.wildberries.ru/catalog/${nm}/detail.aspx`; }

/* -------- Утилиты -------- */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function naturalCompare(a, b) {
  return a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' });
}

const TIER_ORDER = ['iPhone', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 0'];
function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? TIER_ORDER.length : i;
}

/* ======================================================
   ГЛАВНАЯ СТРАНИЦА
   ====================================================== */
function initHome() {
  const listEl   = document.getElementById('models-list');
  const countEl  = document.getElementById('model-count');
  const searchEl = document.getElementById('search');
  const clearBtn = document.getElementById('clear-search');
  const emptyEl  = document.getElementById('empty-state');

  if (!listEl) return;

  let allModels = [];

  function render(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? allModels.filter(m => m.toLowerCase().includes(q))
      : allModels;

    if (!filtered.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    listEl.innerHTML = filtered.map(model => `
      <a class="model-card" href="model.html?m=${encodeURIComponent(model)}">
        <div class="model-name">${escapeHtml(model)}</div>
        <span class="model-arrow">↗</span>
      </a>`).join('');
  }

  loadData()
    .then(rows => {
      const grouped = groupByModel(rows);
      allModels = Array.from(grouped.keys()).sort((a, b) => {
        const ta = tierRank(grouped.get(a)[0].tier);
        const tb = tierRank(grouped.get(b)[0].tier);
        if (ta !== tb) return ta - tb;
        return naturalCompare(a, b);
      });
      countEl.textContent = String(allModels.length).padStart(3, '0');
      render();
    })
    .catch(err => {
      listEl.innerHTML = `<div class="loading" style="color:var(--accent)">Ошибка: ${escapeHtml(err.message)}</div>`;
    });

  searchEl.addEventListener('input', e => {
    const v = e.target.value;
    clearBtn.classList.toggle('visible', v.length > 0);
    render(v);
  });

  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    clearBtn.classList.remove('visible');
    searchEl.focus();
    render('');
  });
}

document.addEventListener('DOMContentLoaded', initHome);
