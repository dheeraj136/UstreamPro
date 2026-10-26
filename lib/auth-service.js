import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 12;
export const SESSION_DURATION_DEFAULT = 24 * 60 * 60; // 24 hours in seconds
export const SESSION_DURATION_REMEMBER = 30 * 24 * 60 * 60; // 30 days in seconds
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// --- Helper Functions ---
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function base64UrlEncode(buffer) {
  return buffer.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkcePair() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  return { codeVerifier, codeChallenge };
}

export function timingSafeMatch(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(trimmed);
}

export function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password cannot exceed 128 characters" };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" };
  }
  if (!/[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number or special character" };
  }
  return { valid: true };
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

// --- Rate Limiting ---
export function checkRateLimit(db, key, { maxPoints = 5, windowMs = 15 * 60 * 1000, blockDurationMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const stmt = db.prepare("SELECT * FROM rate_limits WHERE key = ?");
  const record = stmt.get(key);

  if (record) {
    if (record.blocked_until && record.blocked_until > now) {
      const retryAfterSeconds = Math.ceil((record.blocked_until - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    if (now - record.first_attempt_at > windowMs) {
      // Window expired, reset counter
      db.prepare("UPDATE rate_limits SET points = 1, first_attempt_at = ?, last_attempt_at = ?, blocked_until = 0 WHERE key = ?")
        .run(now, now, key);
      return { allowed: true, remaining: maxPoints - 1 };
    }

    const newPoints = record.points + 1;
    if (newPoints > maxPoints) {
      const blockedUntil = now + blockDurationMs;
      db.prepare("UPDATE rate_limits SET points = ?, last_attempt_at = ?, blocked_until = ? WHERE key = ?")
        .run(newPoints, now, blockedUntil, key);
      return { allowed: false, retryAfterSeconds: Math.ceil(blockDurationMs / 1000) };
    }

    db.prepare("UPDATE rate_limits SET points = ?, last_attempt_at = ? WHERE key = ?")
      .run(newPoints, now, key);
    return { allowed: true, remaining: maxPoints - newPoints };
  }

  db.prepare("INSERT INTO rate_limits (key, points, first_attempt_at, last_attempt_at, blocked_until) VALUES (?, 1, ?, ?, 0)")
    .run(key, now, now);
  return { allowed: true, remaining: maxPoints - 1 };
}

export function resetRateLimit(db, key) {
  try {
    db.prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
  } catch {}
}

// --- User Management ---
export async function registerUser(db, { email, password, name }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();

  if (!validateEmail(cleanEmail)) {
    throw new Error("Invalid email format");
  }
  if (!cleanName || cleanName.length > 50) {
    throw new Error("Name must be between 1 and 50 characters");
  }
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.message);
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = Date.now();

  // Create user
  db.prepare("INSERT INTO users (id, email, password_hash, name, email_verified, google_id, created_at, updated_at) VALUES (?, ?, ?, ?, 0, NULL, ?, ?)")
    .run(userId, cleanEmail, passwordHash, cleanName, now, now);

  // Create primary profile
  const profileId = crypto.randomUUID();
  db.prepare("INSERT INTO profiles (id, user_id, name, avatar, is_kids, maturity_rating, language, pin_hash, is_primary, created_at, updated_at) VALUES (?, ?, ?, 'avatar-1', 0, 'All', 'en', NULL, 1, ?, ?)")
    .run(profileId, userId, cleanName, now, now);

  // Generate email verification token
  const verification = createEmailVerification(db, userId);

  const user = db.prepare("SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?").get(userId);
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(profileId);

  return { user, profile, verificationToken: verification.token };
}

export async function authenticateUser(db, email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) return null;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
  if (!user || !user.password_hash) {
    // Constant time dummy compare to prevent timing enumeration
    await bcrypt.compare(password, "$2a$12$e80yq9j5bC4dG6b2Kz7n0eZ8F3G9h1j4l6n8p0r2t4v6x8z0B2D4F");
    return null;
  }

  const match = await verifyPassword(password, user.password_hash);
  if (!match) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    email_verified: Boolean(user.email_verified),
    created_at: user.created_at,
  };
}

// --- Session Lifecycle ---
export function createSession(db, userId, { rememberMe = false, ip = "", userAgent = "" } = {}) {
  const sessionId = crypto.randomUUID();
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const durationSec = rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT;
  const expiresAt = now + durationSec * 1000;

  db.prepare("INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_active_at, ip_address, user_agent, is_remember_me) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(sessionId, userId, tokenHash, now, expiresAt, now, ip || "", userAgent || "", rememberMe ? 1 : 0);

  return {
    token: rawToken,
    sessionId,
    expiresAt,
    maxAge: durationSec
  };
}

export function validateSession(db, token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = Date.now();

  const session = db.prepare("SELECT s.*, u.email, u.name, u.email_verified, u.created_at as user_created_at FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?")
    .get(tokenHash, now);

  if (!session) return null;

  // Touch last_active_at
  try {
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(now, session.id);
  } catch {}

  return {
    session: {
      id: session.id,
      userId: session.user_id,
      expiresAt: session.expires_at,
      lastActiveAt: session.last_active_at,
      isRememberMe: Boolean(session.is_remember_me),
      ipAddress: session.ip_address,
      userAgent: session.user_agent
    },
    user: {
      id: session.user_id,
      email: session.email,
      name: session.name,
      email_verified: Boolean(session.email_verified),
      created_at: session.user_created_at
    }
  };
}

export function rotateSession(db, oldToken, userId, meta = {}) {
  revokeSession(db, oldToken);
  return createSession(db, userId, meta);
}

export function revokeSession(db, token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function revokeAllUserSessions(db, userId, exceptToken = null) {
  if (exceptToken) {
    const exceptHash = hashToken(exceptToken);
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(userId, exceptHash);
  } else {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }
}

export function getUserSessions(db, userId, currentToken = null) {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const rows = db.prepare("SELECT id, created_at, expires_at, last_active_at, ip_address, user_agent, is_remember_me, token_hash FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_active_at DESC")
    .all(userId, Date.now());

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    lastActiveAt: r.last_active_at,
    expiresAt: r.expires_at,
    ipAddress: r.ip_address || "Unknown",
    userAgent: r.user_agent || "Unknown",
    isCurrent: r.token_hash === currentHash,
  }));
}

// --- Email Verification ---
export function createEmailVerification(db, userId) {
  db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = now + VERIFICATION_TOKEN_TTL_MS;

  db.prepare("INSERT INTO email_verifications (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), userId, tokenHash, expiresAt, now);

  return { token: rawToken, expiresAt };
}

export function verifyEmailToken(db, token) {
  if (!token) return { success: false, message: "Token is required" };
  const tokenHash = hashToken(token);
  const now = Date.now();

  const record = db.prepare("SELECT * FROM email_verifications WHERE token_hash = ? AND expires_at > ?")
    .get(tokenHash, now);

  if (!record) {
    return { success: false, message: "Invalid or expired verification token" };
  }

  db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").run(now, record.user_id);
  db.prepare("DELETE FROM email_verifications WHERE id = ?").run(record.id);

  return { success: true, userId: record.user_id };
}

// --- Password Reset ---
export function requestPasswordReset(db, email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);

  if (!user) {
    // Return generic success to prevent account enumeration
    return { success: true, emailSent: false };
  }

  db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(user.id);
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = now + PASSWORD_RESET_TTL_MS;

  db.prepare("INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)")
    .run(crypto.randomUUID(), user.id, tokenHash, expiresAt, now);

  return { success: true, emailSent: true, resetToken: rawToken };
}

export async function resetPasswordWithToken(db, token, newPassword) {
  if (!token) throw new Error("Reset token is required");
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.message);
  }

  const tokenHash = hashToken(token);
  const now = Date.now();

  const record = db.prepare("SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?")
    .get(tokenHash, now);

  if (!record) {
    throw new Error("Invalid or expired password reset link");
  }

  const newHash = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(newHash, now, record.user_id);
  db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(record.id);

  // Security: Revoke all active sessions upon password reset
  revokeAllUserSessions(db, record.user_id);

  return { success: true };
}

