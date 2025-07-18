import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchNightsAPI, authAPI, gameSchemasAPI, matchesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { MatchNight, Match, User, GameMode } from '../types';
import {
  ArrowLeft,
  MapPin,
  Users,
  Play,
  Edit,
  Plus,
  X,
  CheckCircle,
  Award,
  RefreshCw,
  Clock,
  Trophy,
  UserPlus,
  UserMinus,
  Crown,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const MatchNightDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [matchNight, setMatchNight] = useState<MatchNight | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [gameStatus, setGameStatus] = useState<any>(null);
  const [loadingGameStatus, setLoadingGameStatus] = useState(true);

  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [completingGame, setCompletingGame] = useState(false);
  const [recalculatingStats, setRecalculatingStats] = useState(false);
  const [fixingSchema, setFixingSchema] = useState(false);


  const [resultData, setResultData] = useState({
    team1_games: 0,
    team2_games: 0,
    winner_ids: [] as number[]
  });

  // Game modes
  const gameModes: GameMode[] = [
    {
      id: 'everyone_vs_everyone',
              name: 'Iedereen met iedereen',
      description: 'Alle spelers spelen tegen elkaar in verschillende combinaties',
      icon: 'Target'
    },
    {
      id: 'king_of_the_court',
      name: 'King of the Court',
      description: 'Winnaars blijven op de baan, verliezers gaan naar de wachtrij',
      icon: 'Crown'
    }
  ];

  useEffect(() => {
    if (id) {
      setLoadingGameStatus(true);
      fetchMatchNight();
      fetchAllUsers();
    }
  }, [id]);

  // Load game status after match night data is loaded
  useEffect(() => {
    if (matchNight && !loading) {
      fetchGameStatus();
    }
  }, [matchNight, loading]);

  const fetchGameStatus = async () => {
    try {
      setLoadingGameStatus(true);
      const response = await gameSchemasAPI.getGameStatus(parseInt(id!));
      setGameStatus(response.data);
    } catch (err: any) {
      console.error('Error fetching game status:', err);
    } finally {
      setLoadingGameStatus(false);
    }
  };





  const handleCompleteGame = async () => {
    if (!matchNight) return;
    
    setCompletingGame(true);
    try {
      const response = await gameSchemasAPI.completeGame(parseInt(id!));
      if (response.status === 200) {
        // Refresh the page to show completed state
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to complete game:', error);
      setError('Failed to complete game');
    } finally {
      setCompletingGame(false);
    }
  };

  const handleRecalculateStats = async () => {
    if (!matchNight) return;
    
    setRecalculatingStats(true);
    try {
      const response = await authAPI.recalculateStats(parseInt(id!));
      if (response.status === 200) {
        // Refresh match night data to show updated stats
        await fetchMatchNight();
        setError('');
      }
    } catch (error) {
      console.error('Failed to recalculate stats:', error);
      setError('Failed to recalculate stats');
    } finally {
      setRecalculatingStats(false);
    }
  };

  const handleFixSchema = async () => {
    setFixingSchema(true);
    try {
      const response = await authAPI.fixSchema();
      if (response.status === 200) {
        // Refresh the page to reload data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to fix schema:', error);
      setError('Failed to fix database schema');
    } finally {
      setFixingSchema(false);
    }
  };



  const handleAddResult = (match: Match) => {
    setSelectedMatch(match);
    
    // Als er al een uitslag is, laad deze
    if (match.result && match.result.score) {
      const scoreParts = match.result.score.split('-');
      const team1Games = parseInt(scoreParts[0]) || 0;
      const team2Games = parseInt(scoreParts[1]) || 0;
      setResultData({ 
        team1_games: team1Games, 
        team2_games: team2Games, 
        winner_ids: match.result.winner_ids || [] 
      });
    } else {
      setResultData({ team1_games: 0, team2_games: 0, winner_ids: [] });
    }
    
    setShowResultModal(true);
  };

  const handleSubmitResult = async () => {
    if (!selectedMatch || (resultData.team1_games === 0 && resultData.team2_games === 0)) {
      setError('Vul de gewonnen games in voor beide teams');
      return;
    }

    // Bepaal winnaars op basis van games
    const winner_ids = [];
    if (resultData.team1_games > resultData.team2_games) {
      winner_ids.push(selectedMatch.player1_id, selectedMatch.player2_id);
    } else if (resultData.team2_games > resultData.team1_games) {
      winner_ids.push(selectedMatch.player3_id, selectedMatch.player4_id);
    }

    const score = `${resultData.team1_games}-${resultData.team2_games}`;

    try {
      setSubmittingResult(true);
      const response = await matchesAPI.submitResult(selectedMatch.id, {
        score: score,
        winner_ids: winner_ids
      });
        
        // Update player stats
        await authAPI.recalculateStats(parseInt(id!));
        
        // Refresh data
        await fetchMatchNight();
        setShowResultModal(false);
        setError('');
        
        // Check if a new match was generated (King of the Court)
        if (response.data.next_match) {
          console.log('New King of the Court match generated:', response.data.next_match);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Fout bij het opslaan van uitslag');
      } finally {
        setSubmittingResult(false);
      }
  };



  const fetchMatchNight = async () => {
    try {
      setLoading(true);
      const response = await matchNightsAPI.getById(parseInt(id!));
      setMatchNight(response.data);
    } catch (err: any) {
      setError('Fout bij het ophalen van padelavond');
      console.error('Error fetching match night:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setAllUsers(response.data.users);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };



  const handleAddParticipant = async () => {
    if (!selectedUserId) {
      setError('Selecteer een gebruiker');
      return;
    }

    try {
      setAddingParticipant(true);
      await matchNightsAPI.addParticipant(parseInt(id!), parseInt(selectedUserId));
      await fetchMatchNight(); // Refresh data
      setSelectedUserId(''); // Reset selection
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het toevoegen van deelnemer');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleRemoveParticipant = async (userId: number) => {
    try {
      await matchNightsAPI.removeParticipant(parseInt(id!), userId);
      await fetchMatchNight(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het verwijderen van deelnemer');
    }
  };



  const handleStartGame = async (gameMode: string) => {
    setStartingGame(true);
    setShowGameModal(false);
    
    try {
      const response = await gameSchemasAPI.startGame(parseInt(id!), gameMode);
      if (response.status === 201) {
        // Refresh data
        await fetchGameStatus();
        await fetchMatchNight();
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het starten van spel');
    } finally {
      setStartingGame(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const dateFormatted = format(date, 'EEEE d MMMM yyyy', { locale: nl });
      const timeFormatted = format(date, 'HH:mm', { locale: nl });
      return `${dateFormatted} om ${timeFormatted}`;
    } catch {
      return dateString;
    }
  };

  const getSortedPlayerStats = () => {
    if (!matchNight?.player_stats) return [];
    
    return [...matchNight.player_stats].sort((a, b) => {
      // Sort by total points (descending)
      return b.total_points - a.total_points;
    });
  };

  const isCreator = () => {
    if (!matchNight || !currentUser) return false;
    return matchNight.creator_id === currentUser.id;
  };



  const isGameCompleted = () => {
    return matchNight?.game_status === 'completed';
  };

  // Filter out users who are already participating
  const availableUsers = allUsers.filter(user => 
    !matchNight?.participants?.some(p => p.id === user.id)
  );

  if (loading || loadingGameStatus) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!matchNight) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Padelavond niet gevonden</h3>
        <p className="text-gray-500 mt-1">De opgevraagde padelavond bestaat niet.</p>
        
        {/* Debug button to fix database schema */}
        <div className="mt-6">
          <button
            onClick={handleFixSchema}
            disabled={fixingSchema}
            className="btn-secondary flex items-center justify-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{fixingSchema ? 'Database repareren...' : 'Database Schema Repareren'}</span>
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Probeer dit als de padelavond niet wordt gevonden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Terug</span>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {formatDateTime(matchNight.date)}
            </h1>
            <div className="flex items-center space-x-4 text-gray-600 mt-1">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm sm:text-base">{matchNight.location}</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span className="text-sm sm:text-base">{matchNight.participants_count} deelnemers</span>
              </div>
              <div className="flex items-center">
                <Play className="w-4 h-4 mr-1" />
                <span className="text-sm sm:text-base">{matchNight.num_courts} baan{matchNight.num_courts > 1 ? 'en' : ''}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            {loadingGameStatus ? (
              <div className="flex items-center space-x-2 bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Laden...</span>
              </div>
            ) : isGameCompleted() ? (
              <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg">
                <Trophy className="w-4 h-4" />
                <span className="font-medium">Spel Afgerond</span>
              </div>
            ) : gameStatus?.game_active ? (
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                <Play className="w-4 h-4" />
                <span className="font-medium">
                  Actief Spel '{gameStatus.game_schema.game_mode === 'everyone_vs_everyone' ? 'Iedereen met iedereen' : 'King of the Court'}'
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Niet Gestart</span>
              </div>
            )}
          </div>
          
          {/* Alleen creator kan bewerken - niet voor afgeronde spellen */}
          {isCreator() && !isGameCompleted() && (
            <button
              onClick={() => navigate(`/match-nights/${id}/edit`)}
              className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Edit className="w-4 h-4" />
              <span>Bewerken</span>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Actions - alleen tonen als spel niet is afgerond */}
      {!isGameCompleted() && (
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Start Padelavond knop - alleen voor creator */}
          {isCreator() && matchNight.participants_count >= 4 && !gameStatus?.game_active && (
            <button
              onClick={() => setShowGameModal(true)}
              disabled={startingGame}
              className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Play className="w-4 h-4" />
              <span>{startingGame ? 'Spel starten...' : 'Start Padelavond'}</span>
            </button>
          )}

          {/* Nieuw Spel Starten button - alleen voor creator */}
          {isCreator() && gameStatus?.game_active && (
            <button
              onClick={() => setShowGameModal(true)}
              disabled={startingGame}
              className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Play className="w-4 h-4" />
              <span>{startingGame ? 'Spel starten...' : 'Nieuw Spel Starten'}</span>
            </button>
          )}

          {/* Spel afronden button - alleen voor creator tijdens actief spel */}
          {isCreator() && gameStatus?.game_active && (
            <button
              onClick={handleCompleteGame}
              disabled={completingGame}
              className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{completingGame ? 'Afronden...' : 'Spel Afronden'}</span>
            </button>
          )}

          {/* Recalculate stats button - alleen voor creator als er uitslagen zijn */}
          {isCreator() && matchNight.matches && matchNight.matches.some(match => match.result) && (
            <button
              onClick={handleRecalculateStats}
              disabled={recalculatingStats}
              className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{recalculatingStats ? 'Herberekenen...' : 'Herbereken Stand'}</span>
            </button>
          )}




        </div>
      )}

      {/* Player Stats Section - alleen tijdens actief of afgerond spel */}
      {(gameStatus?.game_active || matchNight?.game_status === 'completed') && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Spelstanden
          </h2>
          {getSortedPlayerStats().length > 0 ? (
            <div className="space-y-3">
              {getSortedPlayerStats().map((stat, index) => (
                <div key={stat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{stat.user_name}</p>
                      <p className="text-sm text-gray-500">
                        {gameStatus?.game_schema?.game_mode === 'king_of_the_court' ? 'Gewonnen wedstrijden' : 'Totaal punten gescoord'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">
                      {stat.total_points}
                    </p>
                    <p className="text-xs text-gray-500">
                      {gameStatus?.game_schema?.game_mode === 'king_of_the_court' ? 'wedstrijden' : 'punten'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Nog geen uitslagen ingevoerd
            </p>
          )}
        </div>
      )}

      {/* Add Participant Section - alleen voor creator, niet tijdens actief spel of afgeronde spellen */}
      {isCreator() && !gameStatus?.game_active && !isGameCompleted() && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Deelnemer Toevoegen</h2>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
                Selecteer Gebruiker
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-field w-full"
                disabled={availableUsers.length === 0}
              >
                <option value="">Kies een gebruiker...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddParticipant}
              disabled={!selectedUserId || addingParticipant || availableUsers.length === 0}
              className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>{addingParticipant ? 'Toevoegen...' : 'Toevoegen'}</span>
            </button>
          </div>
          {availableUsers.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Alle gebruikers zijn al toegevoegd aan deze avond.</p>
          )}
        </div>
      )}

      {/* Participants - alleen zichtbaar als er geen actief spel is en niet afgerond */}
      {!gameStatus?.game_active && !isGameCompleted() && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Deelnemers</h2>
          {matchNight.participants && matchNight.participants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchNight.participants.map((participant: User) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{participant.name}</p>
                      <p className="text-sm text-gray-500">{participant.email}</p>
                    </div>
                  </div>
                  {/* Alleen creator kan deelnemers verwijderen - niet voor afgeronde spellen */}
                  {isCreator() && !isGameCompleted() && (
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Verwijder deelnemer"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nog geen deelnemers</p>
          )}
        </div>
      )}



      {/* Matches - alleen tonen als er wedstrijden zijn */}
      {matchNight.matches && matchNight.matches.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Wedstrijden</h2>
          
          <div className="space-y-4">
            {matchNight.matches.map((match: Match) => (
              <div key={match.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Ronde {match.round} - Baan {match.court}
                    </span>
                    {match.is_naai_partij && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                        NAAI-PARTIJ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {match.result && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-green-600">
                          <Trophy className="w-4 h-4 mr-1" />
                          <span className="text-sm">Voltooid</span>
                        </div>
                        {/* Alleen creator kan bewerken - niet voor afgeronde spellen */}
                        {isCreator() && !isGameCompleted() && (
                          <button
                            onClick={() => handleAddResult(match)}
                            className="btn-secondary flex items-center space-x-1 text-xs"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Bewerken</span>
                          </button>
                        )}
                      </div>
                    )}
                    {!match.result && isCreator() && !isGameCompleted() && (
                      <button
                        onClick={() => handleAddResult(match)}
                        className="btn-primary flex items-center space-x-1 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Uitslag</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Team 1</p>
                    <p className="text-gray-600">
                      {match.player1_name || match.player1?.name || 'Onbekend'} & {match.player2_name || match.player2?.name || 'Onbekend'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Team 2</p>
                    <p className="text-gray-600">
                      {match.player3_name || match.player3?.name || 'Onbekend'} & {match.player4_name || match.player4?.name || 'Onbekend'}
                    </p>
                  </div>
                </div>
                {match.result && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <p className="text-sm text-green-800">
                      Score: {match.result.score}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {gameStatus?.game_active ? 'Nieuw Spel Starten' : 'Kies Speltype'}
                </h2>
                <button
                  onClick={() => setShowGameModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {gameStatus?.game_active && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Let op:</strong> Het starten van een nieuw spel zal alle bestaande resultaten wissen.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {gameModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleStartGame(mode.id)}
                    disabled={startingGame}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        {mode.icon === 'Target' ? (
                          <Target className="w-5 h-5 text-primary-600" />
                        ) : (
                          <Crown className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{mode.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{mode.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowGameModal(false)}
                  className="btn-secondary"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedMatch?.result ? 'Uitslag Bewerken' : 'Uitslag Invoeren'}
                </h2>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Match Info */}
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Ronde {selectedMatch.round} - Baan {selectedMatch.court}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Team 1</p>
                      <p className="text-gray-600">
                        {selectedMatch.player1_name || selectedMatch.player1?.name || 'Onbekend'} & {selectedMatch.player2_name || selectedMatch.player2?.name || 'Onbekend'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Team 2</p>
                      <p className="text-gray-600">
                        {selectedMatch.player3_name || selectedMatch.player3?.name || 'Onbekend'} & {selectedMatch.player4_name || selectedMatch.player4?.name || 'Onbekend'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Games Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="team1_games" className="block text-sm font-medium text-gray-700 mb-2">
                      Team 1 Games
                    </label>
                    <input
                      type="number"
                      id="team1_games"
                      min="0"
                      max="10"
                      value={resultData.team1_games}
                      onChange={(e) => setResultData(prev => ({ 
                        ...prev, 
                        team1_games: parseInt(e.target.value) || 0 
                      }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="team2_games" className="block text-sm font-medium text-gray-700 mb-2">
                      Team 2 Games
                    </label>
                    <input
                      type="number"
                      id="team2_games"
                      min="0"
                      max="10"
                      value={resultData.team2_games}
                      onChange={(e) => setResultData(prev => ({ 
                        ...prev, 
                        team2_games: parseInt(e.target.value) || 0 
                      }))}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                {/* Score Preview */}
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm font-medium text-blue-900 mb-1">Score Preview:</p>
                  <p className="text-lg font-bold text-blue-800">
                    {resultData.team1_games} - {resultData.team2_games}
                  </p>
                  {resultData.team1_games > resultData.team2_games && (
                    <p className="text-sm text-green-600 mt-1">Team 1 wint</p>
                  )}
                  {resultData.team2_games > resultData.team1_games && (
                    <p className="text-sm text-green-600 mt-1">Team 2 wint</p>
                  )}
                  {resultData.team1_games === resultData.team2_games && resultData.team1_games > 0 && (
                    <p className="text-sm text-orange-600 mt-1">Gelijkspel</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSubmitResult}
                  disabled={submittingResult || (resultData.team1_games === 0 && resultData.team2_games === 0)}
                  className="btn-primary"
                >
                  {submittingResult ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MatchNightDetails; 