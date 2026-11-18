const express = require("express");

const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");

const { autenticarToken } = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const { permetreRols } = require("../middlewares/roles.middleware");

router.use(autenticarToken);

router.use(establirOrganitzacioActiva);

router.get(
  "/",
  permetreRols("SUPERADMIN", "MASTER", "TECNIC"),
  dashboardController.obtenirDashboard,
);

module.exports = router;
