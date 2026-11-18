const express = require("express");

const router = express.Router();

const inspeccionsController = require("../controllers/inspeccions.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");


// =====================================================
// TOTES LES RUTES REQUEREIXEN LOGIN
// =====================================================

router.use(autenticarToken);


// =====================================================
// ESTABLIR ORGANITZACIÓ ACTIVA
// =====================================================
//
// SUPERADMIN:
// pot indicar-la amb:
//
// X-Organitzacio-Activa: 1
//
// MASTER / TECNIC:
// utilitzen l'organització definida al JWT.
//

router.use(establirOrganitzacioActiva);


// =====================================================
// OBTENIR INSPECCIONS
// =====================================================

router.get(
  "/",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
  ),
  inspeccionsController.obtenirInspeccions,
);


// =====================================================
// OBTENIR UNA INSPECCIÓ
// =====================================================

router.get(
  "/:id",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
  ),
  inspeccionsController.obtenirInspeccio,
);


// =====================================================
// CREAR INSPECCIÓ
// =====================================================

router.post(
  "/",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
  ),
  inspeccionsController.crearInspeccio,
);


// =====================================================
// EXPORTS
// =====================================================

module.exports = router;