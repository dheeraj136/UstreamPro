import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../lib/db.js";
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
  checkRateLimit,
  resetRateLimit,
  validateEmail,
  validatePasswordStrength,
  hashToken,
  timingSafeMatch
} from "../lib/auth-service.js";
import { handleAuthRoute } from "../lib/auth-routes.js";

function makeMockReqRes(options = {}) {
  const req = {
    method: options.method || "GET",
    url: options.url || "/",
    headers: options.headers || {},
    body: options.body || null,
    on: (event, handler) => {
      if (event === "data" && options.rawBody) {
        handler(Buffer.from(options.rawBody));
      }
      if (event === "end") {
        handler();
      }
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    ended: false,
    body: null,
    setHeader: (name, value) => {
      res.headers[name.toLowerCase()] = value;
    },
    writeHead: (status, headers = {}) => {
      res.statusCode = status;
      for (const [k, v] of Object.entries(headers)) {
        res.headers[k.toLowerCase()] = v;
      }
    },
    end: (chunk) => {
      res.ended = true;
      if (chunk) res.body = chunk;
      return res;
    },
    json: (obj) => {
      res.ended = true;
      res.body = JSON.stringify(obj);
      return res;
    }
  };

  return { req, res };
}

test("1. Password validation and email formatting checks", () => {
  assert.equal(validateEmail("user@example.com"), true);
  assert.equal(validateEmail("invalid-email"), false);
  assert.equal(validateEmail(""), false);
  assert.equal(validateEmail("user@ustream.tv"), true);

  const strongPass = validatePasswordStrength("SecureP@ssw0rd123");
  assert.equal(strongPass.valid, true);

  const shortPass = validatePasswordStrength("short1A");
  assert.equal(shortPass.valid, false);

  const noDigitPass = validatePasswordStrength("NoDigitsHereAtAll");
  assert.equal(noDigitPass.valid, false);
});

test("2. User Registration and automatic primary profile creation", async () => {
  const db = createDatabase(":memory:");
  const { user, profile, verificationToken } = await registerUser(db, {
    email: "alex@ustream.tv",
    password: "Password123!",
    name: "Alex"
  });

  assert.ok(user.id);
  assert.equal(user.email, "alex@ustream.tv");
  assert.equal(user.email_verified, 0);
  assert.ok(verificationToken);

  // Password should NOT be in user object
  assert.equal(user.passwordHash, undefined);

  // Check profile created
  assert.ok(profile.id);
  assert.equal(profile.user_id, user.id);
  assert.equal(profile.name, "Alex");
  assert.equal(profile.is_primary, 1);

  // Duplicate email registration should fail
  await assert.rejects(
    async () => {
      await registerUser(db, { email: "alex@ustream.tv", password: "Password123!", name: "Alex 2" });
    },
    /already exists/
  );
});

test("3. Authentication, timing-safe verification and session creation", async () => {
  const db = createDatabase(":memory:");
  await registerUser(db, {
    email: "sam@ustream.tv",
    password: "MySecurePassword2026!",
    name: "Sam"
  });

  // Valid credentials
  const user = await authenticateUser(db, "sam@ustream.tv", "MySecurePassword2026!");
  assert.ok(user);
  assert.equal(user.email, "sam@ustream.tv");

  // Invalid password -> null (enumeration safe)
  const failedAuth = await authenticateUser(db, "sam@ustream.tv", "WrongPassword!");
  assert.equal(failedAuth, null);

  // Non-existent email -> null
  const unknownAuth = await authenticateUser(db, "nobody@ustream.tv", "SomePassword!");
  assert.equal(unknownAuth, null);

  // Create session
  const session = createSession(db, user.id, {
    userAgent: "Mozilla/5.0 TestBrowser",
    ipAddress: "192.168.1.50",
    rememberMe: true
  });

  assert.ok(session.token);

  // Validate session token
  const auth = validateSession(db, session.token);
  assert.ok(auth);
  assert.equal(auth.user.id, user.id);
  assert.equal(auth.session.isRememberMe, true);
  assert.equal(auth.session.userAgent, "Mozilla/5.0 TestBrowser");

  // Session rotation on login
  const rotated = rotateSession(db, session.token, user.id, {
    userAgent: "Mozilla/5.0 RotatedBrowser",
    ipAddress: "192.168.1.51",
    rememberMe: true
  });
  assert.ok(rotated.token);
  assert.notEqual(rotated.token, session.token);

  // Old session token should now be invalid
  const oldValidation = validateSession(db, session.token);
  assert.equal(oldValidation, null);

  // New rotated session is valid
  const newValidation = validateSession(db, rotated.token);
  assert.ok(newValidation);
});

test("4. Brute-force protection and rate limiting", () => {
  const db = createDatabase(":memory:");
  const key = "ip:login:127.0.0.1";

  for (let i = 0; i < 5; i++) {
    const rate = checkRateLimit(db, key, { maxPoints: 5, windowMs: 60000 });
    assert.equal(rate.allowed, true);
  }

  // 6th attempt should be blocked
  const blockedRate = checkRateLimit(db, key, { maxPoints: 5, windowMs: 60000 });
  assert.equal(blockedRate.allowed, false);

  // Reset rate limit
  resetRateLimit(db, key);
  const resetCheck = checkRateLimit(db, key, { maxPoints: 5, windowMs: 60000 });
  assert.equal(resetCheck.allowed, true);
});

test("5. Email verification token generation, expiration, and verification", () => {
  const db = createDatabase(":memory:");
  const reg = registerUser(db, {
    email: "verify@ustream.tv",
    password: "Password123!",
    name: "Verifier"
  });

  return reg.then(({ user, verificationToken }) => {
    // Verify with valid token
    const result = verifyEmailToken(db, verificationToken);
    assert.equal(result.success, true);

    // Check user is now verified
    const updatedUser = db.prepare("SELECT email_verified FROM users WHERE id = ?").get(user.id);
    assert.equal(updatedUser.email_verified, 1);

    // Single-use: using the token again should fail
    const reuseResult = verifyEmailToken(db, verificationToken);
    assert.equal(reuseResult.success, false);
  });
});

test("6. Single-use hashed password reset token and session invalidation", async () => {
  const db = createDatabase(":memory:");
  const { user } = await registerUser(db, {
    email: "reset@ustream.tv",
    password: "OldPassword123!",
    name: "ResetTester"
  });

  // Create an active session
  const session = createSession(db, user.id);
  assert.ok(validateSession(db, session.token));

  // Request reset
  const resetRes = requestPasswordReset(db, "reset@ustream.tv");
  assert.ok(resetRes.resetToken);

  // Reset password
  await resetPasswordWithToken(db, resetRes.resetToken, "NewSecurePassword456!");

  // Old password should fail
  const oldLogin = await authenticateUser(db, "reset@ustream.tv", "OldPassword123!");
  assert.equal(oldLogin, null);

  // New password should succeed
  const newLogin = await authenticateUser(db, "reset@ustream.tv", "NewSecurePassword456!");
  assert.ok(newLogin);

  // Password reset must have revoked all existing sessions
  const sessionAfterReset = validateSession(db, session.token);
  assert.equal(sessionAfterReset, null);

  // Token is single-use, second attempt should fail
  await assert.rejects(
    async () => {
      await resetPasswordWithToken(db, resetRes.resetToken, "AnotherPassword789!");
    },
    /Invalid or expired/
  );
});

test("7. Multiple Viewer Profiles (Max 5, Kids Mode, Maturity Ratings, PIN Lock)", async () => {
  const db = createDatabase(":memory:");
  const { user } = await registerUser(db, {
    email: "family@ustream.tv",
    password: "FamilyPassword1!",
    name: "Family Head"
  });

  // Initial primary profile created
  let profiles = getUserProfiles(db, user.id);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].isPrimary, true);
  const primaryId = profiles[0].id;

  // Add 4 more profiles (Total: 5)
  const p2 = await createProfile(db, user.id, { name: "Kids Zone", avatar: "🐼", isKids: true, maturityRating: "G" });
  const p3 = await createProfile(db, user.id, { name: "Teen Zone", avatar: "🐯", isKids: false, maturityRating: "PG-13" });
  const p4 = await createProfile(db, user.id, { name: "Secret Zone", avatar: "🦁", pin: "1234" });
  const p5 = await createProfile(db, user.id, { name: "Guest Zone", avatar: "🚀" });

  profiles = getUserProfiles(db, user.id);
  assert.equal(profiles.length, 5);

  // 6th profile must fail (Max 5 limit)
  await assert.rejects(
    async () => {
      await createProfile(db, user.id, { name: "Too Many Profiles", avatar: "⚡" });
    },
    /Maximum of 5/
  );

  // Test PIN verification on p4
  assert.equal(await verifyProfilePin(db, user.id, p4.id, "1234"), true);
  assert.equal(await verifyProfilePin(db, user.id, p4.id, "0000"), false);
  assert.equal(await verifyProfilePin(db, user.id, p4.id, "wrong"), false);

  // Primary profile deletion should fail
  assert.throws(
    () => {
      deleteProfile(db, user.id, primaryId);
    },
    /Cannot delete the primary/
  );

  // Non-primary profile deletion succeeds
  deleteProfile(db, user.id, p5.id);
  profiles = getUserProfiles(db, user.id);
  assert.equal(profiles.length, 4);
});

