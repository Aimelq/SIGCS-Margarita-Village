import os
import psycopg2

def get_db():
    """
    Crea y retorna una nueva conexión a la base de datos PostgreSQL.

    En producción (Render), usa la variable DATABASE_URL completa.
    En local (Docker), usa las variables individuales del docker-compose.
    """
    # Render y la mayoría de plataformas proveen una URL completa de conexión
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # psycopg2 necesita 'postgresql://' en vez de 'postgres://' (Render usa 'postgres://')
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        return psycopg2.connect(database_url)

    # Fallback: variables individuales para entorno local con Docker
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "SIGCS-MV"),
        user=os.getenv("DB_USER", "admin"),
        password=os.getenv("DB_PASSWORD", "admin123"),
    )
