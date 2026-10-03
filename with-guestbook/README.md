# with-guestbook — 축하 한마디까지

`static` 과 같은 청첩장(main · developer · release)에 **축하 한마디(방명록)** 를 더한 구성입니다. main 과 developer 에 입력창이 나타납니다. 작은 Node 서버가 정적 파일을 내보내고, 하객이 남긴 글을 SQLite 에 저장합니다. 외부 패키지가 없습니다.

## 실행

```sh
cd with-guestbook
cp invitation.conf.example invitation.conf    # 값을 채웁니다 (static 과 같은 형식)
# 사진은 ../static/src/photos/ 에 넣습니다

docker compose up -d --build                  # http://localhost:8080
```

- `invitation.conf` 는 읽기 전용으로 컨테이너에 연결되고, **컨테이너가 시작될 때** `static/build.sh` 로 `dist/` 를 만듭니다. 설정이나 사진을 바꾸면 `docker compose restart` 하세요.
- `GUESTBOOK_API_BASE` 는 서버가 자동으로 `/api` 로 채웁니다. conf 에 적을 필요가 없습니다.
- 페이지 주소는 `/`(DEFAULT_VERSION), `/main.html`, `/developer.html`, `/release.html` 입니다.
- 글은 `guestbook-data` 볼륨(`/data/guestbook.db`)에 저장됩니다. `docker compose down` 해도 남고, `down -v` 하면 지워집니다.

## 환경 변수

`with-guestbook/.env` 파일에 적으면 `docker-compose.yml` 이 읽습니다.

| 이름 | 기본 | 설명 |
|---|---|---|
| `ADMIN_TOKEN` | (없음) | 설정하면 글을 지울 수 있습니다. 비워 두면 삭제 기능이 꺼집니다. |
| `TRUST_PROXY` | `0` | nginx·Caddy 같은 reverse proxy 뒤에 둘 때 `1`. 속도 제한이 실제 하객 IP 로 걸립니다. |

## API

| 요청 | 설명 |
|---|---|
| `GET /api/guestbook?limit=10&before=<id>` | `{ count, recent: [{ id, ts, name, msg }], next }` — 최신 글부터. `next` 를 다음 `before` 로 씁니다. |
| `POST /api/guestbook` | 본문 `{ name?, msg }` → `201 { ok, item }`. 이름 20자, 한마디 200자까지. |
| `DELETE /api/guestbook/:id` | 헤더 `x-admin-token: <ADMIN_TOKEN>` 필요. |
| `GET /healthz` | `{ ok: true }` |

```sh
# 부적절한 글 지우기
curl -X DELETE -H "x-admin-token: $ADMIN_TOKEN" http://localhost:8080/api/guestbook/12
```

## 알아둘 것

- **속도 제한**: IP 하나당 10분에 5개까지. 메모리에 저장하므로 서버를 재시작하면 초기화됩니다.
- **글은 화면에 글자 그대로 표시**됩니다. (HTML 이 실행되지 않습니다)
- **HTTPS**: 이 서버는 HTTP 만 냅니다. 인터넷에 공개하려면 Caddy, nginx, Cloudflare Tunnel 같은 것으로 HTTPS 를 앞에 두세요. 카카오톡 미리보기도 `https://` 주소여야 잘 나옵니다.
- **백업**: 볼륨 안의 `guestbook.db` 한 파일입니다.
  `docker compose cp invitation:/data/guestbook.db ./backup.db`
- **Node 버전**: SQLite 를 Node 내장 모듈(`node:sqlite`)로 쓰므로 Node 22.13 이상이 필요합니다. Dockerfile 은 `node:24-alpine` 을 씁니다. 시작할 때 "SQLite is an experimental feature" 경고가 한 줄 나오는데 정상입니다.
