# Развёртывание сайта «Хутба» (hutba.org) на хостинге

Инструкция для администратора / DevOps.
Все параметры ниже проверены на текущем состоянии проекта (Astro 7.0.3, Node 24.15, npm 11.12):
сборка выполнена, собранный сервер запущен и проверены все ключевые маршруты.

**Содержание**

1. [Главное, что нужно понять до начала](#0-главное-что-нужно-понять-до-начала)
2. [Технические характеристики проекта](#1-технические-характеристики-проекта)
3. [Требования к серверу](#2-требования-к-серверу-вариант-vps)
4. [Критично: медиа и сборка](#3-критично-медиа-и-сборка)
5. [Пошаговое развёртывание (VPS): шаги 1–11](#4-пошаговое-развёртывание-vps-основная-схема)
6. [Обновление и откат](#5-обновление-сайта-и-откат)
7. [Бэкапы, место на диске, мониторинг](#6-бэкапы-место-на-диске-мониторинг)
8. [Что делать нельзя](#7-что-делать-нельзя-частые-ошибки) · [Диагностика](#8-диагностика)
9. [Альтернативные площадки (Vercel, Cloudflare Pages, Docker)](#9-альтернативные-площадки-и-почему-их-не-хватит-как-есть)
10. [Приложения: шпаргалка, вопросы разработчику, как проверялось](#10-приложение-а-шпаргалка-все-команды-подряд)

---

## 0. Главное, что нужно понять до начала

1. **Сайт не является «чисто статическим».** Почти все страницы пререндерятся (в сборке
   получается 407 готовых `index.html`), но одна страница — `/lesson` — рендерится на сервере
   по запросу: в `src/pages/lesson.astro` стоит `export const prerender = false;`
   (то же самое у служебных маршрутов `/_image` и `/_server-islands`).
   **Следствие:** обычный «хостинг сайтов» (Apache/cPanel, статика на S3, GitHub Pages)
   не подойдёт — нужен постоянно работающий процесс **Node.js ≥ 22.12** либо serverless-платформа
   (Vercel — именно под неё проект настроен сейчас, см. §9).

2. **Весь медиаконтент лежит вне Git.** Каталог `public/` полностью в `.gitignore`
   (`# media assets (stored outside version control)`), а внутри него — 113 ГБ / 24 690 файлов:
   видео уроков, аудио, шрифты Корана, изображения аятов. Свежий `git clone` **не содержит**
   ни одного шрифта и ни одного видео — их нужно перенести на сервер отдельно (§6).

3. **Рекомендуемая схема** (её и описывает основная часть инструкции):

   ```
   VPS Ubuntu 22.04/24.04
     nginx (80/443) ──┬── /_astro, HTML, /lesson …  →  Node.js (127.0.0.1:4321)
                      └── /media, /mp3, /fonts, /ayat → прямо с диска (sendfile, Range)
   ```

   * код и `node_modules` — `/srv/hutba/app`
   * медиа (113 ГБ) — `/srv/hutba/assets`
   * сайт — `https://hutba.org` (домен уже прописан в `astro.config.mjs`, поле `site`)

---

## 1. Технические характеристики проекта

| Параметр | Значение |
| --- | --- |
| Генератор | Astro `7.0.3` (`output: 'static'` + адаптер) |
| UI | React 19, Tailwind CSS 3, framer-motion, Radix, Headless UI |
| Диаграммы | `astro-mermaid` + `mermaid` (собираются локально, CDN не используется) |
| Требование к Node | **`>= 22.12.0`** (поле `engines` пакета Astro) |
| Пакетный менеджер | npm (есть `package-lock.json`), в репозитории `.npmrc` с `legacy-peer-deps=true` — **удалять нельзя** |
| Команды сборки | `npm ci` → `npm run build` (`= astro build`) |
| Переменные окружения | **не используются** (нет ни `import.meta.env`, ни `process.env`) — секретов настраивать не нужно |
| Внешние API/CDN | **нет** — все шрифты, аудио, видео и стили отдаются с этого же домена |
| Домен | `https://hutba.org` (жёстко в `astro.config.mjs`: `site`) |

### Объём данных

| Каталог (внутри `public/`) | Размер | Файлы |
| --- | --- | --- |
| `media/` (видео + аудио уроков) | 111 933 МБ (в т.ч. `mp4` 82 844 МБ, `mp3` 28 910 МБ) | 4 425 |
| `mp3/` (аудио Корана) | 828 МБ | — |
| `fonts/` (Amiri, KFGQPC, `mushaf-v2/QCF2001…2604.ttf`) | 201 МБ | — |
| `ayat/` (PNG изображений аятов) | 30 МБ | — |
| `subject-icons/`, `favicon.ico`, `s5_logo.png` | ~0,1 МБ | — |
| **Итого `public/`** | **≈113 ГБ / 24 690 файлов** | |

Отдельно: **6 502 файла имеют не-ASCII имена** (кириллица, арабица). На Linux это работает,
но требуется UTF-8-локаль сервера (`LANG=C.UTF-8` или `ru_RU.UTF-8`) — иначе возможны битые имена
при распаковке/переносе.
Максимальный размер одного файла — **964 МБ** (`public/media/akida/akida-at-tahawiya/video/…mp4`).

### Что даёт сборка (проверено)

| Артефакт | Размер / файлов |
| --- | --- |
| `dist/client/` — HTML + JS/CSS + перенесённый `public/` | ~661 МБ / 906 файлов (**без медиа**, если собирать в клоне без `public/`) |
| `dist/server/entry.mjs` + `chunks/` | ~54 МБ / 429 файлов |
| Пререндеренных страниц (`index.html`) | 407 |
| Время сборки | ≈65 секунд на 4 ядрах |
| `node_modules/` (после `npm ci`) | ≈558 МБ |

---

## 2. Требования к серверу (вариант «VPS»)

| Ресурс | Минимум | Рекомендуется |
| --- | --- | --- |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 ГБ | 4 ГБ и больше (во время сборки пик по памяти заметный) |
| Диск | 160 ГБ SSD | 250 ГБ NVMe (медиа 113 ГБ + релизы + `node_modules`) |
| ОС | Ubuntu 22.04 | Ubuntu 24.04 LTS |
| ПО | Node.js ≥ 22.12, nginx, git, rsync | + certbot, ufw |
| Трафик | — | **не менее 1–2 ТБ/мес**: 760 видеофайлов суммарно 82 ГБ |

Отдельные требования:

* постоянно работающий процесс (systemd) — сайт нельзя отдавать только nginx-ом;
* локаль UTF-8;
* **не подходит** дешёвый shared-хостинг с cPanel/PHP: там нет долгоживущего Node-процесса
  и обычно нет 113 ГБ диска.

> **Qdrant не нужен.** Файл `docker-compose.yml` в корне проекта поднимает Qdrant
> (`qdrant_data/`) — это локальный инструмент подготовки контента; в коде сайта обращений к нему нет.
> На прод-сервере Docker и Qdrant запускать не требуется.

---

## 3. Критично: медиа и сборка

1. `public/` полностью игнорируется Git. **Свежий клон не содержит медиа** — это правильно и удобно:
   сборка получается маленькой (661 МБ), а 113 ГБ ассетов живут на сервере отдельно и отдаются
   nginx-ом напрямую.

2. **Astro 7 всегда копирует `public/` в результат сборки.** Опции, которая это отключает, нет
   (в коде Astro `copyPublicDir: true` задаётся жёстко). Поэтому:

   * не собирайте проект там, где рядом лежат 113 ГБ медиа (в `public/`) — сборка начнёт копировать
     всё это в `dist/`, потребует лишних 113 ГБ и много времени;
   * на сервере держите две отдельные вещи: **код** (`/srv/hutba/app`, без `public/media`) и
     **ассеты** (`/srv/hutba/assets`, полная копия `public/`).

3. Ссылки в разметке абсолютные — `/media/...`, `/fonts/...`, `/ayat/...`, `/mp3/...`,
   `/subject-icons/...`, `/favicon.ico`, `/s5_logo.png`. Значит, ассеты обязаны быть доступны по этим
   путям на том же домене (nginx подставит их из `/srv/hutba/assets`, см. §8).

4. Плейлисты и аудио Корана (`howler`, `<audio>`, `<video>`) используют **HTTP Range** —
   сервер обязан поддерживать докачку (nginx делает это «из коробки»).

---

## 4. Пошаговое развёртывание (VPS, основная схема)

### Шаг 1. Пользователь, каталоги, firewall

```bash
sudo adduser --system --group --home /srv/hutba --shell /bin/bash hutba
sudo mkdir -p /srv/hutba/app /srv/hutba/assets /srv/hutba/backup
sudo chown -R hutba:hutba /srv/hutba
sudo chmod 750 /srv/hutba
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

Локаль (для 6 502 файлов с не-ASCII именами):

```bash
sudo locale-gen ru_RU.UTF-8
```

### Шаг 2. Node.js ≥ 22.12

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git rsync
node -v   # должно быть >= 22.12.0 (Astro 7 не запустится на старом Node)
npm -v
```

### Шаг 3. Получить код

```bash
sudo -u hutba -H bash
cd /srv/hutba/app
git clone https://github.com/MaratYalilov/AstroProject.git .
git checkout master        # или нужный тег/ветку, согласованную с разработчиком
```

### Шаг 4. Зависимости

```bash
cd /srv/hutba/app
npm ci            # обязательно полный, БЕЗ --omit=dev: адаптеры и @astrojs/react стоят в devDependencies
```

`npm ci` берёт версии из `package-lock.json` и подхватывает `.npmrc` (`legacy-peer-deps=true`) —
это штатное поведение проекта, ошибок peer-зависимостей быть не должно.

> **Важно (проверено):** серверный бандл **не самодостаточен** — он импортирует внешние пакеты
> (`react`, `react-dom/server`, `send`, `server-destroy`, `sharp`, `shiki`, `unstorage`, `devalue`,
> `marked`, `framer-motion` и др.). Поэтому `node_modules` должен оставаться рядом с релизом.
> Не применяйте `npm prune --omit=dev` после сборки: вместе с dev-пакетами удалятся
> `@astrojs/node`, `send` и `server-destroy`, и сайт перестанет запускаться.
> Кроме того `sharp` — нативный модуль: **`npm ci` выполняется только на самой Linux-машине**,
> копировать `node_modules` с Windows нельзя.

### Шаг 5. Переключить адаптер с Vercel на Node

Проект настроен под Vercel (`@astrojs/vercel`). На VPS нужен `@astrojs/node` в режиме `standalone`.
Это единственное обязательное изменение кода, всё остальное (интеграции, `output: 'static'`,
`site`, порядок страниц) остаётся как есть.

```bash
npm install @astrojs/node@11.1.2
```

Почему именно такая версия: у `@astrojs/node` 11.0.x–11.1.2 peer-зависимость `astro ^7.0.0`
(подходит текущий 7.0.3), а начиная с 11.1.3 требуется `astro ^7.2.1`. Если вы хотите последнюю
версию — сначала `npm install astro@latest`, потом `npm install @astrojs/node@latest`, и обязательно
прогнать сборку (§Шаг 6).

Правка `astro.config.mjs` (диффом):

```diff
-import vercel from '@astrojs/vercel';
+import node from '@astrojs/node';
@@
   output: 'static',
-  adapter: vercel(),
+  adapter: node({ mode: 'standalone' }),
 });
```

`@astrojs/vercel` можно удалить из `devDependencies` (`npm uninstall @astrojs/vercel`) — на VPS он
не нужен. Если планируете деплой ещё и на Vercel, удобнее завести второй конфиг
(`astro.config.node.mjs`) и собирать с `--config`.

### Шаг 6. Сборка

```bash
cd /srv/hutba/app
npm run build
```

Ожидаемый результат (проверено):

```
dist/
├── client/            # 407 пререндеренных index.html + _astro/* + api/*.json  (~661 МБ)
└── server/
    ├── entry.mjs      # точка входа Node-сервера
    ├── virtual_astro_middleware.mjs
    └── chunks/
```

Быстрая проверка ещё до настройки nginx:

```bash
HOST=127.0.0.1 PORT=4321 node /srv/hutba/app/dist/server/entry.mjs
# в другом терминале:
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4321/
curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:4321/lesson?subject=quran&course=koran-2-uroven'
```

### Шаг 7. Перенос медиа (≈113 ГБ) в `/srv/hutba/assets`

Переносится **содержимое** каталога `public/` (структура сохраняется: `media/`, `mp3/`, `fonts/`,
`ayat/`, `subject-icons/`, `favicon.ico`, `s5_logo.png`).

**Вариант A — rsync (быстрее всего, с возобновлением).** Из WSL/Linux-машины, где лежит проект:

```bash
rsync -aH --info=progress2 --partial --append-verify \
  /mnt/d/Yandex.Disk/AstroProject/public/ hutba@SERVER:/srv/hutba/assets/
```

Если сессия оборвалась — просто запустите команду заново, она продолжит с места разрыва.

**Вариант B — без rsync (чистый Windows).** Каталогами, чтобы можно было докачивать по частям:

```powershell
# по одному предмету за раз: media/akida, media/quran, media/fiqh …
tar -cf - -C D:\Yandex.Disk\AstroProject\public media\akida | ssh hutba@SERVER "tar -xf - -C /srv/hutba/assets"
# остальное
tar -cf - -C D:\Yandex.Disk\AstroProject\public fonts ayat mp3 subject-icons favicon.ico s5_logo.png `
  | ssh hutba@SERVER "tar -xf - -C /srv/hutba/assets"
```

Крупнейший файл — 964 МБ, есть 760 файлов `.mp4`. Ориентировочное время: 100 Мбит/с ≈ 3 часа,
1 Гбит/с ≈ 20 минут. Учитывайте лимиты трафика хостинга/канала.

**Не переносите медиа через файловый менеджер хостинга** (113 ГБ и 24 690 файлов) — используйте
rsync/SFTP/ssh-tar или физический диск.

Проверка после переноса:

```bash
rsync -avn --delete --itemize-changes /mnt/d/Yandex.Disk/AstroProject/public/ hutba@SERVER:/srv/hutba/assets/
# ожидаемый вывод — пустой список (всё совпадает)

# на сервере
sudo -u hutba du -sh /srv/hutba/assets        # ожидаем ≈110 ГиБ
sudo -u hutba find /srv/hutba/assets -type f | wc -l   # ожидаем 24 690
```

Права: nginx работает под `www-data` и должен читать ассеты.

```bash
sudo chown -R hutba:www-data /srv/hutba/assets
sudo chmod -R 750 /srv/hutba/assets
sudo usermod -aG hutba www-data     # плюс доступ к /srv/hutba
sudo systemctl restart nginx
```

Альтернатива, если не хочется возиться с группами: `sudo chmod -R a+rX /srv/hutba/assets`
(содержимое и так публичное).

### Шаг 8. systemd-сервис

`/etc/systemd/system/hutba.service`:

```ini
[Unit]
Description=HUTBA (Astro 7 + Node standalone)
After=network.target

[Service]
Type=simple
User=hutba
Group=hutba
WorkingDirectory=/srv/hutba/app
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=4321
ExecStart=/usr/bin/node /srv/hutba/app/dist/server/entry.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hutba
sudo systemctl status hutba --no-pager
ss -ltnp | grep 4321        # сервер слушает только 127.0.0.1 — наружу его не публикуем
journalctl -u hutba -n 50 --no-pager
```

### Шаг 9. nginx

`/etc/nginx/sites-available/hutba.conf` (первый запуск — по HTTP, TLS добавим на шаге 10):

```nginx
# www → без www
server {
    listen 80;
    listen [::]:80;
    server_name www.hutba.org;
    return 301 https://hutba.org$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name hutba.org;

    root /srv/hutba/app/dist/client;   # пререндеренные страницы и _astro из релиза
    index index.html;
    charset utf-8;

    # HTML и JSON сжимаются хорошо: /api/search-index.json 1,8 МБ → ~0,3 МБ
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json
               application/manifest+json image/svg+xml;

    client_max_body_size 8m;           # загрузки файлов на сайте нет

    # 1) ассеты сборки — иммутабельный кэш
    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }

    # 2) медиа и шрифты — прямо с диска, минуя Node (Range/докачка поддерживается nginx)
    location ~ ^/(media|mp3|fonts|ayat)/ {
        root /srv/hutba/assets;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
        try_files $uri =404;
    }

    # 3) статические JSON-индексы
    location ^~ /api/ {
        add_header Cache-Control "public, max-age=3600";
        try_files $uri @node;
    }

    # 4) HTML — не кэшировать надолго
    location ~* \.html$ {
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # 5) остальное: файл из релиза → файл из ассетов → SSR (Node)
    location / {
        try_files $uri $uri/index.html @assets;
    }

    location @assets {
        root /srv/hutba/assets;
        try_files $uri @node;
    }

    location @node {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location ~ /\. { deny all; }       # скрытые файлы
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/hutba.conf /etc/nginx/sites-enabled/hutba.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Как это работает: `/_astro/*`, HTML и `/api/*.json` отдаются из `dist/client` (то есть
Node не участвует в 95% запросов), `/media`, `/mp3`, `/fonts`, `/ayat` — прямо из `/srv/hutba/assets`,
а в Node уходят только динамические маршруты: `/lesson`, `/_image`, `/_server-islands` и 404-и.

### Шаг 10. HTTPS (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hutba.org -d www.hutba.org --redirect
sudo systemctl status certbot.timer --no-pager     # автопродление
sudo certbot renew --dry-run
```

Certbot сам добавит `listen 443 ssl`, сертификаты и редирект с HTTP. После этого проверьте, что
`https://www.hutba.org/...` отвечает редиректом на `https://hutba.org/...` (домен без `www`
прописан в `astro.config.mjs` → canonical-ссылки указывают на apex).

### Шаг 11. Приёмка (чек-лист)

```bash
BASE=https://hutba.org
curl -s  -o /dev/null -w 'главная:              %{http_code}\n' $BASE/
curl -s  -o /dev/null -w 'предмет (статика):    %{http_code}\n' $BASE/quran/koran-2-uroven/
curl -s  -o /dev/null -w 'интерактивный урок:   %{http_code}\n' $BASE/quran/muallim-sani/
curl -s  -o /dev/null -w 'SSR /lesson:          %{http_code}\n' "$BASE/lesson?subject=quran&course=koran-2-uroven"
curl -s  -o /dev/null -w 'глоссарий:            %{http_code}\n' $BASE/glossary/
curl -s  -o /dev/null -w 'поиск:                %{http_code}\n' $BASE/search/
curl -s  -o /dev/null -w 'индекс поиска:        %{http_code} %{size_download} байт\n' $BASE/api/search-index.json
curl -s  -o /dev/null -w 'глоссарий JSON:       %{http_code} %{size_download} байт\n' $BASE/api/glossary.json
curl -s  -o /dev/null -w 'шрифт Amiri:          %{http_code}\n' $BASE/fonts/Amiri-Regular.ttf
curl -s  -o /dev/null -w 'шрифт QCF (mushaf):   %{http_code}\n' $BASE/fonts/mushaf-v2/QCF2001.ttf
curl -s  -o /dev/null -w 'логотип:              %{http_code}\n' $BASE/s5_logo.png
curl -sI $BASE/ | grep -i cache-control
```

Ожидаемые значения: везде `200`; `/api/search-index.json` ≈ 1,79 МБ без gzip (≈0,3 МБ с gzip —
проверьте `curl -s -H 'Accept-Encoding: gzip' -w '%{size_download}\n' -o /dev/null $BASE/api/search-index.json`).

Проверка докачки видео (обязательно для плеера):

```bash
VIDEO=$(sudo -u hutba find /srv/hutba/assets/media/quran -name '*.mp4' | head -1 | sed 's#/srv/hutba/assets##')
curl -sI -H 'Range: bytes=0-1023' "$BASE$VIDEO" | grep -Ei 'HTTP/|content-range|accept-ranges'
# ожидаем: 206 Partial Content и Content-Range: bytes 0-1023/…
```

Проверка «не осталось ли 404 на ассеты» по конкретной странице:

```bash
curl -s "$BASE/lesson?subject=fiqh&course=mishkat-namaz" | grep -o '/media/[^"]*' | sort -u | head
# затем каждый путь проверить:  curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' "$BASE/media/..."
```

---

## 5. Обновление сайта и откат

Обновление (простейший вариант — сборка «на месте»):

```bash
sudo -u hutba -H bash
cd /srv/hutba/app
git fetch --all
git checkout <коммит-или-тег>          # то, что согласовано с разработчиком
npm ci
npm run build
exit
sudo systemctl restart hutba
curl -s -o /dev/null -w '%{http_code}\n' https://hutba.org/
```

Откат — тем же способом на предыдущий коммит (`git checkout <старый коммит> && npm ci && npm run build
&& sudo systemctl restart hutba`). Сборка занимает около минуты, поэтому окна обслуживания нет:
старые файлы заменяются уже после успешной сборки.

Если нужен полностью атомарный вариант «релизов со симлинком»:

```
/srv/hutba/releases/2026-09-21_1200/{client,server,node_modules,package.json}
/srv/hutba/current -> releases/2026-09-21_1200
/srv/hutba/assets                       # 113 ГБ, вне релизов, не версионируется
```

В этом случае nginx указывает `root /srv/hutba/current/client;`, systemd —
`ExecStart=/usr/bin/node /srv/hutba/current/server/entry.mjs`, а переключение делается
`ln -sfn releases/<новая> current && sudo systemctl restart hutba`.

---

## 6. Бэкапы, место на диске, мониторинг

* **Код и контент уроков** — в Git (`https://github.com/MaratYalilov/AstroProject`). Достаточно
  хранить актуальную ветку и теги; отдельный бэкап не нужен.
* **Медиа (113 ГБ) в Git отсутствует.** Оно существует только у владельца проекта и на сервере.
  Минимум раз в квартал (после добавления новых курсов) делайте копию:
  `sudo rsync -a --delete /srv/hutba/assets/ /mnt/backup/hutba-assets/` (внешний диск или объектное
  хранилище).
* **Конфиги:** `/etc/nginx/sites-available/hutba.conf`, `/etc/systemd/system/hutba.service`,
  `/etc/letsencrypt/` — сохраните их текст в репозиторий инфраструктуры/в защищённую заметку.
* **Место:** `df -h /srv` — при добавлении курсов медиа растёт (только видео сейчас 82 ГБ).
  Держите ≥15% свободного места, иначе nginx/Node начнут падать.
* **Наблюдаемость:** `systemctl status hutba`, `journalctl -u hutba -f`, логи nginx
  (`/var/log/nginx/error.log`). Полезно поставить cron-проверку:
  `*/5 * * * * curl -fsS -o /dev/null http://127.0.0.1:4321/ || systemctl restart hutba`.

---

## 7. Что делать НЕЛЬЗЯ (частые ошибки)

1. **Собирать проект в каталоге, где лежит `public/` с медиа.** Astro 7 всегда копирует `public/`
   в результат: получите лишние 113 ГБ в `dist/` и очень долгую сборку.
2. **Переносить `node_modules` с Windows на сервер.** В проекте есть нативные модули (`sharp`) —
   `npm ci` выполняется только на самой Linux-машине.
3. **Делать `npm ci --omit=dev` / `npm prune --omit=dev`.** `@astrojs/react`, `@astrojs/node`
   и часть зависимостей сервера стоят в `devDependencies`; без них сборка или запуск сломаются.
4. **Отдавать сайт только статикой** (nginx/Apache без Node). `/lesson` — SSR-страница, все уроки
   из курсов открываются именно через неё.
5. **Публиковать порт 4321 наружу.** Node слушает `127.0.0.1`, доступ только через nginx.
6. **Менять домен в разметке задним числом** — домен берётся из `site` в `astro.config.mjs`
   (сейчас `https://hutba.org`). Если боевой домен другой, поменяйте значение **до** сборки.
7. **Резать Range-запросы** на прокси/CDN — иначе видео не будет перематываться (проверка в §Шаг 11).

---

## 8. Диагностика

| Симптом | Причина и что проверить |
| --- | --- |
| `502 Bad Gateway` на `/lesson` | процесс Node не запущен: `systemctl status hutba`, `journalctl -u hutba -n 100` |
| Сайт работает, видео/шрифты отдают 404 | ассеты не перенесены в `/srv/hutba/assets` или нет прав: `ls -l /srv/hutba/assets/media`, `sudo -u www-data test -r /srv/hutba/assets/fonts/Amiri-Regular.ttf` |
| Ошибка старта `Cannot find module 'send'`/`'server-destroy'` | `node_modules` вычищен (`--omit=dev`) или скопирован с Windows — выполните `npm ci` на сервере |
| `EBADENGINE` при `npm ci`, либо адаптер требует `astro ^7.2.1` | версии `@astrojs/node` и `astro` не совпали — см. §Шаг 5 (11.1.2 ↔ astro 7.0.x) |
| Сборка копирует гигабайты и падает по месту | в каталоге сборки присутствует `public/` с медиа (см. §3) |
| Ошибка сборки `[@vercel/nft] File … does not exist` | в конфиге остался адаптер `@astrojs/vercel`, который неприменим на VPS — переключитесь на `@astrojs/node` |
| Имена файлов превратились в «кракозябры» | на сервере не UTF-8 локаль: `locale-gen ru_RU.UTF-8`, переносить заново через rsync/ssh (не через zip с Windows) |
| Видео не перематывается, `206` не отдаётся | Range режется прокси/CDN; в nginx-конфиге ничего не нужно, проверьте внешние слои (Cloudflare → правило не буферизовать, либо проксирование медиа в обход) |
---

## 9. Альтернативные площадки (и почему их не хватит «как есть»)

Проект сейчас сконфигурирован под **Vercel** (`@astrojs/vercel`), но разместить сайт целиком там
нельзя из-за медиа. Официальные лимиты:

| Площадка | Ограничение | Наш случай |
| --- | --- | --- |
| Vercel | «Static File uploads»: **100 МБ на файл (Hobby) / 1 ГБ (Pro)** | 760 `.mp4` и 2560 `.mp3` в `public/media`; крупнейший файл — 964 МБ, суммарно ≈110 ГБ → не влезает ни на одном тарифе |
| Cloudflare Pages | максимум **25 MiB на файл**, **20 000 файлов** на сайт (Free), сборка ≤ 20 мин | 24 690 файлов и файлы до 964 МБ → не влезает |
| Обычный shared-хостинг | нет долгоживущего Node-процесса, лимит диска | не подходит |

Реально возможные варианты, если VPS не подходит:

1. **Vercel/Cloudflare Pages только для HTML+SSR, медиа — в объектном хранилище** (Cloudflare R2,
   S3, Selectel) **с проксированием на тот же домен**: разметка использует абсолютные пути
   `/media/...`, `/fonts/...`, `/ayat/...`, `/mp3/...`, поэтому нужно, чтобы эти префиксы отдавались
   с `hutba.org` (Cloudflare Worker или nginx впереди). Это отдельная задача для разработчика,
   из коробки такой схемы в проекте нет.
2. **Docker-контейнер на хостинге** (если провайдер даёт только контейнеры). Пример:

   ```dockerfile
   # .dockerignore обязательно должен содержать public/ (113 ГБ в контекст сборки не нужен)
   FROM node:22-bookworm AS build
   WORKDIR /app
   COPY package.json package-lock.json .npmrc ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:22-bookworm-slim
   WORKDIR /app
   ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
   COPY --from=build /app/node_modules ./node_modules
   COPY --from=build /app/package.json ./
   COPY --from=build /app/dist ./dist
   EXPOSE 4321
   CMD ["node", "./dist/server/entry.mjs"]
   ```

   Медиа монтируется томом в `/srv/hutba/assets` (или отдаётся отдельным nginx), nginx-конфиг из §Шаг 9
   подходит без изменений. `docker-compose.yml` из репозитория к сайту **не относится** — он поднимает
   Qdrant для локальной работы с контентом.
3. **Отказаться от SSR** (только если разработчик доработает `/lesson`) — тогда сайт станет полностью
   статическим и его можно будет положить на любой статический хостинг/в CDN, но HTML на все уроки
   вырастет в объёме (сотни комбинаций `subject/course/slug`).

---

## 10. Приложение А: шпаргалка (все команды подряд)

```bash
# --- на сервере, от root ---
adduser --system --group --home /srv/hutba --shell /bin/bash hutba
mkdir -p /srv/hutba/app /srv/hutba/assets && chown -R hutba:hutba /srv/hutba && chmod 750 /srv/hutba
locale-gen ru_RU.UTF-8
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs git rsync nginx
ufw allow 22,80,443/tcp && ufw enable

# --- код и сборка от пользователя hutba ---
sudo -u hutba -H bash -c 'cd /srv/hutba/app && \
  git clone https://github.com/MaratYalilov/AstroProject.git . && \
  git checkout master && npm ci && \
  npm install @astrojs/node@11.1.2'

#   правка astro.config.mjs:  import node from "@astrojs/node";  adapter: node({ mode: "standalone" })

sudo -u hutba -H bash -c 'cd /srv/hutba/app && npm run build'

# --- медиа (с машины, где лежит проект) ---
rsync -aH --info=progress2 --partial --append-verify \
  /mnt/d/Yandex.Disk/AstroProject/public/ hutba@SERVER:/srv/hutba/assets/
chown -R hutba:www-data /srv/hutba/assets && chmod -R 750 /srv/hutba/assets
usermod -aG hutba www-data

# --- сервис и nginx ---
#   /etc/systemd/system/hutba.service  (см. §Шаг 8)
#   /etc/nginx/sites-available/hutba.conf  (см. §Шаг 9)
systemctl daemon-reload && systemctl enable --now hutba
ln -sf /etc/nginx/sites-available/hutba.conf /etc/nginx/sites-enabled/hutba.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- TLS ---
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d hutba.org -d www.hutba.org --redirect
```

## Приложение Б: что сообщить разработчику (владельцу проекта)

* Подтверждение, что боевой домен — `https://hutba.org` (значение `site` в `astro.config.mjs`).
  Если домен другой — попросите поменять значение и пересобрать.
* Разрешение на смену адаптера `@astrojs/vercel` → `@astrojs/node` (`mode: "standalone"`) в `astro.config.mjs`
  и установку пакета `@astrojs/node@11.1.2` (иначе на VPS не будет работать страница `/lesson`).
* Доступ к медиа: кто и как передаст каталог `public/` (≈113 ГБ, в Git его нет).
* Согласование схемы «код в `/srv/hutba/app` + медиа в `/srv/hutba/assets`».

## Приложение В: как это проверялось

* `npm run build` с адаптером `@astrojs/node@11.1.2` (`mode: standalone`): успешно, ≈65 с,
  `dist/client` (407 `index.html`) + `dist/server/entry.mjs`.
* Запуск `node dist/server/entry.mjs` (HOST=127.0.0.1, PORT=4399) и проверка:
  `/` → 200 (50 КБ), `/quran/koran-2-uroven/` → 200, `/quran/muallim-sani/` → 200,
  `/glossary/` → 200, `/search/` → 200, `/api/glossary.json` → 200 (156 966 байт),
  `/api/search-index.json` → 200 (1 791 867 байт),
  `/lesson?subject=quran&course=koran-2-uroven` → 200 за 1,5 с (SSR).
* Размеры и количество файлов получены обходом `public/` (113 074 МБ, 24 690 файлов),
  крупнейший файл 964 МБ.
* Лимиты площадок — из официальной документации Vercel (Limits) и Cloudflare Pages (Platform limits).


---





