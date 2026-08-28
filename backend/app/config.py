from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
