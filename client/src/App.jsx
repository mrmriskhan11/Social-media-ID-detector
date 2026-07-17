import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  Settings, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  ShieldAlert,
  Sparkles,
  Link2,
  Trash2
} from 'lucide-react';

// Backend base URL (resolves to VITE_API_URL environment variable if present, or localhost/relative path)
const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api');

function App() {
  // State variables
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [redirectUrl, setRedirectUrl] = useState(null);
  
  // Settings / API Key State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [apiSaveStatus, setApiSaveStatus] = useState(null);

  // Status/Error Messages
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('serp_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      // Default to opening settings if no key is found to guide the user
      setShowSettings(true);
    }
  }, []);

  // Handle image drag-and-drop / select
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      // Reset search states
      setResults(null);
      setRedirectUrl(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResults(null);
      setRedirectUrl(null);
      setError(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setRedirectUrl(null);
    setError(null);
    setScanning(false);
    setLoading(false);
  };

  // Save API key
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('serp_api_key', apiKey.trim());
      setApiSaveStatus('success');
      setTimeout(() => {
        setApiSaveStatus(null);
        setShowSettings(false);
      }, 1500);
    } else {
      localStorage.removeItem('serp_api_key');
      setApiSaveStatus('removed');
      setTimeout(() => setApiSaveStatus(null), 1500);
    }
  };

  // Run the main reverse face search
  const handleSearch = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setRedirectUrl(null);

    try {
      // 1. Upload local file to server to get a temporary public URL
      setStatusMessage('Uploading image to secure temporary cloud server...');
      const uploadData = new FormData();
      uploadData.append('image', file);

      const uploadResponse = await axios.post(`${API_BASE}/upload`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const publicImageUrl = uploadResponse.data.url;
      setStatusMessage('Image uploaded successfully! Starting visual scan...');
      
      // Trigger the face scan animation UI
      setScanning(true);
      
      // Run the scan animation for 2.5 seconds to look premium
      await new Promise(resolve => setTimeout(resolve, 2500));

      setStatusMessage('Searching public web indexes for social matches...');

      // 2. Query the search endpoint
      const searchResponse = await axios.post(`${API_BASE}/search`, {
        imageUrl: publicImageUrl,
        serpApiKey: apiKey.trim()
      });

      setScanning(false);
      
      const searchData = searchResponse.data;

      if (searchData.redirectUrl) {
        setRedirectUrl(searchData.redirectUrl);
      }

      if (searchData.socialMatches) {
        setResults(searchData.socialMatches);
      } else {
        setResults([]);
      }

    } catch (err) {
      console.error(err);
      setScanning(false);
      setError(
        err.response?.data?.error || 
        err.response?.data?.details || 
        err.message || 
        'An error occurred during the search.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <Sparkles className="logo-icon" size={32} />
          <h1 className="logo-text">Social Matcher</h1>
        </div>
        <button 
          className="settings-btn"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={18} />
          {showSettings ? 'Hide Key' : 'Configure API'}
        </button>
      </header>

      {/* Settings / API Key Config Panel */}
      {showSettings && (
        <section className="settings-panel">
          <h3 className="settings-title">
            <Settings size={20} className="logo-icon" />
            SerpApi Key Configuration
          </h3>
          <p className="settings-desc">
            For direct in-app social media scanning, this app uses Google Lens via SerpApi.
            You can get a <strong>free API Key</strong> (100 searches/month) by signing up at{' '}
            <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer">
              SerpApi.com <ExternalLink size={12} style={{ display: 'inline' }} />
            </a>.
            <br />
            <em>If you don't have a key, the app will upload your image and redirect you to Google Lens directly.</em>
          </p>
          <div className="input-group">
            <div className="api-input-wrapper">
              <input
                type={showKey ? 'text' : 'password'}
                className="api-input"
                placeholder="Paste your SerpApi Key here..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button 
                type="button"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dark)',
                  cursor: 'pointer'
                }}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button className="save-api-btn" onClick={handleSaveApiKey}>
              Save Key
            </button>
          </div>
          
          {apiSaveStatus === 'success' && (
            <div style={{ color: '#10b981', marginTop: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle size={16} /> Key saved securely!
            </div>
          )}
          {apiSaveStatus === 'removed' && (
            <div style={{ color: '#f59e0b', marginTop: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={16} /> Key cleared. Using fallback redirect mode.
            </div>
          )}
        </section>
      )}

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Side: Upload Panel */}
        <section className="upload-panel">
          {!preview ? (
            <div 
              className="dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileSelect').click()}
            >
              <UploadCloud className="dropzone-icon" size={48} />
              <div className="dropzone-text">Drag & drop photo here</div>
              <div className="dropzone-subtext">or click to browse from device</div>
              <input 
                id="fileSelect" 
                type="file" 
                className="file-input" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="preview-container">
              <img src={preview} alt="Target face" className="preview-image" />
              {scanning && (
                <div className="scan-overlay">
                  <div className="scanning-grid"></div>
                  <div className="scanner-line"></div>
                </div>
              )}
            </div>
          )}

          {preview && (
            <>
              <button 
                className="search-btn"
                onClick={handleSearch}
                disabled={loading || scanning}
              >
                {loading ? (
                  <>
                    <RefreshCw className="spinner" size={18} style={{ animation: 'spin 1s linear infinite', border: 'none' }} />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Start Face Search
                  </>
                )}
              </button>
              <button 
                className="clear-btn"
                onClick={handleClear}
                disabled={loading}
              >
                <Trash2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Clear Image
              </button>
            </>
          )}
        </section>

        {/* Right Side: Results Panel */}
        <section className="results-panel">
          <div className="results-header-section">
            <h2 className="results-title">Scanned Social Accounts</h2>
            {results && (
              <span className="results-badge">
                {results.length} Profiles Found
              </span>
            )}
          </div>

          {/* Empty State */}
          {!loading && !scanning && !results && !error && (
            <div className="empty-state">
              <UploadCloud className="empty-icon" size={64} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Ready for Scan</p>
              <p style={{ maxWidth: '360px', fontSize: '0.875rem' }}>
                Upload a face picture on the left panel, and click "Start Face Search" to search the public web.
              </p>
            </div>
          )}

          {/* Loading / Scanning Animation State */}
          {(loading || scanning) && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p className="status-text">{statusMessage}</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
              color: '#f87171',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Search Failed</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Results Grid State */}
          {!loading && !scanning && results && (
            <>
              {results.length === 0 ? (
                <div className="empty-state">
                  <ShieldAlert className="empty-icon" size={56} style={{ color: 'var(--accent-pink)' }} />
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>No Direct Matches Filtered</p>
                  <p style={{ maxWidth: '380px', fontSize: '0.875rem' }}>
                    Google Lens did not index this face matching any direct public social media domains.
                  </p>
                </div>
              ) : (
                <div className="matches-grid">
                  {results.map((match, idx) => (
                    <a 
                      key={idx}
                      href={match.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`match-card ${match.icon}`}
                    >
                      <div className="match-thumbnail-wrapper">
                        {match.thumbnail ? (
                          <img src={match.thumbnail} alt={match.title} className="match-thumbnail" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' }}>
                            <Link2 size={24} style={{ color: 'var(--text-dark)' }} />
                          </div>
                        )}
                      </div>
                      
                      <div className="match-info">
                        <div className="match-header">
                          <span className={`match-platform platform-${match.icon}`}>
                            {match.platform}
                          </span>
                          <span className="match-confidence">
                            {match.confidence}% Match
                          </span>
                        </div>
                        <h4 className="match-title" title={match.title}>
                          {match.title}
                        </h4>
                        <p className="match-source" title={match.source}>
                          {match.source}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Fallback Option details always shown when there is a search finished */}
              <div className="fallback-notice">
                <h4 className="fallback-notice-title">
                  <Compass size={18} />
                  Looking for more matches?
                </h4>
                <p className="fallback-notice-desc">
                  Since the API filters only raw social media profiles, you can view the complete Google Lens search results page (including similar clothing, visual look-alikes, and web pages).
                </p>
                {redirectUrl && (
                  <button 
                    className="fallback-redirect-btn"
                    onClick={() => window.open(redirectUrl, '_blank')}
                  >
                    <ExternalLink size={14} />
                    Open Full Google Lens Page
                  </button>
                )}
              </div>
            </>
          )}

          {/* Fallback Notice when no SerpApi key and not loaded yet */}
          {!loading && !scanning && !results && redirectUrl && (
            <div className="fallback-notice" style={{ marginTop: 'auto' }}>
              <h4 className="fallback-notice-title">
                <ShieldAlert size={18} />
                Redirect Mode Ready
              </h4>
              <p className="fallback-notice-desc">
                No SerpApi key was provided. Click below to open Google Lens directly in a new tab with your uploaded photo.
              </p>
              <button 
                className="fallback-redirect-btn"
                onClick={() => window.open(redirectUrl, '_blank')}
              >
                <ExternalLink size={14} />
                Search via Google Lens
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Social Matcher &copy; 2026 | Built for Open Source Intelligence (OSINT)</p>
      </footer>
    </div>
  );
}

export default App;
