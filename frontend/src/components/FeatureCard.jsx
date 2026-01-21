import { Link } from 'react-router-dom';

function FeatureCard({ title, description, icon, color, path, count, loading }) {
  return (
    <Link
      to={path}
      className="card p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className={`${color} p-3 rounded-xl text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? (
            <span className="inline-block w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            `${count || 0} items`
          )}
        </span>
        <span className="text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          View
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default FeatureCard;
