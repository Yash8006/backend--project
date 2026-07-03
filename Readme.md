# 🎬 VideoTube

A full-stack YouTube-like video streaming platform built with a **Node.js/Express backend** and a **React (Vite) frontend**.

## 🌐 Live Demo

| | Link |
|---|---|
| 🖥️ **Frontend** | [https://videotube-frontend-uim4.onrender.com](https://videotube-frontend-uim4.onrender.com) |
| ⚙️ **Backend API** | [https://videotube-fbff.onrender.com](https://videotube-fbff.onrender.com) |

---

## 📁 Repository Structure

```
video-tube/
├── Backend/    # Node.js + Express REST API
└── Frontend/   # React + Vite SPA
```

---

## 🚀 Backend

A robust REST API with:

- **Authentication** – JWT-based access/refresh tokens + Google OAuth 2.0
- **Media Uploads** – Cloudinary integration via Multer
- **Database** – MongoDB + Mongoose
- **Features** – Videos, Users, Subscriptions, Likes, Comments, Tweets, Playlists, Dashboard

### Backend Setup

```bash
cd Backend
cp .env.example .env   # fill in your secrets
npm install
npm run dev
```

**Required environment variables** (see `Backend/.env.example`):

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 8000) |
| `MONGODB_URL` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | JWT secret for access tokens |
| `REFRESH_TOKEN_SECRET` | JWT secret for refresh tokens |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## 🖥️ Frontend

A React SPA with:

- **Vite** build tool
- **Context API** for state management
- YouTube-style UI with personalized homepage, watch page, search, and more

### Frontend Setup

```bash
cd Frontend
cp .env.example .env   # fill in your API keys
npm install
npm run dev
```

**Required environment variables**:

| Variable | Description |
|----------|-------------|
| `VITE_API_BACKEND` | Backend base URL (e.g. `http://localhost:8000`) |
| `VITE_API_BASE` | API prefix (e.g. `/api/v1`) |
| `VITE_YOUTUBE_API_KEY` | YouTube Data API v3 key |

---

## ⚙️ Running Locally

Open two terminals:

```bash
# Terminal 1 – Backend
cd Backend && npm run dev

# Terminal 2 – Frontend
cd Frontend && npm run dev
```

Frontend will be available at `http://localhost:5173`  
Backend API will be available at `http://localhost:8000`

---

## 🔒 Security Note

Never commit `.env` files. All secret keys are excluded via `.gitignore`.  
Use the `.env.example` files as templates.

---

## 📄 License

MIT
