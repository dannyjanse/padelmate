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
    date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    num_courts = db.Column(db.Integer, default=1)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'participants_count': len(self.participations)
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
        return {
            'id': self.id,
            'match_night_id': self.match_night_id,
            'player1_id': self.player1_id,
            'player2_id': self.player2_id,
            'player3_id': self.player3_id,
            'player4_id': self.player4_id,
            'round': self.round,
            'court': self.court,
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
        self.winner_ids = json.dumps(winner_ids)
    
    def get_winner_ids(self):
        """Get winner IDs as list"""
        if self.winner_ids:
            return json.loads(self.winner_ids)
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'score': self.score,
            'winner_ids': self.get_winner_ids(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        } 