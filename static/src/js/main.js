/* main.js — main.html (부모님·어른들께 보내는 버전)의 화면을 채웁니다. 공통 기능은 common.js(WI)를 씁니다. */
(() => {
  const WI = window.WI;
  if (!WI.ready('#app')) return;
  const { C, $, el, has, esc, when } = WI;

  document.title = `${C.GROOM_NAME} ♥ ${C.BRIDE_NAME} 결혼합니다`;

  /* ---------- 글자 크기 (보통 → 크게 → 아주 크게) ---------- */
  const root = document.documentElement, fsz = $('#fsz');
  const LEVELS = ['', 'l', 'xl'], NAMES = ['보통', '크게', '아주 크게'];
  const mark = () => fsz.dataset.level = root.getAttribute('data-size') || '';
  mark();
  fsz.onclick = () => {
    const i = (LEVELS.indexOf(root.getAttribute('data-size') || '') + 1) % LEVELS.length;
    if (LEVELS[i]) root.setAttribute('data-size', LEVELS[i]); else root.removeAttribute('data-size');
    try { localStorage.setItem('fontsize', LEVELS[i]); } catch (e) {}
    mark(); WI.toast(`글자 크기: ${NAMES[i]}`);
  };

  /* ---------- 표지 ---------- */
  WI.photo($('#cPhoto'), C.PHOTO_COVER, `${C.GROOM_NAME}, ${C.BRIDE_NAME}`);
  $('#cDate').textContent = when.ok ? `${when.K.y}. ${WI.pad(when.K.m)}. ${WI.pad(when.K.d)}  ${WI.WD[when.K.wd]}요일  ${when.timeKo}` : '[예식 일시]';
  $('#cGroom').textContent = C.GROOM_NAME;
  $('#cBride').textContent = C.BRIDE_NAME;
  $('#cEn').textContent = [C.GROOM_NAME_EN, C.BRIDE_NAME_EN].filter(has).join('  &  ');
  $('#cVenue').textContent = [C.VENUE_NAME, C.VENUE_HALL].filter(has).join(' ');
  WI.releaseBanner('#releaseBanner');

  /* ---------- 인사말 · 혼주 ---------- */
  $('#greetTitle').textContent = WI.nl(C.GREETING_TITLE);
  $('#greetText').textContent = WI.nl(C.GREETING_TEXT);
  [[C.GROOM_FATHER, C.GROOM_MOTHER, C.GROOM_RANK, C.GROOM_NAME], [C.BRIDE_FATHER, C.BRIDE_MOTHER, C.BRIDE_RANK, C.BRIDE_NAME]].forEach(([f, m, rank, name]) => {
    const p = el('p'); const parents = [f, m].filter(has).join('  ·  ');
    if (parents) p.append(parents + '의  ');
    if (has(rank)) p.append(rank + '  ');
    p.append(el('strong', '', name)); $('#family').append(p);
  });

  /* ---------- 신랑 · 신부 ---------- */
  [[C.GROOM_NAME, C.GROOM_NAME_EN, C.GROOM_INTRO, C.GROOM_PHOTO], [C.BRIDE_NAME, C.BRIDE_NAME_EN, C.BRIDE_INTRO, C.BRIDE_PHOTO]].forEach(([n, en, intro, ph]) => {
    const fig = el('div', 'person'); const box = el('div', 'photo'); WI.photo(box, ph, n);
    fig.append(box, el('h3', '', n));
    if (has(en)) fig.append(el('p', 'en', en));
    if (has(intro)) fig.append(el('p', 'intro', WI.nl(intro)));
    $('#pair').append(fig);
  });

  /* ---------- 예식 안내 ---------- */
  $('#whenDate').textContent = when.dateKo;
  $('#whenTime').textContent = when.timeKo;
  $('#whenVenue').textContent = [C.VENUE_NAME, C.VENUE_HALL].filter(has).join(' ');
  if (when.ok) {
    WI.calendar($('#cal'));
    const dd = $('#dday'); dd.hidden = false;
    WI.every(() => {
      const left = when.dayLeft();
      dd.innerHTML = left > 0 ? `결혼식까지 <b>${left}일</b> 남았습니다` : left === 0 ? '<b>오늘</b> 결혼합니다' : '함께해 주셔서 감사합니다';
      return left > 0;
    });
  }

  /* ---------- 갤러리 · 오시는 길 · 계좌 · 참석 여부 · 방명록 · 연락하기 ---------- */
  WI.gallery($('#gal'), '#galSec');
  WI.directions();
  WI.accounts($('#acc'), '#accSec', { groom: '신랑측 계좌번호', bride: '신부측 계좌번호' });
  WI.rsvp($('#rsvp'), '#rsvpSec', { side: '어느 쪽 하객이신가요?', name: '성함', attend: '참석 여부', count: '참석 인원 (본인 포함)', meal: '식사', msg: '한마디', submit: '문자로 전달하기', note: '문자 앱에서 내용을 한 번 더 확인하고 보낼 수 있습니다.' });
  WI.guestbook({ section: '#gbSec', form: '#gbForm', count: '#gbCount', list: '#gbList', more: '#gbMore', git: false, labels: { name: '이름', msg: '한마디', submit: '남기기' } });
  WI.contacts($('#contact'), '#contactSec', { groom: '신랑', bride: '신부', groomFather: '신랑 아버님', groomMother: '신랑 어머님', brideFather: '신부 아버님', brideMother: '신부 어머님' });

  /* ---------- 마무리 ---------- */
  WI.photo($('#closePhoto'), C.PHOTO_CLOSING, `${C.GROOM_NAME}, ${C.BRIDE_NAME}`);
  $('#closeMsg').textContent = WI.nl(C.CLOSING_TEXT);
  $('#closeNames').textContent = `${C.GROOM_NAME}  ♥  ${C.BRIDE_NAME}`;
  WI.share($('#copyLink'), $('#shareBtn'));
})();
