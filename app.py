import os

from dotenv import load_dotenv

from backend import create_app
from backend.config import DevelopmentConfig, ProductionConfig, TestingConfig

load_dotenv(override=True)


def deploy_app():
    config_map = {
        "dev": DevelopmentConfig,
        "prod": ProductionConfig,
        "test": TestingConfig,
    }

    env = os.environ.get("ENV", "dev")
    app = create_app(config_map[env]())
    return app


app = deploy_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
