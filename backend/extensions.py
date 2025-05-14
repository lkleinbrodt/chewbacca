import logging

from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate(render_as_batch=True)


def create_logger(name, level="INFO"):
    # Create a logger instance
    logger = logging.getLogger(name)

    # Remove this comment to enable the level setting
    logger.setLevel(level)

    # Check if handler already exists to prevent duplicate handlers
    if not logger.handlers:
        formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        import sys

        console_handler = logging.StreamHandler(stream=sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger


logger = create_logger("app")
