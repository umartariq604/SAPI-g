const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

// Configure Passport (conditionally enable Google OAuth)
const hasGoogleCreds = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (hasGoogleCreds) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('Google profile:', profile?.id);
            // Check if user already exists
            let user = await User.findOne({ googleId: profile.id });
            
            if (!user) {
                // Check if user exists with the same email but no googleId
                user = await User.findOne({ email: profile.emails[0].value });
                
                if (user) {
                    // Update existing user with googleId
                    user.googleId = profile.id;
                    await user.save();
                    console.log('Updated existing user with Google ID:', user._id);
                } else {
                    // Create new user
                    user = await User.create({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        firstName: profile.name.givenName,
                        lastName: profile.name.familyName,
                        role: 'user'
                    });
                    console.log('Created new user:', user._id);
                }
            } else {
                console.log('Found existing user:', user._id);
            }
            
            return done(null, user);
        } catch (error) {
            console.error('Google strategy error:', error);
            return done(error, null);
        }
    }));
} else {
    console.warn("Google OAuth is disabled: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
}

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
