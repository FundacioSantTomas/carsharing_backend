const tracabilitatService = require(
  "../services/tracabilitat.service",
);

const reservesService = require(
  "../services/reserves.service",
);


// =====================================================
// HELPERS
// =====================================================

function obtenirRol(req) {
  return String(
    req.user?.rol || "",
  )
    .trim()
    .toUpperCase();
}


function obtenirUsuariId(req) {
  const id =
    Number(
      req.user?.id,
    );

  return Number.isInteger(id)
    ? id
    : null;
}


function obtenirServeiId(req) {
  const valor =
    req.user?.serveiId ??
    req.user?.servei_id ??
    null;

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const id =
    Number(
      valor,
    );

  return Number.isInteger(id) &&
    id > 0
    ? id
    : null;
}


// =====================================================
// VALIDAR ACCÉS A RESERVA
// =====================================================

async function validarAccesReserva(
  req,
  reservaId,
  organitzacioId,
) {
  const reserva =
    await reservesService.obtenirReservaPerId(
      reservaId,
      organitzacioId,
    );

  if (!reserva) {
    return {
      ok: false,
      status: 404,
      message:
        "Reserva no trobada",
      reserva: null,
    };
  }


  const rol =
    obtenirRol(req);


  // ---------------------------------------------------
  // MASTER / SUPERADMIN
  // ---------------------------------------------------

  if (
    rol === "MASTER" ||
    rol === "SUPERADMIN"
  ) {
    return {
      ok: true,
      reserva,
    };
  }


  // ---------------------------------------------------
  // BASIC
  // ---------------------------------------------------

  if (rol === "BASIC") {
    const usuariId =
      obtenirUsuariId(req);

    if (
      !usuariId ||
      Number(
        reserva.usuari_id,
      ) !== usuariId
    ) {
      return {
        ok: false,
        status: 403,
        message:
          "No tens permisos per consultar aquesta reserva",
        reserva,
      };
    }

    return {
      ok: true,
      reserva,
    };
  }


  // ---------------------------------------------------
  // TECNIC
  // ---------------------------------------------------

  if (rol === "TECNIC") {
    const serveiId =
      obtenirServeiId(req);

    if (!serveiId) {
      return {
        ok: false,
        status: 403,
        message:
          "El tècnic no té cap servei assignat",
        reserva,
      };
    }

    if (
      Number(
        reserva.servei_id,
      ) !== serveiId
    ) {
      return {
        ok: false,
        status: 403,
        message:
          "No tens permisos per consultar reserves d'un altre servei",
        reserva,
      };
    }

    return {
      ok: true,
      reserva,
    };
  }


  return {
    ok: false,
    status: 403,
    message:
      "No tens permisos per realitzar aquesta acció",
    reserva,
  };
}


// =====================================================
// SINCRONITZAR KM RESERVA
// =====================================================

async function sincronitzarKmsReserva(
  req,
  res,
) {
  try {
    // -------------------------------------------------
    // ORGANITZACIÓ ACTIVA
    // -------------------------------------------------

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
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Cal seleccionar una organització activa",
        });
    }


    // -------------------------------------------------
    // RESERVA
    // -------------------------------------------------

    const reservaId =
      Number(
        req.params.id,
      );

    if (
      !Number.isInteger(
        reservaId,
      ) ||
      reservaId <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "La reserva indicada no és vàlida",
        });
    }


    // -------------------------------------------------
    // PERMISOS
    // -------------------------------------------------

    const acces =
      await validarAccesReserva(
        req,
        reservaId,
        organitzacioId,
      );


    if (!acces.ok) {
      return res
        .status(
          acces.status || 403,
        )
        .json({
          ok: false,

          message:
            acces.message,
        });
    }


    // -------------------------------------------------
    // BASIC NO POT SINCRONITZAR MANUALMENT
    // -------------------------------------------------

    if (
      obtenirRol(req) ===
      "BASIC"
    ) {
      return res
        .status(403)
        .json({
          ok: false,

          message:
            "No tens permisos per sincronitzar manualment els quilòmetres",
        });
    }


    // -------------------------------------------------
    // SINCRONITZAR KM
    // -------------------------------------------------

    const resultat =
      await tracabilitatService
        .sincronitzarKmsReserva(
          reservaId,
          organitzacioId,
        );


    // -------------------------------------------------
    // RESPOSTA
    // -------------------------------------------------

    return res.json({
      ok: true,

      message:
        "Quilòmetres sincronitzats correctament",

      data:
        resultat,
    });
  } catch (error) {
    console.error(
      "Error sincronitzant quilòmetres:",
      error,
    );

    return res
      .status(400)
      .json({
        ok: false,

        message:
          error.message ||
          "No s'han pogut sincronitzar els quilòmetres",
      });
  }
}


// =====================================================
// OBTENIR TRAJECTÒRIA RESERVA
// =====================================================

async function obtenirTrajectoriaReserva(
  req,
  res,
) {
  try {
    // -------------------------------------------------
    // ORGANITZACIÓ ACTIVA
    // -------------------------------------------------

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
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Cal seleccionar una organització activa",
        });
    }


    // -------------------------------------------------
    // RESERVA
    // -------------------------------------------------

    const reservaId =
      Number(
        req.params.id,
      );

    if (
      !Number.isInteger(
        reservaId,
      ) ||
      reservaId <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "La reserva indicada no és vàlida",
        });
    }


    // -------------------------------------------------
    // PERMISOS
    // -------------------------------------------------

    const acces =
      await validarAccesReserva(
        req,
        reservaId,
        organitzacioId,
      );


    if (!acces.ok) {
      return res
        .status(
          acces.status || 403,
        )
        .json({
          ok: false,

          message:
            acces.message,
        });
    }


    // -------------------------------------------------
    // CONSULTAR TRAJECTÒRIA
    // -------------------------------------------------

    const resultat =
      await tracabilitatService
        .obtenirTrajectoriaReserva(
          reservaId,
          organitzacioId,
        );


    // -------------------------------------------------
    // RESPOSTA
    // -------------------------------------------------

    return res.json({
      ok: true,

      data:
        resultat,
    });
  } catch (error) {
    console.error(
      "Error obtenint trajectòria de la reserva:",
      error,
    );

    return res
      .status(400)
      .json({
        ok: false,

        message:
          error.message ||
          "No s'ha pogut obtenir la trajectòria de la reserva",
      });
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarKmsReserva,

  obtenirTrajectoriaReserva,
};