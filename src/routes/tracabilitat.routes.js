const express = require("express");

const router = express.Router();

const tracabilitatController = require("../controllers/tracabilitat.controller");

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

router.use(establirOrganitzacioActiva);

// =====================================================
// SINCRONITZAR KM D'UNA RESERVA
// =====================================================
//
// SUPERADMIN
//   → qualsevol organització activa
//
// MASTER
//   → la seva organització
//
// TECNIC
//   → la seva organització
//
// BASIC
//   → no pot forçar sincronització manual
//
// =====================================================

router.post(
  "/reserves/:id/sync-kms",

  permetreRols("MASTER", "TECNIC"),

  tracabilitatController.sincronitzarKmsReserva,
);

// =====================================================
// TRAJECTÒRIA GPS D'UNA RESERVA
// =====================================================
//
// BASIC
//   → només la seva reserva
//
// TECNIC
//   → només reserves del seu servei
//
// MASTER
//   → totes les reserves de l'organització
//
// SUPERADMIN
//   → totes les reserves de l'organització activa
//
// La comprovació concreta de reserva / servei / usuari
// s'ha de fer al controlador.
//
// =====================================================

router.get(
  "/reserves/:id/trajectoria",

  permetreRols("BASIC", "TECNIC", "MASTER", "SUPERADMIN"),

  tracabilitatController.obtenirTrajectoriaReserva,
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;
