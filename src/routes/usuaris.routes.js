const express = require("express");

const router = express.Router();

const usuarisController = require("../controllers/usuaris.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");

// =====================================================
// AUTENTICACIÓ
// =====================================================

router.use(autenticarToken);

// =====================================================
// ORGANITZACIÓ ACTIVA
// =====================================================

router.use(establirOrganitzacioActiva);

// =====================================================
// SINCRONITZAR USUARIS
// =====================================================

router.post(
  "/sync",
  permetreRols("SUPERADMIN", "MASTER"),
  usuarisController.sincronitzarUsuaris,
);

// =====================================================
// CREAR USUARI
// =====================================================

router.post(
  "/",
  permetreRols("SUPERADMIN", "MASTER"),
  usuarisController.crearUsuari,
);

// =====================================================
// CANVIAR CONTRASENYA
// =====================================================

router.put(
  "/:id/password",
  permetreRols("SUPERADMIN", "MASTER"),
  usuarisController.canviarContrasenya,
);

// =====================================================
// ACTIVAR
// =====================================================

router.put(
  "/:id/activar",
  permetreRols("SUPERADMIN", "MASTER"),
  usuarisController.activarUsuari,
);

// =====================================================
// DESACTIVAR
// =====================================================

router.put(
  "/:id/desactivar",
  permetreRols("SUPERADMIN", "MASTER"),
  usuarisController.desactivarUsuari,
);

// =====================================================
// OBTENIR USUARIS
// =====================================================
//
// TECNIC pot consultar usuaris.
// El controller ja el limita
// als usuaris del seu servei.
//

router.get(
  "/",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC"),
  usuarisController.obtenirUsuaris,
);

// =====================================================
// OBTENIR USUARI PER ID
// =====================================================
//
// TECNIC només podrà consultar
// usuaris del seu servei perquè
// el controller ja ho comprova.
//

router.get(
  "/:id",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC"),
  usuarisController.obtenirUsuariPerId,
);

// =====================================================
// ACTUALITZAR USUARI
// =====================================================

router.put(
  "/:id",
  permetreRols("SUPERADMIN", "MASTER"),
  usuarisController.actualitzarUsuari,
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;
