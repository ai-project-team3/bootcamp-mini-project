from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Full SQLAlchemy URL. When set it wins over the db_* fields below, which is
    # how you point a local run at SQLite instead of standing up MariaDB:
    #   DB_URL=sqlite:///./dev.db
    db_url: str = ""

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "eoleumttaeng"
    db_password: str = "eoleumttaeng"
    db_name: str = "eoleumttaeng"
    cors_origins: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        if self.db_url:
            return self.db_url
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
