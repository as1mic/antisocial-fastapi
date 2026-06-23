from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "AntiSocial API"
    project_version: str = "0.1.0"
    project_description: str = "API for the AntiSocial study project"

    database_url: str = "postgresql+psycopg2://postgres:password@localhost:5432/antisocial"
    secret_key: str = "change_this_secret_key_for_production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    demo_seed_enabled: bool = False
    demo_public_credentials: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()