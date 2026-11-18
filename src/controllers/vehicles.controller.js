const vehiclesService = require("../services/vehicles.service");


// =====================================================
// ORGANITZACIÓ
// =====================================================

function obtenirOrganitzacioActiva(req, res) {
  const organitzacioId =
    Number(req.organitzacioId);

  if (
    !Number.isInteger(
      organitzacioId,
    ) ||
    organitzacioId <= 0
  ) {
    res.status(400).json({
      ok: false,
      message:
        "Cal seleccionar una organització activa",
    });

    return null;
  }

  return organitzacioId;
}


// =====================================================
// OBTENIR VEHICLES
// =====================================================

async function obtenirVehicles(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioActiva(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const vehicles =
      await vehiclesService.obtenirVehicles(
        organitzacioId,
        req.query,
      );

    res.json({
      ok: true,
      data: vehicles,
    });
  } catch (error) {
    console.error(
      "Error obtenint vehicles:",
      error,
    );

    const errorClient =
      error.message ===
      "El filtre booleà indicat no és vàlid";

    res.status(
      errorClient
        ? 400
        : 500,
    ).json({
      ok: false,

      message:
        error.message ||
        "Error obtenint vehicles",
    });
  }
}


// =====================================================
// OBTENIR VEHICLE
// =====================================================

async function obtenirVehicle(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioActiva(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const vehicle =
      await vehiclesService.obtenirVehiclePerId(
        req.params.id,
        organitzacioId,
      );

    if (!vehicle) {
      return res.status(
        404,
      ).json({
        ok: false,
        message:
          "Vehicle no trobat",
      });
    }

    res.json({
      ok: true,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Error obtenint vehicle:",
      error,
    );

    res.status(
      500,
    ).json({
      ok: false,

      message:
        error.message ||
        "Error obtenint el vehicle",
    });
  }
}


// =====================================================
// SINCRONITZAR VEHICLES GLOBALSAT
// =====================================================
//
// Lògica del service:
//
// - vehicle nou
//      reservable = false
//
// - vehicle existent
//      conserva reservable
//      conserva configuració manual
//
// - només actualitza dades de Globalsat
//

async function sincronitzarVehiclesGlobalsat(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioActiva(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const resultat =
      await vehiclesService.sincronitzarVehiclesGlobalsat(
        organitzacioId,
      );

    res.json({
      ok: true,

      message:
        "Vehicles sincronitzats correctament",

      data:
        resultat,
    });
  } catch (error) {
    console.error(
      "Error sincronitzant vehicles de Globalsat:",
      error,
    );

    res.status(
      500,
    ).json({
      ok: false,

      message:
        error.message ||
        "No s'han pogut sincronitzar els vehicles de Globalsat",
    });
  }
}


// =====================================================
// ACTUALITZAR VEHICLE
// =====================================================

async function actualitzarVehicle(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioActiva(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const vehicle =
      await vehiclesService.actualitzarVehicle(
        req.params.id,
        organitzacioId,
        req.body,
      );

    res.json({
      ok: true,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Error actualitzant vehicle:",
      error,
    );

    const errorClient =
      error.message ===
        "Vehicle no trobat" ||
      error.message ===
        "El nombre de places no és vàlid";

    res.status(
      errorClient
        ? 400
        : 500,
    ).json({
      ok: false,

      message:
        error.message ||
        "Error actualitzant el vehicle",
    });
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirVehicles,
  obtenirVehicle,
  sincronitzarVehiclesGlobalsat,
  actualitzarVehicle,
};