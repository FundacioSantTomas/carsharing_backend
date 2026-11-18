const express = require("express");

const router = express.Router();

const organitzacionsController = require("../controllers/organitzacions.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");

// =====================================================
// LOGIN
// =====================================================

router.use(autenticarToken);

// =====================================================
// OBTENIR ORGANITZACIONS
// =====================================================

router.get(
  "/",
  permetreRols("SUPERADMIN"),
  organitzacionsController.obtenirOrganitzacions,
);

// =====================================================
// OBTENIR ORGANITZACIÓ PER ID
// =====================================================

router.get(
  "/:id",
  permetreRols("SUPERADMIN"),
  organitzacionsController.obtenirOrganitzacioPerId,
);

// =====================================================
// CREAR ORGANITZACIÓ
// =====================================================

router.post(
  "/",
  permetreRols("SUPERADMIN"),
  organitzacionsController.crearOrganitzacio,
);

// =====================================================
// ACTUALITZAR ORGANITZACIÓ
// =====================================================

router.put(
  "/:id",
  permetreRols("SUPERADMIN"),
  organitzacionsController.actualitzarOrganitzacio,
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;
