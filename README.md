# wedding-invitation

설정 파일 하나(`invitation.conf`)를 채우면 같은 청첩장이 **세 가지 페이지**로 만들어집니다.

| 페이지 | 대상 | 모습 |
|---|---|---|
| **main** | 부모님, 부모님 지인 | 도장(囍)과 세로 이름이 있는 차분한 화면. 글자가 크고, 오른쪽 위 **'가'** 버튼으로 글자 크기를 3단계로 바꿀 수 있습니다 |
| **developer** | 친구, 개발자 동료 | 코드 에디터·터미널 콘셉트. 라이트/다크, 파일 탭, 타이핑 연출 |
| **release** | 모두 (예식 후) | 예식 시각 전엔 `403` 잠금 화면, 지나면 릴리스 노트 모양의 감사 인사 |

세 페이지는 화면 아래 링크로 서로 이동합니다. 바닐라 HTML·CSS·JS 이고 React, webpack 같은 도구가 필요 없습니다.

> 구조(설정 파일 → build → 페이지 3개, 계좌 난독화, 예식 후에 열리는 release 페이지)는 [NerdKim 의 `wedding-invitation-for-nerds`](https://github.com/nerdkim/wedding-invitation-for-nerds) 에서 영감을 받았습니다. 코드는 처음부터 새로 썼고 복사하지 않았습니다.
>
> **나중에 고칠 때는 [`docs/NOTES.md`](docs/NOTES.md) 부터 읽으세요.**

## 시작하기

```bash
cd static
cp invitation.conf.example invitation.conf   # ① 복사
# ② invitation.conf 를 열어 [대괄호 문구]를 내 내용으로 바꿉니다
#    사진은 src/photos/ 에 넣고, 파일 이름을 conf 의 PHOTO_* 에 맞춥니다
./build.sh                                   # ③ dist/ 생성       (Windows: .\build.ps1)
./startup.sh                                 # ④ http://localhost:8080   (Windows: .\startup.ps1)
```

- `./build.sh` 에서 `Permission denied` 가 나면 `sh build.sh` 로 실행하세요.
- 아직 안 바꾼 자리표시 찾기: `grep -n '"\[' invitation.conf`
- release 를 시각 전에 미리 보려면 주소 끝에 `?preview=1` (예: `release.html?preview=1`)

## 구조

```
.
├── README.md
├── LICENSE                    MIT
├── docs/NOTES.md              만든 사람용 메모 (상태, 파일 지도, 점검표)
├── .github/workflows/pages.yml   push 하면 빌드해서 GitHub Pages 에 올림 (선택)
│
├── static/                    구성 1. 정적 파일만
│   ├── build.sh / build.ps1          invitation.conf → dist/
│   ├── startup.sh / startup.ps1      dist/ 를 로컬에서 미리 보기
│   ├── invitation.conf.example
│   └── src/                   원본. {{TOKEN}} 만 있고 실제 값은 없음
│       ├── main.html  developer.html  release.html
│       ├── css/   common.css  main.css  developer.css  release.css
│       ├── js/    common.js   main.js   developer.js   release.js   private.js
│       └── photos/            사진을 넣는 곳
│
├── with-guestbook/            구성 2. 축하 한마디까지 (Node + SQLite, Docker)
│   ├── Dockerfile  docker-compose.yml
│   └── server/server.mjs      static/ 을 그대로 빌드해 서빙 + 축하 API
│
└── tools/terminal-cpp/        C++ 터미널 도구. 같은 conf 를 읽어 터미널에 청첩장 출력
```

| | `static/` | `with-guestbook/` |
|---|---|---|
| 하객 축하 한마디 저장 | 아니오 (입력창이 나오지 않음) | **예** (SQLite) |
| 필요한 것 | sh, sed, base64 (Windows 는 PowerShell) | Docker 또는 Node 22.13+ |
| 올릴 곳 | 정적 호스팅 | 컨테이너를 돌릴 서버 |

`with-guestbook` 은 `static/` 을 복사하지 않고 **그대로 빌드해서** 씁니다. 그래서 화면 코드는 `static/src/` 한 곳에만 있습니다.

## 개인정보

- `invitation.conf`(이름·전화·계좌)는 `.gitignore` 로 **git 에 올라가지 않습니다.**
- 올라간 청첩장은 **링크를 아는 누구나** 볼 수 있습니다. 전화번호와 계좌번호도 마찬가지입니다.
- 계좌번호는 `dist/js/data.js` 에서 **난독화**됩니다. 검색 엔진 노출과 자동 수집을 막는 정도이고 **암호화가 아닙니다.**
- `static/src/photos/` 의 사진은 **git 에 올라갑니다.** 저장소가 public 이면 누구나 볼 수 있으니, 공개해도 되는 사진만 넣거나 저장소를 private 으로 두세요.
- release 의 `403` 화면은 **연출일 뿐 보안이 아닙니다.** 소스를 열면 내용이 보입니다.

## 배포

### GitHub Pages (자동)
1. 저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 선택
2. **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `INVITATION_CONF`, Value: 내 `invitation.conf` 내용 **전체**
3. `main` 브랜치에 push → `https://<아이디>.github.io/<저장소 이름>/` 에 올라갑니다.
4. 그 주소를 `SITE_ORIGIN` 에 적고(시크릿도 같이 갱신) 다시 push 하면 카카오톡 미리보기에 사진이 나옵니다.

시크릿이 없으면 예시 값(`[신랑 이름]` 같은 자리표시)으로 빌드됩니다.

### 직접 올리기
`./build.sh` 로 만든 `static/dist/` 안의 내용을 Netlify, Cloudflare Pages, 개인 서버 등에 올립니다.

### 축하 한마디까지
[`with-guestbook/README.md`](with-guestbook/README.md) 를 보세요.

## C++ 터미널 도구

```bash
cd tools/terminal-cpp
make && ./invitation --accounts      # ../../static/invitation.conf 를 읽습니다
```

웹 페이지가 아니라 터미널에 출력하는 작은 보너스 도구입니다. Windows 콘솔은 먼저 `chcp 65001`.

## 라이선스

MIT. `LICENSE` 의 `[이름]` 을 본인 이름으로 바꿔 주세요.
