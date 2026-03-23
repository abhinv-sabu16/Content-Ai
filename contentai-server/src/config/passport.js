import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel } from "../models/user.js";

export function configurePassport() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName;
            const avatar = profile.photos?.[0]?.value;
            const googleId = profile.id;
            if (!email) return done(new Error("No email returned from Google."), null);
            const user = await UserModel.findOrCreateGoogleUser({ googleId, email, name, avatar });
            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
    console.log("  ✅ Google OAuth enabled");
  } else {
    console.log("  ⚠️  Google OAuth disabled — GOOGLE_CLIENT_ID not set in .env");
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => done(null, { id }));
}