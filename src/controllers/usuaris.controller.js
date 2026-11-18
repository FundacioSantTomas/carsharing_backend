const usuarisService = require("../services/usuaris.service");

const globalsatUsuarisService = require(
  "../integrations/globalsat/globalsat-usuaris.service",
);

// =====================================================
// OBTENIR ORGANITZACIÓ ACTIVA
// =====================================================

function obtenirOrganitzacioId(req, res) {
  const organitzacioId = Number(
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
// SINCRONITZAR USUARIS GLOBALSAT
// =====================================================

async function sincronitzarUsuaris(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const resultat =
      await globalsatUsuarisService.sincronitzarUsuaris(
        organitzacioId,
      );

    res.json({
      ok: true,
      message:
        "Usuaris sincronitzats correctament",
      data: resultat,
    });
  } catch (error) {
    console.error(
      "Error sincronitzant usuaris:",
      error,
    );

    res.status(400).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// OBTENIR USUARIS
// =====================================================

async function obtenirUsuaris(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const rol = String(
      req.user.rol || "",
    ).toUpperCase();

    let serveiId = null;
    let usuariId = null;

    // BASIC: només ell mateix
    if (rol === "BASIC") {
      usuariId =
        req.user.id;
    }

    // TECNIC: només usuaris
    // del seu servei
    if (rol === "TECNIC") {
      serveiId =
        req.user.serveiId;
    }

    const usuaris =
      await usuarisService.obtenirUsuaris(
        organitzacioId,
        {
          serveiId,
          usuariId,
        },
      );

    res.json({
      ok: true,
      data: usuaris,
    });
  } catch (error) {
    console.error(
      "Error obtenint usuaris:",
      error,
    );

    res.status(500).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// OBTENIR USUARI PER ID
// =====================================================

async function obtenirUsuariPerId(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const usuari =
      await usuarisService.obtenirUsuariPerId(
        req.params.id,
        organitzacioId,
      );

    if (!usuari) {
      return res
        .status(404)
        .json({
          ok: false,
          message:
            "Usuari no trobat",
        });
    }

    const rol = String(
      req.user.rol || "",
    ).toUpperCase();

    if (
      rol === "BASIC" &&
      Number(usuari.id) !==
        Number(req.user.id)
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "No tens permisos per veure aquest usuari",
        });
    }

    if (
      rol === "TECNIC" &&
      Number(
        usuari.servei_id,
      ) !==
        Number(
          req.user.serveiId,
        )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "Només pots veure usuaris del teu servei",
        });
    }

    res.json({
      ok: true,
      data: usuari,
    });
  } catch (error) {
    console.error(
      "Error obtenint usuari:",
      error,
    );

    res.status(500).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// CREAR USUARI
// =====================================================

async function crearUsuari(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const rolActual = String(
      req.user.rol || "",
    ).toUpperCase();

    const rolNou = String(
      req.body.rol ||
        "BASIC",
    ).toUpperCase();

    if (
      rolActual === "MASTER" &&
      (
        rolNou ===
          "SUPERADMIN" ||
        rolNou ===
          "MASTER"
      )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "Un MASTER només pot crear usuaris TECNIC o BASIC",
        });
    }

    const usuari =
      await usuarisService.crearUsuari(
        organitzacioId,
        req.body,
      );

    res
      .status(201)
      .json({
        ok: true,
        message:
          "Usuari creat correctament",
        data: usuari,
      });
  } catch (error) {
    console.error(
      "Error creant usuari:",
      error,
    );

    res.status(400).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// ACTUALITZAR USUARI
// =====================================================

async function actualitzarUsuari(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const actual =
      await usuarisService.obtenirUsuariPerId(
        req.params.id,
        organitzacioId,
      );

    if (!actual) {
      return res
        .status(404)
        .json({
          ok: false,
          message:
            "Usuari no trobat",
        });
    }

    const rolActual = String(
      req.user.rol || "",
    ).toUpperCase();

    const rolDesti = String(
      req.body.rol ??
        actual.rol,
    ).toUpperCase();

    if (
      rolActual === "MASTER" &&
      (
        String(
          actual.rol || "",
        ).toUpperCase() ===
          "SUPERADMIN" ||
        String(
          actual.rol || "",
        ).toUpperCase() ===
          "MASTER"
      )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "No pots modificar aquest usuari",
        });
    }

    if (
      rolActual === "MASTER" &&
      (
        rolDesti ===
          "SUPERADMIN" ||
        rolDesti ===
          "MASTER"
      )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "Un MASTER només pot assignar els rols TECNIC o BASIC",
        });
    }

    const usuari =
      await usuarisService.actualitzarUsuari(
        req.params.id,
        organitzacioId,
        req.body,
      );

    res.json({
      ok: true,
      message:
        "Usuari actualitzat correctament",
      data: usuari,
    });
  } catch (error) {
    console.error(
      "Error actualitzant usuari:",
      error,
    );

    res.status(400).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// CANVIAR CONTRASENYA
// =====================================================

async function canviarContrasenya(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    await usuarisService.canviarContrasenya(
      req.params.id,
      organitzacioId,
      req.body.password,
    );

    res.json({
      ok: true,
      message:
        "Contrasenya actualitzada correctament",
    });
  } catch (error) {
    console.error(
      "Error canviant contrasenya:",
      error,
    );

    res.status(400).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// ACTIVAR USUARI
// =====================================================

async function activarUsuari(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    const usuari =
      await usuarisService.activarUsuari(
        req.params.id,
        organitzacioId,
      );

    res.json({
      ok: true,
      message:
        "Usuari activat correctament",
      data: usuari,
    });
  } catch (error) {
    console.error(
      "Error activant usuari:",
      error,
    );

    res.status(400).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// DESACTIVAR USUARI
// =====================================================

async function desactivarUsuari(
  req,
  res,
) {
  try {
    const organitzacioId =
      obtenirOrganitzacioId(
        req,
        res,
      );

    if (!organitzacioId) {
      return;
    }

    if (
      Number(
        req.params.id,
      ) ===
      Number(
        req.user.id,
      )
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          message:
            "No pots desactivar el teu propi usuari",
        });
    }

    const usuari =
      await usuarisService.desactivarUsuari(
        req.params.id,
        organitzacioId,
      );

    res.json({
      ok: true,
      message:
        "Usuari desactivat correctament",
      data: usuari,
    });
  } catch (error) {
    console.error(
      "Error desactivant usuari:",
      error,
    );

    res.status(400).json({
      ok: false,
      message:
        error.message,
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarUsuaris,

  obtenirUsuaris,
  obtenirUsuariPerId,

  crearUsuari,
  actualitzarUsuari,
  canviarContrasenya,

  activarUsuari,
  desactivarUsuari,
};