import os
import psycopg

# Hash generado previamente
h = "$2b$12$SbltwfAi8PVVj4alZxuhp.muBn.MzDayyNtNGH/3UgHhA.TlZOuTK"

# Conectar usando la variable de entorno DATABASE_URL que el contenedor backend tiene
conn = psycopg.connect(os.environ.get('DATABASE_URL'))
with conn.cursor() as cur:
    cur.execute("UPDATE usuarios SET password_hash = %s WHERE email = %s", (h, 'test@example.com'))
    conn.commit()
print('Password hash updated for test@example.com')
