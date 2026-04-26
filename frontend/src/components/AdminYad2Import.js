import React, { useState } from 'react';
import { importYad2ListingsBatch, runYad2SyncNow } from '../services/api';

const pretty = (value) => JSON.stringify(value, null, 2);

const AdminYad2Import = () => {
  const [sourceTag, setSourceTag] = useState('yad2-batch-2');
  const [upsert, setUpsert] = useState(true);
  const [items, setItems] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [rawPreview, setRawPreview] = useState('');

  const handleFile = async (event) => {
    setError('');
    setResult(null);
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setError('JSON file must contain an array of listings.');
        setItems(null);
        setRawPreview(text.slice(0, 2000));
        return;
      }
      setItems(parsed);
      setRawPreview(pretty(parsed.slice(0, 3)));
    } catch (parseErr) {
      setItems(null);
      setRawPreview('');
      setError(`Invalid JSON file: ${parseErr.message}`);
    }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!Array.isArray(items) || items.length === 0) {
      setError('Choose a JSON file that contains at least one listing.');
      return;
    }
    setLoading(true);
    try {
      const response = await importYad2ListingsBatch({
        items,
        sourceTag: sourceTag.trim() || 'yad2',
        upsert,
      });
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSyncNow = async () => {
    setError('');
    setSyncResult(null);
    setSyncLoading(true);
    try {
      const response = await runYad2SyncNow();
      setSyncResult(response);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Yad2 sync failed.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="import-page">
      <h2>Admin Yad2 Batch Import</h2>
      <p className="import-help">
        Upload a JSON array of Yad2 listings. This imports additional listings without deleting existing ones.
      </p>
      <div className="import-sync-panel">
        <h3>Live Feed Sync</h3>
        <p>
          Run one immediate Yad2 sync now (uses your logged-in agent/admin permissions).
        </p>
        <button className="secondary-btn" type="button" onClick={handleRunSyncNow} disabled={syncLoading}>
          {syncLoading ? 'Running sync...' : 'Run Yad2 Sync Now'}
        </button>
        {syncResult && (
          <p className="import-summary">
            {syncResult.message || 'Yad2 sync finished.'}
            {typeof syncResult.fetched === 'number' && (
              <>
                {' '}Fetched: <strong>{syncResult.fetched}</strong> | Created: <strong>{syncResult.created ?? 0}</strong> |
                Updated: <strong>{syncResult.updated ?? 0}</strong> | Skipped: <strong>{syncResult.skipped ?? 0}</strong>
              </>
            )}
          </p>
        )}
      </div>

      <form className="import-form" onSubmit={handleImport}>
        <div className="input-field">
          <label>Batch Source Tag</label>
          <input
            type="text"
            value={sourceTag}
            onChange={(e) => setSourceTag(e.target.value)}
            placeholder="e.g. yad2-batch-2"
          />
        </div>

        <div className="import-checkbox-row">
          <input
            id="upsert"
            type="checkbox"
            checked={upsert}
            onChange={(e) => setUpsert(e.target.checked)}
          />
          <label htmlFor="upsert">
            Upsert by external ID (recommended)
          </label>
        </div>

        <div className="input-field">
          <label>Listings JSON file</label>
          <input type="file" accept=".json,application/json" onChange={handleFile} />
          {fileName && (
            <p className="import-file-meta">
              File: <strong>{fileName}</strong>{' '}
              {Array.isArray(items) ? `(${items.length} rows parsed)` : ''}
            </p>
          )}
        </div>

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Importing...' : 'Import Listings'}
        </button>
      </form>

      {error && <p className="status-message status-message-error">{error}</p>}

      {rawPreview && (
        <section className="import-preview">
          <h3>Preview (first 3 rows)</h3>
          <pre>{rawPreview}</pre>
        </section>
      )}

      {result && (
        <section className="import-result">
          <h3>Import Result</h3>
          <p className="import-summary">
            Created: <strong>{result.created ?? 0}</strong> | Updated: <strong>{result.updated ?? 0}</strong> |
            Skipped: <strong>{result.skipped ?? 0}</strong> | Total: <strong>{result.total ?? 0}</strong>
          </p>
          {Array.isArray(result.errors) && result.errors.length > 0 && (
            <>
              <h4>Row Errors</h4>
              <pre>{pretty(result.errors)}</pre>
            </>
          )}
          <h4>Raw Response</h4>
          <pre>{pretty(result)}</pre>
        </section>
      )}
    </div>
  );
};

export default AdminYad2Import;
