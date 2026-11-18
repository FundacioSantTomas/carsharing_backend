const express = require("express");

const router = express.Router();

const reservesController = require("../controllers/reserves.controller");

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
// MASTER / TECNIC / BASIC:
// sempre utilitzen l'organització
// definida al JWT.
//

router.use(establirOrganitzacioActiva);

// =====================================================
// SINCRONITZAR RESERVES GLOBALSAT
// =====================================================
//
// IMPORTANT:
// Aquesta ruta ha d'anar abans de "/:id"
// perquè Express no interpreti
// "sync-globalsat" com un id.
//
// Només SUPERADMIN i MASTER.
//

router.post(
  "/sync-globalsat",
  permetreRols("SUPERADMIN", "MASTER"),
  reservesController.sincronitzarReservesGlobalsat,
);

// =====================================================
// OBTENIR RESERVES
// =====================================================
//
// El controller ja aplica els permisos:
//
// BASIC:
//   només les seves reserves
//
// TECNIC:
//   reserves del seu servei
//
// MASTER:
//   reserves de la seva organització
//
// SUPERADMIN:
//   reserves de l'organització activa
//

router.get(
  "/",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC", "BASIC"),
  reservesController.obtenirReserves,
);

// =====================================================
// OBTENIR UNA RESERVA
// =====================================================
//
// El controller comprova si l'usuari
// té accés a la reserva.
//

router.get(
  "/:id",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC", "BASIC"),
  reservesController.obtenirReservaPerId,
);

// =====================================================
// CREAR RESERVA
// =====================================================
//
// BASIC:
//   només pot crear una reserva per ell mateix.
//
// TECNIC:
//   només dins del seu servei.
//
// MASTER / SUPERADMIN:
//   poden seleccionar usuari.
//

router.post(
  "/",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC", "BASIC"),
  reservesController.crearReserva,
);

// =====================================================
// ACTUALITZAR RESERVA
// =====================================================
//
// BASIC:
//   només reserves pròpies.
//
// TECNIC:
//   només reserves del seu servei.
//

router.put(
  "/:id",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC", "BASIC"),
  reservesController.actualitzarReserva,
);

// =====================================================
// CANCEL·LAR RESERVA
// =====================================================
//
// BASIC:
//   només reserves pròpies.
//
// TECNIC:
//   només reserves del seu servei.
//

router.delete(
  "/:id",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC", "BASIC"),
  reservesController.cancelarReserva,
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;
