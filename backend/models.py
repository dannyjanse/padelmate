from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

# Import db from app
from extensions import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    participations = db.relationship('Participation', backref='user', lazy=True)
    matches_as_player1 = db.relationship('Match', foreign_keys='Match.player1_id', backref='player1', lazy=True)
    matches_as_player2 = db.relationship('Match', foreign_keys='Match.player2_id', backref='player2', lazy=True)
    matches_as_player3 = db.relationship('Match', foreign_keys='Match.player3_id', backref='player3', lazy=True)
    matches_as_player4 = db.relationship('Match', foreign_keys='Match.player4_id', backref='player4', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MatchNight(db.Model):
    __tablename__ = 'match_nights'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, nullable=False)  # Changed from Date to DateTime to include time
    location = db.Column(db.String(200), nullable=False)
    num_courts = db.Column(db.Integer, default=1)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_status = db.Column(db.String(20), default='not_started')  # 'not_started', 'active', 'completed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_match_nights', lazy=True)
    participations = db.relationship('Participation', backref='match_night', lazy=True)
    matches = db.relationship('Match', backref='match_night', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'location': self.location,
            'num_courts': self.num_courts,
            'creator_id': self.creator_id,
            'creator': self.creator.to_dict() if self.creator else None,
            'game_status': self.game_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'participants_count': len(self.participations),
            'player_stats': [stat.to_dict() for stat in self.player_stats] if self.player_stats else []
        }

class Participation(db.Model):
    __tablename__ = 'participations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    match_night_id = db.Column(db.Integer, db.ForeignKey('match_nights.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure unique participation per user per match night
    __table_args__ = (db.UniqueConstraint('user_id', 'match_night_id', name='unique_user_match_night'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'match_night_id': self.match_night_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': self.user.to_dict() if self.user else None
        }

class Match(db.Model):
    __tablename__ = 'matches'
    
    id = db.Column(db.Integer, primary_key=True)
    match_night_id = db.Column(db.Integer, db.ForeignKey('match_nights.id'), nullable=False)
    game_schema_id = db.Column(db.Integer, db.ForeignKey('game_schemas.id'), nullable=True)
    player1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    player2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    player3_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    player4_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    round = db.Column(db.Integer, nullable=False)
    court = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    result = db.relationship('MatchResult', backref='match', uselist=False, lazy=True)
    
    def to_dict(self):
        # Haal de user objecten op voor de namen
        player1 = User.query.get(self.player1_id)
        player2 = User.query.get(self.player2_id)
        player3 = User.query.get(self.player3_id)
        player4 = User.query.get(self.player4_id)
        
        # Check if this is a naai-partij (last match for 6 or 7 players)
        is_naai_partij = False
        if self.round >= 8:  # Naai-partijen zijn altijd de laatste wedstrijden
            is_naai_partij = True
        
        return {
            'id': self.id,
            'match_night_id': self.match_night_id,
            'player1_id': self.player1_id,
            'player1_name': player1.name if player1 else None,
            'player2_id': self.player2_id,
            'player2_name': player2.name if player2 else None,
            'player3_id': self.player3_id,
            'player3_name': player3.name if player3 else None,
            'player4_id': self.player4_id,
            'player4_name': player4.name if player4 else None,
            'round': self.round,
            'court': self.court,
            'is_naai_partij': is_naai_partij,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'result': self.result.to_dict() if self.result else None
        }

class MatchResult(db.Model):
    __tablename__ = 'match_results'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    score = db.Column(db.String(50), nullable=True)  # e.g., "6-3, 6-4"
    winner_ids = db.Column(db.Text, nullable=True)  # JSON array of winner user IDs
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_winner_ids(self, winner_ids):
        """Set winner IDs as JSON string"""
        if winner_ids is None:
            self.winner_ids = None
        else:
            self.winner_ids = json.dumps(winner_ids)
    
    def get_winner_ids(self):
        """Get winner IDs as list"""
        if not self.winner_ids:
            return []
        
        try:
            # Handle case where winner_ids might already be a list
            if isinstance(self.winner_ids, list):
                return self.winner_ids
            
            # Try to parse as JSON
            return json.loads(self.winner_ids)
        except (json.JSONDecodeError, TypeError, ValueError):
            # If JSON parsing fails, return empty list
            return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'score': self.score,
            'winner_ids': self.get_winner_ids(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class GameSchema(db.Model):
    __tablename__ = 'game_schemas'
    
    id = db.Column(db.Integer, primary_key=True)
    match_night_id = db.Column(db.Integer, db.ForeignKey('match_nights.id'), nullable=False)
    game_mode = db.Column(db.String(50), nullable=False)  # 'everyone_vs_everyone' or 'king_of_the_court'
    status = db.Column(db.String(20), default='pending')  # 'pending', 'active', 'completed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    match_night = db.relationship('MatchNight', backref='game_schemas', lazy=True)
    matches = db.relationship('Match', backref='game_schema', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_night_id': self.match_night_id,
            'game_mode': self.game_mode,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'matches': [match.to_dict() for match in self.matches] if self.matches else []
        }

class PlayerStats(db.Model):
    __tablename__ = 'player_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    match_night_id = db.Column(db.Integer, db.ForeignKey('match_nights.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_points = db.Column(db.Integer, default=0)  # Total points scored across all matches
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    match_night = db.relationship('MatchNight', backref='player_stats', lazy=True)
    user = db.relationship('User', backref='player_stats', lazy=True)
    
    # Ensure unique stats per player per match night
    __table_args__ = (db.UniqueConstraint('match_night_id', 'user_id', name='unique_player_match_night_stats'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_night_id': self.match_night_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'total_points': self.total_points,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 