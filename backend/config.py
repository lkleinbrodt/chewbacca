import logging
import os
from datetime import timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


class Config:
    ROOT_DIR = Path(os.path.abspath(os.path.dirname(__file__))).parent
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = SECRET_KEY
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY is not set")
    ENV = os.environ.get("ENV", "dev").lower()

    ADMIN_EMAILS = ["lkleinbrodt@gmail.com"]

    CORS_HEADERS = "Content-Type"

    SESSION_TYPE = "filesystem"
    SESSION_COOKIE_SAMESITE = None
    SESSION_COOKIE_SECURE = True  # Only send cookie over HTTPS
    REMEMBER_COOKIE_SECURE = True  # Same for "remember me" cookie
    SESSION_COOKIE_HTTPONLY = True  # Prevent client-side JS access to cookie

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=90)

    # Calendar JSON files directory
    CALENDAR_JSON_DIR = os.environ.get(
        "CALENDAR_JSON_DIR", os.path.join(ROOT_DIR, "calendar_data")
    )
    if not os.path.exists(CALENDAR_JSON_DIR):
        os.makedirs(CALENDAR_JSON_DIR)

    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")

    OAUTH_CREDENTIALS = {
        "google": {
            "id": os.environ.get("GOOGLE_CLIENT_ID"),
            "secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
        }
    }


class DevelopmentConfig(Config):
    ENV = "development"
    DEBUG = True
    FRONTEND_URL = "http://localhost:5173"
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(Config.ROOT_DIR, "app.db")
    # SQLALCHEMY_DATABASE_URI = (
    #     "postgresql://coyote-user:coyote-password@localhost:5432/coyote-db-dev"
    # )


class ProductionConfig(Config):
    ENV = "production"
    DEBUG = False
    FRONTEND_URL = "https://landonkleinbrodt.com"

    # SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")

    # if SQLALCHEMY_DATABASE_URI:
    #     SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
    #         "postgres://", "postgresql://"
    #     )
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(Config.ROOT_DIR, "app.db")

    CACHE_TYPE = "FileSystemCache"
    CACHE_DIR = os.path.join(os.getenv("TEMP", "/tmp"), "flask_cache")


class TestingConfig(Config):
    ENV = "testing"
    DEBUG = True
    FRONTEND_URL = "http://localhost:8000"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
