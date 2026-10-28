import { getDb } from "./db.js";
import {
  registerUser,
  authenticateUser,
  createSession,
  validateSession,
  rotateSession,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  createEmailVerification,
  verifyEmailToken,
  requestPasswordReset,
  resetPasswordWithToken,
  changeUserPassword,
  getUserProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  verifyProfilePin,
  getProfileWatchlist,
  toggleProfileWatchlist,
  getProfilePlaybackHistory,
  saveProfilePlaybackProgress,
  createGoogleOAuthUrl,
  handleGoogleOAuthCallback,
  checkRateLimit,
  resetRateLimit,
  parseCookies,
  serializeCookie,
  SESSION_DURATION_REMEMBER,
  SESSION_DURATION_DEFAULT
} from "./auth-service.js";

const COOKIE_SESSION_NAME = "ustream_session";
const COOKIE_PROFILE_NAME = "ustream_active_profile";

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) { // 1MB limit
        raw = "";
        resolve({});
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res, status, payload, cookies = [], req = null) {
  const origin = req?.headers?.origin;
  if (typeof res.setHeader === "function") {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate");
    if (origin) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-credentials", "true");
    } else {
      res.setHeader("access-control-allow-origin", "*");
    }
    res.setHeader("access-control-allow-headers", "content-type, authorization");
    res.setHeader("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
    if (cookies.length > 0) {
      res.setHeader("set-cookie", cookies);
    }
  }

  if (typeof res.writeHead === "function") {
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "access-control-allow-origin": origin || "*",
      ...(origin ? { "access-control-allow-credentials": "true" } : {}),
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
    };
    if (cookies.length > 0) {
      headers["set-cookie"] = cookies;
    }
    res.writeHead(status, headers);
    res.end(JSON.stringify(payload));
    return true;
  }

  if (typeof res.status === "function") {
    res.status(status);
    res.json(payload);
    return true;
  }

  if (typeof res.end === "function") {
    res.statusCode = status;
    res.end(JSON.stringify(payload));
    return true;
  }
  return true;
}

function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "127.0.0.1";
}

function getUserAgent(req) {
  return req.headers?.["user-agent"] || "";
}

function getSessionFromReq(db, req) {
  const cookieHeader = req.headers?.cookie || "";
  const cookies = parseCookies(cookieHeader);
  let token = cookies[COOKIE_SESSION_NAME];
  if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (!token) return null;
  return validateSession(db, token);
}

function getActiveProfileId(req, profiles) {
  const cookieHeader = req.headers?.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const requestedId = cookies[COOKIE_PROFILE_NAME];
  if (requestedId && profiles.some((p) => p.id === requestedId)) {
    return requestedId;
  }
  const primary = profiles.find((p) => p.isPrimary) || profiles[0];
  return primary ? primary.id : null;
}

