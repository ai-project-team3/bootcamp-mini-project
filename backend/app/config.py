from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # MariaDB 없이 돌려보기 위한 전체 URL 오버라이드. 값이 있으면 아래 db_* 를
    # 전부 무시한다. 예: DB_URL=sqlite:///./dev.db
    db_url: str = ""

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "iceddaeng"
    db_password: str = "iceddaeng"
    db_name: str = "iceddaeng"
    cors_origins: str = "http://localhost:5173"
    # 얼음땡 기획안 §5 문항 생성용(Gemini 무료 키). 없으면 항상 기본 문항 세트로 폴백한다.
    gemini_api_key: Optional[str] = None

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
