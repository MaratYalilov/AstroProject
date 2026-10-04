# Шпаргалка: Git, GitHub и обновление сайта hutba.org

> Файл для администратора сервера. Все команды проверены под текущую конфигурацию проекта.
> Пути: код — `/srv/hutba/app`, медиа — `/srv/hutba/assets`, сервис — `hutba`, домен — `hutba.org`.

---

## Оглавление

1. [Быстрая шпаргалка (TL;DR)](#1-быстрая-шпаргалка-tldr)
2. [Подключение к серверу](#2-подключение-к-серверу)
3. [Основные команды git](#3-основные-команды-git)
4. [Обновление сайта на сервере](#4-обновление-сайта-на-сервере)
5. [Откат (rollback)](#5-откат-rollback)
6. [Проверка работоспособности](#6-проверка-работоспособности)
7. [Управление сервисом и логами](#7-управление-сервисом-и-логами)
8. [Авторизация в GitHub](#8-авторизация-в-github)
9. [Типичные ошибки и решения](#9-типичные-ошибки-и-решения)
10. [Что НЕЛЬЗЯ делать](#10-что-нельзя-делать)

---

## 1. Быстрая шпаргалка (TL;DR)

### Обновить сайт с GitHub

```bash
ssh hutba
cd /srv/hutba/app
git status                          # убедиться, что рабочая копия чистая
git pull origin scroll-to-active-patch
npm ci                              # если менялся package.json / package-lock.json
npm run build
systemctl --user restart hutba
curl -s -o /dev/null -w '%{http_code}\n' https://hutba.org/   

SSH:
Host: hutba.org
Port: 4242
User: hutba
```

### Откатить на предыдущий коммит

```bash
cd /srv/hutba/app
git log --oneline -10               # найти нужный коммит
git checkout <коммит>
npm ci && npm run build
sudo systemctl restart hutba
```

### Проверить, что всё работает

```bash
systemctl status hutba --no-pager
journalctl -u hutba -n 50 --no-pager
curl -s -o /dev/null -w '%{http_code}\n' https://hutba.org/
```

---

## 2. Подключение к серверу

### С Windows (PowerShell / Windows Terminal)

```powershell
ssh -p 4242 hutba@hutba.org
```

- Порт: `4242`
- Пользователь: `hutba`
- Хост: `hutba.org`

### Настройка `~/.ssh/config` (чтобы не вводить каждый раз)

Файл: `C:\Users\<Имя>\.ssh\config`

```
Host hutba
    HostName hutba.org
    Port 4242
    User hutba
```

Теперь достаточно:
```powershell
ssh hutba
```

### Первый раз — fingerprint сервера

```
The authenticity of host ... can't be established.
Are you sure you want to continue connecting (yes/no)?
```
→ пишем `yes`, нажимаем Enter.

### Выход с сервера

```bash
exit
```
или `Ctrl+D`.

---

## 3. Основные команды git

### Где я и что за репозиторий

```bash
pwd                                 # текущая папка
git status                          # состояние репозитория
git branch                          # локальные ветки (текущая — со звёздочкой)
git branch -a                       # все ветки, включая удалённые
git remote -v                       # куда указывает origin
```

### Посмотреть историю

```bash
git log --oneline -10               # последние 10 коммитов кратко
git log --oneline --graph --all     # граф всех веток
git show <коммит>                   # что изменилось в конкретном коммите
git diff <коммит1>..<коммит2>       # разница между коммитами
git diff <коммит1>..<коммит2> --stat # только список изменённых файлов
```

### Синхронизация с GitHub

```bash
git fetch origin                    # узнать о новых коммитах, не меняя рабочую копию
git pull origin <ветка>             # скачать и применить изменения
git push origin <ветка>             # отправить свои коммиты (сейчас через SSH, без пароля)
```

### Работа с ветками

```bash
git checkout <ветка>                # переключиться на ветку
git checkout -b <новая-ветка>       # создать и сразу переключиться
git branch <имя-бэкапа>             # создать ветку-бэкап с текущего состояния
git branch -d <ветка>               # удалить ветку (если смержена)
git branch -D <ветка>               # удалить ветку принудительно
```

### Если что-то не так в рабочей копии

```bash
git stash                           # спрятать незакоммиченные изменения
git stash pop                       # вернуть спрятанное
git checkout -- <файл>              # откатить изменения в одном файле
git reset --hard origin/<ветка>     # жёстко привести к состоянию origin (потеря локальных правок!)
```

---

## 4. Обновление сайта на сервере

### Полный цикл (пошагово)

```bash
# 1. Зайти на сервер
ssh hutba
или
ssh -p 4242 hutba@hutba.org

# 2. Перейти в папку проекта
cd /srv/hutba/app

# 3. Убедиться, что нет незакоммиченных правок
git status
# Ожидаем: "nothing to commit, working tree clean"

# 4. Узнать о новых коммитах и посмотреть, что прилетит
git fetch origin
git log HEAD..origin/scroll-to-active-patch --oneline

# 5. Стянуть обновления
git pull origin scroll-to-active-patch

# 6. Если менялся package.json или package-lock.json — переустановить зависимости
git diff HEAD@{1} -- package.json package-lock.json
# если есть изменения:
npm ci

# 7. Пересобрать проект
npm run build

# 8. Перезапустить сервис
sudo systemctl restart hutba

# 9. Проверить
curl -s -o /dev/null -w '%{http_code}\n' https://hutba.org/
```

### Минимальный вариант (когда точно знаете, что зависимостей не менялось)

```bash
cd /srv/hutba/app
git pull origin scroll-to-active-patch
npm run build
sudo systemctl restart hutba
```

### Важно про `npm ci`

- Используйте **`npm ci`**, а не `npm install`. `npm ci` ставит ровно те версии, что в `package-lock.json`, без обновлений.
- **НЕ используйте** `npm ci --omit=dev` или `npm prune --omit=dev` — часть пакетов (`@astrojs/node`, `@astrojs/react`) сидит в `devDependencies`, без них сайт не запустится.
- **НЕ копируйте** `node_modules` между Windows и Linux — там нативные модули (`sharp`), они несовместимы.

---

## 5. Откат (rollback)

### Вариант A. Вернуться на предыдущий коммит

```bash
cd /srv/hutba/app
git log --oneline -10                       # найти нужный коммит
git checkout <хэш-коммита>                  # например, 2d326e3
npm ci
npm run build
sudo systemctl restart hutba
curl -s -o /dev/null -w '%{http_code}\n' https://hutba.org/
```

**Как вернуться обратно на ветку** (после того как откат больше не нужен):

```bash
git checkout scroll-to-active-patch
npm ci && npm run build
sudo systemctl restart hutba
```

### Вариант B. Вернуться к состоянию origin

Если кто-то наделал локальных коммитов и надо всё откатить к тому, что в GitHub:

```bash
git branch backup-$(date +%F)               # сделать бэкап на всякий случай
git fetch origin
git reset --hard origin/scroll-to-active-patch
npm ci && npm run build
sudo systemctl restart hutba
```

### Вариант C. Откатить один конкретный коммит (не удаляя историю)

Если один из коммитов что-то сломал, но остальные нужны:

```bash
git revert <хэш-плохого-коммита>            # создаст новый коммит, отменяющий изменения
npm ci && npm run build
sudo systemctl restart hutba
git push origin scroll-to-active-patch      # отправить откат в GitHub
```

---

## 6. Проверка работоспособности

### Локально на сервере (минуя nginx)

```bash
# Node-процесс отвечает?
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4321/

# SSR-страница /lesson работает?
curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:4321/lesson?subject=quran&course=koran-2-uroven'
```

### Через nginx (снаружи)

```bash
BASE=https://hutba.org
curl -s -o /dev/null -w 'главная:              %{http_code}\n' $BASE/
curl -s -o /dev/null -w 'предмет (статика):    %{http_code}\n' $BASE/quran/koran-2-uroven/
curl -s -o /dev/null -w 'SSR /lesson:          %{http_code}\n' "$BASE/lesson?subject=quran&course=koran-2-uroven"
curl -s -o /dev/null -w 'шрифт Amiri:          %{http_code}\n' $BASE/fonts/Amiri-Regular.ttf
curl -s -o /dev/null -w 'логотип:              %{http_code}\n' $BASE/s5_logo.png
```

Ожидаемые значения — везде `200`.

### Проверка докачки видео (Range)

```bash
VIDEO=$(sudo -u hutba find /srv/hutba/assets/media/quran -name '*.mp4' | head -1 | sed 's#/srv/hutba/assets##')
curl -sI -H 'Range: bytes=0-1023' "https://hutba.org$VIDEO" | grep -Ei 'HTTP/|content-range|accept-ranges'
# ожидаем: 206 Partial Content и Content-Range
```

---

## 7. Управление сервисом и логами

### systemd-сервис `hutba`

```bash
sudo systemctl status hutba --no-pager        # состояние
sudo systemctl restart hutba                  # перезапуск
sudo systemctl stop hutba                     # остановить
sudo systemctl start hutba                    # запустить
sudo systemctl reload hutba                   # перечитать конфиг (для нашего сервиса — то же, что restart)
sudo systemctl enable hutba                   # автозапуск при загрузке
```

### Логи

```bash
journalctl -u hutba -n 50 --no-pager          # последние 50 строк
journalctl -u hutba -f                        # следить в реальном времени (Ctrl+C — выход)
journalctl -u hutba --since "10 min ago"      # за последние 10 минут
journalctl -u hutba --since today             # за сегодня
```

### Nginx

```bash
sudo nginx -t                                 # проверить конфиг
sudo systemctl reload nginx                   # применить без разрыва соединений
sudo systemctl restart nginx                  # полный перезапуск

tail -f /var/log/nginx/error.log              # ошибки nginx в реальном времени
tail -f /var/log/nginx/access.log             # все запросы
```

### Проверить, что Node слушает порт

```bash
ss -ltnp | grep 4321
# ожидаем: LISTEN 127.0.0.1:4321 (только локально, наружу не торчит)
```

---

## 8. Авторизация в GitHub

### Текущая схема (SSH)

На сервере настроен **SSH-ключ** — все `git pull` / `git push` идут без пароля и токенов.

Проверить подключение:

```bash
ssh -T git@github.com
# ожидаем: "Hi MaratYalilov! You've successfully authenticated..."
```

### Где что лежит в GitHub

| Механизм | Ссылка | Срок действия |
|---|---|---|
| **SSH keys** | https://github.com/settings/keys | Бессрочно |
| Personal Access Tokens (classic) | https://github.com/settings/tokens | Задаётся вручную |
| Fine-grained tokens | https://github.com/settings/tokens?type=beta | Задаётся вручную |

**Мы используем SSH-ключ.** Он бессрочный. Personal Access Token (если создавали) — не нужен, можно удалить.

### Файлы SSH-ключа на сервере

```bash
~/.ssh/id_ed25519            # приватный ключ (никому не отдавать!)
~/.ssh/id_ed25519.pub        # публичный ключ (его добавляем в GitHub)
~/.ssh/known_hosts           # список доверенных хостов (github.com и т.д.)
```

Вывести публичный ключ (если нужно добавить на новую машину в GitHub):

```bash
cat ~/.ssh/id_ed25519.pub
```

### Если remote случайно переключился на HTTPS

Проверить:
```bash
git remote -v
```
Если видите `https://github.com/...` — переключить обратно на SSH:
```bash
git remote set-url origin git@github.com:MaratYalilov/AstroProject.git
```

---

## 9. Типичные ошибки и решения

| Ошибка | Причина | Решение |
|---|---|---|
| `fatal: not a git repository` | Вы не в папке проекта | `cd /srv/hutba/app` |
| `Authentication failed` / `Password authentication is not supported` | Используется HTTPS вместо SSH | `git remote set-url origin git@github.com:MaratYalilov/AstroProject.git` |
| `Permission denied (publickey)` | SSH-ключ не добавлен в GitHub | Добавить `~/.ssh/id_ed25519.pub` на https://github.com/settings/keys |
| `Your branch is ahead of 'origin/...' by N commits` | Есть локальные коммиты, не запушенные в GitHub | Разобраться, что за коммиты (`git log origin/<ветка>..HEAD`), и запушить или откатить |
| `Your branch and 'origin/...' have diverged` | Локально и на GitHub разные коммиты | `git pull --rebase origin <ветка>` (разрулить конфликты) или `git reset --hard origin/<ветка>` |
| `Your local changes would be overwritten by merge` | Есть незакоммиченные правки | `git stash` → `git pull` → `git stash pop` (или `git checkout -- .` — потерять правки) |
| `502 Bad Gateway` на `/lesson` | Node-процесс упал | `systemctl status hutba`, `journalctl -u hutba -n 100` |
| Сайт работает, медиа отдают 404 | Ассеты не перенесены или нет прав | Проверить `/srv/hutba/assets/`, права `hutba:www-data`, `chmod 750` |
| `Cannot find module 'send'/'server-destroy'` | `node_modules` вычищен или скопирован с Windows | Выполнить `npm ci` на самой Linux-машине |
| Сборка копирует гигабайты и падает | В каталоге сборки есть `public/` с медиа | Медиа должны быть в `/srv/hutba/assets`, а не в `public/` |
| `EBADENGINE` при `npm ci` | Версии `@astrojs/node` и `astro` не совпали | См. DEPLOY.md §Шаг 5 (`@astrojs/node@11.1.2` ↔ `astro 7.0.x`) |
| `ssh: command not found` (Windows) | Нет встроенного SSH-клиента | Параметры → Приложения → Доп. компоненты → OpenSSH Client |
| `Host key verification failed` | Изменился ключ сервера GitHub | `ssh-keygen -R github.com` и снова `ssh -T git@github.com` |

---

## 10. Что НЕЛЬЗЯ делать

- ❌ **Не коммитить на сервере.** Сервер — только для `git pull`. Все правки — локально и через `git push` в GitHub.
- ❌ **Не использовать `npm install`** для обновления зависимостей на сервере — только `npm ci` (ставит ровно то, что в lock-файле).
- ❌ **Не использовать `npm ci --omit=dev`** и **`npm prune --omit=dev`** — часть нужных для работы пакетов сидит в `devDependencies`.
- ❌ **Не копировать `node_modules`** между Windows и Linux — нативные модули (`sharp`) несовместимы.
- ❌ **Не собирать проект в каталоге, где лежит `public/` с 113 ГБ медиа** — Astro скопирует их в `dist/`, сборка упадёт по месту.
- ❌ **Не публиковать порт 4321 наружу.** Node должен слушать только `127.0.0.1`, доступ — через nginx.
- ❌ **Не удалять `.npmrc`** — там `legacy-peer-deps=true`, без него `npm ci` может упасть на peer-зависимостях.
- ❌ **Не менять домен в разметке задним числом** — он берётся из `site` в `astro.config.mjs`.
- ❌ **Не резать Range-запросы** на CDN/прокси — иначе видео не будет перематываться.
- ❌ **Не делать force-push (`git push -f`) в общие ветки** — сломает историю у других разработчиков.

---

## Полезные однострочники

```bash
# Где я и что за проект
pwd && git remote -v && git status

# Последние 5 коммитов
git log --oneline -5

# Полный цикл обновления одной строкой
cd /srv/hutba/app && git pull origin scroll-to-active-patch && npm ci && npm run build && sudo systemctl restart hutba

# Быстрая проверка что сайт жив
curl -s -o /dev/null -w 'HTTP %{http_code}, %{time_total}s\n' https://hutba.org/

# Сколько места на диске
df -h /srv

# Размер медиа
du -sh /srv/hutba/assets

# Топ-5 процессов по CPU
ps aux --sort=-%cpu | head -6
```

---

## Контакты и ссылки

- **Репозиторий:** https://github.com/MaratYalilov/AstroProject
- **Ветка прода:** `scroll-to-active-patch` (либо `master` — уточнить у разработчика)
- **Полная инструкция по развёртыванию:** `DEPLOY.md` в корне проекта
- **Сайт:** https://hutba.org

---