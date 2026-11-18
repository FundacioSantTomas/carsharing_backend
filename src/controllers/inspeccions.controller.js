const inspeccionsService =
  require("../services/inspeccions.service");


// =====================================================
// ORGANITZACIÓ
// =====================================================

function obtenirOrganitzacioActiva(
  req,
  res,
) {
  const organitzacioId =
    Number(
      req.organitzacioId,
    );

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
// OBTENIR INSPECCIONS
// =====================================================

async function obtenirInspeccions(
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

    const inspeccions =
      await inspeccionsService.obtenirInspeccions(
        organitzacioId,
        req.query,
      );

    return res.json({
      ok: true,
      data: inspeccions,
    });
  } catch (error) {
    console.error(
      "Error obtenint inspeccions:",
      error,
    );

    return res.status(500).json({
      ok: false,
      message:
        error.message ||
        "Error obtenint inspeccions",
    });
  }
}


// =====================================================
// OBTENIR INSPECCIÓ
// =====================================================

async function obtenirInspeccio(
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

    const inspeccio =
      await inspeccionsService.obtenirInspeccioPerId(
        req.params.id,
        organitzacioId,
      );

    if (!inspeccio) {
      return res.status(404).json({
        ok: false,
        message:
          "Inspecció no trobada",
      });
    }

    return res.json({
      ok: true,
      data: inspeccio,
    });
  } catch (error) {
    console.error(
      "Error obtenint inspecció:",
      error,
    );

    return res.status(500).json({
      ok: false,
      message:
        error.message ||
        "Error obtenint la inspecció",
    });
  }
}


// =====================================================
// CREAR INSPECCIÓ
// =====================================================

async function crearInspeccio(
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

    const inspectorId =
      Number(
        req.user?.id,
      );

    if (
      !Number.isInteger(
        inspectorId,
      ) ||
      inspectorId <= 0
    ) {
      return res.status(401).json({
        ok: false,
        message:
          "No s'ha pogut identificar l'inspector",
      });
    }

    const inspeccio =
      await inspeccionsService.crearInspeccio({
        organitzacioId,

        inspectorId,

        vehicleId:
          Number(
            req.body.vehicleId,
          ),

        kms:
          req.body.kms,

        exterior:
          req.body.exterior,

        interior:
          req.body.interior,

        pneumatics:
          req.body.pneumatics,

        llums:
          req.body.llums,

        neteja:
          req.body.neteja,

        documentacio:
          req.body.documentacio,

        observacions:
          req.body.observacions,
      });

    return res.status(201).json({
      ok: true,
      data: inspeccio,
    });
  } catch (error) {
    console.error(
      "Error creant inspecció:",
      error,
    );

    const esErrorClient =
      error.message?.includes(
        "ha d'estar entre 1 i 5",
      ) ||
      error.message ===
        "Cal indicar el vehicle" ||
      error.message ===
        "Cal indicar l'inspector" ||
      error.message ===
        "El valor de quilòmetres no és vàlid" ||
      error.message ===
        "El vehicle no existeix, no està actiu o no és inspeccionable" ||
      error.message ===
        "L'inspector no existeix o no pertany a l'organització";

    return res
      .status(
        esErrorClient
          ? 400
          : 500,
      )
      .json({
        ok: false,
        message:
          error.message ||
          "Error creant la inspecció",
      });
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirInspeccions,
  obtenirInspeccio,
  crearInspeccio,
};