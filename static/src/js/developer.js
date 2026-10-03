/* developer.js — developer.html 의 화면을 채웁니다. 공통 기능은 common.js(WI)를 씁니다.
 * 이 파일에는 개인 정보가 없습니다. 값은 invitation.conf → build.sh → data.js 로 들어옵니다.
 */
(() => {
  const WI = window.WI;
  if (!WI.ready('#app')) return;
  const { C, $, el, has, nl, isHolder, esc, pad, when, WD } = WI;

  WI.theme($('#theme'));
  document.title = `${C.GROOM_NAME} ♥ ${C.BRIDE_NAME} 결혼합니다`;

  /* 코드 블록: tok(색, 글자) 와 L(들여쓰기, ...조각) 으로 한 줄씩 만듭니다. */
  const tok = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;
  const L = (i, ...parts) => `<div class="l"><span class="t" style="--i:${i}">${parts.join('')}</span></div>`;
  const block = rows => `<div class="code">${rows.join('')}</div>`;
  const venueFull = [C.VENUE_NAME, C.VENUE_HALL].filter(has).join(' ');

  /* ---------- 표지: 터미널 + 이름 + 사진 ---------- */
  $('#cGroom').textContent = C.GROOM_NAME;
  $('#cBride').textContent = C.BRIDE_NAME;
  $('#cEn').textContent = [C.GROOM_NAME_EN, C.BRIDE_NAME_EN].filter(has).join('  &  ');
  $('#cSub').textContent = when.ok ? `${when.dateKo} ${when.timeKo} · ${venueFull}` : `[예식 일시] · ${venueFull}`;
  const coverName = has(C.PHOTO_COVER_DEV) ? C.PHOTO_COVER_DEV : C.PHOTO_COVER;
  WI.photo($('#cPhoto'), coverName, `${C.GROOM_NAME}, ${C.BRIDE_NAME}`);
  $('#cCap').textContent = '// ' + WI.base(WI.photoSrc(coverName));
  $('#termSr').textContent = `${C.GROOM_NAME}, ${C.BRIDE_NAME} 결혼식. ${when.iso} ${when.timeKo}. ${venueFull}`;
  WI.releaseBanner('#releaseBanner');

  (function terminal() {
    const term = $('#term');
    const left = when.dayLeft();
    const status = when.ok ? (left > 0 ? `D-${left}` : left === 0 ? 'D-Day' : 'released') : 'pending';
    const rows = [
      ['<span class="p">$</span>', `./invite --groom "${C.GROOM_NAME}" --bride "${C.BRIDE_NAME}"`, false],
      ['<span class="p">&gt;</span>', `date    ${when.iso}${when.ok ? ` (${WD[when.K.wd]}) ${when.hhmm}` : ''}`, false],
      ['<span class="p">&gt;</span>', `venue   ${venueFull}`, false],
      ['<span class="p">&gt;</span>', `status  ${status}  <span class="ok">ready</span>`, true]
    ];
    const lines = rows.map(([pre, text, html], i) => { const d = el('div', i ? 'out' : ''); d.innerHTML = pre; return { d, text, html }; });
    const show = ({ d, text, html }) => d.insertAdjacentHTML('beforeend', html ? text : esc(text));
    const cur = el('span', 'cur');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lines.forEach(l => { term.append(l.d); show(l); });
      lines[lines.length - 1].d.append(cur);
      return;
    }
    // 첫 줄만 한 글자씩 치고, 나머지는 차례로 나타납니다.
    const first = lines[0]; term.append(first.d); first.d.append(cur);
    let i = 0;
    const type = () => {
      if (i < first.text.length) { cur.before(first.text[i++]); setTimeout(type, 26); return; }
      let n = 1;
      const next = () => { if (n >= lines.length) return; const l = lines[n++]; term.append(l.d); show(l); l.d.append(cur); setTimeout(next, 240); };
      setTimeout(next, 260);
    };
    setTimeout(type, 350);
  })();

  /* ---------- 인사말 · 혼주 (greeting.md) ---------- */
  const intro = has(C.DEV_INTRO) ? C.DEV_INTRO : C.GREETING_TEXT;
  $('#greeting').innerHTML =
    `<h2 class="h"><span class="k">#</span>초대합니다</h2>` +
    `<p class="text pre">${esc(nl(intro))}</p>` +
    `<div class="fam">` +
    [['groom', C.GROOM_FATHER, C.GROOM_MOTHER, C.GROOM_RANK, C.GROOM_NAME], ['bride', C.BRIDE_FATHER, C.BRIDE_MOTHER, C.BRIDE_RANK, C.BRIDE_NAME]].map(([k, f, m, r, n]) => {
      const parents = [f, m].filter(has).join(' · ');
      return `<p><span class="c">// ${k}</span><br>${parents ? esc(parents) + '의 ' : ''}${has(r) ? esc(r) + ' ' : ''}<strong>${esc(n)}</strong></p>`;
    }).join('') + `</div>`;

  /* ---------- 신랑 · 신부 (people.json) ---------- */
  function personBlock(P) {
    const prop = (k, v, tail) => L(1, tok('f', k), tok('p', ': '), v, tok('p', ','), tail || '');
    const rows = [L(0, tok('p', '{')), prop('name', tok('s', `"${P.name}"`))];
    if (has(P.en)) rows.push(prop('en', tok('s', `"${P.en}"`)));
    if (has(P.role)) rows.push(prop('role', tok('s', `"${P.role}"`)));
    if (has(P.rankExpr)) rows.push(prop('rank', tok('n', P.rankExpr), has(P.rank) ? tok('c', ' // ' + P.rank) : ''));
    else if (has(P.rank)) rows.push(prop('rank', tok('s', `"${P.rank}"`)));
    if (has(P.mbti)) rows.push(prop('mbti', tok('s', `"${P.mbti}"`)));
    if (has(P.hobby)) {
      const items = isHolder(P.hobby) ? [P.hobby] : WI.list(P.hobby);
      rows.push(prop('hobby', tok('p', '[') + items.map(s => tok('s', `"${s}"`)).join(tok('p', ', ')) + tok('p', ']')));
    }
    if (has(P.note)) rows.push(L(1, tok('c', P.note.trim().startsWith('//') ? P.note.trim() : '// ' + P.note.trim())));
    rows.push(L(0, tok('p', '}')));
    return block(rows);
  }
  [{ name: C.GROOM_NAME, en: C.GROOM_NAME_EN, role: C.GROOM_ROLE, rank: C.GROOM_RANK, rankExpr: C.GROOM_RANK_EXPR, mbti: C.GROOM_MBTI, hobby: C.GROOM_HOBBY, note: C.GROOM_NOTE, photo: C.GROOM_PHOTO },
   { name: C.BRIDE_NAME, en: C.BRIDE_NAME_EN, role: C.BRIDE_ROLE, rank: C.BRIDE_RANK, rankExpr: C.BRIDE_RANK_EXPR, mbti: C.BRIDE_MBTI, hobby: C.BRIDE_HOBBY, note: C.BRIDE_NOTE, photo: C.BRIDE_PHOTO }]
    .forEach(P => {
      const row = el('div', 'person'); const fig = el('div');
      const ph = el('div', 'photo'); WI.photo(ph, P.photo, P.name);
      fig.append(ph, el('p', 'cap', WI.base(WI.photoSrc(P.photo))));
      const code = el('div'); code.innerHTML = personBlock(P);
      row.append(fig, code); $('#people').append(row);
    });

  /* ---------- 예식 안내 (schedule.ts) ---------- */
  $('#schedule').innerHTML = block([
    L(0, tok('k', 'const'), ' wedding ', tok('p', '= {')),
    L(1, tok('f', 'date'), tok('p', ': '), tok('s', `"${when.iso}"`), tok('p', ','), when.ok ? tok('c', `   // ${WD[when.K.wd]}요일`) : ''),
    L(1, tok('f', 'time'), tok('p', ': '), tok('s', `"${when.hhmm || '[예식 시각]'}"`), tok('p', ','), when.ok ? tok('c', `   // ${when.timeKo}`) : ''),
    L(1, tok('f', 'venue'), tok('p', ': '), tok('s', `"${venueFull}"`), tok('p', ',')),
    L(0, tok('p', '};'))
  ]) + `<p class="big-date">${esc(when.dateKo)}</p><p class="big-time">${esc(when.timeKo)}</p>`;

  if (when.ok) {
    WI.calendar($('#cal'));
    $('#dday').hidden = false;
    const met = has(C.FIRST_MET_AT) ? new Date(C.FIRST_MET_AT) : null;
    const hasProg = met && !isNaN(met) && when.W > met;
    if (hasProg) $('#prog').hidden = false;
    WI.every(() => {
      const diff = when.W - Date.now();
      if (diff <= 0) {
        $('#ddLabel').textContent = ''; $('#ddNum').textContent = '감사합니다'; $('#ddUnit').textContent = '';
        $('#ddClock').textContent = '함께해 주셔서 고맙습니다.';
      } else {
        const p = WI.parts(diff);
        $('#ddLabel').textContent = '결혼식까지';
        $('#ddNum').textContent = p.d; $('#ddUnit').textContent = '일';
        $('#ddClock').textContent = `${pad(p.h)}:${pad(p.m)}:${pad(p.s)} 남았습니다`;
      }
      if (hasProg) {
        const pct = Math.max(0, Math.min(100, (Date.now() - met) / (when.W - met) * 100));
        $('#prog i').style.width = pct + '%';
        $('#prog .bar').setAttribute('aria-valuenow', Math.round(pct));
        $('#pgText').textContent = `${pct.toFixed(1)}%  ·  우리가 만난 지 ${Math.floor((Date.now() - met) / 864e5).toLocaleString('ko-KR')}일`;
      }
      return diff > 0;
    });
  }

  /* ---------- 갤러리 · 오시는 길 · 계좌 · 참석 여부 · 방명록 · 연락하기 ---------- */
  WI.gallery($('#gal'), '#galSec');
  WI.directions();
  WI.accounts($('#acc'), '#accSec', { tags: true });
  WI.rsvp($('#rsvp'), '#rsvpSec', { side: 'side', name: 'name', attend: 'attend', count: 'guests (본인 포함)', meal: 'meal', msg: 'message', submit: '문자로 전달하기', note: '문자 앱에서 내용을 한 번 더 확인하고 보낼 수 있습니다.' });
  WI.guestbook({ section: '#gbSec', form: '#gbForm', count: '#gbCount', list: '#gbList', more: '#gbMore', git: true, labels: { name: 'name', msg: 'message', submit: '남기기' } });
  WI.contacts($('#contact'), '#contactSec', { groom: 'groom', bride: 'bride', groomFather: 'groom.father', groomMother: 'groom.mother', brideFather: 'bride.father', brideMother: 'bride.mother' });

  /* ---------- 마무리 (commit.log) ---------- */
  WI.photo($('#closePhoto'), C.PHOTO_CLOSING, `${C.GROOM_NAME}, ${C.BRIDE_NAME}`);
  $('#commit').innerHTML =
    `<div><span class="acc">$</span> <span class="f">git</span> commit -m</div>` +
    `<span class="msg">${esc(nl(C.CLOSING_TEXT))}</span>` +
    `<div class="res">[main] ${esc(C.GROOM_NAME)} ♥ ${esc(C.BRIDE_NAME)}${when.ok ? ' · ' + esc(when.iso) : ''}</div>`;
  WI.share($('#copyLink'), $('#shareBtn'));

  console.log(`%c♥ ${C.GROOM_NAME} & ${C.BRIDE_NAME}`, 'font:700 16px monospace;color:#C2185B');
  console.log('소스가 궁금하셨나요? 와 주셔서, 축하해 주셔서 감사합니다.');
})();
