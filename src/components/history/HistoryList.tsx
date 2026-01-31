import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LoadingSpinner } from '../common';
import { useCompletedSessions } from '../../database/hooks/useSessions';
import type { WorkoutSession } from '../../types';

interface SessionWithTemplate extends WorkoutSession {
  templateName: string;
}

export function HistoryList() {
  const navigate = useNavigate();
  const { data: sessions, isLoading, error } = useCompletedSessions();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load workout history</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No completed workouts yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Complete a workout to see it here
        </p>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const date = format(new Date(session.completedAt!), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, SessionWithTemplate[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedSessions).map(([date, daySessions]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="space-y-2">
            {daySessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full bg-white rounded-lg shadow-sm p-4 text-left hover:shadow-md transition-shadow"
                aria-label={`session-${session.templateName}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {session.templateName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {format(new Date(session.startedAt), 'h:mm a')} -{' '}
                      {format(new Date(session.completedAt!), 'h:mm a')}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
