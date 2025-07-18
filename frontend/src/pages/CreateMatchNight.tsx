import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchNightsAPI, authAPI } from '../services/api';
import type { CreateMatchNightData, User } from '../types';
import { ArrowLeft, Calendar, MapPin, Users, X, Check } from 'lucide-react';

const CreateMatchNight = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateMatchNightData>({
    date: '',
    time: '19:00',  // Default time
    location: '',
    num_courts: 1,
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-select-dropdown')) {
        setShowUserSelect(false);
      }
    };

    if (showUserSelect) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserSelect]);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await authAPI.getAllUsers();
      setAllUsers(response.data.users);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'num_courts' ? parseInt(value) : value,
    });
  };

  const handleUserToggle = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const removeSelectedUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await matchNightsAPI.create(formData);
      const matchNightId = response.data.match_night.id;
      
      // Add selected users to the match night
      for (const user of selectedUsers) {
        try {
          await matchNightsAPI.addParticipant(matchNightId, user.id);
        } catch (err) {
          console.error(`Failed to add user ${user.name}:`, err);
        }
      }
      
      navigate(`/match-nights/${matchNightId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het aanmaken van padelavond');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Nieuwe Padelavond</h1>
        <p className="text-gray-600 mt-1">Plan een nieuwe padelavond</p>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Datum
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              className="input-field"
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Tijdstip
            </label>
            <input
              id="time"
              name="time"
              type="time"
              className="input-field"
              value={formData.time}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Locatie
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              className="input-field"
              placeholder="Bijv. Padelcentrum Amsterdam"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="num_courts" className="block text-sm font-medium text-gray-700 mb-2">
              Aantal banen
            </label>
            <select
              id="num_courts"
              name="num_courts"
              className="input-field"
              value={formData.num_courts}
              onChange={handleChange}
            >
              <option value={1}>1 baan</option>
              <option value={2}>2 banen</option>
              <option value={3}>3 banen</option>
              <option value={4}>4 banen</option>
            </select>
          </div>

          {/* Multi-select for users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Deelnemers toevoegen
            </label>
            
            {/* Selected users display */}
            {selectedUsers.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Geselecteerde deelnemers:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{user.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedUser(user.id)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User selection dropdown */}
            <div className="relative user-select-dropdown">
              <button
                type="button"
                onClick={() => setShowUserSelect(!showUserSelect)}
                className="w-full input-field text-left flex items-center justify-between"
              >
                <span className={selectedUsers.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedUsers.length > 0 
                    ? `${selectedUsers.length} deelnemer${selectedUsers.length > 1 ? 's' : ''} geselecteerd`
                    : 'Selecteer deelnemers...'
                  }
                </span>
                <span className="text-gray-400">▼</span>
              </button>

              {showUserSelect && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-gray-500">
                      Laden...
                    </div>
                  ) : (
                    <div className="py-1">
                      {allUsers.map((user) => {
                        const isSelected = selectedUsers.some(u => u.id === user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleUserToggle(user)}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 ${
                              isSelected ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                            <span className={isSelected ? 'font-medium' : ''}>
                              {user.name}
                            </span>
                            {!isSelected && <div className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              Je kunt ook later deelnemers toevoegen via de padelavond pagina
            </p>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Aanmaken...' : 'Padelavond Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMatchNight; 