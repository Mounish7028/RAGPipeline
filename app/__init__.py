"""Flask application factory."""
import os
from flask import Flask
from flask_cors import CORS


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), "..", "templates"),
        static_folder=os.path.join(os.path.dirname(__file__), "..", "static"),
    )

    # Load configuration
    from app.config import Config
    app.config.from_object(Config)

    # Enable CORS for all routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Ensure required directories exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["CHROMA_PERSIST_DIR"], exist_ok=True)

    # Register blueprints
    from app.routes.upload import upload_bp
    from app.routes.chat import chat_bp

    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")

    # Root route — serve the SPA
    from flask import render_template

    @app.route("/")
    def index():
        return render_template("index.html")

    return app
