const seguimentService = require("../services/seguiment.service");

// =====================================================
// ORGANITZACIÓ
// =====================================================

function obtenirOrganitzacioActiva(req, res) {
  const organitzacioId = Number(req.organitzacioId);

  if (!Number.isInteger(organitzacioId) || organitzacioId <= 0) {
    res.status(400).json({
      ok: false,

      message: "Cal seleccionar una organització activa",
    });

    return null;
  }

  return organitzacioId;
}

// =====================================================
// CONSULTAR SEGUIMENT
// =====================================================

async function consultarSeguimentVehicle(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioActiva(req, res);

    if (!organitzacioId) {
      return;
    }

    const vehicleId = Number(req.params.vehicleId);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return res.status(400).json({
        ok: false,

        message: "Vehicle no vàlid",
      });
    }

    const { desde, hasta, minutsParada } = req.query;

    const resultat = await seguimentService.consultarSeguimentVehicle({
      vehicleId,

      organitzacioId,

      desde,

      hasta,

      minutsParada: minutsParada ? Number(minutsParada) : 5,
    });

    res.json({
      ok: true,

      data: resultat,
    });
  } catch (error) {
    console.error("Error consultant seguiment:", error);

    const errorsClient = [
      "Vehicle no trobat",
      "Cal indicar el vehicle",
      "Cal indicar el període de consulta",
      "El període indicat no és vàlid",
      "La data final ha de ser posterior a la inicial",
      "Aquest vehicle no té activat el seguiment GPS",
    ];

    const esErrorClient = errorsClient.includes(error.message);

    res.status(esErrorClient ? 400 : 500).json({
      ok: false,

      message:
        error.message || "No s'ha pogut consultar el seguiment del vehicle",
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  consultarSeguimentVehicle,
};
