import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchNightsAPI } from '../services/api';
import type { MatchNight, User } from '../types';

const MatchNightDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      setError('Failed to load match night details');
      console.error('Error fetching match night:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!id) return;
    
    try {
      setJoining(true);
      await matchNightsAPI.join(parseInt(id));
      await fetchMatchNight(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join match night');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    
    try {
      setJoining(true);
      await matchNightsAPI.leave(parseInt(id));
      await fetchMatchNight(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to leave match night');
    } finally {
      setJoining(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!id) return;
    
    try {
      setGeneratingSchedule(true);
      await matchNightsAPI.generateSchedule(parseInt(id));
      await fetchMatchNight(); // Refresh data to show matches
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate schedule');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const isParticipating = () => {
    return matchNight?.participants?.some(p => p.id === user?.id) || false;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!matchNight) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Match Night Not Found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-indigo-600 hover:text-indigo-800 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {matchNight.location}
              </h1>
              <p className="text-gray-600">{formatDate(matchNight.date)}</p>
            </div>
            <div className="flex items-center space-x-4">
              {!isParticipating() ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Deelnemen'}
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {joining ? 'Leaving...' : 'Uitschrijven'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Match Night Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Locatie</h3>
              <p className="text-gray-600">{matchNight.location}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Datum</h3>
              <p className="text-gray-600">{formatDate(matchNight.date)}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Banen</h3>
              <p className="text-gray-600">{matchNight.num_courts} baan{matchNight.num_courts > 1 ? 'en' : ''}</p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Deelnemers ({matchNight.participants?.length || 0})
            </h2>
          </div>
          
          {!matchNight.participants || matchNight.participants.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Nog geen deelnemers</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {matchNight.participants.map((participant: User) => (
                <div key={participant.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {participant.name}
                      </h3>
                      <p className="text-gray-600">{participant.email}</p>
                    </div>
                    {participant.id === user?.id && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Jij
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Speelschema
              </h2>
              {matchNight.participants && matchNight.participants.length >= 4 && (
                <button
                  onClick={handleGenerateSchedule}
                  disabled={generatingSchedule || (matchNight.matches && matchNight.matches.length > 0)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generatingSchedule ? 'Generating...' : 'Schema Genereren'}
                </button>
              )}
            </div>
          </div>
          
          {!matchNight.matches || matchNight.matches.length === 0 ? (
            <div className="px-6 py-8 text-center">
              {matchNight.participants && matchNight.participants.length < 4 ? (
                <p className="text-gray-500">
                  Minimaal 4 deelnemers nodig om schema te genereren
                </p>
              ) : (
                <p className="text-gray-500">
                  Klik "Schema Genereren" om het speelschema te maken
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {matchNight.matches.map((match) => (
                <div key={match.id} className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Ronde {match.round} - Baan {match.court}
                      </h3>
                      <p className="text-gray-600">
                        Spelers: {match.player1_id}, {match.player2_id}, {match.player3_id}, {match.player4_id}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/match/${match.id}`)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Bekijk Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MatchNightDetail; 