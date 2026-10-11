#!/usr/bin/env bash
# Build script for hosting platforms such as Render.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
