import express      from "express";
import cors         from "cors";
import cookieParser  from "cookie-parser";
import session       from "express-session";
import passport      from './config/passport.js';
const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Session — required only for Passport OAuth redirect flow
app.use(session({
    secret:            process.env.SESSION_SECRET || process.env.ACCESS_TOKEN_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie:            { secure: true, sameSite: 'none', maxAge: 5 * 60 * 1000 }, // 5 min — just for OAuth handshake
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());


import authRoutes        from "./routes/auth.routes.js";
import userRoutes        from "./routes/user.routes.js";
import playlistRoutes    from "./routes/playlist.routes.js";

app.use("/api/v1/auth",         authRoutes);
app.use("/api/v1/users",        userRoutes);
app.use("/api/v1/playlists",    playlistRoutes);

export default app