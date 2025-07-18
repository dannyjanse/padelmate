import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchNightsAPI, authAPI } from '../services/api';
import type { MatchNight } from '../types';
import { Plus, Calendar, MapPin, Users, Play, Database, Trophy, CheckCircle, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matchNights, setMatchNights] = useState<MatchNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [fixingSchema, setFixingSchema] = useState(false);


  useEffect(() => {
    fetchMatchNights();
  }, []);

  const fetchMatchNights = async () => {
    try {
      setLoading(true);
      const response = await matchNightsAPI.getAll();
      setMatchNights(response.data.match_nights);
    } catch (err: any) {
      setError('Fout bij het ophalen van padelavonden');
      console.error('Error fetching match nights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFixSchema = async () => {
    try {
      setFixingSchema(true);
      setError('');
      const response = await authAPI.fixSchema();
      console.log('Schema fix response:', response.data);
      alert('Database schema succesvol bijgewerkt! Probeer de pagina te verversen.');
      await fetchMatchNights(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het bijwerken van database schema');
      console.error('Error fixing schema:', err);
    } finally {
      setFixingSchema(false);
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

  const getGameStatusIcon = (gameStatus: string) => {
    switch (gameStatus) {
      case 'active':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'completed':
        return <Trophy className="w-4 h-4 text-yellow-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const getGameStatusText = (gameStatus: string) => {
    switch (gameStatus) {
      case 'active':
        return 'Spel actief';
      case 'completed':
        return 'Spel afgerond';
      default:
        return 'Nog niet gestart';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welkom, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">Beheer je padelavonden</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => navigate('/match-nights/create')}
            className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Padelavond</span>
          </button>
          
          {/* Debug knop - alleen zichtbaar als er een fout is */}
          {error && (
            <button
              onClick={handleFixSchema}
              disabled={fixingSchema}
              className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Wrench className="w-4 h-4" />
              <span>{fixingSchema ? 'Bezig...' : 'Fix Database'}</span>
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



      {/* Match Nights */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Padelavonden</h2>
        
        {matchNights.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen padelavonden</h3>
            <p className="text-gray-500 mb-4">Maak je eerste padelavond aan om te beginnen</p>
            <button
              onClick={() => navigate('/match-nights/create')}
              className="btn-primary"
            >
              Eerste Padelavond Aanmaken
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchNights.map((matchNight) => (
              <div
                key={matchNight.id}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/match-nights/${matchNight.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {formatDateTime(matchNight.date)}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{matchNight.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      {getGameStatusIcon(matchNight.game_status)}
                      <span className="ml-1">{getGameStatusText(matchNight.game_status)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{matchNight.participants_count} deelnemers</span>
                    </div>
                    <div className="flex items-center">
                      <Play className="w-4 h-4 mr-1" />
                      <span>{matchNight.num_courts} baan{matchNight.num_courts > 1 ? 'en' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 