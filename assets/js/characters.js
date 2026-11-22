/* DELTA GREEN — character generator, character sheet, roster */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  const store = DG.store;

  const SKILLS = [
    ['Атлетика', 30], ['Бдительность', 20], ['Бухгалтерия', 10], ['Бюрократия', 10],
    ['Антропология', 0], ['Археология', 0], ['Артиллерия', 0], ['Агентурная разведка', 10],
    ['Вождение', 20], ['Выживание', 10], ['Иностранный язык', 0], ['Информатика', 0],
    ['Искусство', 0], ['История', 10], ['Криминалистика', 0], ['Криминология', 10],
    ['Медицина', 0], ['Маскировка', 10], ['Навигация', 10], ['Наука', 0],
    ['Оккультизм', 10], ['Огнестрельное оружие', 20], ['Оружие ближнего боя', 30],
    ['Первая помощь', 10], ['Пилотирование', 0], ['Подрывное дело', 0], ['Поиск', 20],
    ['Психотерапия', 10], ['Радиоэлектронная разведка', 0], ['Ремесло', 0],
    ['Рукопашный бой', 40], ['Скрытность', 10], ['Тяжелая техника', 10], ['Тяжелое оружие', 0],
    ['Убеждение', 20], ['Уклонение', 30], ['Фармацевтика', 0], ['Хирургия', 0],
    ['Юриспруденция', 0], ['Военная наука', 0], ['Плавание', 20], ['Верховая езда', 10]
  ];
  const BASE = new Map(SKILLS);

  function baseFor(name) {
    if (BASE.has(name)) return BASE.get(name);
    const root = String(name).replace(/\s*\(.*$/, '');
    return BASE.has(root) ? BASE.get(root) : 0;
  }

  const AGENCIES = [
    'ФБР', 'ЦРУ', 'АНБ', 'Управление по борьбе с наркотиками (DEA)', 'ATF', 'Секретная служба США',
    'Разведывательное управление Минобороны (DIA)', 'Армия США', 'ВМС США', 'ВВС США', 'Морская пехота США',
    'Пограничная служба', 'CDC', 'EPA', 'Госдепартамент', 'Местная полиция', 'Шериф округа',
    'Частная военная компания', 'Корпорация / НКО', 'Иное'
  ];

  const PROFESSIONS = window.DG_PROFESSIONS || [];
  const profById = new Map(PROFESSIONS.map(p => [p.id, p]));

  const uid = () => 'ch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function derived(stats) {
    const STR = num(stats.STR, 10), CON = num(stats.CON, 10), POW = num(stats.POW, 10);
    const hp = Math.ceil((STR + CON) / 2);
    const wp = POW;
    const san = POW * 5;
    return { hp, wp, san, bp: san - wp };
  }

  /* ---------------- Wizard ---------------- */
  let W = null; // {host, step, draft}

  function newDraft() {
    return {
      id: null,
      name: '', codename: '', age: '', nationality: '', agency: '', professionId: '',
      stats: { STR: 10, CON: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 },
      method: 'roll', pool: [], assign: {},
      skills: {}, choiceSel: {},
      bonds: [], motivations: ['', '', '', '', ''],
      adapted: { violence: false, helplessness: false },
      disorders: '', weapons: '', gear: '', notes: '',
      hpCur: null, wpCur: null, sanCur: null,
      createdAt: null
    };
  }

  function rollPool() {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const r = [DG.dice.rnd(6), DG.dice.rnd(6), DG.dice.rnd(6), DG.dice.rnd(6)].sort((a, b) => b - a);
      out.push(r[0] + r[1] + r[2]);
    }
    return out;
  }

  function ensureSkills(d) {
    const out = {};
    for (const [k, b] of SKILLS) {
      const cur = d.skills[k];
      out[k] = cur ? { prof: cur.prof || 0, bonus: cur.bonus || 0, custom: !!cur.custom, base: b, fail: !!cur.fail } : { prof: 0, bonus: 0, custom: false, base: b, fail: false };
    }
    for (const k of Object.keys(d.skills)) {
      if (!out[k]) out[k] = { ...d.skills[k], base: baseFor(k) };
    }
    d.skills = out;
  }

  function skillValue(s) {
    const base = s.custom ? 0 : (s.base != null ? s.base : 0);
    const start = Math.max(base, s.prof || 0);
    return Math.min(80, start + (s.bonus || 0) * 20);
  }

  function bonusUsed(d) { return Object.values(d.skills).reduce((a, s) => a + (s.bonus || 0), 0); }

  function bondsCount(d) {
    const p = profById.get(d.professionId);
    return p ? p.bonds : 3;
  }

  function applyProfession(d) {
    const p = profById.get(d.professionId);
    if (!p) return;
    ensureSkills(d);
    for (const [k, v] of p.skills) {
      if (!d.skills[k]) d.skills[k] = { prof: 0, bonus: 0, base: baseFor(k), fail: false };
      d.skills[k].prof = Math.max(d.skills[k].prof || 0, v);
    }
    (p.choices || []).forEach((ch, i) => {
      const sel = d.choiceSel[i] || 0;
      const opt = ch.options[sel] || ch.options[0];
      if (!opt) return;
      const [k, v] = opt;
      if (!d.skills[k]) d.skills[k] = { prof: 0, bonus: 0, base: baseFor(k), fail: false };
      d.skills[k].prof = Math.max(d.skills[k].prof || 0, v);
    });
    const n = p.bonds;
    while (d.bonds.length < n) d.bonds.push({ name: '', value: num(d.stats.CHA, 10), damaged: false });
    if (d.bonds.length > Math.max(n, 4)) d.bonds = d.bonds.slice(0, Math.max(n, 4));
  }

  function mountWizard(host) {
    if (!W || W.host !== host) W = { host, step: 0, draft: newDraft() };
    host.innerHTML = wizardShell();
    bindWizard(host);
  }

  function wizardShell() {
    const d = W.draft;
    const steps = ['Личные данные', 'Характеристики', 'Профессия', 'Навыки', 'Связи', 'Проверка'];
    const tabs = steps.map((s, i) => `<button type="button" data-wstep="${i}" class="${i === W.step ? 'is-on' : ''} ${i < W.step ? 'is-done' : ''}">${i + 1}. ${s}</button>`).join('');
    return `<div class="tool" data-wizard>
      <div class="tool-head"><b>Генератор агента</b><span>DELTA GREEN // RECRUITMENT</span>
        <div class="th-right"><button class="mini" data-warchive>Архив</button><button class="mini" data-wnew>Сбросить</button></div>
      </div>
      <div class="tool-body">
        <div class="wiz-steps">${tabs}</div>
        <div id="wiz-body">${wizardStep()}</div>
        <div class="wiz-nav">
          <button class="btn ghost sm" data-wprev ${W.step === 0 ? 'disabled' : ''}>← Назад</button>
          ${W.step < 5 ? `<button class="btn sm" data-wnext>Далее →</button>` : `<button class="btn red sm" data-wsave>Сохранить в архив</button>`}
          <span class="mono" style="margin-left:auto;color:#6f7a63;font-size:8px;align-self:center">ЧЕРНОВИК НЕ СОХРАНЁН</span>
        </div>
      </div>
    </div>`;
  }

  function wizardStep() {
    const d = W.draft;
    switch (W.step) {
      case 0: return stepIdentity(d);
      case 1: return stepStats(d);
      case 2: return stepProfession(d);
      case 3: return stepSkills(d);
      case 4: return stepBonds(d);
      default: return stepReview(d);
    }
  }

  function stepIdentity(d) {
    return `<div class="wiz-panel is-on">
      <p class="mono" style="font-size:9px;color:#7e8770;letter-spacing:.06em;margin-bottom:12px">ШАГ 1 // КТО ВЫ, КОГДА НЕ РАБОТАЕТЕ НА ГРУППУ</p>
      <div class="input-row">
        <div class="field"><label>Имя и фамилия</label><input class="input" data-wf="name" value="${esc(d.name)}" placeholder="Например: Аарон Блэк"></div>
        <div class="field"><label>Оперативный псевдоним</label><input class="input" data-wf="codename" value="${esc(d.codename)}" placeholder="Агент ДЭРИЛ"></div>
      </div>
      <div class="input-row">
        <div class="field"><label>Возраст</label><input class="input" data-wf="age" value="${esc(d.age)}" placeholder="34"></div>
        <div class="field"><label>Гражданство</label><input class="input" data-wf="nationality" value="${esc(d.nationality)}" placeholder="США"></div>
        <div class="field"><label>Ведомство / организация</label>
          <select class="select" data-wf="agency">
            <option value="">— не указано —</option>
            ${AGENCIES.map(a => `<option ${d.agency === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="callout note" style="margin-top:6px"><span class="callout-t">Куратору</span>
        Имя, псевдоним и ведомство можно изменить позже в листе персонажа. Псевдоним — то, что видят другие агенты; настоящее имя знает только куратор.</div>
    </div>`;
  }

  function stepStats(d) {
    const der = derived(d.stats);
    const attrs = ['STR', 'CON', 'DEX', 'INT', 'POW', 'CHA'];
    const labels = { STR: 'СИЛ', CON: 'ТЕЛ', DEX: 'ЛОВ', INT: 'ИНТ', POW: 'ВОЛ', CHA: 'ХАР' };
    let controls;
    if (d.method === 'roll') {
      const pool = d.pool.length ? d.pool : [];
      const boxes = pool.length
        ? pool.map((v, i) => `<div class="roll-box"><div class="rb-l">КОСТЬ ${i + 1}</div><div class="rb-v">${v}</div><div class="rb-s">4d6 − мин.</div></div>`).join('')
        : `<div class="roll-box" style="grid-column:1/-1;text-align:left"><div class="rb-l">ПУЛ НЕ БРОШЕН</div><div class="rb-s">Нажмите «Бросить 4d6×6» — затем распределите результаты.</div></div>`;
      const used = Object.values(d.assign);
      controls = `<div class="attr-rolls">${boxes}</div>
        <div style="display:flex;gap:8px;margin:10px 0 14px"><button class="btn sm" data-wroll>Бросить 4d6×6</button>
        <button class="btn ghost sm" data-wclearroll>Очистить</button></div>
        <div class="grid g2" style="gap:8px">${attrs.map(a => {
          const idx = d.assign[a];
          return `<div class="assign-row"><span class="ar-l">${labels[a]}</span>
            <select class="select" data-wassign="${a}">
              <option value="">—</option>
              ${pool.map((v, i) => `<option value="${i}" ${idx === i ? 'selected' : ''} ${used.includes(i) && idx !== i ? 'disabled' : ''}>${v}</option>`).join('')}
            </select></div>`;
        }).join('')}</div>
        <p class="mono" style="font-size:8px;color:#6f7a63;margin-top:8px">4d6, отбросить меньший. Среднее 10–12; 18 — предел человеческого.</p>`;
    } else {
      const total = attrs.reduce((a, k) => a + num(d.stats[k], 0), 0);
      controls = `<div class="grid g3" style="gap:8px">${attrs.map(a => `<div class="field"><label>${labels[a]}</label>
        <input class="input" type="number" min="3" max="18" value="${num(d.stats[a], 10)}" data-wstat="${a}"></div>`).join('')}</div>
        <p class="mono" style="font-size:9px;color:${d.method === 'points' && total !== 72 ? '#ff9a8a' : '#8fbf78'};margin-top:8px">
          ${d.method === 'points' ? `Распределено: ${total} / 72` : 'Ручной ввод: следите, чтобы значения оставались в пределах 3–18.'}</p>`;
    }
    return `<div class="wiz-panel is-on">
      <div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">
        <button class="chip ${d.method === 'roll' ? 'is-on' : ''}" data-wmethod="roll">Броски 4d6</button>
        <button class="chip ${d.method === 'points' ? 'is-on' : ''}" data-wmethod="points">72 очка</button>
        <button class="chip ${d.method === 'manual' ? 'is-on' : ''}" data-wmethod="manual">Вручную</button>
      </div>
      ${controls}
      <div class="derived-live">
        <div><span>ОЗ</span><b>${der.hp}</b></div>
        <div><span>ОВ</span><b>${der.wp}</b></div>
        <div><span>ОР</span><b>${der.san}</b></div>
        <div><span>ТОЧКА НАДЛОМА</span><b>${der.bp}</b></div>
      </div>
      <p class="mono" style="font-size:8px;color:#6f7a63;margin-top:8px">ОЗ = (СИЛ+ТЕЛ)/2 ↑ · ОВ = ВОЛ · ОР = ВОЛ×5 · ТН = ОР−ВОЛ</p>
    </div>`;
  }

  function stepProfession(d) {
    const p = profById.get(d.professionId);
    const opts = PROFESSIONS.map(x => `<option value="${x.id}" ${d.professionId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    let detail = `<p class="mono" style="font-size:9px;color:#6f7a63">Выберите профессию — она задаст стартовые навыки и число связей. Позже значения можно править вручную.</p>`;
    if (p) {
      detail = `<div class="card dark" style="margin:10px 0">
        <div class="card-h">${esc(p.name)} <span class="card-tag">СВЯЗИ: ${p.bonds} · ${esc(p.req || '')}</span></div>
        <div class="card-b"><p style="font-size:12px;color:#b9b29a">${esc(p.desc)}</p>
        <div class="tags" style="margin-top:8px">${p.skills.map(([k, v]) => `<span class="tag">${esc(k)} ${v}%</span>`).join('')}</div></div>
      </div>
      ${(p.choices || []).length ? `<h4 style="color:#9dc47c">Выбор специальностей</h4>
        <div class="grid g2" style="gap:8px">${p.choices.map((ch, i) => `<div class="field"><label>${esc(ch.label)}</label>
          <select class="select" data-wchoice="${i}">${ch.options.map((o, j) => `<option value="${j}" ${(d.choiceSel[i] || 0) === j ? 'selected' : ''}>${esc(o[0])} ${o[1]}%</option>`).join('')}</select></div>`).join('')}</div>` : ''}
        <button class="btn red sm" data-wapply style="margin-top:6px">Применить профессию</button>`;
    }
    return `<div class="wiz-panel is-on">
      <div class="input-row">
        <div class="field" style="flex:2"><label>Профессия</label><select class="select" data-wprof>${opts}</select></div>
        <div class="field" style="flex:1"><label>Ведомство</label><select class="select" data-wf="agency"><option value="">—</option>${AGENCIES.map(a => `<option ${d.agency === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
      </div>
      ${detail}
    </div>`;
  }

  function stepSkills(d) {
    ensureSkills(d);
    const rows = Object.keys(d.skills).sort((a, b) => {
      const va = d.skills[a].prof || d.skills[a].bonus ? 1 : 0;
      const vb = d.skills[b].prof || d.skills[b].bonus ? 1 : 0;
      return vb - va || a.localeCompare(b, 'ru');
    });
    const used = bonusUsed(d);
    const canAdd = used < 8;
    return `<div class="wiz-panel is-on">
      <div class="points-bar">
        <span>БОНУСЫ +20%: <b>${used} / 8</b></span>
        <span>ПОТРАЧЕНО: <b>${used * 20}%</b></span>
        <span>ПРЕДЕЛ СОЗДАНИЯ: <b>80%</b></span>
      </div>
      <div class="skill-scroll">
        <table class="tbl compact" style="min-width:0">
          <thead><tr><th>НАВЫК</th><th class="num">БАЗА</th><th class="num">ПРОФ</th><th class="num">ИТОГ</th><th class="c">+20</th></tr></thead>
          <tbody>${rows.map(k => {
            const s = d.skills[k]; const v = skillValue(s);
            return `<tr data-srow="${esc(k)}">
              <td>${esc(k)}${s.custom ? ' <span class="tag">свой</span>' : ''}</td>
              <td class="num">${s.base || 0}</td>
              <td class="num">${s.prof ? s.prof + '%' : '—'}</td>
              <td class="num"><b style="color:#d8eac8">${v}%</b></td>
              <td class="c" style="white-space:nowrap">
                <button class="dc-btn" data-wbonus="${esc(k)}" ${!canAdd || v >= 80 ? 'disabled' : ''} style="padding:2px 5px">+</button>
                ${s.bonus ? `<button class="dc-btn" data-wunbonus="${esc(k)}" style="padding:2px 5px">−</button>` : ''}
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="dc-row" style="margin-top:10px">
        <input class="input" id="wiz-custom-name" placeholder="Свой навык (язык, ремесло, наука)" style="flex:2">
        <input class="input" id="wiz-custom-val" type="number" value="40" min="1" max="80" style="flex:0 0 70px">
        <button class="dc-btn" data-wcustom>Добавить</button>
      </div>
      <p class="mono" style="font-size:8px;color:#6f7a63;margin-top:6px">Ни один навык при создании не может превышать 80%. Каждая неудача в игре отмечается в листе и даёт +1% в конце сессии.</p>
    </div>`;
  }

  function stepBonds(d) {
    const need = bondsCount(d);
    if (!d.bonds.length) {
      for (let i = 0; i < need; i++) d.bonds.push({ name: '', value: num(d.stats.CHA, 10), damaged: false });
    }
    return `<div class="wiz-panel is-on">
      <p class="mono" style="font-size:9px;color:#7e8770;margin-bottom:10px">СВЯЗИ // ПРОФЕССИЯ ДАЁТ ${need} СВЯЗЕЙ. СТАРТОВОЕ ЗНАЧЕНИЕ = ХАР (${d.stats.CHA}).</p>
      <div class="bonds-list">
        ${d.bonds.map((b, i) => `<div class="bond-row">
          <input class="input" data-wbond="${i}" data-bf="name" value="${esc(b.name)}" placeholder="Кто это? Супруг(а), ребёнок, наставник, брат…">
          <input class="input" type="number" min="1" max="18" data-wbond="${i}" data-bf="value" value="${b.value}">
          <button class="dc-btn" data-wdelbond="${i}" title="Удалить связь">×</button>
        </div>`).join('')}
      </div>
      <button class="btn ghost sm" data-waddbond style="margin-top:6px">+ Добавить связь</button>
      <div class="hr"></div>
      <h4>Мотивации (до пяти)</h4>
      <div class="grid g2" style="gap:6px">
        ${d.motivations.map((m, i) => `<input class="input" data-wmot="${i}" value="${esc(m)}" placeholder="Мотивация ${i + 1}">`).join('')}
      </div>
      <div class="grid g2" style="gap:10px;margin-top:12px">
        <label class="check-row" style="color:#c9c2ae"><input type="checkbox" data-wadapt="violence" ${d.adapted.violence ? 'checked' : ''}> Адаптирован к насилию</label>
        <label class="check-row" style="color:#c9c2ae"><input type="checkbox" data-wadapt="helplessness" ${d.adapted.helplessness ? 'checked' : ''}> Адаптирован к беспомощности</label>
      </div>
      <p class="mono" style="font-size:8px;color:#6f7a63;margin-top:8px">Связи — якоря рассудка. Они снижают потерю ОР, но разрушаются под давлением операций.</p>
    </div>`;
  }

  function stepReview(d) {
    const der = derived(d.stats);
    const p = profById.get(d.professionId);
    const top = Object.keys(d.skills).map(k => [k, skillValue(d.skills[k])]).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return `<div class="wiz-panel is-on">
      <div class="chargen-summary">
        <div class="cs-box">
          <h4>АГЕНТ</h4>
          <div class="cs-line"><span>Имя</span><b>${esc(d.name || '—')}</b></div>
          <div class="cs-line"><span>Псевдоним</span><b>${esc(d.codename || '—')}</b></div>
          <div class="cs-line"><span>Профессия</span><b>${esc(p ? p.name : '—')}</b></div>
          <div class="cs-line"><span>Ведомство</span><b>${esc(d.agency || '—')}</b></div>
          <div class="cs-line"><span>Возраст</span><b>${esc(d.age || '—')}</b></div>
          <div class="cs-line"><span>Гражданство</span><b>${esc(d.nationality || '—')}</b></div>
        </div>
        <div class="cs-box">
          <h4>ХАРАКТЕРИСТИКИ</h4>
          ${Object.keys(d.stats).map(k => `<div class="cs-line"><span>${k}</span><b>${d.stats[k]}</b></div>`).join('')}
        </div>
      </div>
      <div class="derived-live" style="margin-top:12px">
        <div><span>ОЗ</span><b>${der.hp}</b></div><div><span>ОВ</span><b>${der.wp}</b></div>
        <div><span>ОР</span><b>${der.san}</b></div><div><span>ТН</span><b>${der.bp}</b></div>
      </div>
      <h4 style="margin-top:14px">КЛЮЧЕВЫЕ НАВЫКИ</h4>
      <div class="tags">${top.map(([k, v]) => `<span class="tag">${esc(k)} ${v}%</span>`).join('')}</div>
      <h4 style="margin-top:14px">СВЯЗИ</h4>
      <div class="tags">${d.bonds.filter(b => b.name).map(b => `<span class="tag">${esc(b.name)} · ${b.value}</span>`).join('') || '<span class="muted">не указаны</span>'}</div>
      ${!d.professionId ? `<div class="callout warn" style="margin-top:14px"><span class="callout-t">Не выбрана профессия</span>Можно сохранить и без неё, но навыки останутся базовыми.</div>` : ''}
      ${!d.name ? `<div class="callout danger" style="margin-top:10px"><span class="callout-t">Нужно имя</span>Без имени агента нельзя сохранить в базу.</div>` : ''}
    </div>`;
  }

  function bindWizard(host) {
    if (host.dataset.bound) return;
    host.dataset.bound = '1';
    const rerender = () => {
      const body = host.querySelector('#wiz-body');
      if (body) body.innerHTML = wizardStep();
      host.querySelectorAll('[data-wstep]').forEach(b => {
        const i = +b.dataset.wstep;
        b.className = i === W.step ? 'is-on' : (i < W.step ? 'is-done' : '');
      });
      const prev = host.querySelector('[data-wprev]');
      if (prev) prev.disabled = W.step === 0;
      const nav = host.querySelector('.wiz-nav');
      if (nav && W.step === 5 && !nav.querySelector('[data-wsave]')) nav.innerHTML = `<button class="btn ghost sm" data-wprev>← Назад</button><button class="btn red sm" data-wsave>Сохранить в архив</button><span class="mono" style="margin-left:auto;color:#6f7a63;font-size:8px;align-self:center">ЧЕРНОВИК НЕ СОХРАНЁН</span>`;
      if (nav && W.step < 5 && nav.querySelector('[data-wsave]')) nav.innerHTML = `<button class="btn ghost sm" data-wprev ${W.step === 0 ? 'disabled' : ''}>← Назад</button><button class="btn sm" data-wnext>Далее →</button><span class="mono" style="margin-left:auto;color:#6f7a63;font-size:8px;align-self:center">ЧЕРНОВИК НЕ СОХРАНЁН</span>`;
    };

    host.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const d = W.draft;
      if (t.dataset.wstep != null) { W.step = +t.dataset.wstep; rerender(); return; }
      if (t.dataset.wnew != null) { if (confirm('Сбросить черновик агента?')) { W = { host, step: 0, draft: newDraft() }; mountWizard(host); } return; }
      if (t.dataset.warchive != null) {
        if (confirm('Покинуть генератор? Черновик не сохранится.')) location.hash = '#/recruit/archive';
        return;
      }
      if (t.dataset.wnext != null) {
        if (W.step === 0) { /* identity optional */ }
        if (W.step === 2 && d.professionId && !Object.keys(d.skills).some(k => d.skills[k].prof)) applyProfession(d);
        W.step = Math.min(5, W.step + 1); rerender(); return;
      }
      if (t.dataset.wprev != null) { W.step = Math.max(0, W.step - 1); rerender(); return; }
      if (t.dataset.wsave != null) { saveWizard(); return; }
      if (t.dataset.wroll != null) {
        d.pool = rollPool();
        d.assign = {};
        d.pool.forEach((v, i) => { d.assign[['STR', 'CON', 'DEX', 'INT', 'POW', 'CHA'][i]] = i; });
        d.stats = {}; Object.keys(d.assign).forEach((k, i) => d.stats[k] = d.pool[d.assign[k]]);
        rerender(); return;
      }
      if (t.dataset.wclearroll != null) { d.pool = []; d.assign = {}; rerender(); return; }
      if (t.dataset.wmethod) {
        d.method = t.dataset.wmethod;
        if (d.method === 'points') { Object.keys(d.stats).forEach(k => d.stats[k] = 12); }
        rerender(); return;
      }
      if (t.dataset.wapply != null) {
        if (!d.professionId) { DG.toast('Сначала выберите профессию'); return; }
        applyProfession(d); DG.toast('Профессия применена: ' + (profById.get(d.professionId) || {}).name); rerender(); return;
      }
      if (t.dataset.wbonus) {
        const s = d.skills[t.dataset.wbonus];
        if (s && bonusUsed(d) < 8 && skillValue(s) < 80) { s.bonus = (s.bonus || 0) + 1; rerender(); }
        return;
      }
      if (t.dataset.wunbonus) {
        const s = d.skills[t.dataset.wunbonus];
        if (s && s.bonus) { s.bonus--; rerender(); }
        return;
      }
      if (t.dataset.wcustom != null) {
        const name = host.querySelector('#wiz-custom-name').value.trim();
        const val = clamp(num(host.querySelector('#wiz-custom-val').value, 40), 1, 80);
        if (!name) { DG.toast('Введите название навыка'); return; }
        ensureSkills(d);
        d.skills[name] = { prof: val, bonus: 0, custom: true, base: 0, fail: false };
        rerender(); return;
      }
      if (t.dataset.waddbond != null) {
        d.bonds.push({ name: '', value: num(d.stats.CHA, 10), damaged: false }); rerender(); return;
      }
      if (t.dataset.wdelbond != null) { d.bonds.splice(+t.dataset.wdelbond, 1); rerender(); return; }
    });

    host.addEventListener('input', (e) => {
      const d = W.draft;
      const el = e.target;
      if (el.dataset.wf) { d[el.dataset.wf] = el.value; return; }
      if (el.dataset.wstat) {
        d.stats[el.dataset.wstat] = clamp(num(el.value, 3), 3, 18);
        const der = derived(d.stats);
        const box = host.querySelector('.derived-live');
        if (box) box.innerHTML = `<div><span>ОЗ</span><b>${der.hp}</b></div><div><span>ОВ</span><b>${der.wp}</b></div><div><span>ОР</span><b>${der.san}</b></div><div><span>ТОЧКА НАДЛОМА</span><b>${der.bp}</b></div>`;
        return;
      }
      if (el.dataset.wmot != null) { d.motivations[+el.dataset.wmot] = el.value; return; }
      if (el.dataset.wbond != null) {
        const b = d.bonds[+el.dataset.wbond];
        if (!b) return;
        if (el.dataset.bf === 'name') b.name = el.value;
        else b.value = clamp(num(el.value, 1), 1, 18);
        return;
      }
      if (el.dataset.wadapt) { d.adapted[el.dataset.wadapt] = el.checked; return; }
    });

    host.addEventListener('change', (e) => {
      const d = W.draft;
      const el = e.target;
      if (el.dataset.wprof != null) { d.professionId = el.value; d.choiceSel = {}; d.skills = {}; ensureSkills(d); rerender(); return; }
      if (el.dataset.wchoice != null) { d.choiceSel[+el.dataset.wchoice] = +el.value; return; }
      if (el.dataset.wassign) {
        const attr = el.dataset.wassign;
        const idx = el.value === '' ? null : +el.value;
        const prev = d.assign[attr];
        if (idx == null) { delete d.assign[attr]; }
        else {
          const other = Object.keys(d.assign).find(k => k !== attr && d.assign[k] === idx);
          if (other != null && prev != null) d.assign[other] = prev;
          d.assign[attr] = idx;
        }
        for (const k of Object.keys(d.stats)) if (d.assign[k] == null) d.stats[k] = 10;
        Object.keys(d.assign).forEach(k => d.stats[k] = d.pool[d.assign[k]]);
        rerender(); return;
      }
      if (el.dataset.wadapt) { d.adapted[el.dataset.wadapt] = el.checked; return; }
    });
  }

  function saveWizard() {
    const d = W.draft;
    if (!d.name.trim()) { DG.toast('Укажите имя агента'); W.step = 0; mountWizard(W.host); return; }
    const der = derived(d.stats);
    const skills = {};
    for (const k of Object.keys(d.skills)) {
      const s = d.skills[k];
      skills[k] = { v: skillValue(s), base: s.custom ? 0 : (s.base || 0), prof: s.prof || 0, bonus: s.bonus || 0, fail: false };
    }
    const p = profById.get(d.professionId);
    const ch = {
      id: d.id || uid(),
      name: d.name.trim(), codename: d.codename.trim(), age: d.age, nationality: d.nationality, agency: d.agency,
      professionId: d.professionId, professionName: p ? p.name : 'Без профессии',
      stats: { ...d.stats }, luck: 50,
      hp: { max: der.hp, cur: der.hp }, wp: { max: der.wp, cur: der.wp }, san: { max: der.san, cur: der.san }, bp: der.bp,
      skills, bonds: d.bonds.map(b => ({ name: b.name.trim(), value: num(b.value, 10), damaged: !!b.damaged })).filter(b => b.name),
      motivations: d.motivations.filter(Boolean), adapted: { ...d.adapted },
      disorders: d.disorders || '', weapons: d.weapons || '', gear: d.gear || '', notes: d.notes || '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      log: [{ t: Date.now(), text: 'Агент создан', kind: 'ok' }],
      tempInsane: false, stun: false, lastSanSpec: '1/1D6'
    };
    const list = store.get('characters', []).filter(x => x.id !== ch.id);
    list.unshift(ch);
    store.set('characters', list);
    DGChar.active = ch;
    DGChar.pendingOpen = ch.id;
    DG.toast('Агент сохранён: ' + ch.name + ' · открываю архив');
    W = { host: W.host, step: 0, draft: newDraft() };
    if (location.hash === '#/recruit/archive') {
      if (DG.mountAll) DG.mountAll(document.querySelector('#page'));
      setTimeout(() => {
        const sheet = document.querySelector('[data-tool="charsheet"]');
        if (sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } else {
      location.hash = '#/recruit/archive';
    }
  }

  /* ---------------- Roster ---------------- */
let rosterState = { q: '', sort: 'updated' };

function ensureChar(ch) {
  if (!ch.hp) ch.hp = { max: 10, cur: 10 };
  if (!ch.wp) ch.wp = { max: 10, cur: 10 };
  if (!ch.san) ch.san = { max: 50, cur: 50 };
  ['hp', 'wp', 'san'].forEach(k => {
    const o = ch[k];
    if (typeof o.max !== 'number' || !Number.isFinite(o.max)) o.max = 10;
    if (typeof o.cur !== 'number' || !Number.isFinite(o.cur)) o.cur = o.max;
  });
  if (typeof ch.bp !== 'number' || !Number.isFinite(ch.bp)) ch.bp = Math.max(0, ch.san.max - num((ch.stats || {}).POW, 10));
  if (typeof ch.luck !== 'number' || !Number.isFinite(ch.luck)) ch.luck = 50;
  if (!Array.isArray(ch.bonds)) ch.bonds = [];
  if (!Array.isArray(ch.motivations)) ch.motivations = [];
  if (!ch.skills || typeof ch.skills !== 'object') ch.skills = {};
  Object.keys(ch.skills).forEach(k => {
    const s = ch.skills[k];
    if (typeof s === 'number') ch.skills[k] = { v: clamp(num(s, 0), 0, 99), base: 0, fail: false };
    else if (!s || typeof s !== 'object') ch.skills[k] = { v: 0, base: 0, fail: false };
    else { s.v = clamp(num(s.v, 0), 0, 99); s.fail = !!s.fail; }
  });
  if (!ch.adapted) ch.adapted = { violence: false, helplessness: false };
  if (!ch.adaptProgress) ch.adaptProgress = { violence: 0, helplessness: 0 };
  if (!Array.isArray(ch.log)) ch.log = [];
  ch.tempInsane = !!ch.tempInsane;
  ch.stun = !!ch.stun;
  if (!ch.lastSanSpec) ch.lastSanSpec = '1/1D6';
  return ch;
}

function saveChar(ch) {
  const list = store.get('characters', []);
  const i = list.findIndex(x => x.id === ch.id);
  ch.updatedAt = new Date().toISOString();
  if (i >= 0) list[i] = ch; else list.unshift(ch);
  store.set('characters', list);
}

const pct = (v, m) => m > 0 ? Math.max(0, Math.min(100, Math.round(v / m * 100))) : 0;
const shortDate = ts => new Date(ts || Date.now()).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const shortDay = ts => new Date(ts || Date.now()).toLocaleDateString('ru-RU');

function logChar(ch, text, kind) {
  ch.log.unshift({ t: Date.now(), text: String(text), kind: kind || '' });
  if (ch.log.length > 80) ch.log.length = 80;
}

function statusOf(ch) {
  const out = [];
  if (ch.hp.cur <= 0) out.push({ k: 'dead', t: 'МЁРТВ' });
  else if (ch.hp.cur <= 2) out.push({ k: 'down', t: 'БЕЗ СОЗНАНИЯ' });
  if (ch.wp.cur <= 0) out.push({ k: 'wp0', t: 'ОВ 0 · БЕЗ СОЗНАНИЯ' });
  else if (ch.wp.cur <= 2) out.push({ k: 'wp2', t: 'ИСТОЩЕНИЕ −20%' });
  if (ch.san.cur <= 0) out.push({ k: 'perm', t: 'ПОСТОЯННОЕ БЕЗУМИЕ' });
  else if (ch.san.cur <= ch.bp) out.push({ k: 'bp', t: 'ЗА ТОЧКОЙ НАДЛОМА' });
  if (ch.tempInsane) out.push({ k: 'temp', t: 'ВРЕМЕННОЕ ПОМЕШАТЕЛЬСТВО' });
  if (ch.stun) out.push({ k: 'stun', t: 'ОГЛУШЁН' });
  return out;
}

function noteHpChange(ch, before, after, why) {
  const dmg = before - after;
  if (dmg <= 0) return;
  logChar(ch, (why ? why + ' · ' : '') + `−${dmg} ОЗ (${before} → ${after})`, 'hp');
  if (before > 2 && dmg >= Math.ceil(before / 2)) {
    ch.stun = true;
    logChar(ch, 'Оглушение: урон не меньше половины текущих ОЗ', 'warn');
  }
  if (after === 0) logChar(ch, '0 ОЗ: смерть; возможна реанимация', 'danger');
  else if (after <= 2) logChar(ch, '2 ОЗ или меньше: проверка ТЕЛ×5 на постоянную травму', 'warn');
}

function noteSanChange(ch, before, after, why) {
  const loss = before - after;
  if (loss <= 0) return;
  logChar(ch, (why ? why + ' · ' : '') + `−${loss} ОР (${before} → ${after})`, 'san');
  if (loss >= 5) {
    ch.tempInsane = true;
    logChar(ch, 'Временное помешательство: потеряно 5+ ОР за один бросок', 'danger');
  }
  if (before > ch.bp && after <= ch.bp && after > 0) {
    ch.bp = Math.max(0, after - num(ch.stats.POW, 10));
    const line = `[${shortDay()}] Расстройство: ОР упали до ${after}. Новая ТН ${ch.bp}.`;
    ch.disorders = ch.disorders ? String(ch.disorders).replace(/\s+$/, '') + '\n' + line : line;
    logChar(ch, `Пройдена Точка Надлома: новое расстройство, ТН → ${ch.bp}. Удалите одну Связь как следствие травмы.`, 'danger');
  }
  if (after === 0) logChar(ch, '0 ОР: постоянное безумие', 'danger');
}

function mountRoster(host) {
  const all = () => (store.get('characters', []) || []).map(ensureChar);
  const list = all();

  host.innerHTML = `<div class="tool">
    <div class="tool-head"><b>Архив персонажей</b><span>${list.length} ДОСЬЕ</span>
      <div class="th-right">
        <button class="mini" data-chimport>Импорт</button>
        <button class="mini" data-chnew>Новый агент</button>
      </div>
    </div>
    <div class="tool-body">
      <div class="arch-bar">
        <input class="input" data-chq placeholder="Поиск: имя, псевдоним, профессия, ведомство" value="${esc(rosterState.q)}">
        <select class="select" data-chsort>
          <option value="updated" ${rosterState.sort === 'updated' ? 'selected' : ''}>Сначала изменённые</option>
          <option value="name" ${rosterState.sort === 'name' ? 'selected' : ''}>По имени</option>
          <option value="prof" ${rosterState.sort === 'prof' ? 'selected' : ''}>По профессии</option>
        </select>
        <span class="arch-count" data-chcount></span>
      </div>
      <div data-chlist></div>
    </div>
  </div>`;

  const listBox = host.querySelector('[data-chlist]');
  const countEl = host.querySelector('[data-chcount]');

  function card(ch) {
    const st = statusOf(ch);
    const main = st.find(x => x.k === 'dead' || x.k === 'perm' || x.k === 'temp' || x.k === 'down' || x.k === 'bp');
    const init = (ch.name || '?').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
    return `<div class="agent-card">
      <div class="ac-photo" data-acphoto="${esc(ch.id)}"><span>${esc(init || '?')}</span><img alt="" hidden></div>
      <div class="ac-main">
        <div class="ac-h"><b>${esc(ch.name || 'Без имени')}</b><span>${esc(ch.codename || '')}</span></div>
        <div class="ac-sub" title="${esc((ch.professionName || '') + (ch.agency ? ' · ' + ch.agency : ''))}">${esc(ch.professionName || 'Без профессии')}${ch.agency ? ' · ' + esc(ch.agency) : ''}</div>
        <div class="ac-vitals">
          <span class="${ch.hp.cur <= 2 ? 'bad' : ''}">ОЗ ${ch.hp.cur}/${ch.hp.max}</span>
          <span class="${ch.wp.cur <= 2 ? 'bad' : ''}">ОВ ${ch.wp.cur}/${ch.wp.max}</span>
          <span class="${ch.san.cur <= ch.bp ? 'bad' : ''}">ОР ${ch.san.cur}/${ch.san.max}</span>
        </div>
        <div class="ac-flags">${main ? `<span class="cs-flag ${main.k}">${esc(main.t)}</span>` : '<span class="cs-flag ok">В СТРОЮ</span>'}</div>
        <div class="ac-btns">
          <button class="dc-btn" data-chopen="${esc(ch.id)}">Открыть лист</button>
          <button class="dc-btn" data-chexport="${esc(ch.id)}">Экспорт</button>
          <button class="dc-btn red" data-chdel="${esc(ch.id)}">Удалить</button>
        </div>
      </div>
    </div>`;
  }

  function draw() {
    const q = rosterState.q.toLowerCase().replace(/ё/g, 'е').trim();
    const items = all().filter(ch => {
      if (!q) return true;
      return [ch.name, ch.codename, ch.professionName, ch.agency].join(' ').toLowerCase().replace(/ё/g, 'е').includes(q);
    });
    if (rosterState.sort === 'name') items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'));
    else if (rosterState.sort === 'prof') items.sort((a, b) => String(a.professionName).localeCompare(String(b.professionName), 'ru') || String(a.name).localeCompare(String(b.name), 'ru'));
    else items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    if (countEl) countEl.textContent = `${items.length} / ${list.length}`;
    const addTile = `<a class="agent-card agent-add" href="#/recruit/generator">
      <div class="ac-photo"><span>＋</span></div>
      <div class="ac-main"><div class="ac-h"><b>Новый агент</b></div><div class="ac-sub">Открыть генератор</div></div>
    </a>`;
    listBox.innerHTML = items.length
      ? `<div class="agent-grid">${items.map(card).join('')}${addTile}</div>`
      : (list.length
        ? `<div class="empty">НИЧЕГО НЕ НАЙДЕНО<br>Измените запрос или сбросьте поиск.</div>`
        : `<div class="empty">АРХИВ ПУСТ<br>Создайте первого агента в генераторе — он появится здесь.<br><a class="cs-act" href="#/recruit/generator">К генератору</a></div>`);
    hydrateCards(listBox);
  }

  draw();
  if (host.dataset.bound) return;
  host.dataset.bound = '1';

  host.addEventListener('input', e => {
    if (e.target.hasAttribute('data-chq')) { rosterState.q = e.target.value; draw(); }
  });
  host.addEventListener('change', e => {
    if (e.target.hasAttribute('data-chsort')) { rosterState.sort = e.target.value; draw(); }
  });
  host.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.chopen) DGChar.openSheet(t.dataset.chopen);
    if (t.dataset.chnew != null) { location.hash = '#/recruit/generator'; }
    if (t.dataset.chimport != null) importJson();
    if (t.dataset.chexport) {
      const ch = all().find(x => x.id === t.dataset.chexport);
      if (ch) downloadJson((ch.name || 'agent') + '.delta-green.json', ch);
    }
    if (t.dataset.chdel) {
      const ch = all().find(x => x.id === t.dataset.chdel);
      if (ch && confirm('Удалить агента «' + ch.name + '»? Действие необратимо.')) {
        store.set('characters', store.get('characters', []).filter(x => x.id !== ch.id));
        if (DG.media) DG.media.del('char:' + ch.id);
        if (DGChar.active && DGChar.active.id === ch.id) DGChar.active = null;
        DG.mountAll(document.querySelector('#page'));
      }
    }
  });
}

async function hydrateCards(scope) {
  const cards = Array.from(scope.querySelectorAll('[data-acphoto]'));
  for (const box of cards) {
    if (!DG.media) continue;
    const u = await DG.media.url('char:' + box.dataset.acphoto);
    if (!u || !box.isConnected) continue;
    const img = box.querySelector('img');
    if (img) { img.src = u; img.hidden = false; }
    const span = box.querySelector('span');
    if (span) span.style.display = 'none';
  }
}

function downloadJson(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function importJson() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const ch = JSON.parse(r.result);
        if (!ch || !ch.name || !ch.stats) throw new Error('bad');
        ch.id = uid();
        ensureChar(ch);
        ch.updatedAt = new Date().toISOString();
        const list = store.get('characters', []);
        list.unshift(ch); store.set('characters', list);
        DGChar.active = ch;
        DGChar.pendingOpen = ch.id;
        DG.mountAll(document.querySelector('#page'));
        DG.toast('Импортирован агент: ' + ch.name);
      } catch (e) { DG.toast('Не удалось прочитать файл агента'); }
    };
    r.readAsText(f);
  };
  inp.click();
}

/* ---------------- Sheet ---------------- */
const STAT_ROWS = [['STR', 'СИЛ'], ['CON', 'ТЕЛ'], ['DEX', 'ЛОВ'], ['INT', 'ИНТ'], ['POW', 'ВОЛ'], ['CHA', 'ХАР']];

function sheetHTML(ch) {
  const skills = ch.skills || {};
  const keys = Object.keys(skills).sort((a, b) => a.localeCompare(b, 'ru'));
  const marked = keys.filter(k => skills[k] && skills[k].fail);
  const bonds = ch.bonds || [];
  const status = statusOf(ch);
  const hpP = pct(ch.hp.cur, ch.hp.max);
  const wpP = pct(ch.wp.cur, ch.wp.max);
  const sanP = pct(ch.san.cur, ch.san.max);

  const statCells = STAT_ROWS.map(([k, l]) => {
    const v = num(ch.stats[k], 10);
    return `<div class="cs-stat"><label>${l}</label>
      <input type="number" min="1" max="18" data-f="stats.${k}" value="${v}">
      <button class="cs-stat-roll roll" data-roll="1d100" data-target="${v * 5}" data-label="${l}×5">${v * 5}%</button></div>`;
  }).join('');

  const skillRows = keys.map(k => {
    const s = skills[k] || { v: 0 };
    const v = num(s.v, 0);
    return `<div class="cs-skill" style="grid-template-columns:minmax(0,1fr) 40px 16px 38px">
      <span class="cs-skill-name" title="База: ${num(s.base, 0)}%">${esc(k)}</span>
      <input type="number" min="0" max="99" data-skill="${esc(k)}" value="${v}">
      <span class="pip ${s.fail ? 'on' : ''}" data-pip="${esc(k)}" title="Отметка неудачи — красный квадрат"></span>
      <button class="cs-roll roll" data-roll="1d100" data-target="${v}" data-label="${esc(k)}">d100</button>
    </div>`;
  }).join('');

  const bondRows = bonds.map((b, i) => {
    const v = num(b.value, 0);
    return `<div class="cs-bond ${v <= 0 ? 'broken' : ''}">
      <input type="text" data-bond="${i}" data-bf="name" value="${esc(b.name)}" placeholder="Имя связи">
      <input type="number" min="0" max="99" data-bond="${i}" data-bf="value" value="${v}">
      <span class="pip ${b.damaged || v <= 0 ? 'on' : ''}" data-bonddmg="${i}" title="Связь повреждена"></span>
      <div class="cs-bond-btns">
        <button data-bonddmg="${i}" data-bv="-1" title="−1">−1</button>
        <button data-bonddmg="${i}" data-bv="-1d4" title="−1к4">−1к4</button>
        <button data-bonddmg="${i}" data-bv="-1d6" title="−1к6">−1к6</button>
      </div>
    </div>`;
  }).join('');

  const improveRows = marked.map(k => `<div class="cs-improve-row">
      <span>${esc(k)}</span><b>${num(skills[k].v, 0)}%</b>
      <button data-grow-check="${esc(k)}">Проверка d100</button>
    </div>`).join('');

  const logs = (ch.log || []).slice(0, 40).map(x => `<div class="cs-log-row ${esc(x.kind || '')}">
      <span>${esc(shortDate(x.t))}</span><span>${esc(x.text)}</span>
    </div>`).join('');

  const adaptRow = (type, label) => {
    const n = num((ch.adaptProgress || {})[type], 0);
    return `<div class="cs-adapt"><span class="cs-adapt-l">${label}</span>
      <span class="cs-pips">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}" data-adapt-pip="${type}" data-i="${i}" title="${i + 1} из 3"></i>`).join('')}</span>
      <span class="cs-adapt-s">${ch.adapted && ch.adapted[type] ? 'АДАПТИРОВАН' : ''}</span></div>`;
  };

  return `<div class="tool tool-sheet" data-sheet="${esc(ch.id)}">
    <div class="tool-head"><b>Лист агента</b><span>${esc(ch.codename || ch.name || '')}</span>
      <div class="th-right">
        <button class="mini" data-shrecalc title="Пересчитать максимумы из характеристик">Пересчитать</button>
        <button class="mini" data-shprint title="Печать на официальном бланке">Офиц. бланк</button>
        <button class="mini" data-shpdf title="Скачать заполненный PDF">PDF</button>
        <button class="mini" data-shexport>Экспорт</button>
        <button class="mini" data-shdel>Удалить</button>
        <span class="mono" style="font-size:7px;color:#5f7a53" data-savestate>СОХРАНЕНО</span>
      </div>
    </div>
    <div class="tool-body" style="padding:10px">
      <div class="char-sheet">
        <div class="cs-head">
          <div class="cs-portrait" data-portrait title="Нажмите, чтобы прикрепить фото">
            <img alt="" hidden>
            <div class="ph">ФОТО<br>АГЕНТА</div>
          </div>
          <div class="cs-id">
            <input data-f="name" value="${esc(ch.name)}" placeholder="ИМЯ АГЕНТА">
            <div class="cs-sub">
              <input data-f="codename" value="${esc(ch.codename)}" placeholder="ПСЕВДОНИМ">
              <input data-f="professionName" value="${esc(ch.professionName || '')}" placeholder="ПРОФЕССИЯ">
            </div>
            <div class="cs-sub">
              <input data-f="agency" value="${esc(ch.agency || '')}" placeholder="ВЕДОМСТВО" style="flex:3;min-width:0">
              <input data-f="age" value="${esc(ch.age || '')}" placeholder="ВОЗРАСТ" style="flex:0 0 58px;min-width:0">
              <input data-f="nationality" value="${esc(ch.nationality || '')}" placeholder="ГРАЖДАНСТВО" style="flex:0 0 96px;min-width:0">
            </div>
          </div>
        </div>

        <div class="cs-stats">${statCells}</div>

        <div class="cs-derived">
          <div><label>ОЗ ТЕК</label><input type="number" data-f="hp.cur" value="${ch.hp.cur}"><div class="val" style="font-size:9px;color:#6f664f">МАКС ${ch.hp.max}</div></div>
          <div><label>ОВ ТЕК</label><input type="number" data-f="wp.cur" value="${ch.wp.cur}"><div class="val" style="font-size:9px;color:#6f664f">МАКС ${ch.wp.max}</div></div>
          <div><label>ОР ТЕК</label><input type="number" data-f="san.cur" value="${ch.san.cur}"><div class="val" style="font-size:9px;color:#6f664f">МАКС ${ch.san.max}</div></div>
          <div><label>ТОЧКА НАДЛОМА</label><input type="number" data-f="bp" value="${ch.bp}"><div class="val" style="font-size:9px;color:#6f664f">ПОРОГ</div></div>
          <div><label>УДАЧА</label><input type="number" min="0" max="99" data-f="luck" value="${ch.luck}"><div class="val" style="font-size:9px;color:#6f664f">d100 ≤ ${ch.luck}</div></div>
        </div>

        ${status.length ? `<div class="cs-status">${status.map(s => `<span class="cs-flag ${esc(s.k)}">${esc(s.t)}</span>`).join('')}</div>` : ''}

        <div class="cs-console">
          <div class="cs-vital">
            <div class="cs-vital-h"><b>ЗДОРОВЬЕ</b><span class="${ch.hp.cur <= 2 ? 'bad' : ''}">${ch.hp.cur} / ${ch.hp.max}</span></div>
            <div class="cs-bar ${hpP <= 25 ? 'low' : ''}"><i style="width:${hpP}%"></i></div>
            <div class="cs-dmg-row">
              <input type="number" min="0" max="999" data-dmg-input="hp" placeholder="0">
              <button class="cs-act red" data-hit="hp">− Нанести</button>
              <button class="cs-act" data-heal="hp">＋ Лечить</button>
            </div>
            <div class="cs-quick">
              ${[4, 6, 8, 10].map(n => `<button data-hit-die="hp" data-die="1d${n}">−1к${n}</button>`).join('')}
              <button data-heal-die="hp" data-die="1d4">＋1к4</button>
            </div>
            <p class="cs-hint">2 ОЗ — потеря сознания и проверка ТЕЛ×5; 0 — смерть.</p>
          </div>

          <div class="cs-vital">
            <div class="cs-vital-h"><b>РАССУДОК</b><span class="${ch.san.cur <= ch.bp ? 'bad' : ''}">${ch.san.cur} / ${ch.san.max}</span></div>
            <div class="cs-bar ${sanP <= 25 ? 'low' : ''}"><i style="width:${sanP}%"></i></div>
            <div class="cs-dmg-row">
              <input type="number" min="0" max="99" data-dmg-input="san" placeholder="0">
              <button class="cs-act red" data-hit="san">− Нанести</button>
            </div>
            <div class="cs-dmg-row">
              <input type="text" class="cs-spec" data-san-spec value="${esc(ch.lastSanSpec)}" placeholder="1/1D6">
              <button class="cs-act" data-san-check>Проверка ОР</button>
            </div>
            <div class="cs-rollres" data-sanres></div>
            <p class="cs-hint">5+ ОР за бросок — временное помешательство; ТН — новое расстройство.</p>
          </div>

          <div class="cs-vital">
            <div class="cs-vital-h"><b>ВОЛЯ</b><span class="${ch.wp.cur <= 2 ? 'bad' : ''}">${ch.wp.cur} / ${ch.wp.max}</span></div>
            <div class="cs-bar ${wpP <= 25 ? 'low' : ''}"><i style="width:${wpP}%"></i></div>
            <div class="cs-dmg-row">
              <input type="number" min="0" max="99" data-dmg-input="wp" placeholder="0">
              <button class="cs-act red" data-hit="wp">− Нанести</button>
              <button class="cs-act" data-heal="wp">＋ Вернуть</button>
            </div>
            <div class="cs-quick">
              <button data-hit-die="wp" data-die="1">−1</button>
              <button data-hit-die="wp" data-die="1d6">−1к6</button>
              <button data-heal-die="wp" data-die="1d4">＋1к4</button>
            </div>
            <p class="cs-hint">1–2 ОВ — истощение −20%; 0 — без сознания.</p>
          </div>
        </div>

        ${triggersHTML(ch)}

        <div class="cs-body">
          <div class="cs-col">
            <h4>НАВЫКИ <span class="cs-count">${keys.length}</span></h4>
            <div class="cs-skill-scroll">${skillRows || '<p class="cs-hint">Навыков нет. Добавьте первый ниже.</p>'}</div>
            <div class="cs-skill cs-add" style="grid-template-columns:minmax(0,1fr) 58px 34px">
              <input type="text" data-newskill placeholder="Новый навык" style="text-align:left">
              <input type="number" data-newskill-val value="10" min="1" max="99">
              <button class="dc-btn" data-addskill>+</button>
            </div>
            <p class="cs-hint">Нажмите d100 рядом с навыком — откроется пульт с проверкой. Красный квадрат — отметка неудачи.</p>
          </div>

          <div class="cs-col">
            <h4>СВЯЗИ <span class="cs-count">${bonds.length}</span></h4>
            <div class="cs-bonds">
              ${bondRows}
              <button class="cs-act" data-addbond style="margin-top:4px">＋ Добавить связь</button>
            </div>
            <h4>МОТИВАЦИИ</h4>
            <textarea class="cs-note" data-f="motivationsText" style="min-height:72px">${esc((ch.motivations || []).join('\n'))}</textarea>
            <h4>РАССТРОЙСТВА</h4>
            <textarea class="cs-note" data-f="disorders" style="min-height:52px">${esc(ch.disorders || '')}</textarea>
            <h4>АДАПТАЦИЯ</h4>
            ${adaptRow('violence', 'НАСИЛИЕ')}
            ${adaptRow('helplessness', 'БЕСПОМОЩНОСТЬ')}
            <p class="cs-hint">Три потери ОР подряд от одного типа травмы — адаптация. Помечайте клетки после каждой такой потери; временное помешательство сбрасывает счёт.</p>
            <label class="check-row" style="font-size:11px"><input type="checkbox" data-f="adapted.violence" ${ch.adapted && ch.adapted.violence ? 'checked' : ''}> адаптирован к насилию</label>
            <label class="check-row" style="font-size:11px"><input type="checkbox" data-f="adapted.helplessness" ${ch.adapted && ch.adapted.helplessness ? 'checked' : ''}> адаптирован к беспомощности</label>
            <h4>ОРУЖИЕ</h4>
            <textarea class="cs-note" data-f="weapons" style="min-height:44px" placeholder="Glock 19 | 50 | 15 м | 1D10 | 0 | 15">${esc(ch.weapons || '')}</textarea>
            <h4>СНАРЯЖЕНИЕ</h4>
            <textarea class="cs-note" data-f="gear" style="min-height:44px" placeholder="Броня, инструменты, аптечка, документы…">${esc(ch.gear || '')}</textarea>
            <h4>ЗАМЕТКИ</h4>
            <textarea class="cs-note" data-f="notes" style="min-height:44px">${esc(ch.notes || '')}</textarea>
          </div>
        </div>

        <div class="cs-improve">
          <div class="cs-improve-h"><b>РОСТ НАВЫКОВ</b><span>${marked.length} отмечено</span></div>
          <p class="cs-hint">Красный квадрат — провал навыка. В конце сессии: +1% за каждую отметку. Домашняя проверка заменяет +1%: бросок d100 выше навыка даёт +1к10 (максимум 99%).</p>
          ${marked.length ? `<div class="cs-improve-list">${improveRows}</div>` : '<p class="cs-hint">Отмеченных навыков нет.</p>'}
          <div class="cs-improve-btns">
            <button class="cs-act" data-grow-plus>Начислить +1% за все отметки</button>
            <button class="cs-act" data-grow-all>Проверить все</button>
          </div>
          <div class="cs-rollres" data-growres></div>
        </div>

        <details class="cs-log-wrap">
          <summary>ЖУРНАЛ · ${(ch.log || []).length} записей</summary>
          <div class="cs-log">${logs || '<p class="cs-hint">Пока пусто.</p>'}</div>
          <button class="cs-act" data-log-clear>Очистить журнал</button>
        </details>

        <div class="sheet-foot" style="padding:8px 14px;border-top:1px solid rgba(27,24,18,.3);font-size:7px">
          <span>DELTA GREEN // ЛИСТ АГЕНТА</span><span>СОХРАНЕНИЕ: ЛОКАЛЬНО</span><span class="right">ОБНОВЛЕНО ${new Date(ch.updatedAt || Date.now()).toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
    </div>
  </div>`;
}

function triggersHTML(ch) {
  const out = [];
  if (ch.hp.cur <= 0) {
    out.push(`<div class="cs-alert danger">
      <b>0 ОЗ · СМЕРТЬ</b>
      <p>Реанимация возможна, если куратор разрешил: проверка Первой помощи в течение минут, равных ТЕЛ. Успех возвращает 1к4 ОЗ (крит — вдвое).</p>
      <button class="cs-act red" data-check="revive">Проверка Первой помощи</button>
      <div class="cs-checkres" data-trigres="revive"></div>
    </div>`);
  } else if (ch.hp.cur <= 2) {
    const con = clamp(num(ch.stats.CON, 10) * 5, 1, 99);
    out.push(`<div class="cs-alert warn">
      <b>2 ОЗ ИЛИ МЕНЬШЕ · ПОСТОЯННАЯ ТРАВМА</b>
      <p>Агент без сознания. Проверка ТЕЛ×5 (${con}%); при провале одна характеристика уменьшается навсегда (1к10, минимум 3).</p>
      <button class="cs-act" data-check="injury">Проверка ТЕЛ×5</button>
      <div class="cs-checkres" data-trigres="injury"></div>
    </div>`);
  }
  if (ch.wp.cur === 0) {
    out.push(`<div class="cs-alert warn"><b>0 ОВ · БЕЗ СОЗНАНИЯ</b><p>Любая проверка, включая проверку ОР, провалена. Восстановите хотя бы 1 ОВ.</p></div>`);
  } else if (ch.wp.cur <= 2) {
    out.push(`<div class="cs-alert warn"><b>1–2 ОВ · ИСТОЩЕНИЕ</b><p>−20% ко всем действиям, пока ОВ не поднимутся выше 2.</p></div>`);
  }
  if (ch.san.cur <= 0) {
    out.push(`<div class="cs-alert danger"><b>0 ОР · ПОСТОЯННОЕ БЕЗУМИЕ</b><p>Агент безвозвратно становится НПС под контролем куратора. Терапия не возвращает его.</p></div>`);
  }
  if (ch.tempInsane) {
    out.push(`<div class="cs-alert danger"><b>ВРЕМЕННОЕ ПОМЕШАТЕЛЬСТВО</b><p>Потеряно 5+ ОР за один бросок. Состояние держится до конца сцены или по решению куратора.</p>
      <button class="cs-act" data-temp-clear>Состояние прошло</button></div>`);
  }
  if (ch.stun) {
    out.push(`<div class="cs-alert warn"><b>ОГЛУШЁН</b><p>Действовать нельзя. В свой ход — проверка ТЕЛ×5, чтобы прийти в себя.</p>
      <button class="cs-act" data-stun-clear>Пришёл в себя</button></div>`);
  }
  return out.length ? `<div class="cs-alerts">${out.join('')}</div>` : '';
}

function applyHit(host, ch, kind, amount, source) {
  const n = Math.max(0, Math.round(num(amount, 0)));
  if (!n) { DG.toast('Укажите количество'); return false; }
  if (kind === 'hp') {
    const before = ch.hp.cur;
    ch.hp.cur = Math.max(0, before - n);
    noteHpChange(ch, before, ch.hp.cur, source);
  } else if (kind === 'san') {
    const before = ch.san.cur;
    const after = Math.max(0, before - n);
    noteSanChange(ch, before, after, source);
    ch.san.cur = after;
  } else if (kind === 'wp') {
    const before = ch.wp.cur;
    ch.wp.cur = Math.max(0, before - n);
    logChar(ch, (source ? source + ' · ' : '') + `−${n} ОВ (${before} → ${ch.wp.cur})`, 'wp');
  }
  return true;
}

function applyHeal(host, ch, kind, amount, source) {
  const n = Math.max(0, Math.round(num(amount, 0)));
  if (!n) { DG.toast('Укажите количество'); return false; }
  if (kind === 'hp') {
    const before = ch.hp.cur;
    ch.hp.cur = Math.min(ch.hp.max, before + n);
    logChar(ch, (source ? source + ' · ' : '') + `+${ch.hp.cur - before} ОЗ (${before} → ${ch.hp.cur})`, 'heal');
  } else if (kind === 'wp') {
    const before = ch.wp.cur;
    ch.wp.cur = Math.min(ch.wp.max, before + n);
    logChar(ch, (source ? source + ' · ' : '') + `+${ch.wp.cur - before} ОВ`, 'heal');
  } else if (kind === 'san') {
    const before = ch.san.cur;
    ch.san.cur = Math.min(ch.san.max, before + n);
    logChar(ch, (source ? source + ' · ' : '') + `+${ch.san.cur - before} ОР`, 'heal');
  }
  return true;
}

function bindSheet(host, ch) {
  if (host.dataset.bound === '1') return;
  host.dataset.bound = '1';
  const cur = () => host.__ch;
  let tid = null;

  const markState = (txt, color) => {
    const el = host.querySelector('[data-savestate]');
    if (el) { el.textContent = txt; el.style.color = color; }
  };
  const saveSoon = () => {
    markState('ИЗМЕНЕНО', '#c99a3f');
    clearTimeout(tid);
    tid = setTimeout(() => {
      const c = cur();
      if (c) { saveChar(c); markState('СОХРАНЕНО', '#5f7a53'); }
    }, 450);
  };
  const persist = () => {
    const c = cur();
    if (!c) return;
    saveChar(c);
    paintSheet(host, c);
  };
  const result = (key, html) => {
    const box = host.querySelector(`[data-trigres="${key}"]`);
    if (box) box.innerHTML = html;
  };
  const setPath = (obj, path, val) => {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
  };

  host.addEventListener('input', e => {
    const el = e.target;
    const c = cur();
    if (!c) return;
    if (el.dataset.f) {
      const p = el.dataset.f;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (p === 'motivationsText') c.motivations = String(v).split('\n').map(s => s.trim()).filter(Boolean);
      else if (el.type === 'number') {
        let nv = clamp(num(v, 0), 0, 999);
        if (p.startsWith('stats.')) nv = clamp(nv, 1, 18);
        else if (p === 'hp.cur') nv = clamp(nv, 0, c.hp.max);
        else if (p === 'wp.cur') nv = clamp(nv, 0, c.wp.max);
        else if (p === 'san.cur') nv = clamp(nv, 0, c.san.max);
        else if (p === 'luck') nv = clamp(nv, 0, 99);
        setPath(c, p, nv);
      } else setPath(c, p, v);
      saveSoon(); return;
    }
    if (el.dataset.skill) {
      const k = el.dataset.skill;
      if (!c.skills[k]) c.skills[k] = { v: 0, base: 0, fail: false };
      c.skills[k].v = clamp(num(el.value, 0), 0, 99);
      saveSoon(); return;
    }
    if (el.dataset.bond) {
      const b = c.bonds[+el.dataset.bond]; if (!b) return;
      if (el.dataset.bf === 'name') b.name = el.value; else b.value = clamp(num(el.value, 0), 0, 99);
      saveSoon(); return;
    }
    if (el.hasAttribute('data-san-spec')) { c.lastSanSpec = el.value; saveSoon(); return; }
  });

  host.addEventListener('change', e => {
    const el = e.target;
    const c = cur();
    if (!c) return;
    const p = el.dataset.f || '';
    if (p.startsWith('stats.') || p === 'hp.cur' || p === 'wp.cur' || p === 'san.cur' || p === 'bp' || p === 'luck') {
      saveChar(c); paintSheet(host, c);
    }
  });

  host.addEventListener('click', async e => {
    const t = e.target.closest('button, [data-pip], [data-bonddmg], [data-adapt-pip]');
    const c = cur();
    if (!c) return;

    if (e.target.closest('[data-portrait]')) {
      const f = await DG.media.pick(); if (!f) return;
      const blob = await DG.media.compress(f, 700, .85); if (!blob) return;
      const ok = await DG.media.set('char:' + c.id, blob);
      if (!ok) { DG.toast('Не удалось сохранить портрет: хранилище переполнено'); return; }
      DG.media.revoke('char:' + c.id);
      loadPortrait(host, c);
      return;
    }
    if (!t) return;

    if (t && t.dataset.hit) {
      const kind = t.dataset.hit;
      const inp = host.querySelector(`[data-dmg-input="${kind}"]`);
      if (applyHit(host, c, kind, inp ? inp.value : 0, 'Ручной ввод')) { if (inp) inp.value = ''; persist(); }
      return;
    }
    if (t && t.dataset.heal) {
      const kind = t.dataset.heal;
      const inp = host.querySelector(`[data-dmg-input="${kind}"]`);
      if (applyHeal(host, c, kind, inp ? inp.value : 0, 'Лечение')) { if (inp) inp.value = ''; persist(); }
      return;
    }
    if (t && t.dataset.hitDie) {
      const r = DG.dice.roll(t.dataset.die);
      if (r.error) return;
      applyHit(host, c, t.dataset.hitDie, r.total, `Бросок ${r.expr} → ${r.total}`);
      persist(); return;
    }
    if (t && t.dataset.healDie) {
      const r = DG.dice.roll(t.dataset.die);
      if (r.error) return;
      applyHeal(host, c, t.dataset.healDie, r.total, `Бросок ${r.expr} → ${r.total}`);
      persist(); return;
    }
    if (t && t.dataset.sanCheck != null) {
      const specEl = host.querySelector('[data-san-spec]');
      const spec = (specEl && specEl.value.trim()) || '1/1D6';
      c.lastSanSpec = spec;
      const before = c.san.cur;
      const r = DG.dice.san(before, spec);
      logChar(c, `Проверка ОР ${spec}: бросок ${r.roll} против ${before} — ${r.success ? 'успех' : 'провал'}, потеря ${r.loss}`, 'san');
      noteSanChange(c, before, Math.max(0, before - r.loss), '');
      c.san.cur = Math.max(0, before - r.loss);
      saveChar(c); paintSheet(host, c);
      const box = host.querySelector('[data-sanres]');
      if (box) box.innerHTML = `БРОСОК <b>${r.roll}</b> ≤ ${before} — <b class="${r.success ? 'ok' : 'bad'}">${r.success ? 'УСПЕХ' : 'ПРОВАЛ'}</b><br>ПОТЕРЯ <b>${r.loss}</b> (${esc(r.lossSpec)}) · ОСТАЛОСЬ <b>${c.san.cur}</b>`;
      return;
    }
    if (t && t.dataset.check) {
      if (t.dataset.check === 'injury') {
        const target = clamp(num(c.stats.CON, 10) * 5, 1, 99);
        const r = DG.dice.check(target, 0);
        logChar(c, `Проверка ТЕЛ×5 (${target}): ${r.roll} — ${r.success ? 'успех' : 'провал'}`, 'check');
        saveChar(c);
        if (r.success) result('injury', `<span class="ok">Бросок ${r.roll} / ${target} — ${r.label}. Постоянной травмы нет.</span>`);
        else result('injury', `<span class="bad">Бросок ${r.roll} / ${target} — ${r.label}. Постоянная травма.</span>
          <div class="cs-trauma">
            <select class="select" data-trauma-stat>${STAT_ROWS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
            <button class="cs-act red" data-trauma-apply>−1к10 (мин. 3)</button>
          </div>`);
      } else if (t.dataset.check === 'revive') {
        const skill = c.skills['Первая помощь'] ? num(c.skills['Первая помощь'].v, 10) : baseFor('Первая помощь');
        const r = DG.dice.check(skill, 0);
        logChar(c, `Реанимация (Первая помощь ${skill}%): ${r.roll} — ${r.success ? 'успех' : 'провал'}`, 'check');
        if (r.success) {
          const heal = DG.dice.roll('1d4');
          const add = heal.total * (r.crit ? 2 : 1);
          c.hp.cur = Math.min(c.hp.max, Math.max(1, c.hp.cur) + add);
          logChar(c, `Реанимация удалась: +${add} ОЗ`, 'heal');
          saveChar(c); paintSheet(host, c);
          DG.toast(`Реанимация удалась: +${add} ОЗ`, 4000);
          result('revive', `<span class="ok">Бросок ${r.roll} / ${skill} — ${r.label}. Возвращено ${add} ОЗ (${c.hp.cur}/${c.hp.max}).</span>`);
        } else {
          logChar(c, 'Реанимация не удалась', 'danger');
          saveChar(c);
          result('revive', `<span class="bad">Бросок ${r.roll} / ${skill} — ${r.label}. Реанимация не удалась.</span>`);
        }
      }
      return;
    }
    if (t && t.dataset.traumaApply != null) {
      const sel = host.querySelector('[data-trauma-stat]');
      const stat = sel ? sel.value : 'CON';
      const roll = DG.dice.rnd(10);
      const old = num(c.stats[stat], 10);
      const nv = Math.max(3, old - roll);
      c.stats[stat] = nv;
      if (stat === 'STR' || stat === 'CON') {
        const d = derived(c.stats);
        c.hp.max = d.hp; c.hp.cur = Math.min(c.hp.cur, d.hp);
      }
      if (stat === 'POW') {
        const d = derived(c.stats);
        c.wp.max = d.wp; c.wp.cur = Math.min(c.wp.cur, d.wp);
        c.san.max = d.san; c.san.cur = Math.min(c.san.cur, d.san);
      }
      logChar(c, `Постоянная травма: ${stat} −${roll} (${old} → ${nv})`, 'danger');
      persist(); return;
    }
    if (t && t.dataset.tempClear != null) {
      c.tempInsane = false; logChar(c, 'Временное помешательство прошло', 'ok'); persist(); return;
    }
    if (t && t.dataset.stunClear != null) {
      c.stun = false; logChar(c, 'Агент пришёл в себя после оглушения', 'ok'); persist(); return;
    }
    if (t && t.dataset.pip) {
      const k = t.dataset.pip;
      if (!c.skills[k]) return;
      c.skills[k].fail = !c.skills[k].fail;
      saveChar(c); paintSheet(host, c); return;
    }
    if (t && t.dataset.adaptPip) {
      const type = t.dataset.adaptPip;
      const i = +t.dataset.i;
      const curN = num(c.adaptProgress[type], 0);
      c.adaptProgress[type] = (i + 1 === curN) ? i : i + 1;
      if (c.adaptProgress[type] >= 3 && !c.adapted[type]) {
        c.adapted[type] = true;
        const what = type === 'violence' ? 'насилию' : 'беспомощности';
        const cost = type === 'violence' ? '1к6 ХАР и столько же из каждой связи' : '1к6 ВОЛ';
        logChar(c, `Получена адаптация к ${what}. Примените ${cost}.`, 'danger');
        DG.toast(`Адаптация к ${what}: ${cost}`, 6000);
      }
      saveChar(c); paintSheet(host, c); return;
    }
    if (t && t.dataset.growCheck) {
      const k = t.dataset.growCheck;
      const s = c.skills[k]; if (!s) return;
      const roll = DG.dice.rnd(100);
      const old = num(s.v, 0);
      let msg;
      if (roll > old) {
        const gain = DG.dice.rnd(10);
        s.v = Math.min(99, old + gain);
        s.fail = false;
        msg = `<span class="ok">${esc(k)}: бросок ${roll} > ${old} → +${gain}% (${s.v}%)</span>`;
        logChar(c, `Рост навыка ${k}: бросок ${roll} > ${old}, +${gain}% → ${s.v}%`, 'grow');
      } else {
        s.fail = false;
        msg = `<span class="bad">${esc(k)}: бросок ${roll} ≤ ${old} — без роста</span>`;
        logChar(c, `Рост навыка ${k}: бросок ${roll} ≤ ${old}, без роста`, 'grow');
      }
      saveChar(c); paintSheet(host, c);
      const box = host.querySelector('[data-growres]'); if (box) box.innerHTML = msg;
      return;
    }
    if (t && t.dataset.growPlus != null) {
      let n = 0;
      Object.keys(c.skills).forEach(k => {
        const s = c.skills[k];
        if (s && s.fail) { s.v = Math.min(99, num(s.v, 0) + 1); s.fail = false; n++; }
      });
      if (n) logChar(c, `Начислено +1% за ${n} отмеченных навыков`, 'grow');
      else DG.toast('Отмеченных навыков нет');
      saveChar(c); paintSheet(host, c);
      const box = host.querySelector('[data-growres]');
      if (box) box.innerHTML = n ? `<span class="ok">+1% начислен ${n} навыкам. Отметки сняты.</span>` : '<span class="bad">Отмеченных навыков нет.</span>';
      return;
    }
    if (t && t.dataset.growAll != null) {
      const marked = Object.keys(c.skills).filter(k => c.skills[k] && c.skills[k].fail);
      if (!marked.length) { DG.toast('Отмеченных навыков нет'); return; }
      const lines = [];
      marked.forEach(k => {
        const s = c.skills[k];
        const roll = DG.dice.rnd(100);
        const old = num(s.v, 0);
        if (roll > old) {
          const gain = DG.dice.rnd(10);
          s.v = Math.min(99, old + gain);
          logChar(c, `Рост ${k}: ${roll} > ${old}, +${gain}% → ${s.v}%`, 'grow');
          lines.push(`${esc(k)}: ${roll} > ${old} → +${gain}%`);
        } else {
          logChar(c, `Рост ${k}: ${roll} ≤ ${old}, без роста`, 'grow');
          lines.push(`${esc(k)}: ${roll} ≤ ${old} — без роста`);
        }
        s.fail = false;
      });
      saveChar(c); paintSheet(host, c);
      const box = host.querySelector('[data-growres]');
      if (box) box.innerHTML = lines.join('<br>');
      return;
    }
    if (t && t.dataset.bonddmg != null) {
      const b = c.bonds[+t.dataset.bonddmg];
      if (!b) return;
      if (!t.dataset.bv) {
        b.damaged = !b.damaged;
        logChar(c, `Связь «${b.name || 'без имени'}»: ${b.damaged ? 'повреждена' : 'отметка снята'}`, 'bond');
        saveChar(c); paintSheet(host, c);
        return;
      }
      const f = t.dataset.bv || '-1';
      let n = 1;
      if (f === '-1d4' || f === '-1d6') {
        const r = DG.dice.roll(f.replace('-', ''));
        n = r.error ? 1 : r.total;
      }
      const old = num(b.value, 0);
      b.value = Math.max(0, old - n);
      if (b.value === 0) b.damaged = true;
      logChar(c, `Связь «${b.name || 'без имени'}»: −${n} (${old} → ${b.value})`, 'bond');
      saveChar(c); paintSheet(host, c);
      return;
    }
    if (t && t.dataset.addbond != null) {
      c.bonds.push({ name: '', value: num(c.stats.CHA, 10), damaged: false });
      saveChar(c); paintSheet(host, c); return;
    }
    if (t && t.dataset.addskill != null) {
      const inp = host.querySelector('[data-newskill]');
      const vInp = host.querySelector('[data-newskill-val]');
      const name = (inp && inp.value || '').trim();
      if (!name) { DG.toast('Введите название навыка'); return; }
      if (c.skills[name]) { DG.toast('Такой навык уже есть'); return; }
      c.skills[name] = { v: clamp(num(vInp && vInp.value, 10), 1, 99), base: 0, fail: false };
      logChar(c, `Добавлен навык ${name}`, 'skill');
      saveChar(c); paintSheet(host, c); return;
    }
    if (t && t.dataset.shrecalc != null) {
      if (!confirm('Пересчитать максимумы ОЗ, ОВ, ОР и ТН из характеристик? Текущие значения будут ограничены новыми максимумами.')) return;
      const d = derived(c.stats);
      c.hp.max = d.hp; c.hp.cur = Math.min(c.hp.cur, d.hp);
      c.wp.max = d.wp; c.wp.cur = Math.min(c.wp.cur, d.wp);
      c.san.max = d.san; c.san.cur = Math.min(c.san.cur, d.san);
      c.bp = d.bp;
      logChar(c, `Производные пересчитаны: ОЗ ${c.hp.max}, ОВ ${c.wp.max}, ОР ${c.san.max}, ТН ${c.bp}`, 'check');
      persist(); return;
    }
    if (t && t.dataset.shprint != null) {
      if (DG.officialSheet) DG.officialSheet.print(c);
      else DG.toast('Модуль официального бланка не загружен');
      return;
    }
    if (t && t.dataset.shpdf != null) {
      if (DG.officialSheet) DG.officialSheet.pdf(c);
      else DG.toast('Модуль официального бланка не загружен');
      return;
    }
    if (t && t.dataset.shexport != null) { downloadJson((c.name || 'agent') + '.delta-green.json', c); return; }
    if (t && t.dataset.shdel != null) {
      if (confirm('Удалить агента «' + c.name + '»?')) {
        store.set('characters', store.get('characters', []).filter(x => x.id !== c.id));
        if (DG.media) DG.media.del('char:' + c.id);
        DGChar.active = null;
        DG.mountAll(document.querySelector('#page'));
      }
      return;
    }
    if (t && t.dataset.logClear != null) {
      c.log = []; saveChar(c); paintSheet(host, c); return;
    }
  });
}

function paintSheet(host, ch) {
  host.__ch = ch;
  host.innerHTML = sheetHTML(ch);
  bindSheet(host, ch);
  loadPortrait(host, ch);
}

function mountSheet(host) {
  const list = store.get('characters', []);
  let id = host.dataset.id || DGChar.pendingOpen || (DGChar.active && DGChar.active.id);
  DGChar.pendingOpen = null;
  let ch = list.find(x => x.id === id) || list[0];
  if (!ch) {
    host.innerHTML = `<div class="tool tool-sheet"><div class="tool-head"><b>Лист агента</b><span>НЕТ ДАННЫХ</span></div>
      <div class="tool-body"><div class="empty">ЛИСТ НЕ ВЫБРАН<br>Создайте агента в генераторе или откройте досье из архива.<br><a class="cs-act" href="#/recruit/generator">К генератору</a></div></div></div>`;
    return;
  }
  ensureChar(ch);
  DGChar.active = ch;
  host.dataset.sheet = ch.id;
  paintSheet(host, ch);
}

async function loadPortrait(host, ch) {
  const box = host.querySelector('[data-portrait]');
  if (!box) return;
  const img = box.querySelector('img');
  const ph = box.querySelector('.ph');
  const u = await DG.media.url('char:' + ch.id);
  if (u) { img.src = u; img.hidden = false; if (ph) ph.style.display = 'none'; }
  else { img.hidden = true; if (ph) ph.style.display = 'grid'; }
}

/* ---------------- Public API ---------------- */
  const DGChar = {
    init() {
      const list = store.get('characters', []);
      if (list.length && !DGChar.active) DGChar.active = list[0];
    },
    mount(el) {
      const tool = el.dataset.tool;
      if (tool === 'chargen') mountWizard(el);
      if (tool === 'chardb') mountRoster(el);
      if (tool === 'charsheet') mountSheet(el);
    },
    openSheet(id) {
      const ch = (store.get('characters', []) || []).find(x => x.id === id);
      if (!ch) return;
      ensureChar(ch);
      DGChar.active = ch;
      const host = document.querySelector('[data-tool="charsheet"]');
      if (host) {
        host.dataset.id = id;
        paintSheet(host, ch);
        host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        DGChar.pendingOpen = id;
        location.hash = '#/recruit/archive';
      }
    },
    setSan(id, val, loss) {
      const ch = (store.get('characters', []) || []).find(x => x.id === id);
      if (!ch) return;
      ensureChar(ch);
      const before = ch.san.cur;
      const after = clamp(num(val, before), 0, 999);
      const drop = loss != null ? Math.max(0, num(loss, 0)) : Math.max(0, before - after);
      if (drop > 0) noteSanChange(ch, before, Math.max(0, before - drop), 'Пульт SAN');
      ch.san.cur = after;
      saveChar(ch);
      const host = document.querySelector('[data-tool="charsheet"]');
      if (host && host.__ch && host.__ch.id === id) paintSheet(host, ch);
    },
    applySanLoss(id, loss) {
      const ch = (store.get('characters', []) || []).find(x => x.id === id);
      if (!ch) return;
      ensureChar(ch);
      const before = ch.san.cur;
      const after = Math.max(0, before - Math.max(0, num(loss, 0)));
      noteSanChange(ch, before, after, 'Пульт SAN');
      ch.san.cur = after;
      saveChar(ch);
      const host = document.querySelector('[data-tool="charsheet"]');
      if (host && host.__ch && host.__ch.id === id) paintSheet(host, ch);
    },
    list() { return store.get('characters', []); },
    uid
  };
  DGChar.active = null;
  window.DGChar = DGChar;
  DG.DGChar = DGChar;
})();

