import random
from typing import List, Dict, Tuple
from models import Match, User

class ScheduleGenerator:
    """
    Generates padel match schedules based on number of players and courts.
    Supports different tournament formats and ensures fair play distribution.
    """
    
    def __init__(self, players: List[User], num_courts: int = 1):
        self.players = players
        self.num_courts = num_courts
        self.num_players = len(players)
    
    def generate_round_robin(self) -> List[Dict]:
        """
        Generate a round-robin tournament where each player plays with and against
        every other player exactly once.
        
        Returns:
            List of matches organized by rounds
        """
        if self.num_players < 4:
            raise ValueError("Need at least 4 players for padel matches")
        
        if self.num_players % 4 != 0:
            raise ValueError("Number of players must be divisible by 4")
        
        matches = []
        players_copy = self.players.copy()
        
        # For round-robin, we need (n-1) rounds where n is number of players
        num_rounds = self.num_players - 1
        
        for round_num in range(num_rounds):
            round_matches = []
            
            # Create matches for this round
            for court in range(self.num_players // 4):
                start_idx = court * 4
                match = {
                    'player1_id': players_copy[start_idx].id,
                    'player2_id': players_copy[start_idx + 1].id,
                    'player3_id': players_copy[start_idx + 2].id,
                    'player4_id': players_copy[start_idx + 3].id,
                    'round': round_num + 1,
                    'court': court + 1
                }
                round_matches.append(match)
            
            matches.extend(round_matches)
            
            # Rotate players for next round (keep first player fixed)
            if round_num < num_rounds - 1:
                players_copy = self._rotate_players(players_copy)
        
        return matches
    
    def generate_swiss_system(self, num_rounds: int = 3) -> List[Dict]:
        """
        Generate a Swiss system tournament where players are paired based on
        similar performance levels.
        
        Args:
            num_rounds: Number of rounds to play
            
        Returns:
            List of matches organized by rounds
        """
        if self.num_players < 4:
            raise ValueError("Need at least 4 players for padel matches")
        
        if self.num_players % 4 != 0:
            raise ValueError("Number of players must be divisible by 4")
        
        matches = []
        players_copy = self.players.copy()
        
        for round_num in range(num_rounds):
            round_matches = []
            
            # Shuffle players for fair distribution
            random.shuffle(players_copy)
            
            # Create matches for this round
            for court in range(self.num_players // 4):
                start_idx = court * 4
                match = {
                    'player1_id': players_copy[start_idx].id,
                    'player2_id': players_copy[start_idx + 1].id,
                    'player3_id': players_copy[start_idx + 2].id,
                    'player4_id': players_copy[start_idx + 3].id,
                    'round': round_num + 1,
                    'court': court + 1
                }
                round_matches.append(match)
            
            matches.extend(round_matches)
        
        return matches
    
    def generate_simple_schedule(self, num_rounds: int = 3) -> List[Dict]:
        """
        Generate a simple schedule with random pairings.
        Good for casual play where exact fairness is less important.
        
        Args:
            num_rounds: Number of rounds to play
            
        Returns:
            List of matches organized by rounds
        """
        if self.num_players < 4:
            raise ValueError("Need at least 4 players for padel matches")
        
        if self.num_players % 4 != 0:
            raise ValueError("Number of players must be divisible by 4")
        
        matches = []
        players_copy = self.players.copy()
        
        for round_num in range(num_rounds):
            round_matches = []
            
            # Shuffle players for each round
            random.shuffle(players_copy)
            
            # Create matches for this round
            for court in range(self.num_players // 4):
                start_idx = court * 4
                match = {
                    'player1_id': players_copy[start_idx].id,
                    'player2_id': players_copy[start_idx + 1].id,
                    'player3_id': players_copy[start_idx + 2].id,
                    'player4_id': players_copy[start_idx + 3].id,
                    'round': round_num + 1,
                    'court': court + 1
                }
                round_matches.append(match)
            
            matches.extend(round_matches)
        
        return matches
    
    def _rotate_players(self, players: List[User]) -> List[User]:
        """
        Rotate players for round-robin tournament.
        Keep first player fixed, rotate others.
        """
        if len(players) <= 1:
            return players
        
        rotated = [players[0]]  # Keep first player fixed
        rotated.extend(players[2:])  # Add all players except first and second
        rotated.append(players[1])   # Add second player at the end
        
        return rotated
    
    def get_optimal_schedule_type(self) -> str:
        """
        Determine the best schedule type based on number of players and courts.
        """
        if self.num_players < 8:
            return "simple"
        elif self.num_players <= 16:
            return "swiss"
        else:
            return "round_robin"
    
    def generate_schedule(self, schedule_type: str = None) -> List[Dict]:
        """
        Generate schedule based on specified type or auto-detect optimal type.
        
        Args:
            schedule_type: 'simple', 'swiss', 'round_robin', or None for auto-detect
            
        Returns:
            List of matches
        """
        if schedule_type is None:
            schedule_type = self.get_optimal_schedule_type()
        
        if schedule_type == "round_robin":
            return self.generate_round_robin()
        elif schedule_type == "swiss":
            return self.generate_swiss_system()
        elif schedule_type == "simple":
            return self.generate_simple_schedule()
        else:
            raise ValueError(f"Unknown schedule type: {schedule_type}")

def create_matches_for_night(match_night_id: int, players: List[User], 
                           num_courts: int = 1, schedule_type: str = None) -> List[Match]:
    """
    Create Match objects for a match night based on players and schedule type.
    
    Args:
        match_night_id: ID of the match night
        players: List of User objects participating
        num_courts: Number of courts available
        schedule_type: Type of schedule to generate
        
    Returns:
        List of Match objects ready to be saved to database
    """
    generator = ScheduleGenerator(players, num_courts)
    schedule = generator.generate_schedule(schedule_type)
    
    matches = []
    for match_data in schedule:
        match = Match(
            match_night_id=match_night_id,
            player1_id=match_data['player1_id'],
            player2_id=match_data['player2_id'],
            player3_id=match_data['player3_id'],
            player4_id=match_data['player4_id'],
            round=match_data['round'],
            court=match_data['court']
        )
        matches.append(match)
    
    return matches 