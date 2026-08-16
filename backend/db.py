import os
import psycopg2

def get_db():
    """
    Crea y retorna una nueva conexión a la base de datos PostgreSQL.
    """
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "SICS-MV"),
        user=os.getenv("DB_USER", "admin"),
        password=os.getenv("DB_PASSWORD", "admin123"),
    )
