const bloquejosService = require("../services/bloquejos.service");

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
// OBTENIR BLOQUEJOS
// =====================================================

async function obtenirBloquejos(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const { vehicleId, desde, fins, actiu } = req.query;

    const bloquejos = await bloquejosService.obtenirBloquejos(organitzacioId, {
      vehicleId,
      desde,
      fins,
      actiu,
    });

    res.json({
      ok: true,
      data: bloquejos,
    });
  } catch (error) {
    console.error("Error obtenint bloquejos:", error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// OBTENIR BLOQUEIG PER ID
// =====================================================

async function obtenirBloqueigPerId(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const bloqueig = await bloquejosService.obtenirBloqueigPerId(
      req.params.id,
      organitzacioId,
    );

    if (!bloqueig) {
      return res.status(404).json({
        ok: false,
        message: "Bloqueig no trobat",
      });
    }

    res.json({
      ok: true,
      data: bloqueig,
    });
  } catch (error) {
    console.error("Error obtenint bloqueig:", error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// CREAR BLOQUEIG
// =====================================================

async function crearBloqueig(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const { vehicleId, inici, fi, motiu, observacions } = req.body;

    if (!vehicleId || !inici || !fi) {
      return res.status(400).json({
        ok: false,
        message: "Cal indicar vehicle, inici i fi",
      });
    }

    const bloqueig = await bloquejosService.crearBloqueig({
      organitzacioId,
      vehicleId,
      inici,
      fi,
      motiu,
      observacions,
      creatPer: req.user.id,
    });

    res.status(201).json({
      ok: true,
      message: "Bloqueig creat correctament",
      data: bloqueig,
    });
  } catch (error) {
    console.error("Error creant bloqueig:", error);

    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// ACTUALITZAR BLOQUEIG
// =====================================================

async function actualitzarBloqueig(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const bloqueig = await bloquejosService.actualitzarBloqueig(
      req.params.id,
      req.body,
      organitzacioId,
    );

    if (!bloqueig) {
      return res.status(404).json({
        ok: false,
        message: "Bloqueig no trobat",
      });
    }

    res.json({
      ok: true,
      message: "Bloqueig actualitzat correctament",
      data: bloqueig,
    });
  } catch (error) {
    console.error("Error actualitzant bloqueig:", error);

    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

// =====================================================
// ELIMINAR BLOQUEIG
// =====================================================

async function eliminarBloqueig(req, res) {
  try {
    const organitzacioId = obtenirOrganitzacioId(req, res);

    if (!organitzacioId) {
      return;
    }

    const bloqueig = await bloquejosService.eliminarBloqueig(
      req.params.id,
      organitzacioId,
    );

    if (!bloqueig) {
      return res.status(404).json({
        ok: false,
        message: "Bloqueig no trobat",
      });
    }

    res.json({
      ok: true,
      message: "Bloqueig eliminat correctament",
      data: bloqueig,
    });
  } catch (error) {
    console.error("Error eliminant bloqueig:", error);

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
  obtenirBloquejos,
  obtenirBloqueigPerId,
  crearBloqueig,
  actualitzarBloqueig,
  eliminarBloqueig,
};
