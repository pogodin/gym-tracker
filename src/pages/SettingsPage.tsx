import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, LoadingSpinner } from '../components/common';
import {
  exportAllData,
  importData,
  clearAllData,
  downloadExportFile,
  parseImportFile,
} from '../database/migration';

export default function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const data = await exportAllData();
      const filename = `gym-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      downloadExportFile(data, filename);
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data: ' + (err instanceof Error ? err.message : 'Unknown error') });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingImportFile(file);
    setShowImportConfirm(true);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!pendingImportFile) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const data = await parseImportFile(pendingImportFile);
      const result = await importData(data);
      queryClient.invalidateQueries();
      setMessage({
        type: 'success',
        text: `Imported ${result.templatesImported} templates and ${result.sessionsImported} workout sessions!`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to import data: ' + (err instanceof Error ? err.message : 'Unknown error') });
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
    }
  };

  const handleClearData = async () => {
    setMessage(null);
    try {
      await clearAllData();
      queryClient.invalidateQueries();
      setMessage({ type: 'success', text: 'All data cleared successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear data: ' + (err instanceof Error ? err.message : 'Unknown error') });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm safe-area-header">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Data Management Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>

          {/* Export */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Export Data</h3>
            <p className="text-sm text-gray-500 mb-3">
              Download all your templates and workout history as a JSON file.
            </p>
            <Button onClick={handleExport} isLoading={isExporting} className="w-full">
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Button>
          </div>

          {/* Import */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Import Data</h3>
            <p className="text-sm text-gray-500 mb-3">
              Import data from a JSON export file. This will add to your existing data.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isImporting}
              className="w-full"
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </div>

          {/* Clear Data */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Clear All Data</h3>
            <p className="text-sm text-gray-500 mb-3">
              Permanently delete all templates and workout history. This cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setShowClearConfirm(true)} className="w-full">
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Migration Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Migrating from Android App</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Open the original Android Gym Tracker app</li>
            <li>Go to Settings and tap "Export Data"</li>
            <li>Save the JSON file to your device</li>
            <li>Transfer the file to this device if needed</li>
            <li>Use the "Import Data" button above to import your data</li>
          </ol>
        </div>
      </main>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        message="Are you sure you want to delete all your templates and workout history? This action cannot be undone."
        confirmText="Clear All"
      />

      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingImportFile(null);
        }}
        onConfirm={handleImport}
        title="Import Data"
        message="This will add the imported data to your existing templates and workouts. Duplicate data may be created if you import the same file twice."
        confirmText="Import"
        variant="primary"
      />

      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-gray-600">Importing data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
