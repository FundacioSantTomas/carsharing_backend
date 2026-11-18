const serveisService = require("../services/serveis.service");

// =====================================================
// OBTENIR ORGANITZACIÓ ACTIVA
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
// OBTENIR SERVEIS
// =====================================================

async function obtenirServeis(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const serveis = await serveisService.obtenirServeis(organitzacioId);

    res.json({
      ok: true,
      data: serveis,
    });
  } catch (error) {
    console.error("Error obtenint serveis:", error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// OBTENIR SERVEI PER ID
// =====================================================

async function obtenirServeiPerId(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const servei = await serveisService.obtenirServeiPerId(
      req.params.id,
      organitzacioId,
    );

    if (!servei) {
      return res.status(404).json({
        ok: false,
        message: "Servei no trobat",
      });
    }

    res.json({
      ok: true,
      data: servei,
    });
  } catch (error) {
    console.error("Error obtenint servei:", error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// SINCRONITZAR SERVEIS
// =====================================================

async function sincronitzarServeis(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const resultat = await serveisService.sincronitzarServeis(organitzacioId);

    res.json({
      ok: true,
      message: "Serveis sincronitzats correctament",
      data: resultat,
    });
  } catch (error) {
    console.error("Error sincronitzant serveis:", error);

    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirServeis,
  obtenirServeiPerId,
  sincronitzarServeis,
};
