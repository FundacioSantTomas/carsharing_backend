const incidenciesService = require("../services/incidencies-reserva.service");

const reservesService = require("../services/reserves.service");

// =====================================================
// HELPERS
// =====================================================

function obtenirRol(req) {
  return String(req.user?.rol || "")
    .trim()
    .toUpperCase();
}

function obtenirUsuariId(req) {
  return Number(req.user?.id);
}

function obtenirServeiId(req) {
  const serveiId = req.user?.serveiId ?? req.user?.servei_id ?? null;

  if (serveiId === null || serveiId === undefined || serveiId === "") {
    return null;
  }

  const numero = Number(serveiId);

  return Number.isFinite(numero) ? numero : null;
}

// =====================================================
// VALIDAR ACCÉS A UNA RESERVA
// =====================================================

async function validarAccesReserva(req, reserva) {
  const rol = obtenirRol(req);

  const usuariId = obtenirUsuariId(req);

  const serveiId = obtenirServeiId(req);

  // ---------------------------------------------------
  // SUPERADMIN / MASTER
  // ---------------------------------------------------

  if (rol === "SUPERADMIN" || rol === "MASTER") {
    return {
      permes: true,
    };
  }

  // ---------------------------------------------------
  // BASIC
  // Només reserva pròpia
  // ---------------------------------------------------

  if (rol === "BASIC") {
    if (Number(reserva.usuari_id) !== usuariId) {
      return {
        permes: false,

        message: "No tens permisos per accedir a aquesta reserva",
      };
    }

    return {
      permes: true,
    };
  }

  // ---------------------------------------------------
  // TECNIC
  // Només reserves del seu servei
  // ---------------------------------------------------

  if (rol === "TECNIC") {
    if (!serveiId) {
      return {
        permes: false,

        message: "El tècnic no té cap servei assignat",
      };
    }

    if (Number(reserva.servei_id) !== serveiId) {
      return {
        permes: false,

        message: "No tens permisos per accedir a incidències d'un altre servei",
      };
    }

    return {
      permes: true,
    };
  }

  return {
    permes: false,

    message: "No tens permisos per realitzar aquesta acció",
  };
}

// =====================================================
// CREAR INCIDÈNCIA
// =====================================================

async function crearIncidencia(req, res) {
  try {
    const organitzacioId = req.organitzacioId;

    const usuariId = obtenirUsuariId(req);

    const reservaId = Number(req.params.id);

    // -------------------------------------------------
    // VALIDACIONS
    // -------------------------------------------------

    if (!organitzacioId) {
      return res.status(400).json({
        ok: false,

        message: "Cal indicar l'organització activa",
      });
    }

    if (!Number.isInteger(reservaId) || reservaId <= 0) {
      return res.status(400).json({
        ok: false,

        message: "La reserva no és vàlida",
      });
    }

    if (!Number.isInteger(usuariId) || usuariId <= 0) {
      return res.status(401).json({
        ok: false,

        message: "No s'ha pogut identificar l'usuari",
      });
    }

    // -------------------------------------------------
    // OBTENIR RESERVA
    // -------------------------------------------------

    const reserva = await reservesService.obtenirReservaPerId(
      reservaId,
      organitzacioId,
    );

    if (!reserva) {
      return res.status(404).json({
        ok: false,

        message: "Reserva no trobada",
      });
    }

    // -------------------------------------------------
    // COMPROVAR PERMISOS
    // -------------------------------------------------

    const acces = await validarAccesReserva(req, reserva);

    if (!acces.permes) {
      return res.status(403).json({
        ok: false,

        message: acces.message,
      });
    }

    // -------------------------------------------------
    // CREAR
    // -------------------------------------------------

    const incidencia = await incidenciesService.crearIncidencia({
      organitzacioId,

      reservaId,

      usuariId,

      tipus: req.body.tipus,

      prioritat: req.body.prioritat,

      descripcio: req.body.descripcio,
    });

    return res.status(201).json({
      ok: true,

      message: "Incidència comunicada correctament",

      data: incidencia,
    });
  } catch (error) {
    console.error("Error creant incidència:", error);

    return res.status(400).json({
      ok: false,

      message: error.message || "No s'ha pogut crear la incidència",
    });
  }
}

// =====================================================
// INCIDÈNCIES D'UNA RESERVA
// =====================================================

async function obtenirIncidenciesReserva(req, res) {
  try {
    const organitzacioId = req.organitzacioId;

    const reservaId = Number(req.params.id);

    if (!organitzacioId) {
      return res.status(400).json({
        ok: false,

        message: "Cal indicar l'organització activa",
      });
    }

    // -------------------------------------------------
    // OBTENIR RESERVA
    // -------------------------------------------------

    const reserva = await reservesService.obtenirReservaPerId(
      reservaId,
      organitzacioId,
    );

    if (!reserva) {
      return res.status(404).json({
        ok: false,

        message: "Reserva no trobada",
      });
    }

    // -------------------------------------------------
    // PERMISOS
    // -------------------------------------------------

    const acces = await validarAccesReserva(req, reserva);

    if (!acces.permes) {
      return res.status(403).json({
        ok: false,

        message: acces.message,
      });
    }

    // -------------------------------------------------
    // INCIDÈNCIES
    // -------------------------------------------------

    const dades = await incidenciesService.obtenirIncidenciesReserva(
      reservaId,
      organitzacioId,
    );

    return res.json({
      ok: true,

      data: dades,
    });
  } catch (error) {
    console.error("Error obtenint incidències de reserva:", error);

    return res.status(500).json({
      ok: false,

      message: error.message || "No s'han pogut obtenir les incidències",
    });
  }
}