export async function changeUserPassword(db, userId, currentPassword, newPassword) {
  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId);
  if (!user) throw new Error("User not found");

  if (user.password_hash) {
    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) throw new Error("Current password is incorrect");
  }

  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) throw new Error(passwordCheck.message);

  const newHash = await hashPassword(newPassword);
  const now = Date.now();
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(newHash, now, userId);

  return { success: true };
}

// --- Profiles Management ---
export function getUserProfiles(db, userId) {
  let profiles = db.prepare("SELECT id, user_id, name, avatar, is_kids, maturity_rating, language, (pin_hash IS NOT NULL) AS has_pin, is_primary, created_at, updated_at FROM profiles WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC")
    .all(userId);

  if (profiles.length === 0) {
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(userId);
    const profileId = crypto.randomUUID();
    const now = Date.now();
    db.prepare("INSERT INTO profiles (id, user_id, name, avatar, is_kids, maturity_rating, language, pin_hash, is_primary, created_at, updated_at) VALUES (?, ?, ?, 'avatar-1', 0, 'All', 'en', NULL, 1, ?, ?)")
      .run(profileId, userId, user?.name || "Viewer", now, now);
    profiles = db.prepare("SELECT id, user_id, name, avatar, is_kids, maturity_rating, language, (pin_hash IS NOT NULL) AS has_pin, is_primary, created_at, updated_at FROM profiles WHERE id = ?")
      .all(profileId);
  }

  return profiles.map((p) => ({
    id: p.id,
    userId: p.user_id,
    name: p.name,
    avatar: p.avatar,
    isKids: Boolean(p.is_kids),
    maturityRating: p.maturity_rating,
    language: p.language,
    hasPin: Boolean(p.has_pin),
    isPrimary: Boolean(p.is_primary),
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }));
}

