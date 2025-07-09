from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from models import User, MatchNight, Participation, Match, MatchResult
from schedule_generator import create_matches_for_night
from app import db
from datetime import datetime
import json

# Blueprints
auth_bp = Blueprint('auth', __name__)
match_nights_bp = Blueprint('match_nights', __name__)
matches_bp = Blueprint('matches', __name__)

# Authentication routes
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not all(k in data for k in ('name', 'email', 'password')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create new user
    user = User(
        name=data['name'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not all(k in data for k in ('email', 'password')):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if user and user.check_password(data['password']):
        login_user(user)
        return jsonify({'message': 'Login successful', 'user': user.to_dict()}), 200
    else:
        return jsonify({'error': 'Invalid email or password'}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({'user': current_user.to_dict()}), 200

# Match Night routes
@match_nights_bp.route('/', methods=['GET'])
@login_required
def get_match_nights():
    """Get all match nights"""
    match_nights = MatchNight.query.order_by(MatchNight.date.desc()).all()
    return jsonify({'match_nights': [mn.to_dict() for mn in match_nights]}), 200

@match_nights_bp.route('/', methods=['POST'])
@login_required
def create_match_night():
    """Create a new match night"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('date', 'location')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    match_night = MatchNight(
        date=date,
        location=data['location'],
        num_courts=data.get('num_courts', 1)
    )
    
    try:
        db.session.add(match_night)
        db.session.commit()
        return jsonify({'message': 'Match night created', 'match_night': match_night.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create match night'}), 500

@match_nights_bp.route('/<int:match_night_id>', methods=['GET'])
@login_required
def get_match_night(match_night_id):
    """Get specific match night with participants and matches"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Get participants
    participations = Participation.query.filter_by(match_night_id=match_night_id).all()
    participants = [p.user.to_dict() for p in participations]
    
    # Get matches
    matches = Match.query.filter_by(match_night_id=match_night_id).order_by(Match.round, Match.court).all()
    
    result = match_night.to_dict()
    result['participants'] = participants
    result['matches'] = [m.to_dict() for m in matches]
    
    return jsonify(result), 200

@match_nights_bp.route('/<int:match_night_id>/join', methods=['POST'])
@login_required
def join_match_night(match_night_id):
    """Join a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Check if already participating
    existing_participation = Participation.query.filter_by(
        user_id=current_user.id,
        match_night_id=match_night_id
    ).first()
    
    if existing_participation:
        return jsonify({'error': 'Already participating in this match night'}), 400
    
    participation = Participation(
        user_id=current_user.id,
        match_night_id=match_night_id
    )
    
    try:
        db.session.add(participation)
        db.session.commit()
        return jsonify({'message': 'Successfully joined match night'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to join match night'}), 500

@match_nights_bp.route('/<int:match_night_id>/leave', methods=['POST'])
@login_required
def leave_match_night(match_night_id):
    """Leave a match night"""
    participation = Participation.query.filter_by(
        user_id=current_user.id,
        match_night_id=match_night_id
    ).first()
    
    if not participation:
        return jsonify({'error': 'Not participating in this match night'}), 400
    
    try:
        db.session.delete(participation)
        db.session.commit()
        return jsonify({'message': 'Successfully left match night'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to leave match night'}), 500

@match_nights_bp.route('/<int:match_night_id>/generate-schedule', methods=['POST'])
@login_required
def generate_schedule(match_night_id):
    """Generate match schedule for a match night"""
    match_night = MatchNight.query.get_or_404(match_night_id)
    
    # Get all participants
    participations = Participation.query.filter_by(match_night_id=match_night_id).all()
    players = [p.user for p in participations]
    
    if len(players) < 4:
        return jsonify({'error': 'Need at least 4 players to generate schedule'}), 400
    
    if len(players) % 4 != 0:
        return jsonify({'error': 'Number of players must be divisible by 4'}), 400
    
    # Check if schedule already exists
    existing_matches = Match.query.filter_by(match_night_id=match_night_id).first()
    if existing_matches:
        return jsonify({'error': 'Schedule already exists for this match night'}), 400
    
    try:
        # Generate matches
        matches = create_matches_for_night(
            match_night_id=match_night_id,
            players=players,
            num_courts=match_night.num_courts,
            schedule_type=request.json.get('schedule_type') if request.json else None
        )
        
        # Save matches to database
        for match in matches:
            db.session.add(match)
        db.session.commit()
        
        return jsonify({
            'message': 'Schedule generated successfully',
            'matches': [match.to_dict() for match in matches]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to generate schedule: {str(e)}'}), 500

# Match routes
@matches_bp.route('/<int:match_id>/result', methods=['POST'])
@login_required
def submit_match_result(match_id):
    """Submit result for a match"""
    match = Match.query.get_or_404(match_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Check if result already exists
    existing_result = MatchResult.query.filter_by(match_id=match_id).first()
    if existing_result:
        return jsonify({'error': 'Result already submitted for this match'}), 400
    
    result = MatchResult(
        match_id=match_id,
        score=data.get('score'),
        winner_ids=data.get('winner_ids', [])
    )
    
    try:
        db.session.add(result)
        db.session.commit()
        return jsonify({'message': 'Result submitted successfully', 'result': result.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to submit result'}), 500

@matches_bp.route('/<int:match_id>/result', methods=['GET'])
@login_required
def get_match_result(match_id):
    """Get result for a match"""
    result = MatchResult.query.filter_by(match_id=match_id).first()
    
    if not result:
        return jsonify({'error': 'No result found for this match'}), 404
    
    return jsonify({'result': result.to_dict()}), 200

# Database initialization endpoint (for development/setup)
@auth_bp.route('/init-db', methods=['POST'])
def init_database():
    """Initialize database tables (development only)"""
    try:
        db.create_all()
        return jsonify({
            'message': 'Database initialized successfully',
            'tables': ['users', 'match_nights', 'participations', 'matches', 'match_results']
        }), 200
    except Exception as e:
        return jsonify({'error': f'Database initialization failed: {str(e)}'}), 500 