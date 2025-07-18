import { useState } from 'react';
import { authAPI } from '../services/api';

const DatabaseSetup = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const createTables = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await authAPI.createTables();
      setMessage(response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create tables');
    } finally {
      setLoading(false);
    }
  };

  const fixMatchNights = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await authAPI.fixMatchNights();
      setMessage(response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fix match_nights table');
    } finally {
      setLoading(false);
    }
  };

  const testDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await authAPI.testDatabase();
      setMessage(`${response.data.message} - Tables: ${response.data.tables?.join(', ') || 'None'}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to test database');
    } finally {
      setLoading(false);
    }
  };

  const testUser = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await authAPI.testUser();
      setMessage(`User: ${response.data.user.name} - Created: ${response.data.created_match_nights} - Participations: ${response.data.participations}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to test user');
    } finally {
      setLoading(false);
    }
  };

  const checkDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await authAPI.checkDatabase();
      const users = response.data.users || [];
      const userList = users.map((user: any) => 
        `${user.name} (${user.email})`
      ).join('\n');
      
      setMessage(`${response.data.message} - Users: ${response.data.user_count}\n\nUser list:\n${userList}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check database');
    } finally {
      setLoading(false);
    }
  };

  const initDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await authAPI.initDatabase();
      setMessage(response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize database');
    } finally {
      setLoading(false);
    }
  };

  const addUsers = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      const response = await authAPI.addUsers();
      setMessage(response.data.message + '\nNieuwe users: ' + response.data.new_users.join(', ') + '\nBestaande users: ' + response.data.existing_users.join(', '));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Database Setup</h1>
      
      <div className="space-y-4">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Database Operations</h2>
          
          <div className="space-y-3">
            <button
              onClick={testDatabase}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Testing...' : 'Test Database Connection'}
            </button>
            
            <button
              onClick={testUser}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Testing...' : 'Test Current User'}
            </button>
            
            <button
              onClick={checkDatabase}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Checking...' : 'Check Database Users'}
            </button>
            
            <button
              onClick={createTables}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating...' : 'Create Database Tables'}
            </button>
            
            <button
              onClick={fixMatchNights}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Fixing...' : 'Fix Match Nights Table'}
            </button>
            
            <button
              onClick={initDatabase}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Initializing...' : 'Initialize Database with Test Data'}
            </button>

            <button
              onClick={addUsers}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Toevoegen...' : 'Voeg 5 vaste users toe'}
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSetup; 