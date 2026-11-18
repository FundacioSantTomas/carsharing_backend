const express = require("express");

const router = express.Router();

const serveisController = require("../controllers/serveis.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");

// =====================================================
// LOGIN
// =====================================================

router.use(autenticarToken);

// =====================================================
// ORGANITZACIÓ ACTIVA
// =====================================================

router.use(establirOrganitzacioActiva);

// =====================================================
// CONSULTAR SERVEIS
// =====================================================
//
// BASIC pot necessitar consultar els serveis
// per la pantalla de reserves.
//
// Tots els rols autenticats poden consultar.
//

router.get(
  "/",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
    "BASIC",
  ),
  serveisController.obtenirServeis,
);

router.get(
  "/:id",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
    "BASIC",
  ),
  serveisController.obtenirServeiPerId,
);

// =====================================================
// SINCRONITZAR SERVEIS
// =====================================================
//
// Només SUPERADMIN i MASTER.
//

router.post(
  "/sync",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
  ),
  serveisController.sincronitzarServeis,
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;