/* DELTA GREEN — shell, router, navigation, search, dice console */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  const PAGES = window.DG_PAGES || [];
  const SEARCH = window.DG_SEARCH || [];
  const byId = new Map(PAGES.map(p => [p.id, p]));

  const GROUPS = [
    { key: 'intro',   code: '00', title: 'Брифинг' },
    { key: 'agent',   code: '01', title: 'Агент' },
    { key: 'rules',   code: '02', title: 'Протоколы' },
    { key: 'world',   code: '03', title: 'Угрозы' },
    { key: 'handler', code: '04', title: 'Куратор' },
  ];
  const GROUP_BY = new Map(GROUPS.map(g => [g.key, g]));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

  function childrenOf(id) { return PAGES.filter(p => p.parent === id); }
  function rootPages(group) { return PAGES.filter(p => p.group === group && !p.parent && !p.hidden); }
  function pageNum(p) { return p.num || p.code || ''; }

  /* ---------------- Storage ---------------- */
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('dg.' + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem('dg.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('dg.' + k); } catch (e) {} }
  };
  DG.store = store;

  DG.toast = function (msg, ms) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(DG.toast._t);
    DG.toast._t = setTimeout(() => t.classList.remove('is-on'), ms || 2400);
  };

  /* ---------------- Nav ---------------- */
  function buildNav() {
    const nav = $('#nav');
    let html = '';
    for (const g of GROUPS) {
      const roots = rootPages(g.key);
      if (!roots.length) continue;
      html += `<details class="nav-group" data-group="${g.key}" open>
        <summary>${esc(g.code)} · ${esc(g.title)}<span class="g-count">${roots.length}</span></summary>
        <div class="nav-list">`;
      for (const p of roots) {
        const kids = childrenOf(p.id).filter(k => !k.hidden);
        html += `<a class="nav-link" href="#/${esc(p.id)}" data-nav="${esc(p.id)}">
          <span class="idx">${esc(pageNum(p))}</span><span>${esc(p.nav)}</span></a>`;
        if (kids.length) {
          html += `<div class="nav-sub">`;
          for (const k of kids) {
            html += `<a class="nav-link" href="#/${esc(k.id)}" data-nav="${esc(k.id)}">
              <span class="idx">${esc(pageNum(k))}</span><span>${esc(k.nav)}</span></a>`;
          }
          html += `</div>`;
        }
      }
      html += `</div></details>`;
    }
    nav.innerHTML = html;
  }

  function setActiveNav(id) {
    $$('.nav-link').forEach(a => a.classList.toggle('is-active', a.dataset.nav === id));
    const active = document.querySelector('.nav-link.is-active');
    if (active) {
      const det = active.closest('details');
      if (det) det.open = true;
      const group = active.closest('.nav-group');
      if (group) group.dataset.active = '1';
    }
  }

  /* ---------------- Render ---------------- */
  function headHtml(p) {
    const stamps = [];
    stamps.push(`<span class="stamp">ДОПУСК<br>КУРАТОР</span>`);
    const crumbs = [];
    if (p.parent && byId.get(p.parent)) crumbs.push(`<a href="#/${esc(p.parent)}">${esc(byId.get(p.parent).nav)}</a>`);
    crumbs.push(esc(p.title));
    return `<div class="sheet-head">
      <div class="corner-marks"><i></i><i></i><i></i><i></i></div>
      <div class="fileline">
        <span class="code">${esc(p.code || 'DG-' + p.id)}</span>
        <span class="dot">●</span>
        <span>${esc(p.kicker || 'ОПЕРАТИВНЫЙ АРХИВ')}</span>
        <span class="dot">●</span>
        <span>Ф.${esc((p.num || p.code || p.id).toUpperCase())}</span>
        <span style="margin-left:auto">${crumbs.join(' / ')}</span>
      </div>
      <h1>${esc(p.title)}</h1>
      ${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ''}
      <div class="sheet-meta">
        ${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        <span class="mono" style="margin-left:auto">РЕД. 1.0 · ЛОКАЛЬНАЯ КОПИЯ</span>
        <span class="stamp">${esc(p.group === 'handler' ? 'ГЛАЗА КУРАТОРА' : 'НЕ РАСПРОСТРАНЯТЬ')}</span>
      </div>
    </div>`;
  }

  function footHtml(p) {
    return `<div class="sheet-foot">
      <span>DELTA GREEN // ${esc(p.code || p.id)}</span>
      <span>СОБРАНО ДЛЯ ЛИЧНОГО АРХИВА КУРАТОРА</span>
      <span class="right">СТР. 1 / 1 · <button class="roll green" style="border:0;background:none" onclick="window.scrollTo({top:0,behavior:'smooth'})">НАВЕРХ ↑</button></span>
    </div>`;
  }

  function fillChildren(scope, p) {
    const kids = childrenOf(p.id).filter(k => !k.hidden);
    const ph = scope.querySelector('#children-slot, [data-children]');
    if (!ph) return;
    if (!kids.length) { ph.remove(); return; }
    ph.innerHTML = `<div class="page-links">${kids.map(k => `
      <a class="page-link" href="#/${esc(k.id)}">
        <span class="pl-k">${esc(k.code || '')} · ${esc(k.kicker || '')}</span>
        <b>${esc(k.nav)}</b>
        <span>${esc(k.summary || k.subtitle || '')}</span>
      </a>`).join('')}</div>`;
  }

  function fillHome(scope) {
    const slot = scope.querySelector('#home-sections');
    if (!slot) return;
    slot.innerHTML = `<div class="section-cards">${GROUPS.map((g, i) => {
      const roots = rootPages(g.key);
      if (!roots.length) return '';
      const lead = roots[0];
      const count = PAGES.filter(p => p.group === g.key && !p.hidden).length;
      return `<a class="section-card" href="#/${esc(lead.id)}">
        <span class="sc-code">${esc(g.code)} / ${String(count).padStart(2, '0')} ДОСЬЕ</span>
        <span class="sc-n">${esc(g.code)}</span>
        <b>${esc(g.title)}</b>
        <p>${esc(lead.summary || lead.subtitle || '')}</p>
        <span class="sc-arrow">Открыть раздел →</span>
      </a>`;
    }).join('')}</div>`;
  }

  function renderPage(id) {
    const p = byId.get(id);
    const host = $('#page');
    if (!p) {
      document.body.classList.remove('landing-view');
      host.innerHTML = `<article class="sheet"><div class="sheet-head"><div class="fileline"><span class="code">ERR-404</span><span class="dot">●</span><span>ДОСЬЕ НЕ НАЙДЕНО</span></div><h1>Доступ запрещён</h1><p class="subtitle">Запрошенный файл отсутствует в архиве или был уничтожен.</p></div><div class="sheet-body"><p class="lede">Проверьте адрес или вернитесь к описи материалов.</p><p><a class="btn" href="#/">Вернуться к описи</a></p></div></article>`;
      document.title = 'Доступ запрещён — DELTA GREEN';
      buildRail(null);
      return;
    }
    const isHome = p.id === 'start';
    document.body.classList.toggle('landing-view', isHome);
    const article = document.createElement('article');
    article.className = isHome ? 'landing' : 'sheet';
    article.dataset.page = p.id;
    article.innerHTML = isHome
      ? p.body
      : `${headHtml(p)}<div class="sheet-body">${p.body}</div>${footHtml(p)}`;
    host.innerHTML = '';
    host.appendChild(article);

    fillChildren(article, p);
    fillHome(article);

    // section ids + rail
    const secs = $$('.section', article);
    secs.forEach((s, i) => { if (!s.id) s.id = 'sec-' + (i + 1); });

    // mobile table of contents for long dossiers
    if (secs.length >= 4) {
      const body = article.querySelector('.sheet-body');
      const titles = secs.map(s => {
        const h = s.querySelector('h2');
        return h ? `<a href="#${esc(s.id)}">${esc(h.textContent.trim())}</a>` : '';
      }).join('');
      if (body && titles) {
        const box = document.createElement('details');
        box.className = 'fold page-toc';
        box.innerHTML = `<summary>Содержание досье · ${secs.length} разделов</summary><div class="fold-b page-toc-links">${titles}</div>`;
        body.insertBefore(box, body.firstChild);
      }
    }

    if (DG.mountTools) DG.mountTools(article);
    buildRail(p, secs);
    setActiveNav(p.id);
    document.body.dataset.page = p.id;
    document.title = `${p.title} — DELTA GREEN`;
    window.scrollTo({ top: 0, behavior: 'auto' });
    rememberRecent(p.id);
  }

  function buildRail(p, secs) {
    const rail = $('#rail');
    if (!p) { rail.innerHTML = ''; return; }
    const toc = (secs || []).map((s, i) => {
      const h = s.querySelector('h2');
      if (!h) return '';
      return `<a href="#${esc(s.id)}" data-toc="${esc(s.id)}">${esc(h.textContent.trim())}</a>`;
    }).join('');
    const recents = store.get('recent', []).map(rid => {
      const r = byId.get(rid);
      return r ? `<a href="#/${esc(r.id)}">${esc(r.nav)}</a>` : '';
    }).join('');
    rail.innerHTML = `
      <div class="rail-block">
        <div class="rail-h">В этом досье</div>
        <div class="rail-toc">${toc || '<a href="#/">К описи материалов</a>'}</div>
      </div>
      ${recents ? `<div class="rail-block"><div class="rail-h">Недавно открытые</div><div class="rail-toc">${recents}</div></div>` : ''}`;
  }

  function rememberRecent(id) {
    if (id === 'start') return;
    const list = store.get('recent', []).filter(x => x !== id);
    list.unshift(id);
    store.set('recent', list.slice(0, 5));
  }

  /* ---------------- Router ---------------- */
  function route() {
    let h = location.hash || '';
    if (!h || h === '#' || h === '#/') { renderPage('start'); return; }
    if (!h.startsWith('#/')) {
      const el = document.getElementById(h.slice(1));
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      renderPage('start');
      return;
    }
    const raw = h.slice(2);
    const qi = raw.indexOf('?');
    const idPart = qi >= 0 ? raw.slice(0, qi) : raw;
    const qs = qi >= 0 ? raw.slice(qi + 1) : '';
    DG.routeQuery = qs ? Object.fromEntries(new URLSearchParams(qs)) : null;
    const id = decodeURIComponent(idPart.replace(/\/$/, ''));
    renderPage(id || 'start');
    document.body.classList.remove('nav-open');
  }

  /* ---------------- Search ---------------- */
  let searchSel = -1;
  let searchHits = [];
  let entityIndex = [];

  function buildEntityIndex() {
    entityIndex = (window.DG_BESTIARY || []).map(e => ({
      id: 'unnatural/bestiary',
      group: 'world',
      parent: 'unnatural',
      title: e.name,
      nav: e.alias || 'Бестиарий',
      headings: [e.type || ''],
      text: [e.name, e.alias, e.type, e.desc, (e.abilities || []).map(a => a.name + ': ' + a.text).join(' ')].filter(Boolean).join(' '),
      q: e.name
    }));
  }
  function openSearch(initial) {
    const m = $('#search-modal');
    m.classList.add('is-open');
    const inp = $('#search-input');
    inp.value = initial || '';
    setTimeout(() => { inp.focus(); inp.select(); }, 20);
    if (initial) doSearch(initial);
    else if (!inp.value) $('#search-results').innerHTML = `<div class="search-empty">Введите запрос. Поиск идёт по заголовкам и тексту всех досье.<br>Например: «потеря рассудка», «глубокий», «автомат», «связи».</div>`;
  }
  function closeSearch() {
    $('#search-modal').classList.remove('is-open');
    searchSel = -1;
  }
  function highlight(text, terms) {
    let out = esc(text);
    for (const t of terms) {
      if (!t) continue;
      try {
        const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        out = out.replace(re, '<mark>$1</mark>');
      } catch (e) {}
    }
    return out;
  }
  function scoreEntry(e, terms, q) {
    const title = norm(e.title + ' ' + e.nav);
    const heads = norm((e.headings || []).join(' '));
    const text = norm(e.text);
    let score = 0;
    for (const t of terms) {
      if (!t) continue;
      let s = 0;
      if (title === q) s += 120;
      else if (title.startsWith(t)) s += 55;
      else if (title.includes(t)) s += 35;
      if (heads.includes(t)) s += 18;
      const idx = text.indexOf(t);
      if (idx >= 0) {
        s += 8;
        const count = Math.min(6, text.split(t).length - 1);
        s += count * 2;
      }
      if (!s) return 0;
      score += s;
    }
    return score;
  }
  function doSearch(q) {
    const terms = norm(q).split(' ').filter(Boolean);
    const box = $('#search-results');
    if (!terms.length) { box.innerHTML = ''; return; }
    searchHits = SEARCH.concat(entityIndex).map(e => ({ e, s: scoreEntry(e, terms, norm(q)) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 24);
    searchSel = searchHits.length ? 0 : -1;
    if (!searchHits.length) {
      box.innerHTML = `<div class="search-empty">Ничего не найдено по запросу «${esc(q)}».<br>Попробуйте одно слово: «рассудок», «погоня», «ритуал», «броня».</div>`;
      return;
    }
    box.innerHTML = searchHits.map((hit, i) => {
      const e = hit.e;
      const text = e.text;
      const nt = norm(text);
      let idx = -1;
      for (const t of terms) { const k = nt.indexOf(t); if (k >= 0) { idx = k; break; } }
      let snip = '';
      if (idx >= 0) {
        const start = Math.max(0, idx - 70);
        snip = (start > 0 ? '…' : '') + text.slice(start, idx + 150) + '…';
      } else {
        snip = text.slice(0, 160) + '…';
      }
      const group = GROUP_BY.get(e.group);
      const href = '#/' + e.id + (e.q ? '?q=' + encodeURIComponent(e.q) : '');
      return `<a class="search-item ${i === searchSel ? 'is-sel' : ''}" href="${href}" data-si="${i}">
        <div class="si-title">${highlight(e.title, terms)} <span>${esc(group ? group.title : e.group)}${e.q ? ' / Бестиарий' : (e.parent ? ' / ' + esc((byId.get(e.parent) || {}).nav || '') : '')}</span></div>
        <div class="si-snip">${highlight(snip, terms)}</div>
      </a>`;
    }).join('');
    box.querySelectorAll('.search-item').forEach(a => a.addEventListener('click', closeSearch));
  }
  function moveSearch(dir) {
    if (!searchHits.length) return;
    searchSel = (searchSel + dir + searchHits.length) % searchHits.length;
    $$('.search-item').forEach((el, i) => el.classList.toggle('is-sel', i === searchSel));
    const el = $$('.search-item')[searchSel];
    if (el) { el.scrollIntoView({ block: 'nearest' }); }
  }

  /* ---------------- Dice console ---------------- */
  const dice = DG.dice;
  let dcMode = 'expr';
  let lastSan = store.get('sanCurrent', 50);

  function dcOpen() {
    const c = $('#dice-console');
    c.classList.add('is-open');
    c.setAttribute('aria-hidden', 'false');
  }
  function dcClose() {
    const c = $('#dice-console');
    c.classList.remove('is-open');
    c.setAttribute('aria-hidden', 'true');
  }
  function dcLog(text, value, cls) {
    const log = $('#dc-log');
    const row = document.createElement('div');
    row.innerHTML = `<span>${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span><span>${esc(text)}</span><b>${esc(value)}</b>`;
    log.prepend(row);
    while (log.children.length > 40) log.lastChild.remove();
  }
  function dcShow(value, meta, cls) {
    const v = $('#dc-value');
    v.textContent = value;
    v.className = 'dc-value' + (cls ? ' ' + cls : '');
    $('#dc-meta').innerHTML = meta;
  }
  function setMode(m) {
    dcMode = m;
    $$('#dc-mode button').forEach(b => b.classList.toggle('is-on', b.dataset.mode === m));
    $('#dc-expr-row').hidden = m !== 'expr';
    $('#dc-check-row').hidden = m !== 'check';
    $('#dc-san-row').hidden = m !== 'san';
    if (m === 'san') {
      const cur = $('#dc-san-cur');
      if (!cur.value) cur.value = String(lastSan || 50);
      $('#dc-san-loss').focus();
    }
    if (m === 'check') $('#dc-target').focus();
    if (m === 'expr') $('#dc-expr').focus();
  }
  function runExpr(expr) {
    const r = dice.roll(expr);
    if (r.error) { dcShow('ERR', esc(r.error)); return; }
    dcShow(r.total, `<b>${esc(r.expr)}</b><br>${esc(r.detail)}`);
    dcLog(r.expr + ' → ' + r.detail, r.total);
  }
  function runCheck() {
    const t = $('#dc-target').value;
    if (!t) { $('#dc-target').focus(); return; }
    const mod = $('#dc-mod').value;
    const r = dice.check(t, mod);
    dcShow(r.roll, `ПРОВЕРКА <b>${r.target}%</b> · БРОСОК <b>${r.roll}</b><br>${r.label}${r.mod ? ' · МОД ' + (r.mod > 0 ? '+' : '') + r.mod : ''}`, r.crit ? 'crit' : (r.fumble || !r.success ? 'fail' : ''));
    dcLog(`Проверка ${r.target}% → ${r.roll}`, r.label);
  }
  function runSan() {
    const cur = $('#dc-san-cur').value;
    const spec = $('#dc-san-loss').value || '0/1d6';
    if (!cur) { $('#dc-san-cur').focus(); return; }
    const r = dice.san(cur, spec);
    lastSan = r.newSan;
    store.set('sanCurrent', lastSan);
    if (window.DGChar && DGChar.active && DGChar.active.id) {
      DGChar.setSan(DGChar.active.id, r.newSan, r.loss);
    }
    dcShow(r.roll, `РАССУДОК <b>${r.current}</b> · БРОСОК <b>${r.roll}</b><br>${r.success ? 'УСПЕХ' : 'ПРОВАЛ'} · ПОТЕРЯ <b>${r.loss}</b> (${esc(r.lossSpec)})<br>ОСТАЛОСЬ: <b>${r.newSan}</b>`, r.success ? '' : 'fail');
    dcLog(`SAN ${r.current} → бросок ${r.roll}`, (r.success ? 'успех' : 'провал') + ' −' + r.loss);
  }

  function bindDice() {
    $('#dice-fab').addEventListener('click', () => {
      const c = $('#dice-console');
      c.classList.contains('is-open') ? dcClose() : dcOpen();
    });
    $('#dc-x').addEventListener('click', dcClose);
    $('#dice-btn').addEventListener('click', () => { dcOpen(); setTimeout(() => $('#dc-expr').focus(), 100); });
    $('#dc-roll').addEventListener('click', () => runExpr($('#dc-expr').value));
    $('#dc-expr').addEventListener('keydown', e => { if (e.key === 'Enter') runExpr($('#dc-expr').value); });
    $('#dc-check').addEventListener('click', runCheck);
    $('#dc-target').addEventListener('keydown', e => { if (e.key === 'Enter') runCheck(); });
    $('#dc-san').addEventListener('click', runSan);
    $('#dc-san-loss').addEventListener('keydown', e => { if (e.key === 'Enter') runSan(); });
    $$('#dc-mode button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $$('.dc-quick button').forEach(b => b.addEventListener('click', () => {
      dcOpen(); setMode('expr'); $('#dc-expr').value = b.dataset.d; runExpr(b.dataset.d);
    }));

    document.addEventListener('click', e => {
      const btn = e.target.closest('.roll, [data-roll]');
      if (!btn) return;
      if (btn.closest('#page') || btn.closest('.rail') || btn.closest('.tool')) {
        e.preventDefault();
        dcOpen();
        const label = btn.dataset.label || '';
        if (btn.dataset.san) {
          setMode('san');
          const spec = btn.dataset.san;
          $('#dc-san-loss').value = spec;
          const activeSan = (window.DGChar && DGChar.active && DGChar.active.san) ? DGChar.active.san.cur : null;
          const cur = btn.dataset.sanCur || activeSan || lastSan || 50;
          $('#dc-san-cur').value = cur;
          if (btn.dataset.auto === '1') runSan();
          else { $('#dc-san-cur').focus(); dcShow('—', `РАССУДОК: УКАЖИТЕ ТЕКУЩИЙ ОР<br>ПОТЕРЯ <b>${esc(spec)}</b>`); }
          return;
        }
        if (btn.dataset.target) {
          setMode('check');
          $('#dc-target').value = btn.dataset.target;
          $('#dc-mod').value = btn.dataset.mod || '0';
          runCheck();
          return;
        }
        if (btn.dataset.roll) {
          setMode('expr');
          $('#dc-expr').value = btn.dataset.roll;
          runExpr(btn.dataset.roll);
          if (label) dcLog(label + ' · ' + btn.dataset.roll, '');
          return;
        }
      }
    });
  }

  /* ---------------- Misc bindings ---------------- */
  function bindChrome() {
    $('#search-btn').addEventListener('click', () => openSearch());
    $('#search-input').addEventListener('input', e => doSearch(e.target.value));
    $('#search-input').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSearch(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchHits[searchSel]) {
          const hit = searchHits[searchSel].e;
          closeSearch();
          location.hash = '#/' + hit.id + (hit.q ? '?q=' + encodeURIComponent(hit.q) : '');
        }
      } else if (e.key === 'Escape') { closeSearch(); }
    });
    $('#search-modal').addEventListener('click', e => { if (e.target === $('#search-modal')) closeSearch(); });
    $('#print-btn').addEventListener('click', () => window.print());
    $('#menu-btn').addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      $('#menu-btn').setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
      if (e.key === 'Escape') { closeSearch(); dcClose(); document.body.classList.remove('nav-open'); }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '/' || e.key === '?') { e.preventDefault(); openSearch(); }
        else if (e.key.toLowerCase() === 'd') { e.preventDefault(); dcOpen(); }
      }
    });
    document.addEventListener('click', e => {
      if (e.target.closest('[data-open-search]')) { e.preventDefault(); openSearch(); }
      if (e.target.closest('[data-open-dice]')) { e.preventDefault(); dcOpen(); }
    });
    window.addEventListener('hashchange', route);
    // close mobile nav on navigation
    document.addEventListener('click', e => {
      if (e.target.closest('.nav-link')) document.body.classList.remove('nav-open');
    });
    // clock
    function tick() {
      const el = $('#clock');
      if (!el) return;
      el.textContent = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' });
    }
    tick(); setInterval(tick, 30000);
  }

  /* ---------------- Init ---------------- */
  function init() {
    if (!PAGES.length) {
      $('#page').innerHTML = `<article class="sheet"><div class="sheet-head"><div class="fileline"><span class="code">SYS-001</span><span class="dot">●</span><span>АРХИВ НЕ СОБРАН</span></div><h1>Нет данных</h1><p class="subtitle">Файл assets/data/pages.js пуст. Запустите сборку: node build.mjs</p></div></article>`;
      return;
    }
    buildNav();
    buildEntityIndex();
    bindDice();
    bindChrome();
    if (window.DGChar && DGChar.init) DGChar.init();
    if (window.DGThreats && DGThreats.init) DGThreats.init();
    route();
  }

  DG.app = { openSearch, dcOpen, dcClose, renderPage, byId, PAGES, GROUPS, setMode };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

