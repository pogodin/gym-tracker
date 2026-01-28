import { useNavigate } from 'react-router-dom';
import type { DayTemplate } from '../../types';
import { Button } from '../common';

interface TemplateCardProps {
  template: DayTemplate;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(template.id)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            aria-label="Edit template"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            aria-label="Delete template"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <Button
        variant="primary"
        className="w-full"
        onClick={() => navigate(`/workout/${template.id}`)}
      >
        Start Workout
      </Button>
    </div>
  );
}
