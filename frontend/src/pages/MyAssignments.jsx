// My Assignments Page - View and manage assigned reviews
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentsApi, codeReviewsApi } from '../services/api';
import { SeverityScore } from '../components/SeverityBadge';
import DetailModal from '../components/DetailModal';

const priorityColors = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [filter, setFilter] = useState('all');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get user email from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        setUserEmail(parsed.email || '');
      } catch {}
    }
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await assignmentsApi.getAll();
      setAssignments(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await assignmentsApi.update(id, { status });
      fetchAssignments();
      if (selectedAssignment?.id === id) {
        setSelectedAssignment({ ...selectedAssignment, status });
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'mine') return a.assigned_to === userEmail;
    return a.status === filter;
  });

  const stats = {
    pending: assignments.filter(a => a.status === 'pending').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Assignments</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track and manage code review assignments
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Assignments</option>
          {userEmail && <option value="mine">My Assignments</option>}
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No assignments found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAssignments.map(assignment => (
              <div
                key={assignment.id}
                onClick={() => setSelectedAssignment(assignment)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[assignment.priority]}`}>
                        {assignment.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[assignment.status]}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                      {assignment.language && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{assignment.language}</span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {assignment.review_title || `Review #${assignment.review_id}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Assigned to: {assignment.assigned_to}
                      {assignment.due_date && (
                        <span className="ml-3">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  {assignment.severity_score && (
                    <SeverityScore score={assignment.severity_score} size="small" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title={selectedAssignment?.review_title || 'Assignment Details'}
        actions={
          <div className="flex gap-2">
            {selectedAssignment?.status === 'pending' && (
              <button
                onClick={() => handleUpdateStatus(selectedAssignment.id, 'in_progress')}
                className="btn btn-primary"
              >
                Start Review
              </button>
            )}
            {selectedAssignment?.status === 'in_progress' && (
              <button
                onClick={() => handleUpdateStatus(selectedAssignment.id, 'completed')}
                className="btn btn-success"
              >
                Mark Complete
              </button>
            )}
            <Link
              to="/code-reviews"
              className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              View Review
            </Link>
          </div>
        }
      >
        {selectedAssignment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Assigned To</h4>
                <p className="text-gray-900 dark:text-white">{selectedAssignment.assigned_to}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Assigned By</h4>
                <p className="text-gray-900 dark:text-white">{selectedAssignment.assigned_by || '-'}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Priority</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[selectedAssignment.priority]}`}>
                  {selectedAssignment.priority}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Status</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selectedAssignment.status]}`}>
                  {selectedAssignment.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            {selectedAssignment.due_date && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Due Date</h4>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedAssignment.due_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {selectedAssignment.notes && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</h4>
                <p className="text-gray-900 dark:text-white">{selectedAssignment.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default MyAssignments;
