# FreshMart backend

Django 6.1 + Django REST Framework API for the FreshMart online grocery store, running on a **local PostgreSQL** database. Switching to a cloud database later is a one-line change (see the end).

## What you need installed

| Tool | Version | Why |
|---|---|---|
| Python | **3.12, 3.13 or 3.14** (Django 6.1 does not run on 3.11 or older) | runs the API |
| PostgreSQL | **15 or newer** (Django 6.1 dropped 14) | the database |

Check Python with `python --version` (Mac/Linux: `python3 --version`).

### Install PostgreSQL

- **Windows:** download the installer from postgresql.org/download/windows. During setup, choose a password for the `postgres` user and **write it down**. Keep port `5432`. Finish the installer; it starts PostgreSQL for you.
- **Mac:** `brew install postgresql@17 && brew services start postgresql@17`. Homebrew makes a superuser named after your Mac username with no password, so in `.env` set `DB_USER=<your mac username>` and leave `DB_PASSWORD` empty. (Postgres.app from postgresapp.com also works.)
- **Ubuntu/Debian:** `sudo apt install postgresql`, then give the `postgres` user a password:
  `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'choose-a-password';"`

## Set up (run inside this `backend` folder)

```bash
python -m venv venv
```
Activate it:
- Windows (Command Prompt): `venv\Scripts\activate`
- Windows (PowerShell): `venv\Scripts\Activate.ps1` (if it is blocked, first run `Set-ExecutionPolicy -Scope Process Bypass`)
- Mac/Linux: `source venv/bin/activate`

```bash
pip install -r requirements.txt
```

Create your settings file: copy `.env.example` to `.env` (Windows: `copy .env.example .env`; Mac/Linux: `cp .env.example .env`). Open `.env` and set at least:

```
SECRET_KEY=any-long-random-text
DB_PASSWORD=the-postgres-password-you-chose
```

Then run these one after another:

```bash
python setup_db.py                     # creates the "freshmart" database (explains any problem in plain words)
python manage.py makemigrations        # should say "No changes detected" (a new file here is also fine)
python manage.py migrate               # builds the tables
python manage.py seed_data             # about 35 demo products
python manage.py create_admin admin@freshmart.com ChooseAStrongPassword
python manage.py test                  # automated checks, should end with "OK"
python manage.py runserver
```

`python manage.py test` makes a temporary `test_freshmart` database, so the PostgreSQL user needs permission to create databases (the default `postgres` user has it).

Open http://localhost:8000/api/health/. You should see `{"status":"ok","database":"ok"}`. Then http://localhost:8000/api/products/ lists the products.

Each later session you only need: activate the venv, then `python manage.py runserver`.

## Connect the frontend

See [docs/FRONTEND_CONNECTION.md](docs/FRONTEND_CONNECTION.md). In short: the API lives at `http://localhost:8000/api`, and CORS already allows `localhost:3000` (Next.js) and `localhost:5173` (Vite).

## Move to a cloud database later

1. Create the database with a provider (Neon, Supabase, Railway, Render, ...) and copy its connection string.
2. Paste it into `.env` as `DATABASE_URL=...`.
3. Run `python manage.py migrate` and `python manage.py seed_data` again.

While `DATABASE_URL` has a value, the `DB_*` settings are ignored. Empty it to go back to local.

## Troubleshooting

| Message | Fix |
|---|---|
| `Can't reach PostgreSQL` | PostgreSQL isn't running, or `DB_HOST` / `DB_PORT` are wrong. Start the PostgreSQL service. |
| `rejected the password` | `DB_PASSWORD` in `.env` doesn't match the one you chose when installing. |
| `PostgreSQL has no user called ...` | Fix `DB_USER` in `.env` (Mac: your Mac username). |
| `database "freshmart" does not exist` | Run `python setup_db.py`. |
| `No module named ...` | The venv isn't active, or run `pip install -r requirements.txt` again. |
| pip says Django 6.1 isn't found | Your Python is older than 3.12. Install a newer Python and recreate the venv. |
| Test run says `permission denied to create database` | Use a PostgreSQL user with the CREATEDB permission (e.g. `postgres`). |
| Site shows a CORS error | Add your frontend address to `CORS_ALLOWED_ORIGINS` in `.env`, then restart the server. |

## Project layout

```
backend/
  manage.py
  setup_db.py          creates the local database
  requirements.txt
  .env.example
  freshmart/           settings, urls
  store/               models, serializers, views, tests, migrations
    management/commands/   seed_data, create_admin
  docs/FRONTEND_CONNECTION.md
```
Django's own admin screen is at http://localhost:8000/django-admin/ (same admin login).
