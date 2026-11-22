/* DELTA GREEN — statblocks, bestiary, pursuits, tabs */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const attrLabel = { STR: 'СИЛ', CON: 'ТЕЛ', DEX: 'ЛОВ', INT: 'ИНТ', POW: 'ВОЛ', CHA: 'ХАР' };
  const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

  function dangerPips(n) {
    n = Math.max(0, Math.min(5, parseInt(n, 10) || 0));
    return '●'.repeat(n) + '○'.repeat(5 - n);
  }

  DG.statblockHTML = function (e) {
    const key = esc(e.key || e.id || e.name);
    const danger = parseInt(e.danger, 10) || 0;
    const attrs = e.attrs || {};
    const hp = e.hp != null ? e.hp : '—';
    const wp = e.wp != null ? e.wp : '—';
    const san = e.san || e.sanLoss || '—';
    const attacks = e.attacks || [];
    const abilities = e.abilities || [];
    const type = e.type || 'Неестественная угроза';
    const imgKey = esc('bestiary:' + (e.key || e.id || e.name));
    return `<article class="statblock" data-key="${key}" data-danger="${danger}" data-type="${esc(type)}">
      <div class="sb-head">
        <div class="sb-code">УГРОЗА ${esc(e.code || ('DG-' + String(danger || 0).padStart(2, '0')))} // ${esc(e.name)} <span class="danger">${dangerPips(danger)}</span></div>
        <div class="sb-tools">
          <button class="mini" data-img-edit="${key}" title="Прикрепить изображение">ФОТО</button>
          <button class="mini roll" data-roll="1D100" data-target="${(attacks.find(a => a.skill) || {}).skill || 50}" data-label="${esc(e.name)}: проверка">d100</button>
        </div>
      </div>
      <div class="sb-main">
        <figure class="sb-portrait" data-img="${key}" data-imgkey="${imgKey}" title="Нажмите или перетащите изображение">
          <img alt="Изображение: ${esc(e.name)}" hidden>
          <figcaption class="sb-ph">ИЗОБРАЖЕНИЕ<br>НЕ ПРИКРЕПЛЕНО<small>НАЖМИТЕ ИЛИ ПЕРЕТАЩИТЕ<br>ФАЙЛ СЮДА</small></figcaption>
          <button class="sb-del" data-img-del="${key}" title="Удалить изображение">УБРАТЬ</button>
        </figure>
        <div class="sb-core">
          <h3 class="sb-name">${esc(e.name)} ${e.alias ? `<span class="sb-alias">${esc(e.alias)}</span>` : ''}</h3>
          <div class="sb-type">${esc(type)} · УРОВЕНЬ УГРОЗЫ ${ROMAN[danger] || '—'} ${e.custom ? '· ВАША УГРОЗА' : ''}</div>
          <div class="attrs">
            ${['STR', 'CON', 'DEX', 'INT', 'POW', 'CHA'].map(k => `<div class="attr"><span>${attrLabel[k]}</span><b>${attrs[k] != null ? esc(attrs[k]) : '—'}</b></div>`).join('')}
          </div>
          <div class="sb-derived">
            <span>ОЗ <b>${esc(hp)}</b></span><span>ОВ <b>${esc(wp)}</b></span>
            ${e.bp != null ? `<span>ТН <b>${esc(e.bp)}</b></span>` : ''}
            ${e.armor ? `<span>БРОНЯ <b>${esc(e.armor)}</b></span>` : ''}
          </div>
        </div>
      </div>
      <div class="sb-body">
        <div class="sb-col">
          ${attacks.length ? `<h4>АТАКИ</h4><div class="table-wrap" style="margin:0 0 8px"><table class="tbl compact">
            <thead><tr><th>АТАКА</th><th class="num">%</th><th>УРОН</th><th class="num">БП</th><th></th></tr></thead>
            <tbody>${attacks.map(a => `<tr>
              <td>${esc(a.name)}</td>
              <td class="num">${esc(a.skill)}</td>
              <td class="mono">${esc(a.dmg || a.damage || '—')}</td>
              <td class="num">${esc(a.ap || 0)}</td>
              <td>${a.skill ? `<button class="roll" data-roll="1D100" data-target="${esc(a.skill)}" data-label="${esc(e.name)}: ${esc(a.name)}">бросок</button>` : '—'}</td>
            </tr>`).join('')}</tbody>
          </table></div>` : ''}
          ${abilities.length ? `<h4>СПОСОБНОСТИ</h4><ul class="sb-abilities">${abilities.map(a => `<li><b>${esc(a.name)}.</b> ${esc(a.text)}</li>`).join('')}</ul>` : ''}
        </div>
        <aside class="sb-side">
          <div class="sb-san">ПОТЕРЯ РАССУДКА <b>${esc(san)}</b></div>
          ${e.desc ? `<p class="sb-desc">${esc(e.desc)}</p>` : ''}
          ${e.skills ? `<p class="sb-armor" style="margin-top:8px">${esc(e.skills)}</p>` : ''}
          <div class="sb-tags tags">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            ${e.custom ? `<span class="tag red">СОЗДАНО КУРАТОРОМ</span>` : ''}
          </div>
        </aside>
      </div>
    </article>`;
  };

  /* ---------------- Images ---------------- */
  async function refreshFigure(fig) {
    const key = fig.dataset.imgkey || ('bestiary:' + fig.dataset.img);
    const img = fig.querySelector('img');
    const ph = fig.querySelector('.sb-ph');
    const u = await DG.media.url(key);
    if (u) {
      img.src = u; img.hidden = false; if (ph) ph.style.display = 'none';
      fig.classList.add('has-img');
    } else {
      img.hidden = true; if (ph) ph.style.display = '';
      fig.classList.remove('has-img');
    }
  }

  function refreshAllFigures(key) {
    document.querySelectorAll('[data-imgkey]').forEach(fig => {
      if (!key || fig.dataset.imgkey === 'bestiary:' + key || fig.dataset.img === key) refreshFigure(fig);
    });
  }
  DG.refreshAllFigures = refreshAllFigures;

  async function attachImage(key, file) {
    if (!file) return;
    const blob = await DG.media.compress(file, 1000, .85);
    if (!blob) { DG.toast('Не удалось прочитать изображение'); return; }
    const ok = await DG.media.set('bestiary:' + key, blob);
    if (!ok) { DG.toast('Не удалось сохранить изображение: хранилище переполнено'); return; }
    DG.media.revoke('bestiary:' + key);
    refreshAllFigures(key);
    DG.toast('Изображение прикреплено');
  }

  /* ---------------- Bestiary ---------------- */
  let bestState = { danger: 0, q: '', custom: true };
  let bestHost = null;

  function bestiaryEntities() {
    const base = (window.DG_BESTIARY || []).slice();
    const custom = (window.DGThreats && DGThreats.customEntities) ? DGThreats.customEntities() : [];
    return base.concat(custom).sort((a, b) => (parseInt(a.danger, 10) || 0) - (parseInt(b.danger, 10) || 0) || String(a.name).localeCompare(String(b.name), 'ru'));
  }

  function bestiaryFiltered() {
    const q = bestState.q.toLowerCase().replace(/ё/g, 'е').trim();
    return bestiaryEntities().filter(e => {
      if (!bestState.custom && e.custom) return false;
      if (bestState.danger && (parseInt(e.danger, 10) || 0) !== bestState.danger) return false;
      if (!q) return true;
      const hay = (e.name + ' ' + (e.alias || '') + ' ' + (e.type || '') + ' ' + (e.desc || '')).toLowerCase().replace(/ё/g, 'е');
      return hay.includes(q);
    });
  }

  function renderBestiary() {
    if (!bestHost) return;
    const all = bestiaryEntities();
    const list = bestiaryFiltered();
    const countBox = bestHost.querySelector('[data-best-count]');
    if (countBox) countBox.textContent = `${list.length} / ${all.length}`;
    const listBox = bestHost.querySelector('[data-best-list]');
    if (!listBox) return;
    if (!list.length) {
      listBox.innerHTML = `<div class="empty" style="border:1px dashed #b6a98b;color:#7a7158;background:rgba(255,255,255,.2)">НИЧЕГО НЕ НАЙДЕНО<br>Сбросьте фильтр или измените запрос.</div>`;
      return;
    }
    listBox.innerHTML = list.map(e => DG.statblockHTML(e)).join('');
    listBox.querySelectorAll('[data-img]').forEach(refreshFigure);
  }

  function mountBestiary(el) {
    bestHost = el;
    if (DG.routeQuery && DG.routeQuery.q) {
      bestState = { danger: 0, q: DG.routeQuery.q, custom: true };
      DG.routeQuery = null;
    } else {
      bestState = { danger: 0, q: '', custom: true };
    }
    el.innerHTML = `<div class="bestiary-bar">
      <span class="lbl">Угроза:</span>
      <button class="chip ${bestState.danger === 0 ? 'is-on' : ''}" data-bd="0">Все</button>
      ${[1, 2, 3, 4, 5].map(n => `<button class="chip ${bestState.danger === n ? 'is-on' : ''}" data-bd="${n}">${ROMAN[n]}</button>`).join('')}
      <span class="lbl" style="margin-left:8px">Поиск:</span>
      <input class="bestiary-search" data-best-q placeholder="имя, тип…" value="${esc(bestState.q)}">
      <button class="chip ${bestState.custom ? 'is-on' : ''}" data-best-custom>Мои угрозы</button>
      <span class="bestiary-count" data-best-count></span>
    </div>
    <div data-best-list></div>`;
    renderBestiary();
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-bd], [data-best-custom]');
      if (t && t.dataset.bd != null) {
        bestState.danger = +t.dataset.bd;
        el.querySelectorAll('[data-bd]').forEach(b => b.classList.toggle('is-on', +b.dataset.bd === bestState.danger));
        renderBestiary();
      }
      if (t && t.hasAttribute('data-best-custom')) {
        bestState.custom = !bestState.custom;
        t.classList.toggle('is-on', bestState.custom);
        renderBestiary();
      }
    });
    el.addEventListener('input', e => {
      if (e.target.hasAttribute('data-best-q')) {
        bestState.q = e.target.value;
        renderBestiary();
      }
    });
  }
  DG.refreshBestiary = renderBestiary;

  /* ---------------- Pursuits ---------------- */
  const PURSUITS = [
    { id: 'duty', name: 'Выполнить обязательства', cost: 'Ничего', roll: 'SAN', target: 'san', effect: 'Провал: −1D4 к Связи. Неудача: без эффекта. Успех: +1D6 к Связи. Крит: +1D6 к Связи и +1 ОР.' },
    { id: 'nature', name: 'Вернуться к природе', cost: '−1 к Связи вне DG', roll: 'SAN', target: 'san', effect: 'Провал: −1D4 ОР. Неудача: без эффекта. Успех: +1D4 ОР. Крит: +4 ОР.' },
    { id: 'newbond', name: 'Завести новую Связь', cost: '−1D4 к Связи вне DG', roll: 'ХАР×5', target: 'cha5', effect: 'Неудача: без эффекта. Успех: новая Связь со значением ½ ХАР. Крит: то же, значение ХАР.' },
    { id: 'therapy-true', name: 'Терапия: говорить правду', cost: '−1 к Связи вне DG', roll: 'Удача или Психотерапия', target: 'luck', effect: 'Провал: −1 ОР. Неудача: без эффекта. Успех: +1D6 ОР. Крит: +6 ОР и ремиссия расстройства; Связь с терапевтом ½ ХАР.' },
    { id: 'therapy-false', name: 'Терапия: скрывать правду', cost: '−1 к Связи вне DG', roll: 'Удача или Психотерапия', target: 'luck', effect: 'Провал: −1 ОР. Неудача: без эффекта. Успех: +1D4 ОР. Крит: +4 ОР и ремиссия расстройства; Связь с терапевтом ½ ХАР.' },
    { id: 'improve', name: 'Улучшить навык или характеристику', cost: '−1 к Связи вне DG', roll: 'Навык/характеристика', target: 'skill', effect: 'Неудача: +1 к характеристике или +1D10 к навыку. Успех/крит: без эффекта.' },
    { id: 'indulge', name: 'Потворствовать мотивации', cost: '−1 к Связи вне DG', roll: 'SAN', target: 'san', effect: 'Провал: −1 ОР. Неудача: без эффекта. Успех: +1 ОР. Крит: +1D4 ОР.' },
    { id: 'training', name: 'Специальная подготовка', cost: '−1 к Связи вне DG', roll: 'Нет', target: 'none', effect: 'Получить специальную подготовку: новый навык или трюк, согласованный с куратором.' },
    { id: 'case', name: 'Остаться на деле', cost: '−1 к Связи вне DG и +1D6−3 ОР', roll: 'Криминология или Оккультизм (тайно)', target: 'skill', effect: 'Провал: опасная ложная зацепка. Неудача: без эффекта. Успех: важная зацепка. Крит: исключительно ценная зацепка.' },
    { id: 'study', name: 'Изучать Неестественное', cost: '−1D4 к Связи вне DG', roll: 'Зависит от источника', target: 'none', effect: 'Эффект и потеря ОР зависят от источника: том, артефакт, свидетель. Куратор определяет результат.' }
  ];

  function mountPursuits(el) {
    const chars = (window.DGChar && DGChar.list()) ? DGChar.list() : [];
    const state = DG.store.get('pursuitLog', {});
    let activeId = (DGChar.active && DGChar.active.id) || (chars[0] && chars[0].id) || '';
    const ch = () => chars.find(c => c.id === activeId);

    function targetFor(p) {
      const c = ch();
      if (!c) return 50;
      if (p.target === 'san') return c.san.cur;
      if (p.target === 'cha5') return c.stats.CHA * 5;
      if (p.target === 'luck') return 50;
      return 50;
    }

    function draw() {
      const c = ch();
      el.innerHTML = `<div class="tool">
        <div class="tool-head"><b>Домашние сцены</b><span>PERSONAL PURSUITS SUMMARY</span>
          <div class="th-right"><span class="mono" style="font-size:7px">МЕЖДУ ОПЕРАЦИЯМИ</span></div>
        </div>
        <div class="tool-body">
          <div class="input-row" style="margin-bottom:10px">
            <div class="field" style="flex:2"><label>Агент</label>
              <select class="select" data-pc-char>
                <option value="">— без привязки —</option>
                ${chars.map(c2 => `<option value="${c2.id}" ${c2.id === activeId ? 'selected' : ''}>${esc(c2.name)}${c2.codename ? ' / ' + esc(c2.codename) : ''}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="flex:1"><label>Текущий ОР</label><input class="input" value="${c ? c.san.cur : '—'}" readonly></div>
            <div class="field" style="flex:1"><label>ХАР×5</label><input class="input" value="${c ? c.stats.CHA * 5 : '—'}" readonly></div>
          </div>
          ${!chars.length ? `<div class="callout note" style="background:rgba(157,196,124,.06);border-color:#59684a;color:#a9b79a"><span class="callout-t" style="color:#9dc47c">Нет агентов</span>Создайте агента в разделе «Вербовка → Генератор», чтобы привязать результаты к листу.</div>` : ''}
          <div class="pursuit-grid">
            ${PURSUITS.map(p => `<div class="pursuit-card">
              <div class="pc-h"><b>${esc(p.name)}</b></div>
              <p>${esc(p.effect)}</p>
              <div class="pc-f" style="justify-content:space-between">
                <span>ЦЕНА: ${esc(p.cost)}</span>
                <button class="dc-btn" data-pursue="${p.id}" ${p.target === 'none' ? 'disabled' : ''}>${p.target === 'none' ? 'БЕЗ БРОСКА' : 'd100 ≤ ' + targetFor(p)}</button>
              </div>
              <div class="mono" data-pres="${p.id}" style="font-size:8px;color:#6f9660;margin-top:4px"></div>
            </div>`).join('')}
          </div>
          <div class="hr"></div>
          <h4 style="color:#9dc47c">Журнал сцен</h4>
          <div data-plog>
            ${(state[activeId] || []).length ? (state[activeId] || []).slice().reverse().map(x => `<div class="threat-item" style="margin-bottom:4px"><div class="ti-h"><b>${esc(x.name)}</b><span class="tag">${esc(x.result)}</span></div><div class="ti-stats">${esc(x.date)} · ОР ${x.san}</div></div>`).join('') : `<div class="empty">СЦЕН ЕЩЁ НЕ БЫЛО<br>Выберите занятие и сделайте бросок — результат можно записать в журнал.</div>`}
          </div>
        </div>
      </div>`;
      bind();
    }

    function bind() {
      const sel = el.querySelector('[data-pc-char]');
      if (sel) sel.addEventListener('change', () => { activeId = sel.value; draw(); });
      el.querySelectorAll('[data-pursue]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = PURSUITS.find(x => x.id === btn.dataset.pursue);
          if (!p) return;
          const c = ch();
          const target = targetFor(p);
          const r = DG.dice.check(target, 0);
          const res = r.crit ? 'КРИТ' : (r.success ? 'УСПЕХ' : (r.fumble ? 'ПРОВАЛ' : 'НЕУДАЧА'));
          const box = el.querySelector(`[data-pres="${p.id}"]`);
          if (box) box.innerHTML = `БРОСОК ${r.roll} / ${target} → <b style="color:${r.success ? '#9dc47c' : '#ff9a8a'}">${res}</b> <button class="dc-btn" data-precord="${p.id}" data-presult="${res}" style="padding:1px 4px;margin-left:4px">в журнал</button>`;
        });
      });
      el.querySelectorAll('[data-precord]').forEach(b => {
        b.addEventListener('click', () => {
          const p = PURSUITS.find(x => x.id === b.dataset.precord);
          const c = ch();
          const entry = { name: p.name, result: b.dataset.presult, date: new Date().toLocaleDateString('ru-RU'), san: c ? c.san.cur : '—' };
          const all = DG.store.get('pursuitLog', {});
          if (!all[activeId]) all[activeId] = [];
          all[activeId].push(entry);
          DG.store.set('pursuitLog', all);
          state[activeId] = all[activeId];
          draw();
          DG.toast('Записано в журнал');
        });
      });
    }
    draw();
  }

  /* ---------------- Tabs ---------------- */
  function mountTabs(scope) {
    scope.querySelectorAll('[data-tabs]').forEach(box => {
      if (box.dataset.bound) return;
      box.dataset.bound = '1';
      const tabs = Array.from(box.querySelectorAll('.tab'));
      const panels = Array.from(box.querySelectorAll('.tabpanel'));
      tabs.forEach(t => t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.toggle('is-on', x === t));
        panels.forEach(p => p.classList.toggle('is-on', p.id === t.dataset.tab));
      }));
    });
  }

  /* ---------------- Mount ---------------- */
  DG.mountTools = function (scope) {
    if (!scope) return;
    scope.querySelectorAll('[data-tool]').forEach(el => {
      const t = el.dataset.tool;
      if (t === 'bestiary') mountBestiary(el);
      else if (t === 'pursuits') mountPursuits(el);
      else if (t === 'threatgen' && window.DGThreats) DGThreats.mount(el);
      else if (window.DGChar) DGChar.mount(el);
    });
    mountTabs(scope);
  };
  DG.mountAll = function (scope) {
    // replace data-driven tools with clean nodes so no stale listeners remain
    if (!scope) return;
    scope.querySelectorAll('[data-tool="chardb"], [data-tool="charsheet"]').forEach(el => {
      const fresh = el.cloneNode(false);
      fresh.innerHTML = '';
      el.parentNode.replaceChild(fresh, el);
    });
    DG.mountTools(scope);
    document.querySelectorAll('[data-img]').forEach(refreshFigure);
  };

  /* ---------------- Global image + figure events ---------------- */
  document.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-img-del]');
    if (del) {
      e.preventDefault(); e.stopPropagation();
      const key = del.dataset.imgDel;
      await DG.media.del('bestiary:' + key);
      DG.media.revoke('bestiary:' + key);
      refreshAllFigures(key);
      DG.toast('Изображение удалено');
      return;
    }
    const ed = e.target.closest('[data-img-edit]');
    const fig = e.target.closest('[data-img]');
    if (ed || (fig && !e.target.closest('.sb-del'))) {
      e.preventDefault();
      const key = ed ? ed.dataset.imgEdit : fig.dataset.img;
      const f = await DG.media.pick();
      if (f) attachImage(key, f);
    }
  });

  document.addEventListener('dragover', (e) => {
    const fig = e.target.closest('[data-img]');
    if (fig) { e.preventDefault(); fig.classList.add('drag'); }
  });
  document.addEventListener('dragleave', (e) => {
    const fig = e.target.closest('[data-img]');
    if (fig) fig.classList.remove('drag');
  });
  document.addEventListener('drop', (e) => {
    const fig = e.target.closest('[data-img]');
    if (!fig) return;
    e.preventDefault(); fig.classList.remove('drag');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) attachImage(fig.dataset.img, f);
  });

  DG.PURSUITS = PURSUITS;
})();
