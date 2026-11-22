/* DELTA GREEN — печать на официальном бланке (2 страницы, PDF-образ) */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  const P1 = { w: 1829, h: 2292, src: (window.DG_SHEET_IMAGES && window.DG_SHEET_IMAGES.page1) || './assets/sheet/page1.webp' };
  const P2 = { w: 1828, h: 2294, src: (window.DG_SHEET_IMAGES && window.DG_SHEET_IMAGES.page2) || './assets/sheet/page2.webp' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (v, total) => (v / total * 100).toFixed(3) + '%';

  function field(page, x, y, w, h, text, cls) {
    if (text == null || text === '') return '';
    return `<div class="os-field ${cls || ''}" style="left:${pct(x, page.w)};top:${pct(y, page.h)};width:${pct(w, page.w)};height:${pct(h, page.h)}">${esc(text)}</div>`;
  }
  function mark(page, x, y, w, h, symbol) {
    return `<div class="os-mark" style="left:${pct(x, page.w)};top:${pct(y, page.h)};width:${pct(w, page.w)};height:${pct(h, page.h)}">${symbol || 'X'}</div>`;
  }

  // Официальные строки листа: центр строки, левый край чекбокса, центр узкой графы значения.
  const SKILL_ROWS = {
    'Агентурная разведка': { y: 1245, cb: 250, x: 650 },
    'Антропология': { y: 1298, cb: 250, x: 650 },
    'Артиллерия': { y: 1353, cb: 250, x: 650 },
    'Археология': { y: 1407, cb: 250, x: 650 },
    'Атлетика': { y: 1461, cb: 250, x: 650 },
    'Бдительность': { y: 1516, cb: 250, x: 650 },
    'Бухгалтерия': { y: 1570, cb: 250, x: 650 },
    'Бюрократия': { y: 1626, cb: 250, x: 650 },
    'Верховая езда': { y: 1679, cb: 250, x: 650 },
    'Военные науки': { y: 1729, cb: 250, x: 650 },
    'Вождение': { y: 1896, cb: 250, x: 650 },
    'Выживание': { y: 1948, cb: 250, x: 650 },
    'Информатика': { y: 2004, cb: 250, x: 650 },
    'Искусство': { y: 2059, cb: 250, x: 650 },
    'История': { y: 2167, cb: 250, x: 650 },
    'Криминалистика': { y: 1239, cb: 730, x: 1128 },
    'Криминология': { y: 1295, cb: 730, x: 1128 },
    'Маскировка': { y: 1350, cb: 730, x: 1128 },
    'Медицина': { y: 1406, cb: 730, x: 1128 },
    'Навигация': { y: 1455, cb: 730, x: 1128 },
    'Наука': { y: 1512, cb: 730, x: 1128 },
    'Огнестрельное оружие': { y: 1732, cb: 730, x: 1128 },
    'Оккультизм': { y: 1786, cb: 730, x: 1128 },
    'Оружие ближнего боя': { y: 1841, cb: 730, x: 1128 },
    'Первая помощь': { y: 1895, cb: 730, x: 1128 },
    'Пилотирование': { y: 1948, cb: 730, x: 1128 },
    'Плавание': { y: 2057, cb: 730, x: 1128 },
    'Подрывное дело': { y: 2118, cb: 730, x: 1128 },
    'Поиск': { y: 2166, cb: 730, x: 1128 },
    'Психотерапия': { y: 1238, cb: 1210, x: 1606 },
    'Радиоэлектронная разведка': { y: 1293, cb: 1210, x: 1606 },
    'Ремесло': { y: 1345, cb: 1210, x: 1606 },
    'Рукопашный бой': { y: 1457, cb: 1210, x: 1606 },
    'Скрытность': { y: 1514, cb: 1210, x: 1606 },
    'Тяжелая техника': { y: 1565, cb: 1210, x: 1606 },
    'Тяжелое вооружение': { y: 1621, cb: 1210, x: 1606 },
    'Убеждение': { y: 1676, cb: 1210, x: 1606 },
    'Уклонение': { y: 1732, cb: 1210, x: 1606 },
    'Фармацевтика': { y: 1785, cb: 1210, x: 1606 },
    'Хирургия': { y: 1842, cb: 1210, x: 1606 },
    'Юриспруденция': { y: 1897, cb: 1210, x: 1606 },
    'Сверхъестественное': { y: 1946, cb: 1210, x: 1606 },
    'Иностранные языки': { y: 1996, cb: 1210, x: 1606 }
  };
  const ALIAS = {
    'Военная наука': 'Военные науки',
    'Тяжелое оружие': 'Тяжелое вооружение',
    'Иностранный язык': 'Иностранные языки'
  };
  const norm = raw => {
    const s = String(raw || '').replace(/\s*\(.*\)\s*$/, '').trim();
    return ALIAS[s] || s;
  };

  function aggregateSkills(ch) {
    const out = {};
    for (const [key, s] of Object.entries(ch.skills || {})) {
      const name = norm(key);
      const v = Number(s && s.v != null ? s.v : s) || 0;
      const fail = !!(s && s.fail);
      if (!out[name]) out[name] = { v, fail, raw: key };
      else {
        if (v > out[name].v) { out[name].v = v; out[name].raw = key; }
        out[name].fail = out[name].fail || fail;
      }
    }
    return out;
  }

  function build(ch) {
    ch = ch || {};
    const stats = ch.stats || {};
    const hp = ch.hp || {}; const wp = ch.wp || {}; const san = ch.san || {};
    const bonds = ch.bonds || [];
    const skills = aggregateSkills(ch);
    const f1 = [];
    const f2 = [];

    f1.push(field(P1, 245, 198, 735, 17, ch.name || '', 'lead'));
    f1.push(field(P1, 1020, 198, 700, 17, ch.professionName || '', 'lead'));
    f1.push(field(P1, 245, 280, 735, 18, ch.agency || ch.professionName || ''));
    f1.push(field(P1, 1020, 280, 700, 18, ch.nationality || ''));
    f1.push(field(P1, 700, 385, 110, 18, ch.age || '', 'center'));
    f1.push(field(P1, 845, 385, 860, 18, ch.professionName || ''));

    const statRows = [['STR', 466], ['CON', 521], ['DEX', 575], ['INT', 630], ['POW', 684], ['CHA', 739]];
    for (const [k, y] of statRows) {
      const v = Number(stats[k]) || 0;
      f1.push(field(P1, 410, y, 107, 55, v ? String(v) : '', 'center'));
      f1.push(field(P1, 517, y, 105, 55, v ? String(v * 5) : '', 'center'));
    }
    const derRows = [['hp', 837], ['wp', 891], ['san', 945]];
    for (const [k, y] of derRows) {
      const max = Number((ch[k] || {}).max) || 0;
      const cur = Number((ch[k] || {}).cur) || 0;
      f1.push(field(P1, 555, y, 205, 54, max ? String(max) : '', 'center'));
      f1.push(field(P1, 760, y, 70, 54, cur ? String(cur) : '', 'center'));
    }
    f1.push(field(P1, 760, 1001, 70, 54, ch.bp ? String(ch.bp) : '', 'center'));

    bonds.slice(0, 5).forEach((b, i) => {
      const y = 466 + i * 55;
      f1.push(field(P1, 1045, y + 13, 475, 30, b.name || ''));
      f1.push(field(P1, 1535, y, 120, 55, b.value != null ? String(b.value) : '', 'center'));
      if (b.damaged) f1.push(mark(P1, 1012, y + 18, 18, 18));
    });

    const mot = [];
    (ch.motivations || []).slice(0, 5).forEach(m => mot.push('· ' + m));
    if (ch.disorders) mot.push('Расстройства: ' + ch.disorders);
    f1.push(field(P1, 1015, 850, 625, 230, mot.join('\n'), 'small'));

    const appearance = [];
    if (ch.age) appearance.push('Возраст: ' + ch.age);
    if (ch.nationality) appearance.push('Гражданство: ' + ch.nationality);
    if (ch.adapted && (ch.adapted.violence || ch.adapted.helplessness)) {
      appearance.push('Адаптация: ' + [ch.adapted.violence ? 'насилие' : '', ch.adapted.helplessness ? 'беспомощность' : ''].filter(Boolean).join(', '));
    }
    f1.push(field(P1, 245, 1115, 540, 70, appearance.join('\n'), 'small'));

    // отметки адаптации (все три клетки + «адаптир.»)
    if (ch.adapted && ch.adapted.violence) [1112, 1152, 1192, 1237].forEach(x => f1.push(mark(P1, x, 1153, 18, 18)));
    if (ch.adapted && ch.adapted.helplessness) [1365, 1405, 1445, 1485].forEach(x => f1.push(mark(P1, x, 1153, 18, 18)));

    const used = new Set();
    for (const [name, row] of Object.entries(SKILL_ROWS)) {
      const s = skills[name];
      if (!s) continue;
      used.add(name);
      if (s.v > 0) f1.push(field(P1, row.x - 50, row.y - 27, 100, 54, String(s.v), 'center'));
      if (s.fail) f1.push(mark(P1, row.cb, row.y - 10, 18, 18));
    }
    // Свободные навыки: две строки в правой колонке «Иностранные языки и другие навыки».
    const extras = Object.entries(skills).filter(([n, s]) => !used.has(n) && !SKILL_ROWS[n] && s.v > 0).slice(0, 2);
    extras.forEach(([n, s], i) => {
      const y = 1996 + i * 54;
      f1.push(field(P1, 1180, y - 22, 370, 44, n + ' (' + s.v + '%)', 'tiny'));
    });


    // Страница 2
    const wounds = [];
    if (hp.cur != null && hp.max != null && hp.cur < hp.max) wounds.push(`ОЗ: ${hp.cur}/${hp.max}`);
    if (ch.disorders) wounds.push(ch.disorders);
    f2.push(field(P2, 250, 125, 1450, 210, wounds.join('\n'), 'small'));
    f2.push(field(P2, 250, 450, 1450, 340, ch.gear || '', 'small'));

    const wl = String(ch.weapons || '').split('\n').map(s => s.trim()).filter(Boolean);
    const rows = wl.slice(0, 7);
    rows.forEach((line, i) => {
      const y = 880 + i * 58;
      const p = line.split('|').map(x => x.trim());
      const cols = [300, 455, 565, 765, 935, 1095, 1275, 1445];
      const widths = [150, 100, 190, 160, 150, 170, 160, 150];
      if (p.length > 1) {
        p.slice(0, 8).forEach((txt, j) => f2.push(field(P2, cols[j], y + 14, widths[j], 30, txt, 'tiny')));
      } else {
        f2.push(field(P2, 300, y + 14, 1350, 30, line, 'tiny'));
      }
    });
    if (wl.length > 7) {
      f2.push(field(P2, 250, 1230, 1450, 60, wl.slice(7).join('; '), 'tiny'));
    }

    f2.push(field(P2, 250, 1350, 650, 520, ch.notes || '', 'small'));
    const events = bonds.map(b => `${b.name || '—'} — ${b.value != null ? b.value : '—'}${b.damaged ? ' (повреждена)' : ''}`).join('\n');
    f2.push(field(P2, 915, 1350, 780, 440, events, 'small'));
    f2.push(field(P2, 250, 2135, 650, 30, ch.agency || '', 'tiny'));
    f2.push(field(P2, 930, 2135, 700, 30, ch.codename || ch.name || '', 'tiny'));

    return `<div class="official-print" id="official-print">
      <div class="os-page os-page1"><img class="os-bg" src="${P1.src}" alt=""><div class="os-layer">${f1.join('')}</div></div>
      <div class="os-page os-page2"><img class="os-bg" src="${P2.src}" alt=""><div class="os-layer">${f2.join('')}</div></div>
    </div>`;
  }

  function printSheet(ch) {
    let host = document.getElementById('official-print');
    if (host) host.remove();
    document.body.insertAdjacentHTML('beforeend', build(ch));
    document.body.classList.add('printing-official');
    const cleanup = () => {
      document.body.classList.remove('printing-official');
      const h = document.getElementById('official-print');
      if (h) h.remove();
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    // Печать вызывается сразу из обработчика клика: некоторые браузеры
    // блокируют print(), если он вызван из setTimeout без жеста пользователя.
    try {
      window.print();
    } catch (e) {
      cleanup();
      DG.toast('Печать недоступна в этом окне. Используйте кнопку «PDF».', 4200);
      return;
    }
    // страховка для браузеров, которые не присылают afterprint
    setTimeout(cleanup, 60000);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function paintPage(page, bg, idx) {
    const W = bg.naturalWidth || bg.width;
    const H = bg.naturalHeight || bg.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);

    const dpi = W / ((idx === 0 ? 602.64 : 600.96) / 72);
    const fs = cls => {
      if (cls.includes('center')) return 6.6;
      if (cls.includes('small')) return 6.0;
      if (cls.includes('tiny')) return 5.4;
      if (cls.includes('lead')) return 5.9;
      return 6.2;
    };

    for (const el of page.querySelectorAll('.os-field')) {
      const st = el.style;
      if (!st.left || !st.top) continue;
      const x = parseFloat(st.left) / 100 * W;
      const y = parseFloat(st.top) / 100 * H;
      const w = parseFloat(st.width) / 100 * W;
      const h = parseFloat(st.height) / 100 * H;
      const text = el.textContent;
      const pt = fs(el.className);
      const px = pt * dpi / 72;
      const bold = el.className.includes('lead') || el.className.includes('center');
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = '#111';
      ctx.font = `${bold ? '700' : '400'} ${px}px "Courier New", monospace`;
      ctx.textBaseline = 'top';
      const lines = String(text).split('\n');
      if (el.className.includes('center')) {
        const lh = px * 1.2;
        let cy = y + (h - lines.length * lh) / 2;
        for (const line of lines) {
          const tw = ctx.measureText(line).width;
          ctx.fillText(line, x + (w - tw) / 2, cy);
          cy += lh;
        }
      } else {
        let cy = y + 1;
        for (const line of lines) {
          ctx.fillText(line, x, cy);
          cy += px * 1.25;
        }
      }
      ctx.restore();
    }

    for (const el of page.querySelectorAll('.os-mark')) {
      const st = el.style;
      const x = parseFloat(st.left) / 100 * W;
      const y = parseFloat(st.top) / 100 * H;
      const w = parseFloat(st.width) / 100 * W;
      const h = parseFloat(st.height) / 100 * H;
      ctx.fillStyle = '#111';
      ctx.font = `700 ${Math.round(w * 0.9)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.textContent.trim() || 'X', x + w / 2, y + h / 2);
    }
    return canvas;
  }

  async function pdfSheet(ch) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      DG.toast('Модуль PDF не загружен. Обновите страницу.', 4000);
      return;
    }
    DG.toast('Готовлю PDF официального бланка…', 5000);
    try {
      const temp = document.createElement('div');
      temp.innerHTML = build(ch);
      const pages = [...temp.querySelectorAll('.os-page')];
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      for (let i = 0; i < pages.length; i++) {
        const bgSrc = pages[i].querySelector('.os-bg').getAttribute('src');
        const bg = await loadImage(bgSrc);
        const canvas = paintPage(pages[i], bg, i);
        if (i > 0) pdf.addPage();
        const h = 198 * canvas.height / canvas.width;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 6, 6, 198, h);
      }
      const safe = String(ch.codename || ch.name || 'agent').replace(/[\\/:*?"<>|]/g, '_');
      pdf.save('DELTA-GREEN_' + safe + '.pdf');
      DG.toast('PDF сохранён');
    } catch (e) {
      console.error(e);
      DG.toast('Не удалось создать PDF. Попробуйте печать через «Офиц. бланк».', 5000);
    }
  }

  try { [P1.src, P2.src].forEach(src => { const im = new window.Image(); im.src = src; }); } catch (e) {}
  DG.officialSheet = { build, print: printSheet, pdf: pdfSheet };
})();