export async function handleAuthRoute(req, res, pathname, dbOverride = null) {
  const db = dbOverride || getDb();
  const method = req.method.toUpperCase();
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  const isSecure = Boolean(req.headers?.["x-forwarded-proto"] === "https" || req.connection?.encrypted || process.env.NODE_ENV === "production");

  // Normalize pathname: remove trailing slash
  const route = pathname.replace(/\/$/, "");

  // 1. POST /api/auth/register
  if (method === "POST" && route === "/api/auth/register") {
    const rate = checkRateLimit(db, `ip:register:${ip}`, { maxPoints: 5, windowMs: 15 * 60 * 1000 });
    if (!rate.allowed) {
      return sendJson(res, 429, { ok: false, error: "Too many registration attempts. Please try again later." });
    }

    const body = await readJsonBody(req);
    try {
      const { user, profile, verificationToken } = await registerUser(db, {
        email: body.email,
        password: body.password,
        name: body.name
      });

      const session = createSession(db, user.id, { rememberMe: true, ip, userAgent });
      const sessionCookie = serializeCookie(COOKIE_SESSION_NAME, session.token, {
        maxAge: session.maxAge,
        secure: isSecure
      });
      const profileCookie = serializeCookie(COOKIE_PROFILE_NAME, profile.id, {
        maxAge: session.maxAge,
        secure: isSecure,
        httpOnly: false
      });

      return sendJson(res, 201, {
        ok: true,
        user,
        profiles: [profile],
        activeProfile: profile,
        token: session.token,
        verificationToken // Available for dev/testing verification link
      }, [sessionCookie, profileCookie]);
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 2. POST /api/auth/login
  if (method === "POST" && route === "/api/auth/login") {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();

    // Check rate limits by IP and by email
    const ipRate = checkRateLimit(db, `ip:login:${ip}`, { maxPoints: 8, windowMs: 15 * 60 * 1000 });
    if (!ipRate.allowed) {
      return sendJson(res, 429, { ok: false, error: "Too many failed attempts. Please try again in 15 minutes." });
    }

    const user = await authenticateUser(db, email, body.password);
    if (!user) {
      return sendJson(res, 401, { ok: false, error: "Invalid email or password" });
    }

    // Reset rate limit on successful credentials
    resetRateLimit(db, `ip:login:${ip}`);

    // Session rotation
    const cookies = parseCookies(req.headers?.cookie || "");
    const oldToken = cookies[COOKIE_SESSION_NAME];
    if (oldToken) revokeSession(db, oldToken);

    const rememberMe = Boolean(body.rememberMe);
    const session = createSession(db, user.id, { rememberMe, ip, userAgent });
    const profiles = getUserProfiles(db, user.id);
    const activeProfileId = getActiveProfileId(req, profiles);
    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

    const sessionCookie = serializeCookie(COOKIE_SESSION_NAME, session.token, {
      maxAge: session.maxAge,
      secure: isSecure
    });
    const profileCookie = serializeCookie(COOKIE_PROFILE_NAME, activeProfile.id, {
      maxAge: session.maxAge,
      secure: isSecure,
      httpOnly: false
    });

    return sendJson(res, 200, {
      ok: true,
      user,
      profiles,
      activeProfile,
      token: session.token
    }, [sessionCookie, profileCookie]);
  }

  // 3. POST /api/auth/logout
  if (method === "POST" && route === "/api/auth/logout") {
    const cookies = parseCookies(req.headers?.cookie || "");
    let token = cookies[COOKIE_SESSION_NAME];
    if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (token) revokeSession(db, token);

    const clearSession = serializeCookie(COOKIE_SESSION_NAME, "", { maxAge: 0, secure: isSecure });
    const clearProfile = serializeCookie(COOKIE_PROFILE_NAME, "", { maxAge: 0, secure: isSecure, httpOnly: false });

    return sendJson(res, 200, { ok: true, message: "Logged out successfully" }, [clearSession, clearProfile]);
  }

  // 4. POST /api/auth/logout-all
  if (method === "POST" && route === "/api/auth/logout-all") {
    const auth = getSessionFromReq(db, req);
    if (!auth) {
      return sendJson(res, 401, { ok: false, error: "Authentication required" });
    }

    revokeAllUserSessions(db, auth.user.id);
    const clearSession = serializeCookie(COOKIE_SESSION_NAME, "", { maxAge: 0, secure: isSecure });
    const clearProfile = serializeCookie(COOKIE_PROFILE_NAME, "", { maxAge: 0, secure: isSecure, httpOnly: false });

    return sendJson(res, 200, { ok: true, message: "Logged out from all devices" }, [clearSession, clearProfile]);
  }

  // 5. GET /api/auth/me
  if (method === "GET" && route === "/api/auth/me") {
    const auth = getSessionFromReq(db, req);
    if (!auth) {
      return sendJson(res, 200, { ok: true, user: null, profiles: [], activeProfile: null });
    }

    const profiles = getUserProfiles(db, auth.user.id);
    const activeProfileId = getActiveProfileId(req, profiles);
    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

    return sendJson(res, 200, {
      ok: true,
      user: auth.user,
      session: {
        id: auth.session.id,
        isRememberMe: auth.session.isRememberMe,
        expiresAt: auth.session.expiresAt
      },
      profiles,
      activeProfile
    });
  }

  // 6. GET /api/auth/sessions
  if (method === "GET" && route === "/api/auth/sessions") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const cookies = parseCookies(req.headers?.cookie || "");
    const sessions = getUserSessions(db, auth.user.id, cookies[COOKIE_SESSION_NAME]);
    return sendJson(res, 200, { ok: true, sessions });
  }

  // 7. GET & POST /api/auth/verify-email
  if (route === "/api/auth/verify-email") {
    let token = "";
    if (method === "GET") {
      const urlObj = new URL(req.url, "http://localhost");
      token = urlObj.searchParams.get("token") || "";
    } else if (method === "POST") {
      const body = await readJsonBody(req);
      token = body.token;
    }
    const result = verifyEmailToken(db, token);
    if (!result.success) {
      if (method === "GET" && typeof res.writeHead === "function") {
        res.writeHead(302, { Location: `/#/profile?verificationError=${encodeURIComponent(result.message)}` });
        return res.end();
      }
      return sendJson(res, 400, { ok: false, error: result.message });
    }
    if (method === "GET" && typeof res.writeHead === "function") {
      res.writeHead(302, { Location: "/#/profile?verified=1" });
      return res.end();
    }
    return sendJson(res, 200, { ok: true, message: "Email successfully verified!" });
  }

  // 8. POST /api/auth/resend-verification
  if (method === "POST" && route === "/api/auth/resend-verification") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const rate = checkRateLimit(db, `verify:${auth.user.id}`, { maxPoints: 3, windowMs: 15 * 60 * 1000 });
    if (!rate.allowed) {
      return sendJson(res, 429, { ok: false, error: "Please wait a few minutes before requesting another verification email." });
    }

    const verification = createEmailVerification(db, auth.user.id);
    return sendJson(res, 200, {
      ok: true,
      message: "Verification email sent",
      verificationToken: verification.token
    });
  }

  // 9. POST /api/auth/forgot-password
  if (method === "POST" && route === "/api/auth/forgot-password") {
    const rate = checkRateLimit(db, `ip:forgot:${ip}`, { maxPoints: 5, windowMs: 15 * 60 * 1000 });
    if (!rate.allowed) {
      return sendJson(res, 429, { ok: false, error: "Too many requests. Please try again later." });
    }

    const body = await readJsonBody(req);
    const result = requestPasswordReset(db, body.email);
    // Generic response prevents account enumeration
    return sendJson(res, 200, {
      ok: true,
      message: "If that email exists in our system, password reset instructions have been sent.",
      resetToken: result.resetToken // Provided for dev / automated test environment
    });
  }

  // 10. POST /api/auth/reset-password
  if (method === "POST" && route === "/api/auth/reset-password") {
    const body = await readJsonBody(req);
    try {
      await resetPasswordWithToken(db, body.token, body.password);
      const clearSession = serializeCookie(COOKIE_SESSION_NAME, "", { maxAge: 0, secure: isSecure });
      return sendJson(res, 200, {
        ok: true,
        message: "Your password has been reset successfully. Please log in with your new password."
      }, [clearSession]);
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 11. POST /api/auth/change-password
  if (method === "POST" && route === "/api/auth/change-password") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const body = await readJsonBody(req);
    try {
      await changeUserPassword(db, auth.user.id, body.currentPassword, body.newPassword);
      // Revoke other sessions, rotate current
      const cookies = parseCookies(req.headers?.cookie || "");
      const currentToken = cookies[COOKIE_SESSION_NAME];
      revokeAllUserSessions(db, auth.user.id, currentToken);

      return sendJson(res, 200, { ok: true, message: "Password updated successfully" });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 12. GET /api/auth/google
  if (method === "GET" && route === "/api/auth/google") {
    try {
      const urlObj = new URL(req.url, "http://localhost");
      const returnUrl = urlObj.searchParams.get("returnUrl") || "/";
      const { url } = createGoogleOAuthUrl(db, returnUrl);
      if (typeof res.writeHead === "function") {
        res.writeHead(302, { Location: url });
        return res.end();
      }
      return sendJson(res, 200, { ok: true, url });
    } catch (err) {
      return sendJson(res, 400, {
        ok: false,
        error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
      });
    }
  }

  // 13. GET /api/auth/google/callback
  if (method === "GET" && route === "/api/auth/google/callback") {
    const urlObj = new URL(req.url, "http://localhost");
    const code = urlObj.searchParams.get("code");
    const state = urlObj.searchParams.get("state");

    try {
      const { sessionToken, returnUrl } = await handleGoogleOAuthCallback(db, code, state);
      const sessionCookie = serializeCookie(COOKIE_SESSION_NAME, sessionToken, {
        maxAge: SESSION_DURATION_REMEMBER,
        secure: isSecure
      });

      if (typeof res.writeHead === "function") {
        res.writeHead(302, {
          Location: returnUrl.startsWith("/") ? returnUrl : "/",
          "Set-Cookie": sessionCookie
        });
        return res.end();
      }
      return sendJson(res, 200, { ok: true, returnUrl }, [sessionCookie]);
    } catch (err) {
      if (typeof res.writeHead === "function") {
        res.writeHead(302, { Location: `/#/login?error=${encodeURIComponent(err.message)}` });
        return res.end();
      }
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // --- Profile Routes ---
  // 14. GET /api/profiles
  if (method === "GET" && route === "/api/profiles") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const profiles = getUserProfiles(db, auth.user.id);
    return sendJson(res, 200, { ok: true, profiles });
  }

  // 15. POST /api/profiles
  if (method === "POST" && route === "/api/profiles") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const body = await readJsonBody(req);
    try {
      const profile = await createProfile(db, auth.user.id, body);
      return sendJson(res, 201, { ok: true, profile });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 16. PUT /api/profiles/:id or POST /api/profiles/update
  if ((method === "PUT" || method === "POST") && (route.startsWith("/api/profiles/") && !route.includes("/select") && !route.includes("/verify-pin"))) {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const profileId = route.split("/").pop();
    const body = await readJsonBody(req);
    try {
      const profile = await updateProfile(db, auth.user.id, profileId, body);
      return sendJson(res, 200, { ok: true, profile });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 17. DELETE /api/profiles/:id or POST /api/profiles/delete
  if ((method === "DELETE" && route.startsWith("/api/profiles/")) || (method === "POST" && route.endsWith("/delete"))) {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const parts = route.split("/");
    const profileId = method === "DELETE" ? parts.pop() : parts[parts.length - 2];
    try {
      deleteProfile(db, auth.user.id, profileId);
      return sendJson(res, 200, { ok: true, message: "Profile deleted successfully" });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 18. POST /api/profiles/:id/select or /api/profiles/select
  if (method === "POST" && route.includes("/select")) {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const body = await readJsonBody(req);
    const parts = route.split("/");
    const profileId = parts.includes("select") && parts.indexOf("select") > 0 && parts[parts.indexOf("select") - 1] !== "profiles"
      ? parts[parts.indexOf("select") - 1]
      : body.profileId;

    const profiles = getUserProfiles(db, auth.user.id);
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return sendJson(res, 404, { ok: false, error: "Profile not found" });

    // If profile has PIN, verify it
    if (profile.hasPin) {
      const pinValid = await verifyProfilePin(db, auth.user.id, profile.id, body.pin);
      if (!pinValid) {
        return sendJson(res, 403, { ok: false, error: "Incorrect profile PIN", requiresPin: true });
      }
    }

    const profileCookie = serializeCookie(COOKIE_PROFILE_NAME, profile.id, {
      maxAge: SESSION_DURATION_REMEMBER,
      secure: isSecure,
      httpOnly: false
    });

    return sendJson(res, 200, { ok: true, activeProfile: profile }, [profileCookie]);
  }

  // 19. POST /api/profiles/:id/verify-pin
  if (method === "POST" && route.includes("/verify-pin")) {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const body = await readJsonBody(req);
    const parts = route.split("/");
    const profileId = parts[parts.indexOf("verify-pin") - 1] || body.profileId;

    const valid = await verifyProfilePin(db, auth.user.id, profileId, body.pin);
    if (!valid) {
      return sendJson(res, 403, { ok: false, error: "Incorrect PIN" });
    }
    return sendJson(res, 200, { ok: true, verified: true });
  }

  // 20. GET /api/profile/watchlist & POST /api/profile/watchlist/toggle
  if (route === "/api/profile/watchlist") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const profiles = getUserProfiles(db, auth.user.id);
    const activeProfileId = getActiveProfileId(req, profiles);

    if (method === "GET") {
      const watchlist = getProfileWatchlist(db, activeProfileId);
      return sendJson(res, 200, { ok: true, watchlist });
    }
  }

  if (method === "POST" && route === "/api/profile/watchlist/toggle") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const profiles = getUserProfiles(db, auth.user.id);
    const activeProfileId = getActiveProfileId(req, profiles);
    const body = await readJsonBody(req);

    const result = toggleProfileWatchlist(db, activeProfileId, body.title, body.itemData);
    return sendJson(res, 200, { ok: true, ...result });
  }

  // 21. GET /api/profile/history & POST /api/profile/history
  if (route === "/api/profile/history") {
    const auth = getSessionFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" });

    const profiles = getUserProfiles(db, auth.user.id);
    const activeProfileId = getActiveProfileId(req, profiles);

    if (method === "GET") {
      const history = getProfilePlaybackHistory(db, activeProfileId);
      return sendJson(res, 200, { ok: true, history });
    }

    if (method === "POST") {
      const body = await readJsonBody(req);
      saveProfilePlaybackProgress(db, activeProfileId, body);
      return sendJson(res, 200, { ok: true });
    }
  }

  return false; // Route not matched by auth handler
}