export async function createProfile(db, userId, { name, avatar = "avatar-1", isKids = false, maturityRating = "All", language = "en", pin = null }) {
  const cleanName = String(name || "").trim();
  if (!cleanName || cleanName.length > 30) {
    throw new Error("Profile name must be between 1 and 30 characters");
  }

  const existingCount = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE user_id = ?").get(userId).count;
  if (existingCount >= 5) {
    throw new Error("Maximum of 5 viewer profiles allowed per account");
  }

  let pinHash = null;
  if (pin && typeof pin === "string" && pin.trim().length) {
    if (!/^\d{4}$/.test(pin.trim())) {
      throw new Error("Profile PIN must be exactly 4 digits");
    }
    pinHash = await hashPassword(pin.trim());
  }

  const profileId = crypto.randomUUID();
  const now = Date.now();
  const isPrimary = existingCount === 0 ? 1 : 0;

  db.prepare("INSERT INTO profiles (id, user_id, name, avatar, is_kids, maturity_rating, language, pin_hash, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(profileId, userId, cleanName, avatar, isKids ? 1 : 0, isKids ? "G" : maturityRating, language, pinHash, isPrimary, now, now);

  return {
    id: profileId,
    userId,
    name: cleanName,
    avatar,
    isKids: Boolean(isKids),
    maturityRating: isKids ? "G" : maturityRating,
    language,
    hasPin: Boolean(pinHash),
    isPrimary: Boolean(isPrimary)
  };
}

export async function updateProfile(db, userId, profileId, updates) {
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ? AND user_id = ?").get(profileId, userId);
  if (!profile) throw new Error("Profile not found");

  const name = updates.name !== undefined ? String(updates.name).trim() : profile.name;
  if (!name || name.length > 30) throw new Error("Profile name must be between 1 and 30 characters");

  const avatar = updates.avatar !== undefined ? String(updates.avatar).trim() : profile.avatar;
  const isKids = updates.isKids !== undefined ? Boolean(updates.isKids) : Boolean(profile.is_kids);
  const maturityRating = isKids ? "G" : (updates.maturityRating !== undefined ? updates.maturityRating : profile.maturity_rating);
  const language = updates.language !== undefined ? updates.language : profile.language;

  let pinHash = profile.pin_hash;
  if (updates.pin !== undefined) {
    if (updates.pin === "" || updates.pin === null) {
      pinHash = null;
    } else if (/^\d{4}$/.test(String(updates.pin).trim())) {
      pinHash = await hashPassword(String(updates.pin).trim());
    } else {
      throw new Error("Profile PIN must be exactly 4 digits");
    }
  }

  const now = Date.now();
  db.prepare("UPDATE profiles SET name = ?, avatar = ?, is_kids = ?, maturity_rating = ?, language = ?, pin_hash = ?, updated_at = ? WHERE id = ?")
    .run(name, avatar, isKids ? 1 : 0, maturityRating, language, pinHash, now, profileId);

  return {
    id: profileId,
    userId,
    name,
    avatar,
    isKids,
    maturityRating,
    language,
    hasPin: Boolean(pinHash),
    isPrimary: Boolean(profile.is_primary)
  };
}

export function deleteProfile(db, userId, profileId) {
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ? AND user_id = ?").get(profileId, userId);
  if (!profile) throw new Error("Profile not found");

  const total = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE user_id = ?").get(userId).count;
  if (total <= 1) {
    throw new Error("Cannot delete the only profile on your account");
  }

  if (profile.is_primary) {
    throw new Error("Cannot delete the primary profile");
  }

  db.prepare("DELETE FROM profiles WHERE id = ?").run(profileId);
  return { success: true };
}

export async function verifyProfilePin(db, userId, profileId, pin) {
  const profile = db.prepare("SELECT pin_hash FROM profiles WHERE id = ? AND user_id = ?").get(profileId, userId);
  if (!profile) throw new Error("Profile not found");
  if (!profile.pin_hash) return true; // No PIN required
  if (!pin) return false;
  return await verifyPassword(String(pin).trim(), profile.pin_hash);
}

// --- Watchlist & History (Profile Scoped) ---
export function getProfileWatchlist(db, profileId) {
  const rows = db.prepare("SELECT item_title, item_data, created_at FROM profile_watchlist WHERE profile_id = ? ORDER BY created_at DESC")
    .all(profileId);

  return rows.map((r) => {
    let data = {};
    try { data = JSON.parse(r.item_data || "{}"); } catch {}
    return { title: r.item_title, data, createdAt: r.created_at };
  });
}

export function toggleProfileWatchlist(db, profileId, itemTitle, itemData = {}) {
  const cleanTitle = String(itemTitle || "").trim();
  if (!cleanTitle) return { saved: false };

  const existing = db.prepare("SELECT id FROM profile_watchlist WHERE profile_id = ? AND item_title = ?").get(profileId, cleanTitle);
  if (existing) {
    db.prepare("DELETE FROM profile_watchlist WHERE id = ?").run(existing.id);
    return { saved: false, title: cleanTitle };
  }

  const id = crypto.randomUUID();
  const serialized = JSON.stringify(itemData || {});
  db.prepare("INSERT INTO profile_watchlist (id, profile_id, item_title, item_data, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, profileId, cleanTitle, serialized, Date.now());

  return { saved: true, title: cleanTitle };
}

export function getProfilePlaybackHistory(db, profileId) {
  const rows = db.prepare("SELECT item_title, tmdb_id, season, episode, progress, item_data, updated_at FROM profile_playback_history WHERE profile_id = ? ORDER BY updated_at DESC LIMIT 50")
    .all(profileId);

  return rows.map((r) => {
    let data = {};
    try { data = JSON.parse(r.item_data || "{}"); } catch {}
    return {
      title: r.item_title,
      tmdbId: r.tmdb_id,
      season: r.season,
      episode: r.episode,
      progress: r.progress,
      updatedAt: r.updated_at,
      ...data
    };
  });
}

export function saveProfilePlaybackProgress(db, profileId, { title, tmdbId = "", season = 1, episode = 1, progress = 0, itemData = {} }) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return;

  const serialized = JSON.stringify(itemData || {});
  const now = Date.now();

  db.prepare(`
    INSERT INTO profile_playback_history (id, profile_id, item_title, tmdb_id, season, episode, progress, item_data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id, item_title) DO UPDATE SET
      tmdb_id = excluded.tmdb_id,
      season = excluded.season,
      episode = excluded.episode,
      progress = excluded.progress,
      item_data = excluded.item_data,
      updated_at = excluded.updated_at
  `).run(crypto.randomUUID(), profileId, cleanTitle, String(tmdbId || ""), Number(season) || 1, Number(episode) || 1, Math.min(100, Math.max(0, Number(progress) || 0)), serialized, now);
}

// --- Google OAuth ---
export function createGoogleOAuthUrl(db, returnUrl = "/") {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:4174/api/auth/google/callback";

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not configured");
  }

  const state = generateRandomToken(24);
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  db.prepare("INSERT INTO oauth_states (state, code_verifier, return_url, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .run(state, codeVerifier, returnUrl || "/", now, expiresAt);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "select_account"
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state
  };
}

