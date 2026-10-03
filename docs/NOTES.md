# 만든 사람용 메모 (나중의 나에게)

이 저장소를 다시 열었을 때 헤매지 않으려고 적어 둔 문서입니다.
**"지금 어디까지 됐고, 뭘 고치려면 어디를 보면 되는지"** 만 적습니다.

---

## 1. 이 저장소가 뭔가

- 같은 청첩장을 **main / developer / release** 세 페이지로 만듭니다.
  - **main**: 부모님·부모님 지인용. 글자 크기 조절('가' 버튼), 큰 버튼, 존댓말 문구
  - **developer**: 친구·개발자용. 에디터/터미널 콘셉트
  - **release**: 예식 시각 전 `403` 잠금, 후에는 릴리스 노트 모양의 감사 인사
- 코드는 **처음부터 새로 쓴 것**입니다. [NerdKim 의 wedding-invitation-for-nerds](https://github.com/nerdkim/wedding-invitation-for-nerds) 의 *구조 아이디어*(설정 파일 → build → 페이지, 계좌 난독화, 예식 후 열리는 release)에서 영감을 받았을 뿐, 그 저장소의 코드를 가져오지 않았습니다.

---

## 2. 확인한 것 / 못 한 것

**직접 실행해서 확인**
- `static/build.sh` (dash 로) → `dist/` 생성, 치환 안 된 `{{TOKEN}}` 없음
- main / developer / release 가 헤드리스 브라우저에서 **오류 없이** 열림 (라이트·다크, 390px 폭)
- release: 예식 시각 전 `403` 잠금 + 카운트다운, `?preview=1` 로 감사 인사 화면
- `with-guestbook/server/server.mjs` 를 Node 22 로 띄워 main · developer 에서 **축하 한마디 쓰기·읽기**
- `tools/terminal-cpp` 컴파일·출력

**실행해 보지 못함**
- `build.ps1`, `startup.ps1` (PowerShell 이 없었습니다)
- `Dockerfile`, `docker-compose.yml` (Docker 가 없었습니다. 서버 코드만 Node 로 돌려 봤습니다)
- `.github/workflows/pages.yml` (GitHub 에서 돌려 보지 못했습니다)
- 실제 휴대폰(아이폰·안드로이드)에서의 `sms:`·`tel:` 링크, 카카오톡 미리보기
- 사진이 **있는** 상태의 화면은 단색 가짜 사진으로만 확인했습니다.

→ 처음 쓸 때 오류가 나면 위 항목부터 의심하세요.

---

## 3. 파일 지도 — "이걸 바꾸고 싶으면 이 파일"

| 바꾸고 싶은 것 | 파일 |
|---|---|
| 이름·날짜·예식장·길 안내·사진 이름·계좌·문구 | `static/invitation.conf` (내가 만든 것. git 에 안 올라감) |
| conf 항목 설명서 | `static/invitation.conf.example` (주석이 설명서) |
| 사진 | `static/src/photos/` |
| 각 페이지 뼈대, 고정 문구 | `static/src/main.html` `developer.html` `release.html` |
| 색·글꼴 | `static/src/css/main.css` `developer.css` (맨 위 `:root` 변수) |
| **세 페이지 공통 기능** | `static/src/js/common.js` + `css/common.css` |
| 각 페이지의 동작 | `static/src/js/main.js` `developer.js` `release.js` |
| release 의 **변경 내역(CHANGELOG)** | `static/src/js/release.js` 의 `notes` 배열 |
| 계좌 난독화 해제 | `static/src/js/private.js` |
| conf → dist 변환 | `static/build.sh` (Windows: `build.ps1`) |
| 서버(방명록) | `with-guestbook/server/server.mjs` |

`dist/` 는 빌드할 때마다 지워지고 다시 만들어집니다. **`dist/` 안의 파일은 절대 직접 고치지 마세요.**

---

## 4. 동작 원리

```
invitation.conf ──build.sh──▶ dist/main.html 등   {{GROOM_NAME}} 같은 자리를 값으로 치환
                         ├──▶ dist/index.html     DEFAULT_VERSION(main|developer)의 사본
                         ├──▶ dist/js/data.js     window.__WEDDING__ (conf 의 일반 항목 전부)
                         └──▶ window.__GIFT__     계좌 (base64 → 문자열 뒤집기 난독화)
```

1. **HTML 에는 `{{TOKEN}}` 뿐**입니다. 제목·og 태그처럼 JS 가 못 바꾸는 곳에만 씁니다.
2. 나머지 값은 **`data.js` 의 `window.__WEDDING__`** 로 들어오고, 페이지 JS 가 읽어 화면을 그립니다.
3. 날짜 계산(요일, 달력, D-day)은 **JS 가 합니다** (`common.js` 의 `WI.when`). 그래서 conf 의 `WEDDING_AT` 형식만 맞으면 됩니다.
4. conf 에 **새 키를 추가하면 `build.sh` 를 안 고쳐도** `data.js` 에 자동으로 들어갑니다. (`_ACCOUNTS` 로 끝나는 키만 난독화 쪽으로 따로 처리)

### common.js (`window.WI`) — 세 페이지가 함께 쓰는 부분
페이지 JS 는 이 함수들을 불러 씁니다. 섹션을 새로 만들 때도 이걸 쓰세요.

| 함수 | 하는 일 |
|---|---|
| `WI.when` | 예식 날짜·시각 문자열, `dayLeft()`, `released()` (예식 후 또는 `?preview=1`) |
| `WI.calendar(box)` | 예식 달 달력 |
| `WI.gallery(box, 섹션)` | `PHOTO_GALLERY` 사진 격자 + 확대 보기 |
| `WI.directions()` | 오시는 길 (id 고정: `venue hall addr copyAddr mapNaver mapKakao venueTel info`) |
| `WI.accounts(box, 섹션, 옵션)` | 계좌 아코디언 + 복사 버튼 |
| `WI.rsvp(form, 섹션, 라벨)` | 참석 여부 → 문자 작성창 |
| `WI.guestbook({...})` | 축하 한마디 (`GUESTBOOK_API_BASE` 가 있을 때만) |
| `WI.contacts(box, 섹션, 호칭)` | 전화·문자 버튼 목록 |
| `WI.photo(box, 이름)` | 사진 넣기. 파일이 없으면 이름이 적힌 빈 칸 |
| `WI.theme(btn)` | 라이트/다크 (developer, release) |
| `WI.releaseBanner(sel)` | 예식 후 release 로 가는 배너 |

### 페이지별로 다른 문구 (conf)
| 키 | 쓰이는 곳 |
|---|---|
| `GREETING_TITLE`, `GREETING_TEXT`, `CLOSING_TEXT` | **main** (어른들께) |
| `DEV_INTRO` | **developer** 인사말 (비우면 `GREETING_TEXT`) |
| `THANKS_TEXT` | **release** 감사 인사 |
| `GROOM_INTRO`, `BRIDE_INTRO` | main 프로필 한 줄 소개 |
| `*_ROLE`, `*_MBTI`, `*_HOBBY`, `*_NOTE`, `*_RANK_EXPR` | developer 의 `people.json` |
| `PHOTO_COVER_DEV` | developer 표지 사진 (비우면 `PHOTO_COVER`) |

### release 의 동작
- `WI.when.released()` = 지금 ≥ `WEDDING_AT` **또는** 주소에 `?preview=1`
- 그 전: `403` + `T-일:시:분:초` 카운트다운 (시각이 되면 자동 새로고침)
- 그 후: 상태(`systemctl status` 모양, 결혼한 지 경과 시간), CHANGELOG, 감사 인사
- 예식 후에는 main(표지 바로 아래), developer(표지 안)에 release 로 가는 배너가 나타납니다.
- `WEDDING_AT` 가 비어 있으면 항상 잠금 상태입니다.

---

## 5. conf 에서 반드시 바꿀 것

- [ ] `[대괄호]` 로 시작하는 값 전부 (남은 줄 찾기: `grep -n '"\[' invitation.conf`)
- [ ] `WEDDING_AT` — **형식 유지**: `2027-04-24T12:00:00+09:00` (비워 두면 달력·카운트다운이 숨겨지고 `[예식 일시]` 로 표시)
- [ ] `FIRST_MET_AT` — `2021-03-14` (비우면 developer 의 진행률 막대가 숨겨짐)
- [ ] `PHOTO_*`, `GROOM_PHOTO`, `BRIDE_PHOTO` — `src/photos/` 에 넣은 파일 이름 (대소문자 포함)
- [ ] `SITE_ORIGIN` — 배포 주소가 정해지면 (카카오톡 미리보기 사진에 필요)
- [ ] `OG_DESCRIPTION` — 카카오톡 미리보기 문구 (전화·계좌 금지)
- [ ] `DEFAULT_VERSION` — 기본으로 열릴 페이지. 부모님께 보낼 링크가 기본이면 `main`
- [ ] `*_ACCOUNTS` — `관계|이름|은행|계좌번호`, 사람은 쉼표로 구분 (값 안에 `|` 와 `,` 금지)

### HTML·JS 에 직접 적혀 있는 문구 (내 이야기로 고칠 곳)
| 파일 | 내용 |
|---|---|
| `src/main.html` | "참석 여부 알리기" 안내, 갤러리 안내 등 **짧은 안내문** (인사말 본문은 conf) |
| `src/developer.html` | 섹션 안내 문구, 맨 아래 `$ ls ./versions` 설명 |
| `src/release.html` | 403 잠금 문구 |
| `src/js/release.js` | **CHANGELOG 항목** (같은 집 와이파이, 양말… 등 예시입니다. 두 사람만 아는 이야기로 바꾸면 좋습니다) |
| `src/main.html` 맨 아래 | "신랑·신부 친구들을 위한 개발자 버전도 있습니다" 링크 문구 |

---

## 6. 자주 하는 작업

### 문구·정보 바꾸기
`invitation.conf` 수정 → `./build.sh` → `./startup.sh` → 브라우저 새로고침.
(`startup.sh` 가 켜져 있는 동안 `build.sh` 를 다시 돌리면 폴더가 새로 만들어져 서버가 멈춥니다. 빌드 후 `startup.sh` 를 다시 켜세요.)

### 새 conf 항목 추가 (예: `GROOM_NICK`)
1. `invitation.conf.example` 과 내 `invitation.conf` 에 `GROOM_NICK="..."` 추가
2. 페이지 JS 에서 `C.GROOM_NICK` 으로 사용 (HTML 에 바로 넣고 싶다면 `{{GROOM_NICK}}`)
3. `build.sh` · `build.ps1` 은 고칠 필요 없음

### 색 바꾸기
`main.css` 의 `--acc`(도장 색)·`--bg` 등, `developer.css` 의 `--acc`·`--k`·`--s` 등. 공통 부품은 이 변수를 따라갑니다.

### 섹션 삭제
`<section>` 을 지우고 페이지 JS 에서 그 섹션을 채우는 `WI.*` 줄도 지웁니다. 안 지우면 오류로 그 아래가 안 그려집니다.

### main 의 글자 크기 단계 바꾸기
`main.css` 의 `html[data-size="l"]`, `html[data-size="xl"]` 의 `font-size` (기본 17 / 19.5 / 22px).

---

## 7. 알려진 한계

- **개인정보**: 링크를 아는 사람은 누구나 전화번호·계좌를 봅니다. 난독화는 검색 엔진·자동 수집 방지용입니다.
- **사진**: `static/src/photos/` 는 git 에 올라갑니다. 저장소가 public 이면 사진도 공개됩니다.
- **글꼴**: 구글 폰트라서 인터넷이 없으면 기본 글꼴로 보입니다.
- **참석 여부**: 저장되지 않습니다. 하객이 문자를 실제로 보내야 도착합니다. 어른들은 문자 작성이 어려울 수 있으니 main 에 **전화 버튼**(연락하기)도 두었습니다.
- **release 잠금**: 연출일 뿐입니다. 기기 시계를 바꾸면 열립니다.
- **카카오톡 미리보기**: `og:` 태그는 build 때 채워집니다. 카카오톡이 이전 미리보기를 기억하면 바뀐 게 안 보일 수 있습니다 (카카오 개발자 사이트의 '공유 디버거'에서 갱신).
- **`src/` 직접 열기**: 값이 비어서 오류 문구가 나옵니다. 항상 `dist/` 를 보세요.
- 방명록 속도 제한(IP 당 10분 5개)은 서버 메모리에 있어 재시작하면 초기화됩니다.

---

## 8. 결정 기록 (왜 이렇게 만들었나)

| 결정 | 이유 |
|---|---|
| main 을 따로 둠 | 부모님·지인께는 장난기 없이 읽기 쉬운 화면이 필요해서. 글자 크기 버튼을 둔 것도 같은 이유 |
| 공통 코드를 `common.js`/`common.css` 로 | 세 페이지가 같은 기능(갤러리, 계좌, 참석 여부…)을 쓰므로 한 곳에서 고치게 |
| 날짜 계산을 build 가 아니라 JS 에서 | `sh` 로 요일·달력을 계산하는 건 복잡하고 오류가 나기 쉬워서 |
| 설정을 `invitation.conf` 하나로 | 코드를 건드리지 않고 값만 바꾸게. `.gitignore` 로 개인정보가 저장소에 안 올라가게 |
| 계좌를 난독화해서 `data.js` 에 | HTML·JS 어디에도 평문 계좌번호가 남지 않게. 보안이 아니라 검색·수집 방지용 |
| 참석 여부를 문자로 | 서버 없이 되는 방식이 이것뿐. 모아서 보려면 `with-guestbook` 쪽을 확장해야 함 |
| with-guestbook 이 static 을 복사하지 않고 빌드해서 씀 | 화면 코드를 두 곳에서 따로 고치다 어긋나는 일을 막으려고 |
| 방명록을 Node 내장 SQLite 로 | 외부 패키지 없이 파일 하나(`guestbook.db`)로 끝나서 백업이 쉬움 |
| D-day 를 한국 시간 달력 기준으로 | 보는 사람의 시간대가 달라도 날짜가 같게 |

---

## 9. 명령 모음

```bash
# static
cd static
cp invitation.conf.example invitation.conf     # 처음 한 번
./build.sh                                      # dist/ 생성   (실행 권한 오류면: sh build.sh)
./startup.sh                                    # http://localhost:8080

# Windows PowerShell
.\build.ps1
.\startup.ps1

# 방명록 포함
cd with-guestbook && cp invitation.conf.example invitation.conf
docker compose up -d
docker compose logs -f                          # 오류 확인

# 터미널(C++)
cd tools/terminal-cpp && make && ./invitation --accounts
```

---

## 10. 결혼식 전 최종 점검

- [ ] `grep -n '"\[' invitation.conf` 에 아무것도 안 나온다
- [ ] `WEDDING_AT` 날짜·시각이 맞다 (main 의 "예식 일시", 달력, D-day)
- [ ] 이름, 부모님 성함, 예식장 주소·전화번호를 한 번 더 읽어 봤다
- [ ] 계좌번호를 **복사 버튼으로 복사해 붙여 보고** 맞는지 확인했다
- [ ] **부모님 폰**으로 main 을 열어 봤다 (글자 크기 '가' 버튼, 전화 버튼)
- [ ] developer 를 폰으로 열어 라이트·다크를 봤다
- [ ] 사진이 전부 나온다 (파일 이름 대소문자 포함)
- [ ] 네이버지도·카카오맵 버튼이 올바른 장소를 연다
- [ ] 참석 여부 문자가 신랑·신부 번호로 각각 잘 열린다
- [ ] `release.html?preview=1` 로 감사 인사와 CHANGELOG 를 확인했다
- [ ] 카카오톡에 링크를 보내 미리보기(제목·설명·사진)를 확인했다
- [ ] 저장소가 public 이라면 올라간 사진을 다시 확인했다
- [ ] `LICENSE` 의 `[이름]` 을 바꿨다
