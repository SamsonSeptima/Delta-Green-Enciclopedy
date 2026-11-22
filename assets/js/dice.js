/* DELTA GREEN — dice engine */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};

  function rnd(sides) { return Math.floor(Math.random() * sides) + 1; }

  function parse(expr) {
    const clean = String(expr || '').replace(/\s+/g, '').replace(/[хХкК]/g, 'd').replace(/[−–—]/g, '-').replace(/\+/g, '+');
    if (!clean) return null;
    if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i.test(clean)) return null;
    const parts = clean.match(/[+-]?[^+-]+/g) || [];
    const dice = [];
    let mod = 0;
    for (const part of parts) {
      const sign = part[0] === '-' ? -1 : 1;
      const token = part.replace(/^[+-]/, '');
      const m = token.match(/^(\d*)d(\d+)$/i);
      if (m) {
        const count = Math.min(parseInt(m[1] || '1', 10), 100);
        const sides = Math.min(parseInt(m[2], 10), 1000);
        if (count < 1 || sides < 2) return null;
        for (let i = 0; i < count; i++) dice.push({ sides, sign });
      } else if (/^\d+$/.test(token)) {
        mod += sign * parseInt(token, 10);
      } else {
        return null;
      }
    }
    if (!dice.length && !mod) return null;
    return { dice, mod, clean };
  }

  function roll(expr) {
    const p = parse(expr);
    if (!p) return { error: 'Не удалось разобрать формулу. Примеры: d100, 1d100, 2d6+2, 1d4−1.' };
    const rolls = p.dice.map(d => ({ sides: d.sides, value: rnd(d.sides), sign: d.sign }));
    let total = p.mod;
    for (const r of rolls) total += r.sign * r.value;
    const detail = rolls.map(r => (r.sign < 0 ? '−' : '') + r.value).join(' + ').replace(/\+ −/g, '−');
    return {
      expr: p.clean,
      total,
      rolls,
      mod: p.mod,
      detail: rolls.length ? detail + (p.mod ? (p.mod > 0 ? ' + ' + p.mod : ' − ' + Math.abs(p.mod)) : '') : String(p.mod),
    };
  }

  const isDouble = n => n % 11 === 0;

  function check(target, mod) {
    const t = Math.max(1, Math.min(99, (parseInt(target, 10) || 0) + (parseInt(mod, 10) || 0)));
    const r = rnd(100);
    const success = r <= t;
    const crit = success && (r === 1 || isDouble(r));
    const fumble = !success && (r === 100 || isDouble(r));
    let label;
    if (r === 1) label = 'КРИТИЧЕСКИЙ УСПЕХ';
    else if (crit) label = 'КРИТИЧЕСКИЙ УСПЕХ';
    else if (r === 100) label = 'КРИТИЧЕСКИЙ ПРОВАЛ';
    else if (fumble) label = 'КРИТИЧЕСКИЙ ПРОВАЛ';
    else if (success) label = 'УСПЕХ';
    else label = 'ПРОВАЛ';
    return { roll: r, target: t, success, crit, fumble, label, mod: parseInt(mod, 10) || 0 };
  }

  function san(current, spec) {
    const cur = Math.max(0, parseInt(current, 10) || 0);
    const s = String(spec || '0/1d6').replace(/\s+/g, '').replace(/[–—−]/g, '-').replace(/[кКD]/g, 'd');
    const parts = s.split('/');
    const lossOk = parts[0] === undefined ? '0' : parts[0];
    const lossFail = parts[1] === undefined ? lossOk : parts[1];
    const r = rnd(100);
    const success = r <= cur;
    const lossSpec = success ? lossOk : lossFail;
    let loss = 0;
    if (/^\d+$/.test(lossSpec)) loss = parseInt(lossSpec, 10);
    else {
      const rr = roll(lossSpec);
      if (!rr.error) loss = Math.max(0, rr.total);
    }
    return { roll: r, current: cur, success, loss, lossSpec, newSan: Math.max(0, cur - loss), spec: s };
  }

  DG.dice = { roll, check, san, parse, rnd };
})();
