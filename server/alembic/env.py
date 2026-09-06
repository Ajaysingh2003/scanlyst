import os
import asyncio

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
from app.models import Base

# Read DATABASE_URL directly from environment — avoids pydantic-settings
# lru_cache issues and works in both local Docker and remote cloud deployments.
_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://Scanlyst:Scanlyst@db:5432/Scanlyst",
)

config = context.config
config.set_main_option("sqlalchemy.url", _DATABASE_URL.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=_DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(_DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(
            lambda c: context.configure(connection=c, target_metadata=target_metadata)
        )
        async with connection.begin():
            await connection.run_sync(lambda c: context.run_migrations())
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
