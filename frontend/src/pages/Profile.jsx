import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authApi } from '../services/api';

function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    authApi.getApiKeys().then(setApiKeys).catch(() => {});
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    setChangingPassword(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      showToast('Password changed successfully', 'success');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName) return;
    try {
      const key = await authApi.createApiKey({ name: newKeyName, expires_in_days: 90 });
      showToast(`API key created. Key: ${key.raw_key} (save this now, it won't be shown again)`, 'success', 10000);
      setApiKeys(prev => [key, ...prev]);
      setNewKeyName('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteApiKey = async (id) => {
    try {
      await authApi.deleteApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showToast('API key deleted', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await authApi.setup2FA();
      setTwoFactorSetup(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await authApi.enable2FA(twoFactorCode);
      showToast('2FA enabled successfully', 'success');
      updateUser({ two_factor_enabled: true });
      setTwoFactorSetup(null);
      setTwoFactorCode('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDisable2FA = async () => {
    const password = prompt('Enter your password to disable 2FA:');
    if (!password) return;
    try {
      await authApi.disable2FA(password);
      showToast('2FA disabled', 'success');
      updateUser({ two_factor_enabled: false });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your account settings and security</p>
      </div>

      {/* User Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              {user?.role || 'viewer'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="input" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input" />
          </div>
          <button type="submit" disabled={changingPassword} className="btn btn-primary">
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* 2FA */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h2>
        {user?.two_factor_enabled ? (
          <div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              2FA is enabled
            </p>
            <button onClick={handleDisable2FA} className="btn btn-danger text-sm">Disable 2FA</button>
          </div>
        ) : twoFactorSetup ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Add this secret to your authenticator app:</p>
            <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono break-all">{twoFactorSetup.secret}</code>
            <div className="flex items-center gap-3">
              <input type="text" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="Enter 6-digit code" className="input max-w-[180px]" />
              <button onClick={handleEnable2FA} className="btn btn-primary">Verify & Enable</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Add an extra layer of security to your account.</p>
            <button onClick={handleSetup2FA} className="btn btn-primary text-sm">Setup 2FA</button>
          </div>
        )}
      </div>

      {/* API Keys */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Keys</h2>
        <div className="flex items-center gap-3 mb-4">
          <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name" className="input flex-1" />
          <button onClick={handleCreateApiKey} className="btn btn-primary text-sm">Create Key</button>
        </div>
        {apiKeys.length > 0 ? (
          <div className="space-y-2">
            {apiKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created {new Date(key.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDeleteApiKey(key.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No API keys yet.</p>
        )}
      </div>
    </div>
  );
}

export default Profile;
