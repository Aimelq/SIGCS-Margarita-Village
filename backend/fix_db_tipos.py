"""
Script para normalizar los tipos de preguntas en la base de datos remota.
Ejecutar una sola vez: python fix_db_tipos.py
"""
import psycopg2

DB_URL = "postgresql://admin:6OhQiQS2OARagCyLygITM8XDmve1mS9o@dpg-dbl7suajnfac73eutd6g-a.oregon-postgres.render.com/sics_mv"

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# 1. Normalizar tipos
cur.execute("UPDATE preguntas SET tipo = 'multiple' WHERE tipo IN ('Opción múltiple', 'Verdadero/Falso')")
print(f"  Filas multiple normalizadas: {cur.rowcount}")

cur.execute("UPDATE preguntas SET tipo = 'abierta' WHERE tipo = 'Desarrollo abierto'")
print(f"  Filas abierta normalizadas: {cur.rowcount}")

conn.commit()

# 2. Verificar resultado
cur.execute("SELECT tipo, COUNT(*) FROM preguntas GROUP BY tipo ORDER BY tipo")
rows = cur.fetchall()
print("\nEstado actual de tipos:")
for tipo, cnt in rows:
    print(f"  {tipo}: {cnt} preguntas")

cur.close()
conn.close()
print("\nOK Normalizacion completada.")
