import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchNightsAPI } from '../services/api';
import type { CreateMatchNightData } from '../types';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';

const CreateMatchNight = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateMatchNightData>({
    date: '',
    time: '19:00',  // Default time
    location: '',
    num_courts: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

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
    setLoading(true);

    try {
      const response = await matchNightsAPI.create(formData);
      navigate(`/match-nights/${response.data.match_night.id}`);
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