import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchNightsAPI } from '../services/api';
import type { MatchNight, CreateMatchNightData } from '../types';
import { ArrowLeft, Calendar, MapPin, Save, Trash2, Clock } from 'lucide-react';

const EditMatchNight = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchNight, setMatchNight] = useState<MatchNight | null>(null);
  const [formData, setFormData] = useState<CreateMatchNightData>({
    date: '',
    time: '19:00',
    location: '',
    num_courts: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchMatchNight();
    }
  }, [id]);

  const fetchMatchNight = async () => {
    try {
      setLoading(true);
      const response = await matchNightsAPI.getById(parseInt(id!));
      const data = response.data;
      setMatchNight(data);
      
      // Parse the datetime to separate date and time
      const dateTime = new Date(data.date);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().slice(0, 5); // Get HH:MM format
      
      // Set form data
      setFormData({
        date: date,
        time: time,
        location: data.location,
        num_courts: data.num_courts,
      });
    } catch (err: any) {
      setError('Fout bij het ophalen van padelavond');
      console.error('Error fetching match night:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'num_courts' ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await matchNightsAPI.update(parseInt(id!), formData);
      navigate(`/match-nights/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het bijwerken van padelavond');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Weet je zeker dat je deze padelavond wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return;
    }

    setError('');
    setDeleting(true);

    try {
      await matchNightsAPI.delete(parseInt(id!));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fout bij het verwijderen van padelavond');
    } finally {
      setDeleting(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Padelavond Bewerken</h1>
        <p className="text-gray-600 mt-1">Wijzig de details van je padelavond</p>
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
              <Clock className="w-4 h-4 inline mr-2" />
              Tijdstip
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required
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

          <div className="flex justify-between space-x-4 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-secondary flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleting ? 'Verwijderen...' : 'Verwijderen'}</span>
            </button>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Opslaan...' : 'Opslaan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMatchNight; 