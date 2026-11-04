# ============================================================
# SIGCS - Margarita Village
# Dockerfile Multi-Etapa (raíz del proyecto)
#
# Etapa 1 (builder): Compila el frontend React con Vite
# Etapa 2 (final):   Levanta el backend Flask que sirve la API
#                    Y también sirve los archivos estáticos del frontend
# ============================================================


# ---- ETAPA 1: Compilar el Frontend -------------------------
# Usamos una imagen de Node.js para instalar dependencias y hacer el build
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Copiamos primero los archivos de dependencias para aprovechar el caché de Docker
COPY frontend/package*.json ./

# Instalamos todas las dependencias de Node.js
RUN npm install

# Copiamos el resto del código del frontend
COPY frontend/ ./

# Construimos la versión de producción del frontend
# Esto genera la carpeta /app/frontend/dist con HTML, CSS y JS optimizados
RUN npm run build


# ---- ETAPA 2: Backend Python + Frontend Compilado ----------
# Imagen final más liviana, solo Python
FROM python:3.12-slim

WORKDIR /app

# Copiamos el archivo de dependencias de Python
COPY backend/requirements.txt ./

# Instalamos las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código del backend
COPY backend/ ./

# Copiamos los archivos compilados del frontend (de la etapa anterior)
# Flask los servirá como archivos estáticos en la carpeta /app/static
COPY --from=builder /app/frontend/dist ./static

# Puerto en el que Flask escuchará
EXPOSE 5000

# Comando de inicio del servidor
CMD ["python", "app.py"]
