/* DELTA GREEN — unnatural threat builder */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  const store = DG.store;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => 'th_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const rnd = n => Math.floor(Math.random() * n) + 1;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const between = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const TYPES = ['Неестественное существо', 'Культист или человек', 'Животное', 'Конструкт', 'Сущность иного измерения', 'Великий Древний', 'Феномен'];
  const MOTIVES = [
    'охраняет гнездо или кладку', 'ищет носителя для потомства', 'собирает человеческие воспоминания',
    'исполняет волю культа', 'питается страхом и вниманием', 'защищает территорию',
    'имитирует человека, чтобы жить среди людей', 'восстанавливает утраченный артефакт',
    'открывает путь сородичам', 'наказывает нарушителей договора'
  ];
  const WEAKNESSES = [
    'освящённое железо и соль', 'прямой солнечный свет', 'огонь', 'проточная вода',
    'разрушение фокуса-артефакта', 'звук определённой частоты', 'имя, произнесённое полностью',
    'разрыв связи с культом', 'серебро', 'зеркальные поверхности'
  ];
  const ABILITIES = [
    ['Амфибия', 'Дышит и охотится в воде; на суше теряет силы со временем.'],
    ['Регенерация', 'Восстанавливает 1D6 ОЗ в начале своего хода, если не получило огонь или кислоту.'],
    ['Невидимость', 'Может становиться невидимым; атаки по нему — с штрафом −40%, пока его не выдаст движение.'],
    ['Телепатия', 'Слышит поверхностные мысли на расстоянии; может транслировать образы.'],
    ['Смена формы', 'Меняет облик за 1 ход; копирует человека, но не его память.'],
    ['Броня', 'Костяные пластины или хитиновая оболочка: 3–5 очков брони.'],
    ['Сверхскорость', 'Действует дважды в раунд или перемещается на 30 м без штрафов.'],
    ['Ужас', 'При первом взгляде требует проверки Рассудка; потеря 1/1D6.'],
    ['Заражение', 'Укус или контакт накладывает болезнь: ТЕЛ×5 раз в день, иначе 1D4 урона и мутация.'],
    ['Рой', 'Состоит из множества мелких тел; оружие с одиночными попаданиями наносит половину урона.'],
    ['Разрыв пространства', 'Может исчезнуть и появиться в пределах 100 м, оставляя след холода и запах озона.'],
    ['Поглощение памяти', 'Съедает воспоминания; жертва теряет 1D6 ОР и один навык на 1D10%.'],
    ['Симбиоз', 'Носит тело-хозяина как скафандр; урон сначала получает хозяин.'],
    ['Смертельный взгляд', 'Проверка ЛОВ×5, иначе 1D10 урона и слепота на 1D4 раунда.']
  ];
  const NAMES_A = ['Бледный', 'Тихий', 'Стеклянный', 'Соляной', 'Мокрый', 'Слепой', 'Двойной', 'Пустой', 'Ржавый', 'Полый', 'Ночной', 'Глиняный'];
  const NAMES_B = ['Свидетель', 'Пастух', 'Носитель', 'Пловец', 'Хор', 'Гость', 'Охотник', 'Квартирант', 'Садовник', 'Курьер', 'Ангел', 'Сосед'];

  const TIERS = {
    1: { label: 'I', hp: [6, 12], attr: [8, 12], skill: [25, 45], san: '0/1D4' },
    2: { label: 'II', hp: [10, 18], attr: [10, 14], skill: [35, 55], san: '0/1D6' },
    3: { label: 'III', hp: [16, 26], attr: [12, 18], skill: [45, 65], san: '1/1D8' },
    4: { label: 'IV', hp: [24, 44], attr: [16, 30], skill: [55, 80], san: '1/1D10' },
    5: { label: 'V', hp: [50, 120], attr: [30, 90], skill: [70, 99], san: '1D10/1D100' }
  };

  let draft = null;
  let host = null;

  function emptyDraft() {
    return {
      id: null, name: '', alias: '', danger: 2, type: TYPES[0],
      attrs: { STR: 10, CON: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 },
      hp: 10, wp: 10, san: '0/1D6', armor: '', desc: '', motive: '', weakness: '',
      attacks: [{ name: 'Когти', skill: 45, dmg: '1D6', ap: 0 }, { name: 'Укус', skill: 35, dmg: '1D8', ap: 1 }],
      abilities: []
    };
  }

  function generate() {
    const d = draft;
    const tier = TIERS[d.danger] || TIERS[2];
    const attr = () => between(tier.attr[0], tier.attr[1]);
    d.attrs = { STR: attr(), CON: attr(), DEX: attr(), INT: attr(), POW: attr(), CHA: attr() };
    d.hp = Math.max(tier.hp[0], Math.round((d.attrs.STR + d.attrs.CON) / 2));
    d.wp = d.attrs.POW;
    d.san = tier.san;
    d.armor = d.danger >= 4 ? String(between(3, 6)) + ' (неестественная плоть)' : (d.danger === 3 ? String(between(1, 3)) : '');
    d.motive = pick(MOTIVES);
    d.weakness = pick(WEAKNESSES);
    d.name = d.name || (pick(NAMES_A) + ' ' + pick(NAMES_B)).toUpperCase();
    const nAb = Math.min(5, Math.max(2, d.danger));
    const pool = [...ABILITIES].sort(() => Math.random() - .5).slice(0, nAb);
    d.abilities = pool.map(([name, text]) => ({ name, text }));
    const skill = between(tier.skill[0], tier.skill[1]);
    d.attacks = [
      { name: pick(['Когти', 'Кулак', 'Щупальце', 'Клюв', 'Лезвие', 'Хвост']), skill, dmg: d.danger >= 4 ? '2D6' : '1D6', ap: d.danger >= 4 ? 3 : 0 },
      { name: pick(['Укус', 'Захват', 'Таран', 'Плевок', 'Взгляд']), skill: Math.max(20, skill - 10), dmg: d.danger >= 4 ? '1D10' : '1D4', ap: 0 }
    ];
    render();
  }

  function statEntity(d) {
    return {
      key: 'custom:' + (d.id || 'draft'),
      name: d.name || 'БЕЗЫМЯННАЯ УГРОЗА',
      alias: d.alias,
      danger: d.danger,
      type: d.type,
      attrs: d.attrs,
      hp: d.hp, wp: d.wp,
      san: d.san,
      armor: d.armor,
      desc: d.desc,
      abilities: [
        ...(d.motive ? [{ name: 'Мотив', text: d.motive }] : []),
        ...(d.weakness ? [{ name: 'Слабость', text: d.weakness }] : []),
        ...d.abilities
      ],
      attacks: d.attacks,
      custom: true
    };
  }

  function render() {
    if (!host) return;
    const d = draft;
    const list = store.get('threats', []);
    const entity = statEntity(d);
    host.innerHTML = `<div class="tool">
      <div class="tool-head"><b>Конструктор угрозы</b><span>UNNATURAL ENTITY WORKBENCH</span>
        <div class="th-right"><button class="mini" data-tg-random>Сгенерировать</button><button class="mini" data-tg-clear>Очистить</button></div>
      </div>
      <div class="tool-body">
        <div class="grid g2" style="gap:10px">
          <div>
            <div class="input-row">
              <div class="field"><label>Название</label><input class="input" data-tf="name" value="${esc(d.name)}" placeholder="ГЛУБОКОВОДНЫЙ ГОСТЬ"></div>
              <div class="field"><label>Псевдоним / тип</label><input class="input" data-tf="alias" value="${esc(d.alias)}" placeholder="Deep One · Гость из-под воды"></div>
            </div>
            <div class="input-row">
              <div class="field"><label>Уровень угрозы</label><select class="select" data-tf="danger">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${d.danger === n ? 'selected' : ''}>${TIERS[n].label} — ${['незначительная', 'умеренная', 'серьёзная', 'смертельная', 'катастрофическая'][n - 1]}</option>`).join('')}</select></div>
              <div class="field"><label>Категория</label><select class="select" data-tf="type">${TYPES.map(t => `<option ${d.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
            </div>
            <div class="attr-rolls" style="margin-top:4px">
              ${['STR', 'CON', 'DEX', 'INT', 'POW', 'CHA'].map(k => `<div class="roll-box"><div class="rb-l">${k}</div><input class="input" type="number" min="1" max="200" value="${d.attrs[k]}" data-ta="${k}" style="text-align:center;font-family:var(--disp);font-size:20px;padding:2px;border:0;background:transparent;color:#d8eac8"></div>`).join('')}
            </div>
            <div class="input-row" style="margin-top:8px">
              <div class="field"><label>ОЗ</label><input class="input" type="number" data-tf="hp" value="${d.hp}"></div>
              <div class="field"><label>ОВ</label><input class="input" type="number" data-tf="wp" value="${d.wp}"></div>
              <div class="field"><label>Потеря ОР</label><input class="input" data-tf="san" value="${esc(d.san)}"></div>
              <div class="field"><label>Броня</label><input class="input" data-tf="armor" value="${esc(d.armor)}" placeholder="3 (хитин)"></div>
            </div>
            <div class="field"><label>Мотив</label><input class="input" data-tf="motive" value="${esc(d.motive)}" placeholder="Чего она хочет?"></div>
            <div class="field"><label>Слабость</label><input class="input" data-tf="weakness" value="${esc(d.weakness)}" placeholder="Что её останавливает?"></div>
            <div class="field"><label>Описание</label><textarea class="textarea" data-tf="desc" style="min-height:64px">${esc(d.desc)}</textarea></div>
          </div>
          <div>
            <h4>Атаки</h4>
            ${d.attacks.map((a, i) => `<div class="skill-pick" style="grid-template-columns:1.2fr 54px 64px 48px 24px;gap:4px">
              <input class="input" data-tatk="${i}" data-af="name" value="${esc(a.name)}" placeholder="Атака">
              <input class="input" type="number" data-tatk="${i}" data-af="skill" value="${a.skill}" placeholder="%">
              <input class="input" data-tatk="${i}" data-af="dmg" value="${esc(a.dmg)}" placeholder="Урон">
              <input class="input" type="number" data-tatk="${i}" data-af="ap" value="${a.ap || 0}" placeholder="БП">
              <button class="dc-btn" data-tatkdel="${i}">×</button>
            </div>`).join('')}
            <button class="dc-btn" data-tatkadd style="margin-top:4px">+ атака</button>
            <h4 style="margin-top:14px">Способности</h4>
            ${d.abilities.map((a, i) => `<div style="border:1px solid #34382b;padding:6px;margin-bottom:5px">
              <div style="display:flex;gap:5px"><input class="input" data-tab="${i}" data-abf="name" value="${esc(a.name)}" placeholder="Название" style="flex:0 0 42%">
              <button class="dc-btn" data-tabdel="${i}">×</button></div>
              <textarea class="textarea" data-tab="${i}" data-abf="text" style="min-height:40px;margin-top:4px">${esc(a.text)}</textarea>
            </div>`).join('')}
            <button class="dc-btn" data-tabadd>+ способность</button>
            <div class="hr"></div>
            <button class="btn red" data-tg-save>Сохранить в базу угроз</button>
            <button class="btn ghost" data-tg-copy style="margin-left:6px">В буфер</button>
          </div>
        </div>
        <div class="divider">Предпросмотр статблока</div>
        <div data-tg-preview>${DG.statblockHTML ? DG.statblockHTML(entity) : ''}</div>
        <div class="divider">Мои угрозы · ${list.length}</div>
        <div class="threat-list" data-tg-list>
          ${list.length ? list.map(t => `<div class="threat-item">
            <div class="ti-h"><b>${esc(t.name)}</b><span class="tag">${esc(TIERS[t.danger] ? TIERS[t.danger].label : '?')}</span><span class="tag">${esc(t.type)}</span>
              <button data-tg-load="${t.id}">ЗАГРУЗИТЬ</button><button data-tg-del="${t.id}">УДАЛИТЬ</button></div>
            <div class="ti-stats">СИЛ ${t.attrs.STR} ТЕЛ ${t.attrs.CON} ЛОВ ${t.attrs.DEX} ИНТ ${t.attrs.INT} ВОЛ ${t.attrs.POW} · ОЗ ${t.hp} · ОР ${esc(t.san)}</div>
            <p>${esc(t.desc || t.motive || '')}</p>
          </div>`).join('') : `<div class="empty">СОХРАНЁННЫХ УГРОЗ НЕТ<br>Сгенерируйте или заполните поля, затем нажмите «Сохранить в базу».</div>`}
        </div>
      </div>
    </div>`;
  }

  function readForm() {
    // state updated live by input handlers; nothing needed
  }

  function save() {
    if (!draft.name.trim()) { DG.toast('Дайте угрозе имя'); return; }
    const list = store.get('threats', []);
    const item = { ...draft, id: draft.id || uid(), updatedAt: new Date().toISOString() };
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.unshift(item);
    store.set('threats', list);
    draft = item;
    DG.toast('Угроза сохранена: ' + item.name);
    if (DG.updateRailCounts) DG.updateRailCounts();
    render();
    if (DG.refreshBestiary) DG.refreshBestiary();
  }

  function mount(el) {
    host = el;
    if (!draft) draft = emptyDraft();
    render();
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.tf) {
        const k = t.dataset.tf;
        draft[k] = (t.type === 'number') ? Math.max(0, parseInt(t.value, 10) || 0) : t.value;
        if (k === 'hp' || k === 'wp') { updatePreview(); }
        return;
      }
      if (t.dataset.ta) { draft.attrs[t.dataset.ta] = Math.max(1, parseInt(t.value, 10) || 1); updatePreview(); return; }
      if (t.dataset.tatk != null) {
        const a = draft.attacks[+t.dataset.tatk]; if (!a) return;
        a[t.dataset.af] = t.dataset.af === 'skill' || t.dataset.af === 'ap' ? (parseInt(t.value, 10) || 0) : t.value;
        updatePreview(); return;
      }
      if (t.dataset.tab != null) {
        const a = draft.abilities[+t.dataset.tab]; if (!a) return;
        a[t.dataset.abf] = t.value; updatePreview(); return;
      }
    });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.tgRandom != null) { generate(); return; }
      if (t.dataset.tgClear != null) { draft = emptyDraft(); render(); return; }
      if (t.dataset.tgSave != null) { save(); return; }
      if (t.dataset.tatkadd) { draft.attacks.push({ name: 'Атака', skill: 40, dmg: '1D6', ap: 0 }); render(); return; }
      if (t.dataset.tatkdel != null) { draft.attacks.splice(+t.dataset.tatkdel, 1); render(); return; }
      if (t.dataset.tabadd) { draft.abilities.push({ name: 'Способность', text: '' }); render(); return; }
      if (t.dataset.tabdel != null) { draft.abilities.splice(+t.dataset.tabdel, 1); render(); return; }
      if (t.dataset.tgLoad) {
        const it = store.get('threats', []).find(x => x.id === t.dataset.tgLoad);
        if (it) { draft = JSON.parse(JSON.stringify(it)); render(); }
        return;
      }
      if (t.dataset.tgDel) {
        if (confirm('Удалить угрозу из базы?')) {
          store.set('threats', store.get('threats', []).filter(x => x.id !== t.dataset.tgDel));
          if (draft.id === t.dataset.tgDel) draft.id = null;
          DG.toast('Угроза удалена'); render();
          if (DG.updateRailCounts) DG.updateRailCounts();
          if (DG.refreshBestiary) DG.refreshBestiary();
        }
        return;
      }
      if (t.dataset.tgCopy != null) {
        navigator.clipboard.writeText(JSON.stringify(draft, null, 2)).then(() => DG.toast('JSON скопирован')).catch(() => DG.toast('Не удалось скопировать'));
      }
    });
  }

  function updatePreview() {
    const box = host && host.querySelector('[data-tg-preview]');
    if (box && DG.statblockHTML) box.innerHTML = DG.statblockHTML(statEntity(draft));
  }

  const DGThreats = {
    init() {},
    mount,
    list() { return store.get('threats', []); },
    customEntities() {
      return store.get('threats', []).map(t => ({ ...t, key: 'custom:' + t.id, custom: true, alias: t.alias + ' · ваша угроза' }));
    }
  };
  window.DGThreats = DGThreats;
  DG.DGThreats = DGThreats;
})();
