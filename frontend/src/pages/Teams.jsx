// Teams Page - Team management and member administration
import { useState, useEffect, useCallback } from 'react';

import { teamsApi } from '../services/api';
import DetailModal from '../components/DetailModal';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [memberData, setMemberData] = useState({ email: '', name: '', role: 'member' });
  const [formLoading, setFormLoading] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchTeams = useCallback(async () => {
    try {
      const result = await teamsApi.getAll({ page: pagination.page, limit: pagination.limit, search });
      setTeams(result.data || []);
      setPagination(prev => ({ ...prev, ...result.pagination }));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const fetchTeamDetails = async (id) => {
    try {
      const data = await teamsApi.getById(id);
      setSelectedTeam(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await teamsApi.create(formData);
      setShowNewForm(false);
      setFormData({ name: '', description: '' });
      showToast('Team created', 'success');
      fetchTeams();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async (id) => {
    const confirmed = await confirm('Delete this team?', { title: 'Delete Team', confirmLabel: 'Delete' });
    if (!confirmed) return;
    try {
      await teamsApi.delete(id);
      setSelectedTeam(null);
      showToast('Team deleted', 'success');
      fetchTeams();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await teamsApi.addMember(selectedTeam.id, memberData);
      setShowAddMember(false);
      setMemberData({ email: '', name: '', role: 'member' });
      showToast('Member added', 'success');
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const confirmed = await confirm('Remove this member?', { title: 'Remove Member', confirmLabel: 'Remove' });
    if (!confirmed) return;
    try {
      await teamsApi.removeMember(selectedTeam.id, memberId);
      showToast('Member removed', 'success');
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage review teams and members
          </p>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Team
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search teams..." />
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Create your first team to organize code reviewers."
          action={{ label: 'Create Team', onClick: () => setShowNewForm(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div
              key={team.id}
              onClick={() => fetchTeamDetails(team.id)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {team.member_count || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Detail Modal */}
      <DetailModal
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        title={selectedTeam?.name}
        actions={
          <>
            <button onClick={() => handleDeleteTeam(selectedTeam?.id)} className="btn btn-danger">
              Delete
            </button>
            <button onClick={() => setShowAddMember(true)} className="btn btn-primary">
              Add Member
            </button>
          </>
        }
      >
        {selectedTeam && (
          <div className="space-y-6">
            {selectedTeam.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4>
                <p className="text-gray-900 dark:text-white">{selectedTeam.description}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Members ({selectedTeam.members?.length || 0})
              </h4>
              {selectedTeam.members?.length > 0 ? (
                <div className="space-y-2">
                  {selectedTeam.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                          {member.role}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No members yet</p>
              )}
            </div>
          </div>
        )}
      </DetailModal>

      {/* New Team Modal */}
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Team">
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowNewForm(false)} className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={formLoading} className="btn btn-primary">
              {formLoading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </DetailModal>

      {/* Add Member Modal */}
      <DetailModal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={memberData.email}
              onChange={(e) => setMemberData({ ...memberData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={memberData.name}
              onChange={(e) => setMemberData({ ...memberData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={memberData.role}
              onChange={(e) => setMemberData({ ...memberData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddMember(false)} className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={formLoading} className="btn btn-primary">
              {formLoading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}

export default Teams;
