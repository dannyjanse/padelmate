import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchNightsAPI } from '../services/api';
import type { MatchNight } from '../types';
import { Calendar, MapPin, Users, Plus, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Dashboard = () => {
  const [matchNights, setMatchNights] = useState<MatchNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Beheer je padelavonden</p>
        </div>
        <Link
          to="/match-nights/new"
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nieuwe Avond</span>
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Match nights grid */}
      {matchNights.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Calendar className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen padelavonden</h3>
          <p className="mt-1 text-sm text-gray-500">
            Maak je eerste padelavond aan om te beginnen.
          </p>
          <div className="mt-6">
            <Link
              to="/match-nights/new"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Eerste Avond Aanmaken
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matchNights.map((matchNight) => (
            <div key={matchNight.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDate(matchNight.date)}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {matchNight.location}
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-1" />
                  {matchNight.participants_count}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {matchNight.num_courts} {matchNight.num_courts === 1 ? 'baan' : 'banen'}
                </div>
                <Link
                  to={`/match-nights/${matchNight.id}`}
                  className="text-primary-600 hover:text-primary-700 flex items-center text-sm font-medium"
                >
                  Bekijk details
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 