const express = require("express");

const router = express.Router();

const controller = require("../controllers/incidencies-reserva.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");

// =====================================================
// MIDDLEWARE GLOBAL
// =====================================================

router.use(autenticarToken);

router.use(establirOrganitzacioActiva);

// =====================================================
// INCIDÈNCIES D'UNA RESERVA
// =====================================================
//
// BASIC
//   - Pot crear incidències sobre les seves reserves
//   - Pot consultar incidències de reserva segons
//     les validacions del controlador
//
// TECNIC
//   - Pot crear incidències
//   - Pot consultar incidències del seu servei
//
// MASTER / SUPERADMIN
//   - Accés complet
//
// =====================================================

router.post(
  "/reserves/:id/incidencies",

  permetreRols("BASIC", "TECNIC", "MASTER", "SUPERADMIN"),

  controller.crearIncidencia,
);

router.get(
  "/reserves/:id/incidencies",

  permetreRols("BASIC", "TECNIC", "MASTER", "SUPERADMIN"),

  controller.obtenirIncidenciesReserva,
);

// =====================================================
// LLISTAT GENERAL D'INCIDÈNCIES
// =====================================================
//
// TECNIC:
//   només incidències del seu servei.
//   El filtre real es fa al controlador/service.
//
// MASTER:
//   totes les incidències de l'organització.
//
// SUPERADMIN:
//   totes les incidències de l'organització activa.
//
// =====================================================

router.get(
  "/incidencies",

  permetreRols("TECNIC", "MASTER", "SUPERADMIN"),

  controller.obtenirIncidencies,
);

// =====================================================
// DETALL INCIDÈNCIA
// =====================================================
//
// També permetem TECNIC perquè pugui consultar
// el detall d'una incidència del seu servei.
//
// IMPORTANT:
// el controlador ha de comprovar que la incidència
// pertany al seu servei.
//
// =====================================================

router.get(
  "/incidencies/:id",

  permetreRols("TECNIC", "MASTER", "SUPERADMIN"),

  controller.obtenirIncidencia,
);

// =====================================================
// ACTUALITZAR INCIDÈNCIA
// =====================================================
//
// Només administració.
//
// =====================================================

router.put(
  "/incidencies/:id",

  permetreRols("MASTER", "SUPERADMIN"),

  controller.actualitzarIncidencia,
);

// =====================================================
// RESOLDRE INCIDÈNCIA
// =====================================================
//
// Només administració.
//
// =====================================================

router.put(
  "/incidencies/:id/resoldre",

  permetreRols("MASTER", "SUPERADMIN"),

  controller.resoldreIncidencia,
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;
