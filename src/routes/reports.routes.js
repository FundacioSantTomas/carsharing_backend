const express = require("express");

const router = express.Router();

const reportsController = require("../controllers/reports.controller");

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
// REPORT RESERVES
// =====================================================
//
// SUPERADMIN → organització activa
// MASTER     → tota empresa
// TECNIC     → només el seu servei
// BASIC      → sense accés
//

router.get(
  "/reserves",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
  ),
  reportsController.reportReserves,
);

// =====================================================
// REPORT INSPECCIONS
// =====================================================

router.get(
  "/inspeccions",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
  ),
  reportsController.reportInspeccions,
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;