// =====================================================
// LLISTAR INCIDÈNCIES
// =====================================================

async function obtenirIncidencies(req, res) {
  try {
    const organitzacioId = req.organitzacioId;

    const rol = obtenirRol(req);

    let serveiId = null;

    if (!organitzacioId) {
      return res.status(400).json({
        ok: false,

        message: "Cal indicar l'organització activa",
      });
    }

    // -------------------------------------------------
    // TECNIC
    // Forcem el filtre pel servei del JWT
    // -------------------------------------------------

    if (rol === "TECNIC") {
      serveiId = obtenirServeiId(req);

      if (!serveiId) {
        return res.status(403).json({
          ok: false,

          message: "El tècnic no té cap servei assignat",
        });
      }
    }

    // -------------------------------------------------
    // OBTENIR INCIDÈNCIES
    // -------------------------------------------------

    const dades = await incidenciesService.obtenirIncidencies({
      organitzacioId,

      estat: req.query.estat,

      prioritat: req.query.prioritat,

      tipus: req.query.tipus,

      serveiId,
    });

    return res.json({
      ok: true,

      data: dades,
    });
  } catch (error) {
    console.error("Error obtenint incidències:", error);

    return res.status(500).json({
      ok: false,

      message: error.message || "No s'han pogut obtenir les incidències",
    });
  }
}

// =====================================================
// DETALL INCIDÈNCIA
// =====================================================

async function obtenirIncidencia(req, res) {
  try {
    const organitzacioId = req.organitzacioId;

    const incidencia = await incidenciesService.obtenirIncidenciaPerId(
      Number(req.params.id),

      organitzacioId,
    );

    if (!incidencia) {
      return res.status(404).json({
        ok: false,

        message: "Incidència no trobada",
      });
    }

    // -------------------------------------------------
    // TECNIC:
    // comprovem la reserva per saber el servei
    // -------------------------------------------------

    if (obtenirRol(req) === "TECNIC") {
      const reserva = await reservesService.obtenirReservaPerId(
        incidencia.reserva_id,

        organitzacioId,
      );

      if (!reserva) {
        return res.status(404).json({
          ok: false,

          message: "Reserva associada no trobada",
        });
      }

      const acces = await validarAccesReserva(req, reserva);

      if (!acces.permes) {
        return res.status(403).json({
          ok: false,

          message: acces.message,
        });
      }
    }

    return res.json({
      ok: true,

      data: incidencia,
    });
  } catch (error) {
    console.error("Error obtenint incidència:", error);

    return res.status(500).json({
      ok: false,

      message: error.message || "No s'ha pogut obtenir la incidència",
    });
  }
}

// =====================================================
// ACTUALITZAR INCIDÈNCIA
// =====================================================
//
// Aquesta ruta ja està limitada a
// MASTER / SUPERADMIN al router.
//
// =====================================================

async function actualitzarIncidencia(req, res) {
  try {
    const incidencia = await incidenciesService.actualitzarIncidencia(
      Number(req.params.id),

      req.body,

      req.organitzacioId,
    );

    if (!incidencia) {
      return res.status(404).json({
        ok: false,

        message: "Incidència no trobada",
      });
    }

    return res.json({
      ok: true,

      message: "Incidència actualitzada correctament",

      data: incidencia,
    });
  } catch (error) {
    console.error("Error actualitzant incidència:", error);

    return res.status(400).json({
      ok: false,

      message: error.message || "No s'ha pogut actualitzar la incidència",
    });
  }
}

// =====================================================
// RESOLDRE INCIDÈNCIA
// =====================================================
//
// Aquesta ruta ja està limitada a
// MASTER / SUPERADMIN al router.
//
// =====================================================

async function resoldreIncidencia(req, res) {
  try {
    const usuariId = obtenirUsuariId(req);

    const incidencia = await incidenciesService.resoldreIncidencia(
      Number(req.params.id),

      req.body,

      req.organitzacioId,

      usuariId,
    );

    if (!incidencia) {
      return res.status(404).json({
        ok: false,

        message: "Incidència no trobada",
      });
    }

    return res.json({
      ok: true,

      message: "Incidència resolta correctament",

      data: incidencia,
    });
  } catch (error) {
    console.error("Error resolent incidència:", error);

    return res.status(400).json({
      ok: false,

      message: error.message || "No s'ha pogut resoldre la incidència",
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  crearIncidencia,
  obtenirIncidenciesReserva,
  obtenirIncidencies,
  obtenirIncidencia,
  actualitzarIncidencia,
  resoldreIncidencia,
};
