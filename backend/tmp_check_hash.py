import os
import psycopg

conn = psycopg.connect(os.environ.get('DATABASE_URL'))
with conn.cursor() as cur:
    cur.execute("SELECT id, email, password_hash FROM usuarios WHERE email = %s", ('test@example.com',))
    row = cur.fetchone()
print(row)
