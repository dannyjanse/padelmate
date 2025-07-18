import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchNightsAPI, authAPI } from '../services/api';
import type { MatchNight, User } from '../types';
import { Plus, Calendar, MapPin, Users, Play, Trophy, Wrench, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matchNights, setMatchNights] = useState<MatchNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [fixingSchema, setFixingSchema] = useState(false);
  const [deletingMatchNight, setDeletingMatchNight] = useState<number | null>(null);
  const [leavingMatchNight, setLeavingMatchNight] = useState<number | null>(null);
  const [showTransferCreatorModal, setShowTransferCreatorModal] = useState(false);
  const [selectedMatchNight, setSelectedMatchNight] = useState<MatchNight | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newCreatorId, setNewCreatorId] = useState<string>('');


  useEffect(() => {
    fetchMatchNights();
    fetchAllUsers();
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

  const fetchAllUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setAllUsers(response.data.users);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const handleFixSchema = async () => {
    try {
      setFixingSchema(true);
      setError('');
      await authAPI.fixSchema();
      alert('Database schema succesvol bijgewerkt! Probeer de pagina te verversen.');
      await fetchMatchNights(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het bijwerken van database schema');
      console.error('Error fixing schema:', err);
    } finally {
      setFixingSchema(false);
    }
  };



  const handleDeleteForAll = async (matchNightId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation
    
    if (!confirm('Weet je zeker dat je deze padelavond wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return;
    }
    
    try {
      setDeletingMatchNight(matchNightId);
      setError('');
      await matchNightsAPI.deleteForAll(matchNightId);
      await fetchMatchNights(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het verwijderen van padelavond');
      console.error('Error deleting match night:', err);
    } finally {
      setDeletingMatchNight(null);
    }
  };

  const handleLeaveMatchNight = async (matchNight: MatchNight, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation
    
    // Check if user is the creator
    const isCreator = matchNight.creator_id === user?.id;
    
    if (isCreator) {
      // Show transfer creator modal
      setSelectedMatchNight(matchNight);
      setShowTransferCreatorModal(true);
    } else {
      // Regular leave
      if (!confirm('Weet je zeker dat je je wilt afmelden voor deze padelavond?')) {
        return;
      }
      
      try {
        setLeavingMatchNight(matchNight.id);
        setError('');
        await matchNightsAPI.leave(matchNight.id);
        await fetchMatchNights(); // Refresh the list
      } catch (err: any) {
        setError(err.response?.data?.error || 'Fout bij het afmelden');
        console.error('Error leaving match night:', err);
      } finally {
        setLeavingMatchNight(null);
      }
    }
  };

  const handleTransferCreatorAndLeave = async () => {
    if (!selectedMatchNight || !newCreatorId) {
      setError('Selecteer een nieuwe creator');
      return;
    }
    
    try {
      setLeavingMatchNight(selectedMatchNight.id);
      setError('');
      await matchNightsAPI.leave(selectedMatchNight.id, parseInt(newCreatorId));
      await fetchMatchNights(); // Refresh the list
      setShowTransferCreatorModal(false);
      setSelectedMatchNight(null);
      setNewCreatorId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het overdragen van creator rechten');
      console.error('Error transferring creator and leaving:', err);
    } finally {
      setLeavingMatchNight(null);
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
        return <Trophy className="w-4 h-4 text-blue-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const getGameStatusText = (gameStatus: string) => {
    switch (gameStatus) {
      case 'active':
        return <span className="text-green-600">Spel actief</span>;
      case 'completed':
        return <span className="text-blue-600">Spel afgerond</span>;
      default:
        return <span className="text-gray-500">Nog niet gestart</span>;
    }
  };

  const getSortedMatchNights = () => {
    return [...matchNights].sort((a, b) => {
      // Priority order: active > not_started > completed
      const getStatusPriority = (status: string) => {
        switch (status) {
          case 'active':
            return 1;
          case 'not_started':
            return 2;
          case 'completed':
            return 3;
          default:
            return 4;
        }
      };

      const aPriority = getStatusPriority(a.game_status);
      const bPriority = getStatusPriority(b.game_status);

      // If different status, sort by priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort by date (newest first for active, oldest first for others)
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      
      if (a.game_status === 'active') {
        // For active games, newest first
        return bDate - aDate;
      } else {
        // For other statuses, oldest first
        return aDate - bDate;
      }
    });
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
            onClick={() => navigate('/match-nights/new')}
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
              onClick={() => navigate('/match-nights/new')}
              className="btn-primary"
            >
              Eerste Padelavond Aanmaken
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getSortedMatchNights().map((matchNight) => (
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
                      {getGameStatusText(matchNight.game_status)}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-1">
                    {/* Leave button - only for not started match nights */}
                    {matchNight.game_status === 'not_started' && (
                      <button
                        onClick={(e) => handleLeaveMatchNight(matchNight, e)}
                        disabled={leavingMatchNight === matchNight.id}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                        title={matchNight.creator_id === user?.id ? "Creator overdragen en afmelden" : "Afmelden"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    

                    
                    {/* Delete button for creators - any status */}
                    {matchNight.creator_id === user?.id && (
                      <button
                        onClick={(e) => handleDeleteForAll(matchNight.id, e)}
                        disabled={deletingMatchNight === matchNight.id}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        title="Verwijder padelavond"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

      {/* Transfer Creator Modal */}
      {showTransferCreatorModal && selectedMatchNight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Creator Overdragen
                </h2>
                <button
                  onClick={() => {
                    setShowTransferCreatorModal(false);
                    setSelectedMatchNight(null);
                    setNewCreatorId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-4">
                  Je bent de creator van deze padelavond. Selecteer een nieuwe creator voordat je je afmeldt.
                </p>
                
                <div className="mb-4">
                  <label htmlFor="new-creator" className="block text-sm font-medium text-gray-700 mb-2">
                    Nieuwe Creator
                  </label>
                  <select
                    id="new-creator"
                    value={newCreatorId}
                    onChange={(e) => setNewCreatorId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecteer een nieuwe creator...</option>
                    {allUsers
                      .filter(user => user.id !== selectedMatchNight.creator_id)
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTransferCreatorModal(false);
                    setSelectedMatchNight(null);
                    setNewCreatorId('');
                  }}
                  className="btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleTransferCreatorAndLeave}
                  disabled={!newCreatorId || leavingMatchNight === selectedMatchNight.id}
                  className="btn-primary"
                >
                  {leavingMatchNight === selectedMatchNight.id ? 'Bezig...' : 'Overdragen en Afmelden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 