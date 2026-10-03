# static — HTML, CSS, JS 만

서버 없이 정적 파일만으로 동작하는 구성입니다. 페이지 세 개(main, developer, release)가 한 번에 만들어집니다. GitHub Pages, Netlify, Cloudflare Pages 어디든 올릴 수 있습니다.

## 명령

| 하는 일 | macOS · Linux · Git Bash | Windows PowerShell |
|---|---|---|
| 설정 파일 만들기 | `cp invitation.conf.example invitation.conf` | `Copy-Item invitation.conf.example invitation.conf` |
| 빌드 (`dist/` 생성) | `./build.sh` | `.\build.ps1` |
| 미리보기 (포트 기본 8080) | `./startup.sh [포트]` | `.\startup.ps1 [-Port 포트]` |
| 다른 설정 파일로 빌드 | `./build.sh --conf 파일 --out 폴더` | `.\build.ps1 -Conf 파일 -Out 폴더` |
| 값 한 번만 덮어쓰기 | `./build.sh --set KEY=VALUE` | `.\build.ps1 -Set "KEY=VALUE"` |

PowerShell 에서 실행이 막히면 `Set-ExecutionPolicy -Scope Process Bypass` 를 한 번 실행하세요. `build.sh` 는 POSIX `sh` 로만 작성되어 있어서 Git Bash 에서도 됩니다.

## invitation.conf

한 줄에 `KEY="값"` 하나씩. 전체 항목과 설명은 `invitation.conf.example` 의 주석을 보세요.

- 값은 항상 큰따옴표로 감싸고, 줄 끝에 주석을 달지 않습니다. (`#` 으로 시작하는 줄만 주석)
- 값 안의 `\n` 은 줄바꿈입니다.
- 필요 없는 항목은 `""` 로 비워 두면 화면에서 사라집니다.
- 사진은 **파일 이름만** 적고, 실제 파일은 `src/photos/` 에 넣습니다.

| 묶음 | 키 |
|---|---|
| 사이트 | `SITE_ORIGIN`, `OG_DESCRIPTION`, `PHOTO_OG`, `DEFAULT_VERSION`, `DEFAULT_THEME`, `GUESTBOOK_API_BASE` |
| 신랑 · 신부 | `GROOM_*`, `BRIDE_*` (`NAME`, `NAME_EN`, `ROLE`, `FATHER`, `MOTHER`, `RANK`, `RANK_EXPR`, `MBTI`, `HOBBY`, `INTRO`, `NOTE`, `PHONE`, `FATHER_PHONE`, `MOTHER_PHONE`, `PHOTO`) |
| 일시 | `WEDDING_AT`, `FIRST_MET_AT` |
| 예식장 | `VENUE_NAME`, `VENUE_HALL`, `VENUE_ADDRESS`, `VENUE_PHONE`, `MAP_NAVER_URL`, `MAP_KAKAO_URL` |
| 오시는 길 | `INFO_SUBWAY`, `INFO_BUS`, `INFO_PARKING`, `INFO_MEAL` |
| 문구 | `GREETING_TITLE`, `GREETING_TEXT`, `CLOSING_TEXT` (main) · `DEV_INTRO` (developer) · `THANKS_TEXT` (release) |
| 사진 | `PHOTO_COVER`, `PHOTO_COVER_DEV`, `PHOTO_CLOSING`, `PHOTO_GALLERY` (쉼표로 구분) |
| 계좌 | `GROOM_ACCOUNTS`, `BRIDE_ACCOUNTS` (`관계\|이름\|은행\|계좌번호`, 사람은 쉼표로 구분) |
| 참석 여부 | `RSVP_ENABLED` (`true` / `false`) |

## 참석 여부는 어떻게 전달되나요?

서버가 없으므로 저장하지 않습니다. 하객이 양식을 채우고 버튼을 누르면 **문자 작성창이 열리고 내용이 채워집니다.** 하객이 신랑측을 고르면 `GROOM_PHONE`, 신부측을 고르면 `BRIDE_PHONE` 로 갑니다. 직접 모아서 보고 싶다면 `with-guestbook` 구성의 축하 한마디를 쓰세요.

## 화면 구성 바꾸기

- 색: `src/css/main.css` 와 `developer.css` 맨 위 `:root` 변수. 공통 부품(버튼, 갤러리, 폼)은 `common.css` 가 그 변수를 따라갑니다.
- 섹션 순서: `src/main.html`, `src/developer.html` 의 `<section>` 블록을 옮기면 됩니다.
- 섹션 삭제: 해당 `<section>` 을 지우고, 페이지 JS(`main.js` / `developer.js`) 에서 그 섹션을 채우는 줄(`WI.gallery(...)`, `WI.accounts(...)` 등)도 함께 지우세요. 안 지우면 JS 오류로 그 아래가 안 그려집니다. (`WI.directions()` 만은 요소가 없으면 알아서 건너뜁니다.)
- release 의 변경 내역(CHANGELOG): `src/js/release.js` 의 `notes` 배열.

## 터미널 도구 (C++)

`../tools/terminal-cpp/` 를 보세요. 같은 `invitation.conf` 를 읽어 터미널에 출력합니다.
