/* release.js — release.html. 예식 시각 전에는 403 잠금 화면, 지나면 감사 인사를 보여 줍니다.
 * 주소 끝에 ?preview=1 을 붙이면 시각 전에도 감사 인사 화면을 미리 볼 수 있습니다. (신랑·신부 확인용) */
(() => {
  const WI = window.WI;
  if (!WI.ready('#app')) return;
  const { C, $, has, esc, pad, when } = WI;
  WI.theme($('#theme'));
  document.title = `v1.0.0 released — ${C.GROOM_NAME} ♥ ${C.BRIDE_NAME}`;

  const line = (cls, text) => `<div class="l"><span class="t ${cls || ''}">${esc(text)}</span></div>`;

  if (!when.released()) {
    /* ---------- 잠금 화면 ---------- */
    $('#locked').hidden = false;
    $('#lockDetail').innerHTML = when.ok
      ? `이 페이지는 ${esc(when.dateKo)} ${esc(when.timeKo)},<br>두 사람의 배포가 끝나는 순간 열립니다.`
      : '이 페이지는 두 사람의 배포가 끝나는 순간 열립니다.';
    if (when.ok) WI.every(() => {
      const p = WI.parts(when.W - Date.now());
      $('#lockCount').textContent = `T-${String(p.d).padStart(3, '0')}:${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;
      if (when.W <= Date.now()) { location.reload(); return false; }
    });
    return;
  }

  /* ---------- 감사 인사 화면 ---------- */
  $('#released').hidden = false;
  $('#relSub').textContent = [C.GROOM_NAME_EN || C.GROOM_NAME, C.BRIDE_NAME_EN || C.BRIDE_NAME].join(' && ') + ' — now on main';

  // 상태: 결혼한 지 얼마나 됐는지 (실시간)
  const stat = $('#status');
  const draw = () => {
    const ms = when.ok ? Date.now() - when.W : 0;
    const p = WI.parts(ms);
    stat.innerHTML = [
      line('', `$ systemctl status marriage`),
      line('ok', `● marriage.service — ${C.GROOM_NAME} & ${C.BRIDE_NAME}`),
      line('dim', `   Loaded: loaded (enabled; preset: forever)`),
      line('ok', `   Active: active (running)`),
      line('dim', `   Since:  ${when.ok ? when.iso + ' ' + when.hhmm + ' KST' : '[예식 일시]'}`),
      line('', `   Uptime: ${when.ok ? `${Math.max(0, p.d)}d ${p.h}h ${p.m}m ${p.s}s` : '-'}`)
    ].join('');
  };
  WI.every(() => { draw(); });

  // 변경 내역 — 자유롭게 고쳐 쓰는 부분입니다. (줄 맨 앞 글자: + 추가 / ~ 변경 / ✓ 수정 / ! 알려진 문제 / - 폐기)
  const notes = [
    ['h', `## v1.0.0 — ${when.ok ? when.iso : '[예식 일시]'}`], ['', ''],
    ['', '### Added'],
    ['ok', '+ 같은 집, 같은 와이파이'],
    ['ok', '+ 새 가족 모듈 (부모님 4명, 형제자매 포함)'],
    ['', ''],
    ['', '### Changed'],
    ['', '~ "내 거", "네 거" → "우리 거"'],
    ['', '~ 약속 시간: 각자 정함 → 같이 정함'],
    ['', ''],
    ['', '### Fixed'],
    ['ok', '✓ "오늘 뭐 먹지?"를 혼자 처리하던 문제 (이제 둘이 병렬 처리)'],
    ['', ''],
    ['', '### Known issues'],
    ['bad', '! 양말 짝이 자꾸 사라짐'],
    ['bad', '! 리모컨 위치 추적 불가'],
    ['', ''],
    ['', '### Deprecated'],
    ['del', '- 혼자 하는 야식']
  ];
  $('#changelog').innerHTML = notes.map(([c, t]) => line(c, t)).join('');

  // 감사 인사
  $('#thanks').textContent = has(C.THANKS_TEXT) ? WI.nl(C.THANKS_TEXT) : '';
  $('#thanksNames').textContent = `— ${C.GROOM_NAME}, ${C.BRIDE_NAME} 올림`;
})();
