"""Creates the local PostgreSQL database for FreshMart if it doesn't exist yet.

Run it once, before `python manage.py migrate`:

    python setup_db.py

It reads the DB_* values from your .env file and explains in plain words
what is wrong if it can't connect.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"


def fail(message):
    print(f"\nERROR: {message}\n")
    sys.exit(1)


if not ENV_FILE.exists():
    fail("There is no .env file in this folder. Copy .env.example to .env and fill it in.")

load_dotenv(ENV_FILE)

if os.getenv("DATABASE_URL", "").strip():
    print("DATABASE_URL is set in .env, so the app will use that (cloud) database.")
    print("Nothing to create locally. If you want the local database, empty DATABASE_URL.")
    sys.exit(0)

try:
    import psycopg
    from psycopg import sql
except ImportError:
    fail("psycopg is not installed. Activate your virtual environment and run: pip install -r requirements.txt")

name = os.getenv("DB_NAME", "freshmart")
user = os.getenv("DB_USER", "postgres")
password = os.getenv("DB_PASSWORD", "")
host = os.getenv("DB_HOST", "127.0.0.1")
port = os.getenv("DB_PORT", "5432")

print(f"Connecting to PostgreSQL at {host}:{port} as '{user}'...")

try:
    # Connect to the built-in "postgres" database to be allowed to create ours.
    connection = psycopg.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname="postgres",
        autocommit=True,
        connect_timeout=5,
    )
except psycopg.OperationalError as error:
    text = str(error).lower()
    if "password authentication failed" in text or "no password supplied" in text:
        fail(f"PostgreSQL rejected the password for user '{user}'. Check DB_USER and DB_PASSWORD in .env.")
    if "role" in text and "does not exist" in text:
        fail(f"PostgreSQL has no user called '{user}'. Check DB_USER in .env (on Mac it is often your computer username).")
    if "refused" in text or "could not connect" in text or "connection failed" in text or "timeout" in text or "timed out" in text:
        fail(
            f"Can't reach PostgreSQL at {host}:{port}. Make sure PostgreSQL is installed and running, "
            "and that DB_HOST and DB_PORT in .env are correct."
        )
    fail(f"Could not connect to PostgreSQL:\n{error}")

with connection:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,))
        if cursor.fetchone():
            print(f"Database '{name}' already exists. Good.")
        else:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
            print(f"Created database '{name}'.")

print("\nDone. Next: python manage.py migrate")
