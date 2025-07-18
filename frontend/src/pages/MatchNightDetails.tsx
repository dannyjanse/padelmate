import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchNightsAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { MatchNight, Match, User } from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users,
  Play,
  Trophy,
  Clock,
  UserPlus,
  UserMinus,
  Edit,
  LogOut
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
  const [joining, setJoining] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMatchNight();
      fetchAllUsers();
    }
  }, [id]);

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

  const handleLeave = async () => {
    try {
      setJoining(true);
      await matchNightsAPI.leave(parseInt(id!));
      await fetchMatchNight(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het verlaten');
    } finally {
      setJoining(false);
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

  const handleGenerateSchedule = async () => {
    try {
      setGeneratingSchedule(true);
      await matchNightsAPI.generateSchedule(parseInt(id!));
      await fetchMatchNight(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het genereren van schema');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE d MMMM yyyy', { locale: nl });
    } catch {
      return dateString;
    }
  };

  const isParticipating = () => {
    if (!matchNight?.participants || !currentUser) return false;
    return matchNight.participants.some(p => p.id === currentUser.id);
  };

  const isCreator = () => {
    if (!matchNight || !currentUser) return false;
    return matchNight.creator_id === currentUser.id;
  };

  const canGenerateSchedule = () => {
    if (!matchNight?.participants) return false;
    const participantCount = matchNight.participants.length;
    return participantCount >= 4 && participantCount % 4 === 0;
  };

  // Filter out users who are already participating
  const availableUsers = allUsers.filter(user => 
    !matchNight?.participants?.some(p => p.id === user.id)
  );

  if (loading) {
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
              {formatDate(matchNight.date)}
            </h1>
            <div className="flex items-center text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm sm:text-base">{matchNight.location}</span>
            </div>
          </div>
        </div>
        
        {/* Alleen creator kan bewerken */}
        {isCreator() && (
          <button
            onClick={() => navigate(`/match-nights/${id}/edit`)}
            className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Edit className="w-4 h-4" />
            <span>Bewerken</span>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-primary-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Datum</p>
              <p className="text-sm text-gray-500">{formatDate(matchNight.date)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-primary-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Deelnemers</p>
              <p className="text-sm text-gray-500">{matchNight.participants_count}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Play className="w-5 h-5 text-primary-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Banen</p>
              <p className="text-sm text-gray-500">{matchNight.num_courts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Afmeld knop - alleen voor deelnemers */}
        {isParticipating() && (
          <button
            onClick={handleLeave}
            disabled={joining}
            className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>{joining ? 'Afmelden...' : 'Afmelden'}</span>
          </button>
        )}

        {/* Schema genereren - alleen voor creator */}
        {isCreator() && canGenerateSchedule() && !matchNight.matches?.length && (
          <button
            onClick={handleGenerateSchedule}
            disabled={generatingSchedule}
            className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Clock className="w-4 h-4" />
            <span>{generatingSchedule ? 'Genereren...' : 'Schema Genereren'}</span>
          </button>
        )}
      </div>

      {/* Add Participant Section - alleen voor creator */}
      {isCreator() && (
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

      {/* Participants */}
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
                {/* Alleen creator kan deelnemers verwijderen */}
                {isCreator() && (
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

      {/* Matches */}
      {matchNight.matches && matchNight.matches.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Wedstrijden</h2>
          <div className="space-y-4">
            {matchNight.matches.map((match: Match) => (
              <div key={match.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Ronde {match.round} - Baan {match.court}
                  </span>
                  {match.result && (
                    <div className="flex items-center text-green-600">
                      <Trophy className="w-4 h-4 mr-1" />
                      <span className="text-sm">Voltooid</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Team 1</p>
                    <p className="text-gray-600">
                      {match.player1?.name} & {match.player2?.name}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Team 2</p>
                    <p className="text-gray-600">
                      {match.player3?.name} & {match.player4?.name}
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
    </div>
  );
};

export default MatchNightDetails; 