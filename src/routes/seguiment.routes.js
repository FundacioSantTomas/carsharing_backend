const express = require("express");

const seguimentController = require("../controllers/seguiment.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");

const router = express.Router();

// =====================================================
// MIDDLEWARES
// =====================================================

router.use(autenticarToken);

router.use(establirOrganitzacioActiva);

// =====================================================
// CONSULTAR SEGUIMENT VEHICLE
// =====================================================

router.get(
  "/vehicles/:vehicleId",
  permetreRols("SUPERADMIN", "MASTER"),
  seguimentController.consultarSeguimentVehicle,
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;
