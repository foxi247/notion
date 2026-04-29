# 🚀 NexusAI — Руководство по развёртыванию

## Обзор вариантов

| Вариант | Сложность | Цена | Рекомендация |
|---------|-----------|------|-------------|
| **VPS + Docker** | ⭐⭐ Средняя | $4-10/мес | ✅ Лучший выбор |
| **Railway.app** | ⭐ Лёгкая | От $5/мес | ✅ Быстрый старт |
| **Render.com** | ⭐ Лёгкая | Бесплатно/$7/мес | ✅ Подходит |
| **Vercel** | ⭐ Лёгкая | Бесплатно | ⚠️ Нет SQLite |

> **Важно:** NexusAI использует **SQLite** (файловая БД). Vercel не подходит, так как там read-only файловая система.

---

## Вариант 1: VPS + Docker (Рекомендуется)

### Требования
- VPS с Ubuntu 22.04/24.04 (1 CPU, 1 GB RAM минимум)
- Доменное имя (опционально, но рекомендуется)

### Шаг 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose (если не установлен)
sudo apt install docker-compose-plugin -y

# Проверка
docker --version
docker compose version
```

### Шаг 2. Клонирование проекта

```bash
# Клонировать репозиторий
git clone https://github.com/ВАШ_ЮЗЕР/nexusai.git
cd nexusai

# Настроить переменные окружения
cp .env.example .env
nano .env  # отредактировать при необходимости
```

### Шаг 3. Сборка и запуск

```bash
# Собрать и запустить
docker compose up -d --build

# Проверить статус
docker compose ps
docker compose logs -f nexusai

# Инициализировать базу данных (создать таблицы)
docker compose exec nexusai bunx prisma db push

# Создать администратора (опционально)
# Зайдите на сайт и зарегистрируйтесь с email admin@nexus.ai
# Потом измените роль в SQLite:
docker compose exec nexusai sh -c \
  "echo \"UPDATE User SET role='admin' WHERE email='admin@nexus.ai';\" | sqlite3 /app/db/nexusai.db"
```

### Шаг 4. Настройка Nginx (reverse proxy + HTTPS)

```bash
# Установка Nginx и Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Создать конфиг Nginx
sudo nano /etc/nginx/sites-available/nexusai
```

Вставить конфигурацию:
```nginx
server {
    listen 80;
    server_name ваш-домен.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/nexusai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Получить SSL сертификат (Let's Encrypt)
sudo certbot --nginx -d ваш-домен.com
```

### Полезные команды Docker

```bash
# Просмотр логов
docker compose logs -f

# Перезапуск
docker compose restart

# Обновление (pull + rebuild)
git pull
docker compose up -d --build

# Резервное копирование БД
docker compose exec nexusai sh -c "cp /app/db/nexusai.db /app/db/backup-$(date +%Y%m%d).db"
docker compose cp nexusai:/app/db/backup-$(date +%Y%m%d).db ./backup.db

# Восстановление БД
docker compose cp ./backup.db nexusai:/app/db/nexusai.db
docker compose restart nexusai
```

---

## Вариант 2: Railway.app

### Шаги

1. **Зайдите на [railway.app](https://railway.app)** → Авторизуйтесь через GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Выберите ваш репозиторий `nexusai`
4. Railway автоматически определит Dockerfile
5. **Переменные окружения** (Section → Variables):
   - `DATABASE_URL` = `file:/app/db/nexusai.db`
6. **Persistent Disk** (чтобы БД не удалялась при деплое):
   - Settings → Add Disk → Mount Path: `/app/db`
7. **Настройка домена** (Settings → Networking → Custom Domain)

> Railway автоматически пересобирает при push в main.

---

## Вариант 3: Render.com

### Шаги

1. **Зайдите на [render.com](https://render.com)** → New → Web Service
2. **Connect repository** → выберите `nexusai`
3. **Settings:**
   - **Build Command:** `docker build -t nexusai .`
   - **Environment:** `Docker`
   - **Environment Variables:**
     - `DATABASE_URL` = `file:/app/db/nexusai.db`
   - **Persistent Disk:** `/app/db` (1 GB)
4. **Deploy** → Render запустит Docker контейнер

---

## Вариант 4: VPS без Docker (ручная установка)

### Шаги

```bash
# Установка bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Клонирование
git clone https://github.com/ВАШ_ЮЗЕР/nexusai.git
cd nexusai

# Установка зависимостей
bun install

# Генерация Prisma клиента
bunx prisma generate

# Создание базы данных
mkdir -p db
echo "DATABASE_URL=file:$(pwd)/db/nexusai.db" > .env
bunx prisma db push

# Сборка
bun run build

# Создание systemd сервиса
sudo nano /etc/systemd/system/nexusai.service
```

```ini
[Unit]
Description=NexusAI
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nexusai
ExecStart=/root/.bun/bin/bun server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:/var/www/nexusai/db/nexusai.db

[Install]
WantedBy=multi-user.target
```

```bash
# Копирование файлов
sudo cp -r . /var/www/nexusai/
sudo chown -R www-data:www-data /var/www/nexusai

# Запуск
sudo systemctl enable nexusai
sudo systemctl start nexusai
sudo systemctl status nexusai
```

---

## Структура файлов для деплоя

```
nexusai/
├── Dockerfile              ← Docker образ
├── docker-compose.yml      ← Docker Compose
├── .dockerignore           ← Исключения для Docker
├── .env.example            ← Шаблон переменных
├── next.config.ts          ← output: "standalone" ✅
├── prisma/
│   └── schema.prisma       ← SQLite схема
├── src/                    ← Исходный код
├── public/                 ← Статические файлы
└── package.json            ← Зависимости
```

---

## Демо-доступ после деплоя

После первого запуска создайте пользователя через интерфейс регистрации.
Чтобы сделать его администратором:

**Docker:**
```bash
docker compose exec nexusai sh -c \
  "echo \"UPDATE User SET role='admin' WHERE email='ВАШ_EMAIL';\" | sqlite3 /app/db/nexusai.db"
```

**Railway/Render:** используйте Shell в консоли сервиса.

---

## Рекомендуемые VPS-провайдеры

| Провайдер | Мин. цена | CPU/RAM | Локация |
|-----------|-----------|---------|---------|
| [Timeweb Cloud](https://timeweb.com) | ~$3/мес | 1/1GB | РФ, НЛ |
| [Beget](https://beget.com) | ~$2/мес | 1/1GB | РФ |
| [Hetzner](https://hetzner.com) | €3.79/мес | 2/4GB | 🇩🇪 Финляндия |
| [DigitalOcean](https://digitalocean.com) | $4/мес | 1/512MB | США, ЕС |
| [Vultr](https://vultr.com) | $3.5/мес | 1/512MB | 30+ стран |

> 💡 **Hetzner** — лучшее соотношение цена/качество для Европы.
> 💡 **Timeweb/Beget** — если нужен хостинг в России.

---

## Чеклист перед деплоем

- [ ] Проект закоммичен в GitHub
- [ ] `.env.example` скопирован в `.env` и заполнен
- [ ] `DATABASE_URL` указывает на persistent volume
- [ ] Dockerfile и docker-compose.yml на месте
- [ ] Nginx настроен как reverse proxy
- [ ] SSL сертификат установлен (Let's Encrypt)
- [ ] Prisma schema применена (`prisma db push`)
- [ ] Администратор создан (роль = 'admin')
- [ ] Резервное копирование БД настроено (cron)
