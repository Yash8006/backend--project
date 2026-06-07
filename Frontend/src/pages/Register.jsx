import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '',
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, username, email, password } = form;
    if (!fullName || !username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!avatar) {
      setError('Avatar image is required.');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('avatar', avatar);
    if (coverImage) formData.append('coverImage', coverImage);

    setLoading(true);
    try {
      await authAPI.register(formData);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-bg-glow" />

      <div className="auth-card card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <span className="logo-icon">▶</span>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>VideoTube</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle text-muted">Join the community today</p>

        <form id="register-form" className="auth-form" onSubmit={handleSubmit} noValidate encType="multipart/form-data">
          {error && <div className="auth-error" role="alert">{error}</div>}

          {/* Avatar upload */}
          <div className="avatar-upload-row">
            <label htmlFor="register-avatar" className="avatar-upload-btn" aria-label="Upload avatar">
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar preview" className="avatar avatar-xl" />
                : <div className="avatar-placeholder avatar-xl">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    <span>Avatar *</span>
                  </div>
              }
              <div className="avatar-upload-overlay">📷</div>
            </label>
            <input id="register-avatar" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

            <label htmlFor="register-cover" className="cover-upload-btn" aria-label="Upload cover image">
              {coverPreview
                ? <img src={coverPreview} alt="Cover preview" className="cover-preview" />
                : <div className="cover-placeholder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/></svg>
                    <span>Cover image (optional)</span>
                  </div>
              }
            </label>
            <input id="register-cover" type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="register-fullname" className="form-label">Full Name</label>
              <input id="register-fullname" type="text" name="fullName" className="form-input" placeholder="John Doe" value={form.fullName} onChange={handleChange} autoComplete="name" />
            </div>
            <div className="form-group">
              <label htmlFor="register-username" className="form-label">Username</label>
              <input id="register-username" type="text" name="username" className="form-input" placeholder="johndoe" value={form.username} onChange={handleChange} autoComplete="username" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">Email</label>
            <input id="register-email" type="email" name="email" className="form-input" placeholder="john@example.com" value={form.email} onChange={handleChange} autoComplete="email" />
          </div>

          <div className="form-group">
            <label htmlFor="register-password" className="form-label">Password</label>
            <input id="register-password" type="password" name="password" className="form-input" placeholder="••••••••" value={form.password} onChange={handleChange} autoComplete="new-password" />
          </div>

          <button id="register-submit-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch text-muted">
          Already have an account?{' '}
          <Link to="/login" id="go-login-link" className="text-accent" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