test("8. Profile-scoped watchlist and playback history", async () => {
  const db = createDatabase(":memory:");
  const { user, profile: prof1 } = await registerUser(db, {
    email: "watcher@ustream.tv",
    password: "WatchPassword1!",
    name: "Watcher"
  });
  const prof2 = await createProfile(db, user.id, { name: "Profile 2", avatar: "🐼" });

  // Add to prof1 watchlist
  toggleProfileWatchlist(db, prof1.id, "Inception", { title: "Inception", year: 2010 });
  toggleProfileWatchlist(db, prof1.id, "Interstellar", { title: "Interstellar", year: 2014 });

  // Add different title to prof2 watchlist
  toggleProfileWatchlist(db, prof2.id, "Cyberpunk: Edgerunners", { title: "Cyberpunk: Edgerunners", year: 2022 });

  const wl1 = getProfileWatchlist(db, prof1.id);
  const wl2 = getProfileWatchlist(db, prof2.id);

  assert.equal(wl1.length, 2);
  assert.equal(wl1.some((w) => w.title === "Inception"), true);
  assert.equal(wl1.some((w) => w.title === "Cyberpunk: Edgerunners"), false);

  assert.equal(wl2.length, 1);
  assert.equal(wl2[0].title === "Cyberpunk: Edgerunners", true);

  // Playback history scoped to profile
  saveProfilePlaybackProgress(db, prof1.id, {
    title: "Inception",
    progress: 45,
    durationSeconds: 8880,
    season: 1,
    episode: 1
  });

  const hist1 = getProfilePlaybackHistory(db, prof1.id);
  const hist2 = getProfilePlaybackHistory(db, prof2.id);

  assert.equal(hist1.length, 1);
  assert.equal(hist1[0].title, "Inception");
  assert.equal(hist1[0].progress, 45);
  assert.equal(hist2.length, 0);
});

