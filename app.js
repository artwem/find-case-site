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
function shortCategoryName(cat) {
  return cat.replace(/^\d+\.\d+\.\s*/, '');
}

function initHome() {
  const listEl     = document.getElementById('models-list');
  const countEl    = document.getElementById('model-count');
  const searchEl   = document.getElementById('search');
  const clearBtn   = document.getElementById('clear-search');
  const emptyEl    = document.getElementById('empty-state');
  const filterEl   = document.getElementById('material-filter');

  if (!listEl) return;

  let allRows = [];
  let activeCategory = '';

  function render(filter = '') {
    const q = filter.trim().toLowerCase();
    const rows = allRows.filter(r => r.cp_category === activeCategory);

    const modelMap = new Map();
    for (const row of rows) {
      if (!row.cp_model || modelMap.has(row.cp_model)) continue;
      modelMap.set(row.cp_model, row);
    }

    const models = Array.from(modelMap.keys()).sort((a, b) => {
      const ta = tierRank(modelMap.get(a).tier);
      const tb = tierRank(modelMap.get(b).tier);
      if (ta !== tb) return ta - tb;
      return naturalCompare(a, b);
    });

    const filtered = q ? models.filter(m => m.toLowerCase().includes(q)) : models;

    countEl.textContent = String(filtered.length).padStart(3, '0');

    if (!filtered.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    listEl.innerHTML = filtered.map(model => `
      <a class="model-card" href="model.html?m=${encodeURIComponent(model)}&cat=${encodeURIComponent(activeCategory)}">
        <div class="model-name">${escapeHtml(model)}</div>
        <span class="model-arrow">↗</span>
      </a>`).join('');
  }

  function renderTabs(categories) {
    if (!filterEl || !categories.length) return;
    filterEl.innerHTML = categories.map(cat => {
      const label = shortCategoryName(cat);
      const active = cat === activeCategory;
      return `<button class="material-tab${active ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
    }).join('');

    filterEl.querySelectorAll('.material-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        filterEl.querySelectorAll('.material-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        render(searchEl.value);
      });
    });

    const arrowLeft  = document.getElementById('filter-arrow-left');
    const arrowRight = document.getElementById('filter-arrow-right');
    if (!arrowLeft || !arrowRight) return;

    const STEP = 200;

    function updateArrows() {
      arrowLeft.disabled  = filterEl.scrollLeft <= 0;
      arrowRight.disabled = filterEl.scrollLeft + filterEl.clientWidth >= filterEl.scrollWidth - 1;
    }

    arrowLeft.onclick  = () => { filterEl.scrollBy({ left: -STEP, behavior: 'smooth' }); };
    arrowRight.onclick = () => { filterEl.scrollBy({ left:  STEP, behavior: 'smooth' }); };
    filterEl.addEventListener('scroll', updateArrows, { passive: true });
    updateArrows();
  }

  loadData()
    .then(rows => {
      allRows = rows;

      const catModels = new Map();
      for (const row of rows) {
        if (!row.cp_category || !row.cp_model) continue;
        if (!catModels.has(row.cp_category)) catModels.set(row.cp_category, new Set());
        catModels.get(row.cp_category).add(row.cp_model);
      }
      const categories = Array.from(catModels.keys())
        .sort((a, b) => catModels.get(b).size - catModels.get(a).size);
      activeCategory = categories[0] || '';
      renderTabs(categories);

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
