// Чистая логика ранжирования. Браузер: window.Rank. Node: require('./rank.js').
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Rank = api;
})(typeof self !== 'undefined' ? self : this, function () {

  function bordaScore(entry, depth) {
    let s = 0;
    if (entry.ozon) { const r = Number(entry.ozon.rank); if (Number.isFinite(r)) s += (depth + 1 - r); }
    if (entry.wb)   { const r = Number(entry.wb.rank);   if (Number.isFinite(r)) s += (depth + 1 - r); }
    return s;
  }

  // rows -> Map cp_model -> Map group_key -> {ozon?, wb?}
  function groupModels(rows) {
    const models = new Map();
    for (const r of rows) {
      if (!r.cp_model || !r.group_key) continue;
      if (!models.has(r.cp_model)) models.set(r.cp_model, new Map());
      const gks = models.get(r.cp_model);
      if (!gks.has(r.group_key)) gks.set(r.group_key, {});
      const slot = r.marketplace === 'WB' ? 'wb' : 'ozon';
      gks.get(r.group_key)[slot] = r;
    }
    return models;
  }

  function isIphone(model) {
    return /^iphone/i.test((model || '').trim());
  }

  function rankedPrints(gkMap, depth) {
    const arr = [];
    for (const [group_key, entry] of gkMap) {
      arr.push({ group_key, entry, score: bordaScore(entry, depth) });
    }
    arr.sort((a, b) => b.score - a.score || a.group_key.localeCompare(b.group_key));
    return arr;
  }

  function modelScore(gkMap, depth) {
    let s = 0;
    for (const entry of gkMap.values()) s += bordaScore(entry, depth);
    return s;
  }

  function orderModels(models, depth, naturalCompare) {
    return Array.from(models.keys()).sort((a, b) => {
      const ia = isIphone(a), ib = isIphone(b);
      if (ia !== ib) return ia ? -1 : 1;
      const sa = modelScore(models.get(a), depth);
      const sb = modelScore(models.get(b), depth);
      if (sa !== sb) return sb - sa;
      return naturalCompare ? naturalCompare(a, b) : a.localeCompare(b);
    });
  }

  return { bordaScore, groupModels, isIphone, rankedPrints, modelScore, orderModels };
});
