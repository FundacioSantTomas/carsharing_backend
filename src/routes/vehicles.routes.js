const express = require("express");

const vehiclesController =
  require("../controllers/vehicles.controller");

const {
  autenticarToken,
} = require("../middlewares/auth.middleware");

const {
  establirOrganitzacioActiva,
} = require("../middlewares/organitzacio.middleware");

const {
  permetreRols,
} = require("../middlewares/roles.middleware");

const router = express.Router();


// =====================================================
// MIDDLEWARES
// =====================================================

router.use(
  autenticarToken,
);

router.use(
  establirOrganitzacioActiva,
);


// =====================================================
// OBTENIR VEHICLES
// =====================================================
//
// BASIC necessita consultar els vehicles
// per poder fer reserves.
//
// Tots els rols autenticats poden consultar-los.
//

router.get(
  "/",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
    "BASIC",
  ),
  vehiclesController.obtenirVehicles,
);


// =====================================================
// SINCRONITZAR VEHICLES GLOBALSAT
// =====================================================
//
// Només SUPERADMIN i MASTER.
//
// IMPORTANT:
//
// - Vehicle nou:
//      reservable = false
//
// - Vehicle existent:
//      conserva el valor de reservable
//
// La sincronització NO ha de sobreescriure
// la configuració manual feta dins l'app.
//

router.post(
  "/sync-globalsat",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
  ),
  vehiclesController.sincronitzarVehiclesGlobalsat,
);


// =====================================================
// OBTENIR VEHICLE PER ID
// =====================================================
//
// IMPORTANT:
// Aquesta ruta ha d'anar DESPRÉS de /sync-globalsat,
// perquè "/:id" podria interpretar "sync-globalsat"
// com si fos un ID.
//

router.get(
  "/:id",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
    "BASIC",
  ),
  vehiclesController.obtenirVehicle,
);


// =====================================================
// ACTUALITZAR VEHICLE
// =====================================================
//
// BASIC i TECNIC no poden modificar vehicles.
//
// La gestió queda limitada a
// SUPERADMIN i MASTER.
//

router.put(
  "/:id",
  permetreRols(
    "SUPERADMIN",
    "MASTER",
  ),
  vehiclesController.actualitzarVehicle,
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;