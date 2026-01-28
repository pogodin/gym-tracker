import { useState, useEffect } from 'react';
import type { SessionSet, UpdateSessionSet } from '../../types';

interface SetRowProps {
  set: SessionSet;
  onUpdate: (data: UpdateSessionSet) => void;
  onDelete: () => void;
}

export function SetRow({ set, onUpdate, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(set.weight?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');

  // Sync local state when set prop changes
  useEffect(() => {
    setWeight(set.weight?.toString() ?? '');
    setReps(set.reps?.toString() ?? '');
  }, [set.weight, set.reps]);

  const handleWeightBlur = () => {
    const numWeight = weight ? parseFloat(weight) : null;
    if (numWeight !== set.weight) {
      onUpdate({ id: set.id, weight: numWeight });
    }
  };

  const handleRepsBlur = () => {
    const numReps = reps ? parseInt(reps, 10) : null;
    if (numReps !== set.reps) {
      onUpdate({ id: set.id, reps: numReps });
    }
  };

  const toggleCompleted = () => {
    onUpdate({ id: set.id, completed: !set.completed });
  };

  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-lg ${set.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
      <span className="w-8 text-center text-sm font-medium text-gray-500">
        {set.setNumber}
      </span>

      <div className="flex-1 flex items-center gap-2">
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleWeightBlur}
          placeholder="0"
          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          step="0.5"
        />
        <span className="text-sm text-gray-500">lbs</span>

        <span className="text-gray-300 mx-1">x</span>

        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={handleRepsBlur}
          placeholder="0"
          className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-500">reps</span>
      </div>

      <button
        type="button"
        onClick={toggleCompleted}
        className={`p-2 rounded-full transition-colors ${
          set.completed
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
        }`}
        aria-label={set.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-600"
        aria-label="Delete set"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