export async function handleGoogleOAuthCallback(db, code, state) {
  if (!code || !state) throw new Error("Missing OAuth code or state parameter");

  const now = Date.now();
  const stateRecord = db.prepare("SELECT * FROM oauth_states WHERE state = ? AND expires_at > ?").get(state, now);
  if (!stateRecord) {
    throw new Error("Invalid or expired OAuth state");
  }

  // Delete state to prevent replay
  db.prepare("DELETE FROM oauth_states WHERE state = ?").run(state);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:4174/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  // Exchange code with PKCE
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: stateRecord.code_verifier
    })
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  }

  const tokens = await tokenRes.json();
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });

  if (!userRes.ok) {
    throw new Error(`Failed to fetch Google user info: ${userRes.status}`);
  }

  const googleUser = await userRes.json();
  if (!googleUser.email) throw new Error("Google account did not return an email address");

  const cleanEmail = googleUser.email.trim().toLowerCase();
  let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(googleUser.sub, cleanEmail);

  if (user) {
    // Link google_id if missing and mark verified
    db.prepare("UPDATE users SET google_id = ?, email_verified = 1, updated_at = ? WHERE id = ?")
      .run(googleUser.sub, now, user.id);
  } else {
    // Create new user
    const userId = crypto.randomUUID();
    const name = googleUser.name || cleanEmail.split("@")[0] || "Viewer";
    db.prepare("INSERT INTO users (id, email, password_hash, name, email_verified, google_id, created_at, updated_at) VALUES (?, ?, NULL, ?, 1, ?, ?, ?)")
      .run(userId, cleanEmail, name, googleUser.sub, now, now);

    // Create primary profile
    const profileId = crypto.randomUUID();
    db.prepare("INSERT INTO profiles (id, user_id, name, avatar, is_kids, maturity_rating, language, pin_hash, is_primary, created_at, updated_at) VALUES (?, ?, ?, 'avatar-1', 0, 'All', 'en', NULL, 1, ?, ?)")
      .run(profileId, userId, name, now, now);

    user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  }

  const session = createSession(db, user.id, { rememberMe: true });
  return {
    sessionToken: session.token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: true
    },
    returnUrl: stateRecord.return_url || "/"
  };
}

// --- Cookie Utilities ---
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return cookies;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx < 0) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try { cookies[key] = decodeURIComponent(val); } catch { cookies[key] = val; }
    }
  });
  return cookies;
}

export function serializeCookie(name, value, {
  maxAge = null,
  httpOnly = true,
  secure = process.env.NODE_ENV === "production",
  sameSite = "Lax",
  path = "/"
} = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge !== null && maxAge !== undefined) {
    cookie += `; Max-Age=${maxAge}`;
  }
  if (httpOnly) cookie += "; HttpOnly";
  if (secure) cookie += "; Secure";
  return cookie;
}
