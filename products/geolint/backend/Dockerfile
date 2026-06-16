FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN mkdir -p geolint && touch geolint/__init__.py
RUN pip install --no-cache-dir -e "."

COPY . .

EXPOSE 8000