test("9. HTTP Auth Routes (Register, Login, Me, Profile Selection, Logout)", async () => {
  const db = createDatabase(":memory:");

  // Test HTTP POST /api/auth/register
  const { req: regReq, res: regRes } = makeMockReqRes({
    method: "POST",
    url: "/api/auth/register",
    rawBody: JSON.stringify({
      email: "httpuser@ustream.tv",
      password: "HttpPassword1!",
      name: "HttpUser"
    })
  });

  const regHandled = await handleAuthRoute(regReq, regRes, "/api/auth/register", db);
  assert.equal(regHandled, true);
  assert.equal(regRes.statusCode, 201);
  const regBody = JSON.parse(regRes.body);
  assert.equal(regBody.ok, true);
  assert.equal(regBody.user.email, "httpuser@ustream.tv");
  assert.ok(regRes.headers["set-cookie"]);

  // Extract session cookie
  const cookieHeader = Array.isArray(regRes.headers["set-cookie"])
    ? regRes.headers["set-cookie"].join("; ")
    : regRes.headers["set-cookie"];

  // Test HTTP GET /api/auth/me with session cookie
  const { req: meReq, res: meRes } = makeMockReqRes({
    method: "GET",
    url: "/api/auth/me",
    headers: { cookie: cookieHeader }
  });

  const meHandled = await handleAuthRoute(meReq, meRes, "/api/auth/me", db);
  assert.equal(meHandled, true);
  assert.equal(meRes.statusCode, 200);
  const meBody = JSON.parse(meRes.body);
  assert.equal(meBody.ok, true);
  assert.equal(meBody.user.email, "httpuser@ustream.tv");
  assert.equal(meBody.profiles.length, 1);

  // Test HTTP POST /api/auth/logout
  const { req: outReq, res: outRes } = makeMockReqRes({
    method: "POST",
    url: "/api/auth/logout",
    headers: { cookie: cookieHeader }
  });

  const outHandled = await handleAuthRoute(outReq, outRes, "/api/auth/logout", db);
  assert.equal(outHandled, true);
  assert.equal(outRes.statusCode, 200);

  // Session should now be revoked
  const { req: meReq2, res: meRes2 } = makeMockReqRes({
    method: "GET",
    url: "/api/auth/me",
    headers: { cookie: cookieHeader }
  });

  await handleAuthRoute(meReq2, meRes2, "/api/auth/me", db);
  const meBody2 = JSON.parse(meRes2.body);
  assert.equal(meBody2.user, null);
});

