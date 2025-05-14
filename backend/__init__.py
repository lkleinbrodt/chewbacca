import os
from logging import ERROR
from logging.handlers import SMTPHandler

from flask import Blueprint, Flask, request, send_from_directory
from flask_cors import CORS

from backend.config import Config
from backend.extensions import db, jwt, migrate
from flask_session import Session


def create_app(config_class: Config):

    app = Flask(
        __name__,
        # static_folder=config_class.ROOT_DIR / "dist",
        # static_url_path="",
    )

    app.config.from_object(config_class)

    CORS(
        app,
        supports_credentials=True,
    )

    jwt.init_app(app)
    Session(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Import blueprints
    from backend.routes import auth_bp, base_bp, calendar_bp, schedule_bp, task_bp

    # Register blueprints
    app.register_blueprint(base_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(task_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(schedule_bp)

    if not app.debug:
        mail_handler = SMTPHandler(
            mailhost=(app.config["MAIL_SERVER"], app.config["MAIL_PORT"]),
            fromaddr=app.config["MAIL_USERNAME"],
            toaddrs=app.config["ADMIN_EMAILS"],
            subject="LK API Application Error",
            credentials=(app.config["MAIL_USERNAME"], app.config["MAIL_PASSWORD"]),
            secure=(),
        )
        mail_handler.setLevel(ERROR)
        app.logger.addHandler(mail_handler)

    return app
