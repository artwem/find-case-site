/* Незаметный селектор магазинов в футере. «Функционал не для всех». */
document.addEventListener('DOMContentLoaded', async () => {
  const footer = document.querySelector('.site-footer .footer-inner');
  if (!footer) return;

  let config, sel;
  try {
    config = await loadShopsConfig();
    sel = getSelectedShops(config);
  } catch (e) { return; }

  const opt = (list, cur) => list.map(s =>
    `<option value="${escapeHtml(s.slug)}"${s.slug === cur ? ' selected' : ''}>${escapeHtml(s.ip)}</option>`
  ).join('');

  const wrap = document.createElement('div');
  wrap.className = 'shop-picker';
  wrap.innerHTML = `
    <details class="shop-picker-details">
      <summary>магазины</summary>
      <label>WB <select id="shop-wb">${opt(config.wb, sel.wb)}</select></label>
      <label>OZON <select id="shop-ozon">${opt(config.ozon, sel.ozon)}</select></label>
    </details>`;
  footer.appendChild(wrap);

  function onChange() {
    setSelectedShops({
      wb: document.getElementById('shop-wb').value,
      ozon: document.getElementById('shop-ozon').value,
    });
    location.reload();
  }
  wrap.querySelector('#shop-wb').addEventListener('change', onChange);
  wrap.querySelector('#shop-ozon').addEventListener('change', onChange);
});
