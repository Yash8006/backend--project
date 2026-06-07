import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();
  const toast = useToast();
  const videoInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  const [form, setForm] = useState({ title: '', description: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
    } else {
      toast.error('Please drop a video file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) { setError('Title and description are required.'); return; }
    if (!videoFile) { setError('Please select a video file.'); return; }
    if (!thumbnail) { setError('Please select a thumbnail image.'); return; }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('videoFile', videoFile);
    formData.append('thumbnail', thumbnail);

    setLoading(true);
    setError('');

    // Simulate progress (real progress requires XHR which we avoid; fetch doesn't expose upload progress)
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 5, 90));
    }, 600);

    try {
      await videoAPI.publish(formData);
      clearInterval(interval);
      setUploadProgress(100);
      toast.success('Video published successfully! 🎉');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      clearInterval(interval);
      setUploadProgress(0);
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="upload-page" className="upload-page">
      <div className="page-header">
        <h1 className="page-title">Upload Video</h1>
      </div>

      <form id="upload-form" className="upload-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="auth-error" role="alert">{error}</div>}

        {/* Video drop zone */}
        <div
          id="video-drop-zone"
          className={`upload-dropzone ${dragOver ? 'dragover' : ''} ${videoFile ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => videoInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && videoInputRef.current?.click()}
          aria-label="Drop video file here or click to select"
        >
          <input
            ref={videoInputRef}
            id="video-file-input"
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          />
          {videoFile ? (
            <div className="upload-file-selected">
              <span className="upload-file-icon">🎬</span>
              <div>
                <p className="upload-file-name">{videoFile.name}</p>
                <p className="text-muted" style={{ fontSize: 12 }}>
                  {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="upload-dropzone-content">
              <div className="upload-dropzone-icon">📤</div>
              <p className="upload-dropzone-label">Drag & drop your video here</p>
              <p className="text-muted" style={{ fontSize: 13 }}>or click to browse</p>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>MP4, MOV, AVI, WebM supported</p>
            </div>
          )}
        </div>

        <div className="upload-fields">
          {/* Thumbnail */}
          <div className="form-group">
            <label htmlFor="thumbnail-input" className="form-label">Thumbnail *</label>
            <div
              className={`upload-thumb-picker ${thumbnail ? 'has-thumb' : ''}`}
              onClick={() => thumbInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && thumbInputRef.current?.click()}
              aria-label="Select thumbnail image"
            >
              <input
                ref={thumbInputRef}
                id="thumbnail-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setThumbnail(f); setThumbPreview(URL.createObjectURL(f)); }
                }}
              />
              {thumbPreview
                ? <img src={thumbPreview} alt="Thumbnail preview" className="thumb-preview" />
                : <div className="thumb-placeholder">
                    <span style={{ fontSize: 32 }}>🖼️</span>
                    <span className="text-muted" style={{ fontSize: 13 }}>Click to upload thumbnail</span>
                  </div>
              }
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="upload-title" className="form-label">Title *</label>
            <input
              id="upload-title"
              type="text"
              className="form-input"
              placeholder="Give your video a catchy title..."
              value={form.title}
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="upload-description" className="form-label">Description *</label>
            <textarea
              id="upload-description"
              className="form-input"
              placeholder="Tell viewers what your video is about..."
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              rows={5}
              maxLength={2000}
            />
          </div>

          {/* Progress bar */}
          {loading && (
            <div className="upload-progress-wrap" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="upload-progress-label">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              id="upload-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Uploading…' : '🚀 Publish Video'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
