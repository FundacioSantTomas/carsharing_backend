const reportsService = require("../services/reports.service");

// =====================================================
// OBTENIR ORGANITZACIÓ
// =====================================================

function obtenirOrganitzacioId(req, res) {
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
// REPORT RESERVES
// =====================================================

async function reportReserves(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const { desde, fins, vehicleId, serveiId, usuariId, estat } = req.query;

    const rol = String(req.user.rol || "").toUpperCase();

    let serveiFiltre = serveiId;

    // -------------------------------------------------
    // TECNIC
    // -------------------------------------------------
    //
    // Encara que intenti enviar un altre servei,
    // sempre utilitzem el seu.
    // -------------------------------------------------

    if (rol === "TECNIC") {
      serveiFiltre = req.user.serveiId;
    }

    const resultat = await reportsService.reportReserves(organitzacioId, {
      desde,
      fins,
      vehicleId,

      serveiId: serveiFiltre,

      usuariId,
      estat,
    });

    res.json({
      ok: true,
      data: resultat,
    });
  } catch (error) {
    console.error("Error generant report de reserves:", error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// REPORT INSPECCIONS
// =====================================================

async function reportInspeccions(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const { desde, fins, vehicleId, inspectorId, resultat } = req.query;

    const dades = await reportsService.reportInspeccions(organitzacioId, {
      desde,
      fins,
      vehicleId,
      inspectorId,
      resultat,
    });

    res.json({
      ok: true,
      data: dades,
    });
  } catch (error) {
    console.error("Error generant report d'inspeccions:", error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  reportReserves,
  reportInspeccions,
};
