/* private.js — window.__GIFT__ (난독화된 계좌) 를 푸는 함수.
 *
 * build.sh / build.ps1 의 난독화와 1:1 로 대응합니다.
 *   난독화: "G:...\nB:...\n" → base64 → 문자열 뒤집기
 *   해제  : 문자열 뒤집기 → base64 해독 → UTF-8
 * 한쪽만 고치면 계좌가 보이지 않습니다.
 *
 * 반환: { groom: [{role,name,bank,number}], bride: [...] }
 * 주의: 난독화일 뿐 암호화가 아닙니다. 검색 엔진·자동 수집 대응용입니다.
 */
window.readGift = function () {
  const empty = { groom: [], bride: [] };
  const blob = window.__GIFT__;
  if (!blob) return empty;
  let text;
  try {
    const b64 = blob.split('').reverse().join('');
    const bin = atob(b64);
    text = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  } catch (e) { return empty; }

  const out = { groom: [], bride: [] };
  text.split('\n').forEach(line => {
    const side = line.startsWith('G:') ? 'groom' : line.startsWith('B:') ? 'bride' : null;
    if (!side) return;
    line.slice(2).split(',').forEach(item => {
      const p = item.split('|').map(s => s.trim());
      if (p.length >= 4 && p[3]) out[side].push({ role: p[0], name: p[1], bank: p[2], number: p[3] });
    });
  });
  return out;
};
