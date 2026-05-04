// ======================================================
// Страница модели: принты + кнопки WB/Ozon
// ======================================================

(function initModelPage() {
  const grid = document.getElementById('prints-grid');
  if (!grid) return;

  const titleEl    = document.getElementById('model-title');
  const eyebrowEl  = document.getElementById('model-eyebrow');
  const countEl    = document.getElementById('prints-count');
  const categoryEl = document.getElementById('model-category');

  const params = new URLSearchParams(window.location.search);
  const modelName = params.get('m');
  const categoryFilter = params.get('cat') || null;

  if (!modelName) {
    titleEl.textContent = 'Модель не указана';
    grid.innerHTML = '<div class="loading">Вернитесь в каталог и выберите модель.</div>';
    return;
  }

  titleEl.textContent = modelName;
  document.title = `${modelName} — Shift Case`;

  if (categoryFilter && categoryEl) {
    categoryEl.textContent = shortCategoryName(categoryFilter);
    categoryEl.hidden = false;
  }

  loadData()
    .then(rows => {
      const prints = rows.filter(r =>
        r.cp_model === modelName &&
        (!categoryFilter || r.cp_category === categoryFilter)
      );

      if (!prints.length) {
        countEl.textContent = '000';
        grid.innerHTML = '<div class="loading">Для этой модели нет принтов.</div>';
        return;
      }

countEl.textContent = String(prints.length).padStart(3, '0');
      eyebrowEl.textContent = `${prints.length} ${pluralize(prints.length, ['принт','принта','принтов'])}`;

      grid.innerHTML = prints.map(row => renderPrintCard(row)).join('');

      // Fallback на сломанные картинки — показываем плейсхолдер
      grid.querySelectorAll('.print-image').forEach(img => {
        img.addEventListener('error', () => {
          img.style.display = 'none';
          const fb = img.parentElement.querySelector('.print-image-fallback');
          if (fb) fb.classList.add('show');
        });
      });
    })
    .catch(err => {
      grid.innerHTML = `<div class="loading" style="color:var(--accent)">Ошибка: ${escapeHtml(err.message)}</div>`;
    });

  function renderPrintCard(row) {
    const imgUrl = printImageUrl(row);

    const ozonBtn = row.sku
      ? `<a class="btn-mp ozon" href="${ozonUrl(row.sku)}" target="_blank" rel="noopener">
           <span class="mp-dot"></span><span>Ozon</span>
         </a>`
      : `<span class="btn-mp ozon disabled" title="Нет на Ozon">
           <span class="mp-dot"></span><span>Ozon</span>
         </span>`;

    const wbBtn = row.nm
      ? `<a class="btn-mp wb" href="${wbUrl(row.nm)}" target="_blank" rel="noopener">
           <span class="mp-dot"></span><span>Wildberries</span>
         </a>`
      : `<span class="btn-mp wb disabled" title="Нет на Wildberries">
           <span class="mp-dot"></span><span>Wildberries</span>
         </span>`;

    return `
      <article class="print-card">
        <div class="print-image-wrap">
          <img class="print-image" src="${escapeHtml(imgUrl)}" alt="принт" loading="lazy" />
          <div class="print-image-fallback">
            <div class="print-image-fallback-mark">◇</div>
            <div>нет превью</div>
          </div>
        </div>
        <div class="print-actions">
          ${ozonBtn}
          ${wbBtn}
        </div>
      </article>`;
  }

  function pluralize(n, forms) {
    const m = Math.abs(n) % 100;
    const m10 = m % 10;
    if (m > 10 && m < 20) return forms[2];
    if (m10 > 1 && m10 < 5) return forms[1];
    if (m10 === 1) return forms[0];
    return forms[2];
  }
})();
