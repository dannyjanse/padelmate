import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchNightsAPI } from '../services/api';
import type { CreateMatchNightForm } from '../types';

const CreateMatchNight: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateMatchNightForm>({
    date: '',
    location: '',
    num_courts: 1,
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
      console.log('Match night created:', response.data);
      
      // Redirect to the new match night
      navigate(`/match-night/${response.data.match_night.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create match night');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Nieuwe Speelavond
            </h2>
            <p className="text-gray-600">
              Plan een nieuwe padel speelavond
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Datum
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                min={getMinDate()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Locatie
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                placeholder="bijv. Padel Club Amsterdam"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="num_courts" className="block text-sm font-medium text-gray-700 mb-1">
                Aantal Banen
              </label>
              <select
                id="num_courts"
                name="num_courts"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.num_courts}
                onChange={handleChange}
              >
                <option value={1}>1 baan</option>
                <option value={2}>2 banen</option>
                <option value={3}>3 banen</option>
                <option value={4}>4 banen</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Aanmaken...' : 'Speelavond Aanmaken'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMatchNight; 