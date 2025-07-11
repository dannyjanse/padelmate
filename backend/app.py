from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv

from extensions import db

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///padelmate.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = None  # Disable redirect for API

# Enable CORS
CORS(app, supports_credentials=True)

# Import models after db initialization
from models import User, MatchNight, Participation, Match, MatchResult

# Import routes after models
from routes import auth_bp, match_nights_bp, matches_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(match_nights_bp, url_prefix='/api/match-nights')
app.register_blueprint(matches_bp, url_prefix='/api/matches')

# Initialize the database
db.init_app(app)
migrate = Migrate(app, db)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'error': 'Authentication required'}), 401

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'message': 'PadelMate API is running'})

@app.route('/')
def index():
    return jsonify({'message': 'Welcome to PadelMate API'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 