# ============================================================
# DOCKERFILE - Backend Flask (Producción)
# SIGCS - Hotel Margarita Village
# ============================================================

FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY . .

# Puerto de Flask
EXPOSE 5000

CMD ["python", "app.py"]
