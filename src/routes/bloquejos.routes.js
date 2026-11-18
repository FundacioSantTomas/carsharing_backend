const express = require("express");

const router = express.Router();

const bloquejosController = require("../controllers/bloquejos.controller");

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
// CONSULTAR BLOQUEJOS
// =====================================================

router.get(
  "/",

  permetreRols("MASTER", "TECNIC"),

  bloquejosController.obtenirBloquejos,
);

router.get(
  "/:id",

  permetreRols("MASTER", "TECNIC"),

  bloquejosController.obtenirBloqueigPerId,
);

// =====================================================
// CREAR BLOQUEIG
// =====================================================

router.post(
  "/",

  permetreRols("MASTER", "TECNIC"),

  bloquejosController.crearBloqueig,
);

// =====================================================
// ACTUALITZAR BLOQUEIG
// =====================================================

router.put(
  "/:id",

  permetreRols("MASTER", "TECNIC"),

  bloquejosController.actualitzarBloqueig,
);

// =====================================================
// ELIMINAR BLOQUEIG
// =====================================================

router.delete(
  "/:id",

  permetreRols("MASTER", "TECNIC"),

  bloquejosController.eliminarBloqueig,
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;
