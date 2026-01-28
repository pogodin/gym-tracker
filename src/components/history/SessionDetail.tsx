import { format } from 'date-fns';
import { LoadingSpinner } from '../common';
import { useSession } from '../../database/hooks/useSessions';

interface SessionDetailProps {
  sessionId: number;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const { data: session, isLoading, error } = useSession(sessionId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load workout details</p>
      </div>
    );
  }

  const duration = session.completedAt
    ? Math.round((session.completedAt - session.startedAt) / 1000 / 60)
    : null;

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {session.templateName || 'Workout'}
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Date</span>
            <p className="font-medium">
              {format(new Date(session.startedAt), 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Duration</span>
            <p className="font-medium">
              {duration ? `${duration} min` : 'In progress'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Exercises</span>
            <p className="font-medium">{session.exercises.length}</p>
          </div>
          <div>
            <span className="text-gray-500">Sets</span>
            <p className="font-medium">
              {completedSets} / {totalSets}
            </p>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        {session.exercises.map((exercise) => (
          <div key={exercise.id} className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{exercise.name}</h3>
            <div className="space-y-2">
              {exercise.sets.map((set) => (
                <div
                  key={set.id}
                  className={`flex items-center gap-4 py-2 px-3 rounded ${
                    set.completed ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <span className="w-8 text-center text-sm font-medium text-gray-500">
                    {set.setNumber}
                  </span>
                  <span className="flex-1">
                    {set.weight ? `${set.weight} lbs` : '-'} x{' '}
                    {set.reps ? `${set.reps} reps` : '-'}
                  </span>
                  {set.completed && (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
