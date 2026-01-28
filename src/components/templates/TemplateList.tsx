import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateCard } from './TemplateCard';
import { ConfirmDialog, LoadingSpinner, Button } from '../common';
import { useTemplates, useDeleteTemplate } from '../../database/hooks/useTemplates';

export function TemplateList() {
  const navigate = useNavigate();
  const { data: templates, isLoading, error } = useTemplates();
  const deleteTemplateMutation = useDeleteTemplate();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteId !== null) {
      await deleteTemplateMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

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
        <p className="text-red-600">Failed to load templates</p>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No workout templates yet</p>
        <Button onClick={() => navigate('/template/new')}>
          Create Your First Template
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={(id) => navigate(`/template/${id}`)}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This will also delete all workout history for this template."
        confirmText="Delete"
      />
    </>
  );
}