test("10. Auth HTTP routes do not leak reset/verification tokens in production and handle unconfigured Vercel DB", async () => {
  const priorNodeEnv = process.env.NODE_ENV;
  const priorExpose = process.env.USTREAM_EXPOSE_DEV_TOKENS;
  const priorVercel = process.env.VERCEL;
  process.env.NODE_ENV = "production";
  delete process.env.USTREAM_EXPOSE_DEV_TOKENS;
  try {
    const db = createDatabase(":memory:");
    const { req: regReq, res: regRes } = makeMockReqRes({
      method: "POST",
      url: "/api/auth/register",
      rawBody: JSON.stringify({
        email: "prodcheck@ustream.tv",
        password: "ProdPassword1!",
        name: "ProdUser"
      })
    });
    await handleAuthRoute(regReq, regRes, "/api/auth/register", db);
    assert.equal(regRes.statusCode, 201);
    const regBody = JSON.parse(regRes.body);
    assert.equal(regBody.verificationToken, undefined);

    const { req: forgotReq, res: forgotRes } = makeMockReqRes({
      method: "POST",
      url: "/api/auth/forgot-password",
      rawBody: JSON.stringify({ email: "prodcheck@ustream.tv" })
    });
    await handleAuthRoute(forgotReq, forgotRes, "/api/auth/forgot-password", db);
    assert.equal(forgotRes.statusCode, 200);
    const forgotBody = JSON.parse(forgotRes.body);
    assert.equal(forgotBody.resetToken, undefined);

    process.env.VERCEL = "1";
    const { req: meReq, res: meRes } = makeMockReqRes({ method: "GET", url: "/api/auth/me" });
    await handleAuthRoute(meReq, meRes, "/api/auth/me");
    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.body);
    assert.equal(meBody.authAvailable, false);
    assert.equal(meBody.user, null);

    const { req: loginReq, res: loginRes } = makeMockReqRes({
      method: "POST",
      url: "/api/auth/login",
      rawBody: JSON.stringify({ email: "prodcheck@ustream.tv", password: "ProdPassword1!" })
    });
    await handleAuthRoute(loginReq, loginRes, "/api/auth/login");
    assert.equal(loginRes.statusCode, 503);
  } finally {
    if (priorNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorNodeEnv;
    if (priorExpose === undefined) delete process.env.USTREAM_EXPOSE_DEV_TOKENS;
    else process.env.USTREAM_EXPOSE_DEV_TOKENS = priorExpose;
    if (priorVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = priorVercel;
  }
});
