import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchNightsAPI, authAPI } from '../services/api';
import type { MatchNight } from '../types';
import { Plus, Calendar, MapPin, Users, Play, Database } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matchNights, setMatchNights] = useState<MatchNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [reinitializing, setReinitializing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
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

  const handleReinitializeDatabase = async () => {
    try {
      setReinitializing(true);
      await authAPI.reinitializeDatabase();
      await fetchMatchNights(); // Refresh data
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het opnieuw initialiseren van database');
    } finally {
      setReinitializing(false);
    }
  };

  const handleDebugDatabase = async () => {
    try {
      const response = await authAPI.debugDatabase();
      setDebugInfo(response.data);
      console.log('Debug info:', response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij debug database');
    }
  };

  const handleFixSchema = async () => {
    try {
      setFixingSchema(true);
      await authAPI.fixSchema();
      setError(''); // Clear any previous errors
      // Refresh debug info
      const response = await authAPI.debugDatabase();
      setDebugInfo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het repareren van database schema');
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
          {/* Debug button */}
          <button
            onClick={handleDebugDatabase}
            className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Database className="w-4 h-4" />
            <span>Debug DB</span>
          </button>
          
          {/* Fix Schema button */}
          <button
            onClick={handleFixSchema}
            disabled={fixingSchema}
            className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Database className="w-4 h-4" />
            <span>{fixingSchema ? 'Repareren...' : 'Fix Schema'}</span>
          </button>
          
          {/* Temporary database reinit button */}
          <button
            onClick={handleReinitializeDatabase}
            disabled={reinitializing}
            className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Database className="w-4 h-4" />
            <span>{reinitializing ? 'Reinitialiseren...' : 'DB Reinit'}</span>
          </button>
          
          <button
            onClick={() => navigate('/match-nights/create')}
            className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Padelavond</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Debug info */}
      {debugInfo && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md">
          <h3 className="font-bold mb-2">Debug Database Info:</h3>
          <p>Users: {debugInfo.users_count}</p>
          <p>Match Nights: {debugInfo.match_nights_count}</p>
          <p>Participations: {debugInfo.participations_count}</p>
          <p>Matches: {debugInfo.matches_count}</p>
          {debugInfo.match_nights && debugInfo.match_nights.length > 0 && (
            <div className="mt-2">
              <p className="font-bold">Match Nights:</p>
              {debugInfo.match_nights.map((mn: any, index: number) => (
                <p key={index} className="text-sm">
                  ID: {mn.id}, Date: {mn.date}, Location: {mn.location}
                </p>
              ))}
            </div>
          )}
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
                      {formatDate(matchNight.date)}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{matchNight.location}</span>
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