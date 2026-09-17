(() => {
  'use strict';

  const CONFIG = Object.freeze({
    supabaseUrl: 'https://ojnlygmerorlsmrcaarf.supabase.co',
    publishableKey: 'sb_publishable_xZj-Mhacd6DxAbn6kfJBHQ_Qh79EuW_',
    imageEndpoint: 'https://ojnlygmerorlsmrcaarf.supabase.co/functions/v1/birthday40-wishlist?img=',
    pollMs: 30000,
    wideBreakpoint: 1280,
    desktopBreakpoint: 900,
    pinnedExpensiveGift: 'alpaka-elements-tote-bko'
  });

  // Compatibility overrides for older catalog entries whose durable purchase page
  // differs from the URL stored in gifts.js. New gifts should prefer a canonical buyUrl.
  const BUY_OVERRIDES = Object.freeze({
    '8bitdo-micro': 'https://shop.8bitdo.com/products/8bitdo-micro-bluetooth-gamepad',
    'niimbot-d110': 'https://www.technocity.ru/catalog/detail/1537325/',
    'digital-caliper': 'https://www.joom.ru/ru/products/66fdd19ebef04001a8365029',
    'olfa-ak5': 'https://www.olfa.co.jp/en/products/686.html',
    'malevich-cutting-mat-a3': 'https://market.yandex.ru/card/kovrik-dlya-rezki-malevich-3-kh-sloynyy-a3-sirenevyy/103652006532',
    'ntag215-tags': 'https://market.yandex.ru/card/nfc-metki-ntag215-dlya-kontrolya-dostupa-100pcs/5970172393',
    'sunshine-ss302a': 'https://market.yandex.ru/card/usb-tester-analizator-zaryadki-sunshine-ss-302a/4392417971',
    'logic-analyzer-24m8ch': 'https://market.yandex.ru/card/nabor-ustroystv-usb-logicheskogo-analizatora-mini-tsifrovoy-karmannyy-razmer-8-kanalnaya-vkhodnaya-pamyat-24-mgts/6055511717',
    'ch341a-programmer': 'https://market.yandex.ru/card/ch341a-eeprom-programmator/101552620393',
    'musedo-cp60g': 'https://market.yandex.ru/card/pyezozvukosnimatel-musedo-cp-60g/102627651877',
    'tagging-gun': 'https://market.yandex.ru/card/iglovoy-pistolet-dlya-birok-i-etiketok/103698011237'
  });

  const SHOP_OVERRIDES = Object.freeze({
    '8bitdo-micro': '8BitDo',
    'niimbot-d110': 'Техносити',
    'digital-caliper': 'Joom',
    'olfa-ak5': 'OLFA'
  });

  const gifts = Array.isArray(window.WISHLIST_GIFTS) ? window.WISHLIST_GIFTS : [];
  const catalogMeta = window.WISHLIST_META || {};
  const rub = new Intl.NumberFormat('ru-RU');

  const elements = {
    grid: document.getElementById('grid'),
    toolbar: document.getElementById('toolbar'),
    count: document.getElementById('count'),
    toast: document.getElementById('toast'),
    offline: document.getElementById('offline'),
    verified: document.getElementById('verified')
  };

  const state = {
    reservations: new Set(),
    busy: new Set(),
    filter: 'all',
    apiOK: true,
    layoutColumns: getLayoutColumns(),
    toastTimer: null,
    pollTimer: null,
    resizeFrame: null
  };

  const htmlEscapes = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  });

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => htmlEscapes[char]);
  const money = value => `${rub.format(value)} ₽`;
  const storageKey = code => `s40_${code}`;

  function getLayoutColumns() {
    if (window.innerWidth > CONFIG.wideBreakpoint) return 4;
    if (window.innerWidth > CONFIG.desktopBreakpoint) return 3;
    return 1;
  }

  function getLocal(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function setLocal(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function removeLocal(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function storageWorks() {
    const key = `s40_test_${Date.now()}`;
    try {
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function isMine(code) {
    return Boolean(getLocal(storageKey(code)));
  }

  function say(message) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    state.toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 3000);
  }

  function passesFilter(gift) {
    if (state.filter === 'all') return true;
    if (state.filter === 'cheap') return gift.price <= 1500;
    if (state.filter === 'star') return Boolean(gift.star);
    return gift.category === state.filter;
  }

  function imageSrc(gift) {
    return gift.imageSrc || CONFIG.imageEndpoint + encodeURIComponent(gift.code);
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '#';
    } catch {
      return '#';
    }
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
  }

  function arrangeByPrice(list) {
    const columns = state.layoutColumns;
    if (columns === 1 || list.length < columns) return list;

    const sorted = [...list].sort((a, b) => a.price - b.price);
    const baseSize = Math.floor(sorted.length / columns);
    const remainder = sorted.length % columns;
    const groups = [];
    let cursor = 0;

    for (let index = 0; index < columns; index += 1) {
      const groupSize = baseSize + (index < remainder ? 1 : 0);
      groups.push(sorted.slice(cursor, cursor + groupSize));
      cursor += groupSize;
    }

    const expensive = groups[groups.length - 1];
    const pinnedIndex = expensive.findIndex(gift => gift.code === CONFIG.pinnedExpensiveGift);
    if (pinnedIndex > 0) expensive.unshift(expensive.splice(pinnedIndex, 1)[0]);

    const arranged = [];
    const rows = Math.max(...groups.map(group => group.length));
    for (let row = 0; row < rows; row += 1) {
      for (const group of groups) {
        if (group[row]) arranged.push(group[row]);
      }
    }
    return arranged;
  }

  function reserveLabel({ taken, own, loading }) {
    if (loading) return 'Секунду…';
    if (taken) return own ? 'Снять мой резерв' : 'Уже забрали';
    return state.apiOK ? 'Забронировать' : 'Резерв офлайн';
  }

  function giftCard(gift) {
    const taken = state.reservations.has(gift.code);
    const own = taken && isMine(gift.code);
    const loading = state.busy.has(gift.code);
    const buyUrl = safeExternalUrl(BUY_OVERRIDES[gift.code] || gift.buyUrl);
    const shop = SHOP_OVERRIDES[gift.code] || gift.shop;
    const disabled = (taken && !own) || !state.apiOK || loading;
    const badge = gift.star ? '★ В САМОЕ ТО' : `#${String(gift.category).toUpperCase()}`;

    return `
      <article class="card${taken ? ' reservedCard' : ''}">
        <div class="pic">
          <img loading="lazy" decoding="async" src="${escapeHtml(imageSrc(gift))}" alt="${escapeHtml(gift.title)}">
          <div class="badge${gift.star ? ' star' : ''}">${escapeHtml(badge)}</div>
        </div>
        <div class="body">
          <div class="shop">${escapeHtml(shop)}</div>
          <div class="title">${escapeHtml(gift.title)}</div>
          <div class="sub">${escapeHtml(gift.subtitle)}</div>
          <div class="why">${escapeHtml(gift.why)}</div>
          <div class="meta">
            <div class="price">${escapeHtml(money(gift.price))}</div>
            <div class="delivery">${escapeHtml(gift.delivery)}</div>
          </div>
          <div class="actions">
            <a class="btn buy" href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener noreferrer">Купить ↗</a>
            <button class="btn reserve${taken ? (own ? ' mine' : ' taken') : ''}" type="button" data-code="${escapeHtml(gift.code)}"${disabled ? ' disabled' : ''}>${escapeHtml(reserveLabel({ taken, own, loading }))}</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const visible = gifts.filter(passesFilter);
    const arranged = arrangeByPrice(visible);
    elements.count.textContent = `${arranged.length} из ${gifts.length}`;
    elements.grid.innerHTML = arranged.map(giftCard).join('');
  }

  async function rpc(functionName, body = {}) {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: CONFIG.publishableKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function sha256(value) {
    const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(data), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function setApiState(available) {
    const changed = state.apiOK !== available;
    state.apiOK = available;
    elements.offline.classList.toggle('show', !available);
    return changed;
  }

  async function refreshStatus() {
    try {
      const result = await rpc('birthday40_status');
      const nextReservations = new Set(Array.isArray(result) ? result : []);
      const reservationsChanged = !setsEqual(state.reservations, nextReservations);
      const apiChanged = setApiState(true);
      state.reservations = nextReservations;
      if (reservationsChanged || apiChanged) render();
    } catch {
      if (setApiState(false)) render();
    }
  }

  function schedulePoll(delay = CONFIG.pollMs) {
    clearTimeout(state.pollTimer);
    if (document.hidden) return;
    state.pollTimer = setTimeout(async () => {
      await refreshStatus();
      schedulePoll();
    }, delay);
  }

  async function reserve(code) {
    if (!state.apiOK || state.busy.has(code)) return;
    if (state.reservations.has(code)) {
      if (isMine(code)) await unreserve(code);
      else say('Эту позицию уже забрали.');
      return;
    }

    if (!storageWorks()) {
      say('Браузер блокирует локальное хранилище. Откройте страницу в обычном режиме браузера, чтобы резерв можно было потом снять.');
      return;
    }

    state.busy.add(code);
    render();

    try {
      const token = crypto.randomUUID() + crypto.randomUUID();
      const tokenHash = await sha256(token);
      await rpc('birthday40_reserve', {
        p_gift_code: code,
        p_reserved_by: 'anonymous',
        p_token_hash: tokenHash
      });

      if (!setLocal(storageKey(code), token)) {
        say('Резерв создан, но браузер не сохранил ключ для его снятия.');
      } else {
        say('Забронировано. Теперь не забудьте купить :)');
      }
      await refreshStatus();
    } catch {
      say('Не получилось: возможно, подарок уже успели забрать.');
      await refreshStatus();
    } finally {
      state.busy.delete(code);
      render();
    }
  }

  async function unreserve(code) {
    if (!window.confirm('Снять ваш резерв с этого подарка?')) return;

    const token = getLocal(storageKey(code));
    if (!token) {
      say('На этом устройстве нет ключа резерва.');
      return;
    }

    state.busy.add(code);
    render();

    try {
      const removed = await rpc('birthday40_unreserve', {
        p_gift_code: code,
        p_token_hash: await sha256(token)
      });

      if (removed) {
        removeLocal(storageKey(code));
        say('Резерв снят');
      } else {
        say('Не удалось снять резерв');
      }
      await refreshStatus();
    } catch {
      say('Не удалось снять резерв');
    } finally {
      state.busy.delete(code);
      render();
    }
  }

  function selectFilter(chip) {
    if (!chip?.dataset.filter) return;
    elements.toolbar.querySelectorAll('[data-filter]').forEach(button => {
      const selected = button === chip;
      button.classList.toggle('on', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    state.filter = chip.dataset.filter;
    render();
  }

  function handleResize() {
    if (state.resizeFrame) cancelAnimationFrame(state.resizeFrame);
    state.resizeFrame = requestAnimationFrame(() => {
      state.resizeFrame = null;
      const nextColumns = getLayoutColumns();
      if (nextColumns === state.layoutColumns) return;
      state.layoutColumns = nextColumns;
      render();
    });
  }

  function renderVerifiedDate() {
    if (!catalogMeta.verifiedAt) return;
    const date = new Date(`${catalogMeta.verifiedAt}T12:00:00`);
    elements.verified.textContent = `Каталог проверен: ${new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)} · Москва.`;
  }

  elements.grid.addEventListener('click', event => {
    const button = event.target.closest('button[data-code]');
    if (button && elements.grid.contains(button)) reserve(button.dataset.code);
  });

  elements.toolbar.addEventListener('click', event => {
    const chip = event.target.closest('button[data-filter]');
    if (chip && elements.toolbar.contains(chip)) selectFilter(chip);
  });

  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(state.pollTimer);
    } else {
      refreshStatus().finally(() => schedulePoll());
    }
  });

  renderVerifiedDate();
  render();
  refreshStatus().finally(() => schedulePoll());
})();
