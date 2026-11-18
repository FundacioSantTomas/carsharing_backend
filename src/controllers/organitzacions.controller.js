const organitzacionsService = require("../services/organitzacions.service");

// =====================================================
// OBTENIR ORGANITZACIONS
// =====================================================

async function obtenirOrganitzacions(req, res) {
  try {
    const organitzacions = await organitzacionsService.obtenirOrganitzacions();

    res.json({
      ok: true,
      data: organitzacions,
    });
  } catch (error) {
    console.error("Error obtenint organitzacions:", error);

    res.status(500).json({
      ok: false,
      message: "Error obtenint les organitzacions",
    });
  }
}

// =====================================================
// OBTENIR ORGANITZACIÓ PER ID
// =====================================================

async function obtenirOrganitzacioPerId(req, res) {
  try {
    const organitzacio = await organitzacionsService.obtenirOrganitzacioPerId(
      req.params.id,
    );

    if (!organitzacio) {
      return res.status(404).json({
        ok: false,
        message: "Organització no trobada",
      });
    }

    res.json({
      ok: true,
      data: organitzacio,
    });
  } catch (error) {
    console.error("Error obtenint organització:", error);

    res.status(500).json({
      ok: false,
      message: "Error obtenint l'organització",
    });
  }
}

// =====================================================
// CREAR ORGANITZACIÓ
// =====================================================

async function crearOrganitzacio(req, res) {
  try {
    const { nom, codi } = req.body;

    if (!nom) {
      return res.status(400).json({
        ok: false,
        message: "Cal indicar el nom de l'organització",
      });
    }

    const organitzacio = await organitzacionsService.crearOrganitzacio({
      nom,
      codi,
    });

    res.status(201).json({
      ok: true,
      message: "Organització creada correctament",
      data: organitzacio,
    });
  } catch (error) {
    console.error("Error creant organització:", error);

    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// ACTUALITZAR ORGANITZACIÓ
// =====================================================

async function actualitzarOrganitzacio(req, res) {
  try {
    const organitzacio = await organitzacionsService.actualitzarOrganitzacio(
      req.params.id,
      req.body,
    );

    if (!organitzacio) {
      return res.status(404).json({
        ok: false,
        message: "Organització no trobada",
      });
    }

    res.json({
      ok: true,
      message: "Organització actualitzada correctament",
      data: organitzacio,
    });
  } catch (error) {
    console.error("Error actualitzant organització:", error);

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
  obtenirOrganitzacions,
  obtenirOrganitzacioPerId,
  crearOrganitzacio,
  actualitzarOrganitzacio,
};
