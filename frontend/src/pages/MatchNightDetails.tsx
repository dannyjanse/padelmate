import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchNightsAPI } from '../services/api';
import type { MatchNight, Match, User } from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Play,
  Trophy,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const MatchNightDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchNight, setMatchNight] = useState<MatchNight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [joining, setJoining] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMatchNight();
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

  const handleJoin = async () => {
    try {
      setJoining(true);
      await matchNightsAPI.join(parseInt(id!));
      await fetchMatchNight(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het deelnemen');
    } finally {
      setJoining(false);
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
    if (!matchNight?.participants) return false;
    // This would need to be implemented based on current user
    return false;
  };

  const canGenerateSchedule = () => {
    if (!matchNight?.participants) return false;
    const participantCount = matchNight.participants.length;
    return participantCount >= 4 && participantCount % 4 === 0;
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {formatDate(matchNight.date)}
            </h1>
            <div className="flex items-center text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {matchNight.location}
            </div>
          </div>
        </div>
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
      <div className="flex space-x-4">
        {!isParticipating() ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{joining ? 'Deelnemen...' : 'Deelnemen'}</span>
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={joining}
            className="btn-secondary flex items-center space-x-2"
          >
            <span>{joining ? 'Verlaten...' : 'Verlaten'}</span>
          </button>
        )}

        {canGenerateSchedule() && !matchNight.matches?.length && (
          <button
            onClick={handleGenerateSchedule}
            disabled={generatingSchedule}
            className="btn-primary flex items-center space-x-2"
          >
            <Clock className="w-4 h-4" />
            <span>{generatingSchedule ? 'Genereren...' : 'Schema Genereren'}</span>
          </button>
        )}
      </div>

      {/* Participants */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Deelnemers</h2>
        {matchNight.participants && matchNight.participants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchNight.participants.map((participant: User) => (
              <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
                <div className="grid grid-cols-2 gap-4 text-sm">
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