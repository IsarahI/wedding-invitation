/* common.js — main / developer / release 세 페이지가 함께 쓰는 기능 모음 (window.WI)
 *
 * 값은 data.js 의 window.__WEDDING__ (conf 의 일반 항목), 계좌는 private.js 의 readGift() 에서 옵니다.
 * 페이지 JS(main.js, developer.js, release.js)는 여기 함수를 불러 화면을 채웁니다.
 *
 * 불러오는 순서: data.js → private.js → common.js → (페이지).js
 */
window.WI = (function () {
  'use strict';

  const C = window.__WEDDING__ || null;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];

  /* ---------- 작은 도구 ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const has = s => typeof s === 'string' && s.trim() !== '';
  const digits = s => (s || '').replace(/\D/g, '');
  const phoneOk = s => digits(s).length >= 8;
  const nl = s => (s || '').replace(/\\n/g, '\n');                 // conf 의 \n → 줄바꿈
  const isHolder = s => /^\[.*\]$/.test((s || '').trim());          // [대괄호 자리표시] 인지
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const base = p => (p || '').split('/').pop();
  const photoSrc = n => !has(n) ? '' : (/^(https?:)?\/\//.test(n) || n.startsWith('/')) ? n : 'photos/' + n;

  /* data.js 가 없으면(= src/ 를 직접 연 경우) 안내 문구를 보여 주고 멈춥니다. */
  function ready(rootSel) {
    if (C) return true;
    const root = $(rootSel || '#app') || document.body;
    root.innerHTML = '<p class="err">data.js 를 찾을 수 없습니다.<br>src/ 를 직접 열지 말고 ./build.sh 로 만든 dist/ 를 열어 주세요.</p>';
    return false;
  }

  /* ---------- 알림 · 복사 ---------- */
  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = el('div', 'toast'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function copyText(text, okMsg) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (e) {
      const ta = el('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
    toast(ok ? (okMsg || '복사했습니다') : '복사하지 못했습니다. 직접 선택해 복사해 주세요');
    return ok;
  }

  /* ---------- 사진 ---------- */
  // 파일이 없으면 파일 이름이 적힌 빈 칸으로 남습니다.
  function photo(box, name, alt, cb) {
    const src = photoSrc(name);
    box.dataset.label = base(src) || 'photo';
    box.classList.add('empty');
    if (!src) { cb && cb(false, src); return; }
    const img = new Image(); img.alt = alt || '';
    img.onload = () => { box.classList.remove('empty'); cb && cb(true, src); };
    img.onerror = () => { img.remove(); cb && cb(false, src); };
    box.prepend(img); img.src = src;
  }

  /* ---------- 날짜 (한국 시간 기준) ---------- */
  const W = C && has(C.WEDDING_AT) ? new Date(C.WEDDING_AT) : null;
  const wOK = !!W && !isNaN(W);
  function kst(d) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' });
    const p = Object.fromEntries(f.formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute,
             wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
  }
  const koTime = (h, mi) => { const t = h === 12 ? '낮 12시' : h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`; return mi ? `${t} ${mi}분` : t; };
  const K = wOK ? kst(W) : null;
  const when = {
    ok: wOK, W, K,
    iso: wOK ? `${K.y}-${pad(K.m)}-${pad(K.d)}` : '[예식 일시]',
    hhmm: wOK ? `${pad(K.h)}:${pad(K.mi)}` : '',
    dateKo: wOK ? `${K.y}년 ${K.m}월 ${K.d}일 ${WD[K.wd]}요일` : '[예식 일시]',
    timeKo: wOK ? koTime(K.h, K.mi) : '',
    // 달력 기준 날짜 차이 (보는 사람의 시간대와 무관)
    dayLeft() { if (!wOK) return null; const n = kst(new Date()); return Math.round((Date.UTC(K.y, K.m - 1, K.d) - Date.UTC(n.y, n.m - 1, n.d)) / 864e5); },
    // 예식 시각이 지났거나 주소 끝에 ?preview=1 이 있으면 true
    released() { if (new URLSearchParams(location.search).get('preview') === '1') return true; return wOK && Date.now() >= W.getTime(); }
  };
  const parts = ms => { ms = Math.max(0, ms); return { d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4), s: Math.floor(ms % 6e4 / 1e3) }; };
  // 1초마다 fn 을 부릅니다. fn 이 false 를 돌려주면 멈춥니다.
  function every(fn) { if (fn() === false) return; const id = setInterval(() => { if (fn() === false) clearInterval(id); }, 1000); }

  function calendar(box) {
    if (!wOK) { box.hidden = true; return; }
    box.hidden = false; box.textContent = ''; box.classList.add('cal');
    WD.forEach((w, i) => box.append(el('span', 'h' + (i === 0 ? ' sun' : ''), w)));
    const first = new Date(Date.UTC(K.y, K.m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(K.y, K.m, 0)).getUTCDate();
    for (let i = 0; i < first; i++) box.append(el('span'));
    for (let d = 1; d <= days; d++) {
      const s = el('span', d === K.d ? 'on' : ((first + d - 1) % 7 === 0 ? 'sun' : ''), d);
      if (d === K.d) s.setAttribute('aria-label', `${K.m}월 ${d}일 결혼식`);
      box.append(s);
    }
  }

  /* ---------- 갤러리 + 라이트박스 ---------- */
  let lb = null, items = [], cur = 0, opener = null;
  function buildLb() {
    lb = el('div', 'lb'); lb.hidden = true; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', '사진 크게 보기');
    lb.innerHTML = '<img alt=""><button class="x" type="button" aria-label="닫기">×</button><button class="p" type="button" aria-label="이전 사진">‹</button>' +
                   '<button class="n" type="button" aria-label="다음 사진">›</button><p class="cnt"></p>';
    document.body.append(lb);
    $('.x', lb).onclick = closeLb; $('.p', lb).onclick = () => step(-1); $('.n', lb).onclick = () => step(1);
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    let tx = null;
    lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  }
  function showLb() {
    const p = items[cur];
    $('img', lb).src = p.src; $('img', lb).alt = `갤러리 사진 ${p.i + 1}`;
    $('.cnt', lb).textContent = `${cur + 1} / ${items.length}`;
    $('.p', lb).hidden = $('.n', lb).hidden = items.length < 2;
  }
  function openLb(all, p) {
    if (!lb) buildLb();
    items = all.filter(x => x.ok); cur = items.indexOf(p);
    opener = document.activeElement; lb.hidden = false; showLb(); $('.x', lb).focus(); document.body.style.overflow = 'hidden';
  }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ''; opener && opener.focus(); }
  function step(d) { cur = (cur + d + items.length) % items.length; showLb(); }

  // box 안에 PHOTO_GALLERY 의 사진들을 타일로 채웁니다. 사진이 없으면 sectionSel 을 숨깁니다.
  function gallery(box, sectionSel) {
    const all = list(C.PHOTO_GALLERY).map((n, i) => ({ name: n, ok: false, i }));
    if (!all.length) { if (sectionSel) $(sectionSel).hidden = true; return; }
    box.classList.add('gal');
    all.forEach(p => {
      const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', `사진 ${p.i + 1} 크게 보기`);
      photo(b, p.name, `갤러리 사진 ${p.i + 1}`, (ok, src) => { p.ok = ok; p.src = src; if (!ok) b.disabled = true; });
      b.addEventListener('click', () => { if (p.ok) openLb(all, p); });
      box.append(b);
    });
  }

  /* ---------- 오시는 길 (id 고정: venue hall addr copyAddr mapNaver mapKakao venueTel info) ---------- */
  function directions() {
    if ($('#venue')) $('#venue').textContent = C.VENUE_NAME;
    if ($('#hall')) $('#hall').textContent = C.VENUE_HALL;
    if ($('#addr')) $('#addr').textContent = C.VENUE_ADDRESS;
    if ($('#copyAddr')) $('#copyAddr').onclick = () => copyText([C.VENUE_ADDRESS, C.VENUE_NAME].filter(has).join(' '), '주소를 복사했습니다');
    const q = encodeURIComponent(has(C.VENUE_ADDRESS) ? C.VENUE_ADDRESS : C.VENUE_NAME);
    if ($('#mapNaver')) $('#mapNaver').href = has(C.MAP_NAVER_URL) ? C.MAP_NAVER_URL : `https://map.naver.com/p/search/${q}`;
    if ($('#mapKakao')) $('#mapKakao').href = has(C.MAP_KAKAO_URL) ? C.MAP_KAKAO_URL : `https://map.kakao.com/?q=${q}`;
    const vt = $('#venueTel');
    if (vt) { if (phoneOk(C.VENUE_PHONE)) vt.href = 'tel:' + digits(C.VENUE_PHONE); else vt.setAttribute('aria-disabled', 'true'); }
    const info = $('#info');
    if (info) {
      [[info.dataset.subway || '지하철', C.INFO_SUBWAY], [info.dataset.bus || '버스', C.INFO_BUS],
       [info.dataset.parking || '주차', C.INFO_PARKING], [info.dataset.meal || '식사', C.INFO_MEAL]]
        .filter(([, v]) => has(v)).forEach(([k, v]) => { const r = el('div'); r.append(el('dt', '', k), el('dd', '', nl(v))); info.append(r); });
      if (!info.children.length) info.hidden = true;
    }
  }

  /* ---------- 계좌 (난독화 해제) ---------- */
  // opts.groom / opts.bride : 아코디언 제목, opts.tags : 제목 앞의 작은 글자(없으면 생략)
  function accounts(box, sectionSel, opts) {
    opts = opts || {};
    const gift = window.readGift ? window.readGift() : { groom: [], bride: [] };
    const sides = [['groom', opts.groom || '신랑측 계좌번호', gift.groom], ['bride', opts.bride || '신부측 계좌번호', gift.bride]].filter(([, , a]) => a.length);
    if (!sides.length) { if (sectionSel) $(sectionSel).hidden = true; return; }
    if (sectionSel) $(sectionSel).hidden = false;
    sides.forEach(([key, title, rows], idx) => {
      const wrap = el('div', 'accd');
      const head = el('button', 'accd-head'); head.type = 'button'; head.id = 'accH' + idx; head.setAttribute('aria-expanded', 'false');
      if (opts.tags) head.append(el('span', 'tag', key + ':'));
      head.append(document.createTextNode(title));
      const body = el('div', 'accd-body'); body.id = 'accB' + idx;
      head.setAttribute('aria-controls', body.id); body.setAttribute('role', 'region'); body.setAttribute('aria-labelledby', head.id);
      const inner = el('div');
      rows.forEach(r => {
        const row = el('div', 'accd-row'); const left = el('div');
        left.append(el('div', 'who', r.role), el('div', 'nm', r.name), el('div', 'no', `${r.bank} ${r.number}`));
        const b = el('button', 'btn sm', '복사'); b.type = 'button'; b.setAttribute('aria-label', `${r.name} 계좌번호 복사`);
        b.onclick = () => copyText(`${r.bank} ${r.number}`, '계좌번호를 복사했습니다');
        row.append(left, b); inner.append(row);
      });
      body.append(inner);
      head.onclick = () => { const open = head.getAttribute('aria-expanded') !== 'true'; head.setAttribute('aria-expanded', open); body.classList.toggle('open', open); };
      wrap.append(head, body); box.append(wrap);
    });
  }

  /* ---------- 폼 도구 ---------- */
  function seg(name, label, opts) {
    const fs = el('fieldset'); fs.append(el('legend', '', label));
    const row = el('div', 'seg');
    opts.forEach((o, i) => {
      const lab = el('label'); const inp = el('input'); inp.type = 'radio'; inp.name = name; inp.value = o; inp.checked = i === 0;
      lab.append(inp, el('span', '', o)); row.append(lab);
    });
    fs.append(row); return fs;
  }
  function field(id, label, node) { const d = el('div'); const l = el('label', 'l', label); l.htmlFor = id; node.id = id; node.className = 'field'; d.append(l, node); return d; }

  /* ---------- 참석 여부 → 문자 작성창 ---------- */
  // L: { side, name, attend, count, meal, msg, submit, note }  — 라벨 글자 (페이지마다 다르게)
  function rsvp(form, sectionSel, L) {
    if (C.RSVP_ENABLED === 'false') { if (sectionSel) $(sectionSel).hidden = true; return; }
    const nameIn = el('input'); nameIn.type = 'text'; nameIn.autocomplete = 'name';
    const cntIn = el('input'); cntIn.type = 'number'; cntIn.min = 1; cntIn.max = 20; cntIn.value = 1; cntIn.inputMode = 'numeric';
    const msgIn = el('textarea'); msgIn.placeholder = '전하고 싶은 말씀이 있다면 적어 주세요 (선택)';
    const sub = el('button', 'btn fill', L.submit); sub.type = 'submit';
    form.append(seg('side', L.side, ['신랑측', '신부측']), field('rName', L.name, nameIn),
      seg('att', L.attend, ['참석', '불참', '미정']), field('rCnt', L.count, cntIn),
      seg('meal', L.meal, ['식사 예정', '식사 안 함', '미정']), field('rMsg', L.msg, msgIn), sub, el('p', 'note', L.note));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!nameIn.value.trim()) { toast('성함을 입력해 주세요'); nameIn.focus(); return; }
      const v = n => form.querySelector(`input[name="${n}"]:checked`).value;
      const side = v('side');
      const body = ['[청첩장 참석 여부]', `구분: ${side} 하객`, `성함: ${nameIn.value.trim()}`, `참석: ${v('att')}`,
        v('att') === '참석' ? `인원: ${cntIn.value || 1}명` : null, `식사: ${v('meal')}`,
        msgIn.value.trim() ? `한마디: ${msgIn.value.trim()}` : null].filter(Boolean).join('\n');
      const to = side === '신랑측' ? C.GROOM_PHONE : C.BRIDE_PHONE;
      if (phoneOk(to)) location.href = `sms:${digits(to)}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(body)}`;
      else copyText(body, '문자를 열 수 없어 내용을 복사했습니다. 직접 보내 주세요');
    });
  }

  /* ---------- 축하 한마디 (GUESTBOOK_API_BASE 가 있을 때만) ---------- */
  // o: { section, form, count, list, more, labels:{name,msg,submit}, git:true/false }
  function guestbook(o) {
    const GB = has(C.GUESTBOOK_API_BASE) ? C.GUESTBOOK_API_BASE.replace(/\/$/, '') : '';
    if (!GB) return;
    $(o.section).hidden = false;
    const gName = el('input'); gName.type = 'text'; gName.maxLength = 20; gName.autocomplete = 'nickname'; gName.placeholder = '이름 (비우면 익명)';
    const gMsg = el('textarea'); gMsg.maxLength = 200; gMsg.placeholder = '축하의 한마디 (200자 이내)';
    const gSub = el('button', 'btn fill', o.labels.submit); gSub.type = 'submit';
    $(o.form).append(field('gName', o.labels.name, gName), field('gMsg', o.labels.msg, gMsg), gSub);
    let total = 0, cursor = null, loading = false;
    const countEl = $(o.count), listEl = $(o.list), moreEl = $(o.more);
    const render = it => {
      const d = el('div', 'gb-item'); const t = kst(new Date(it.ts));
      const meta = el('p', 'meta');
      if (o.git) meta.append(el('span', 'id', `#${it.id}`), document.createTextNode('  '));
      meta.append(document.createTextNode(`${t.y}-${pad(t.m)}-${pad(t.d)} ${pad(t.h)}:${pad(t.mi)}`));
      d.append(meta, el('p', 'who', it.name || '익명'), el('p', 'msg', it.msg)); return d;
    };
    const showCount = () => { countEl.textContent = o.git ? `$ git log --count  →  ${total}` : `축하 한마디 ${total}개`; };
    async function load() {
      if (loading) return; loading = true;
      try {
        const r = await fetch(`${GB}/guestbook?limit=10${cursor ? '&before=' + cursor : ''}`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        total = data.count; showCount();
        data.recent.forEach(it => listEl.append(render(it)));
        cursor = data.next; moreEl.hidden = !cursor;
      } catch (e) { countEl.textContent = '축하 한마디를 불러오지 못했습니다.'; }
      loading = false;
    }
    moreEl.onclick = load;
    $(o.form).addEventListener('submit', async e => {
      e.preventDefault();
      if (!gMsg.value.trim()) { toast('한마디를 적어 주세요'); gMsg.focus(); return; }
      gSub.disabled = true;
      try {
        const r = await fetch(`${GB}/guestbook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: gName.value.trim(), msg: gMsg.value.trim() }) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || '저장하지 못했습니다. 잠시 후 다시 시도해 주세요');
        listEl.prepend(render(data.item)); total += 1; showCount(); gMsg.value = '';
        toast('축하 한마디를 남겼습니다');
      } catch (err) { toast(err.message); }
      gSub.disabled = false;
    });
    load();
  }

  /* ---------- 연락하기 ---------- */
  // roles: { groom, bride, groomFather, groomMother, brideFather, brideMother } — 화면에 쓸 호칭
  function contacts(box, sectionSel, roles) {
    const ppl = [[roles.groom, C.GROOM_NAME, C.GROOM_PHONE], [roles.bride, C.BRIDE_NAME, C.BRIDE_PHONE],
      [roles.groomFather, C.GROOM_FATHER, C.GROOM_FATHER_PHONE], [roles.groomMother, C.GROOM_MOTHER, C.GROOM_MOTHER_PHONE],
      [roles.brideFather, C.BRIDE_FATHER, C.BRIDE_FATHER_PHONE], [roles.brideMother, C.BRIDE_MOTHER, C.BRIDE_MOTHER_PHONE]].filter(([, n, p]) => has(n) && has(p));
    if (!ppl.length) { if (sectionSel) $(sectionSel).hidden = true; return; }
    ppl.forEach(([role, name, phone]) => {
      const row = el('div'); const l = el('div'); l.append(el('div', 'who', role), el('div', 'nm', name));
      const act = el('div', 'act');
      ['전화', '문자'].forEach(t => {
        const a = el('a', 'btn sm', t);
        if (phoneOk(phone)) a.href = (t === '전화' ? 'tel:' : 'sms:') + digits(phone); else a.setAttribute('aria-disabled', 'true');
        a.setAttribute('aria-label', `${name} ${t}`); act.append(a);
      });
      row.append(l, act); box.append(row);
    });
  }

  /* ---------- 공유 · 화면 모드 · release 배너 ---------- */
  function share(copyBtn, shareBtn) {
    if (copyBtn) copyBtn.onclick = () => copyText(location.href, '링크를 복사했습니다');
    if (shareBtn && navigator.share) { shareBtn.hidden = false; shareBtn.onclick = () => navigator.share({ title: document.title, url: location.href }).catch(() => {}); }
  }
  // 라이트/다크 (developer, release). 선택은 이 브라우저에만 저장됩니다.
  function theme(btn) {
    const root = document.documentElement;
    if (!root.getAttribute('data-theme') && (C.DEFAULT_THEME === 'light' || C.DEFAULT_THEME === 'dark')) root.setAttribute('data-theme', C.DEFAULT_THEME);
    if (btn) btn.onclick = () => {
      const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    };
  }
  // 예식 시각이 지나면 release 페이지로 가는 배너를 보여 줍니다.
  function releaseBanner(sel) { const b = $(sel); if (b && when.released() && when.ok) b.hidden = false; }

  return { C, $, el, has, digits, phoneOk, nl, isHolder, esc, pad, list, base, WD, photoSrc, ready, toast, copyText, photo, when, kst, parts, every,
           calendar, gallery, directions, accounts, rsvp, guestbook, contacts, share, theme, releaseBanner };
})();
