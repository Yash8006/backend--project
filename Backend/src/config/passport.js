import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../modles/user.model.js';


passport.use(
    new GoogleStrategy(
        {
            clientID:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL:  process.env.GOOGLE_CALLBACK_URL,
            // Pass tokens through to the verify callback
            passReqToCallback: false,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email    = profile.emails?.[0]?.value;
                const googleId = profile.id;
                const fullName = profile.displayName || 'YouTube User';
                const avatar   = profile.photos?.[0]?.value || '';

                if (!email) {
                    return done(new Error('No email returned from Google'), null);
                }

                // ── Try to find existing user by googleId or email ────────
                let user = await User.findOne({
                    $or: [{ googleId }, { email }],
                });

                if (user) {
                    // Existing user — update YouTube tokens and googleId
                    user.googleId            = googleId;
                    user.authProvider        = user.authProvider || 'google';
                    user.youtubeAccessToken  = accessToken;
                    // refreshToken is only sent on first authorization; preserve existing if not resent
                    if (refreshToken) {
                        user.youtubeRefreshToken = refreshToken;
                    }
                    // Token expires in 1 hour from now
                    user.youtubeTokenExpiry  = new Date(Date.now() + 3600 * 1000);
                    // Update avatar if not set already
                    if (!user.avatar && avatar) user.avatar = avatar;
                    await user.save({ validateBeforeSave: false });
                } else {
                    // New user — auto-generate a unique username from email prefix
                    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                    let username = baseUsername;
                    let attempt  = 0;

                    // Ensure username uniqueness
                    while (await User.findOne({ username })) {
                        attempt++;
                        username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
                        if (attempt > 10) break; // safety valve
                    }

                    user = await User.create({
                        googleId,
                        email,
                        fullName,
                        username,
                        avatar: avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fullName) + '&background=7c3aed&color=fff',
                        authProvider:        'google',
                        youtubeAccessToken:  accessToken,
                        youtubeRefreshToken: refreshToken || null,
                        youtubeTokenExpiry:  new Date(Date.now() + 3600 * 1000),
                        // password is intentionally omitted — it's now optional
                    });
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Minimal serialization — we only use this during the OAuth redirect
// Our own JWT cookies take over after the callback
passport.serializeUser((user, done)   => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password -refreshToken');
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
