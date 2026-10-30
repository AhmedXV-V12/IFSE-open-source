# One image, two services: the command picks indexer or search (see docker-compose.yml)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    IFSE_DATA=/data

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY common/ common/
COPY indexer/ indexer/
COPY search/ search/

RUN useradd --system --uid 10001 ifse && mkdir -p /data && chown ifse /data
USER ifse
VOLUME /data
