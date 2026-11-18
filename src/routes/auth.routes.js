const express = require("express");
const { rateLimit } = require("express-rate-limit");

const authController = require("../controllers/auth.controller");

const router = express.Router();

// =====================================================
// LIMITAR INTENTS DE LOGIN PER IP
// =====================================================

const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  // Els accessos correctes no consumeixen el límit.
  skipSuccessfulRequests: true,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  statusCode: 429,

  message: {
    ok: false,
    message:
      "Massa intents d'accés. Torna-ho a provar més tard.",
  },
});

// =====================================================
// LOGIN
// =====================================================

router.post(
  "/login",
  limitarLogin,
  authController.login,
);

module.exports = router;