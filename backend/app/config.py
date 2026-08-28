from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "iceddaeng"
    db_password: str = "iceddaeng"
    db_name: str = "iceddaeng"
    cors_origins: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str:
        """Also allow any private-network origin.

        Everyone plays on their own phone, so the frontend is usually reached
        over the LAN at the host machine's address rather than on localhost.
        Listing every possible address is impractical; a pattern covers the
        private ranges and loopback. Set CORS_ORIGINS explicitly for a public
        deployment, where this should be narrowed to the real domain.
        """
        return (
            r"^https?://("
            r"localhost"
            r"|127\.\d+\.\d+\.\d+"
            r"|10\.\d+\.\d+\.\d+"
            r"|192\.168\.\d+\.\d+"
            r"|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+"
            r")(:\d+)?$"
        )


settings = Settings()
