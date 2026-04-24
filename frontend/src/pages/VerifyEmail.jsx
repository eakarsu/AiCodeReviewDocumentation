import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/api';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (token) {
      authApi.verifyEmail(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <svg className="animate-spin mx-auto h-12 w-12 text-primary-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Verified!</h2>
              <p className="text-sm text-gray-500 mb-4">Your email has been successfully verified.</p>
              <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
              <p className="text-sm text-gray-500 mb-4">The verification link is invalid or has expired.</p>
              <Link to="/login" className="btn btn-primary">Back to Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
