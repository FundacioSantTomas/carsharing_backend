const reservesService =
  require("../services/reserves.service");

const globalsatReservesService =
  require(
    "../integrations/globalsat/globalsat-reserves.service",
  );


// =====================================================
// COMPROVAR ORGANITZACIÓ ACTIVA
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
// OBTENIR RESERVES
// =====================================================

async function obtenirReserves(
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

    const {
      desde,
      fins,
      vehicleId,
      usuariId,
      serveiId,
    } = req.query;

    const rol =
      String(
        req.user.rol ||
          "",
      ).toUpperCase();

    let usuariFiltre =
      usuariId;

    let serveiFiltre =
      serveiId;


    // =================================================
    // BASIC
    // =================================================
    //
    // Pot veure totes les reserves
    // de la seva organització.
    //
    // No apliquem filtre per usuari
    // ni per servei.
    // =================================================

    if (
      rol ===
      "BASIC"
    ) {
      usuariFiltre =
        undefined;

      serveiFiltre =
        undefined;
    }


    // =================================================
    // TECNIC
    // =================================================
    //
    // Pot veure totes les reserves
    // de tota l'organització.
    //
    // Les restriccions del servei
    // només s'apliquen a les mutacions.
    // =================================================

    if (
      rol ===
      "TECNIC"
    ) {
      usuariFiltre =
        undefined;

      serveiFiltre =
        undefined;
    }


    // =================================================
    // MASTER / SUPERADMIN
    // =================================================
    //
    // Utilitzen els filtres rebuts.
    // =================================================

    const reserves =
      await reservesService.obtenirReserves(
        {
          organitzacioId,
          desde,
          fins,
          vehicleId,
          usuariId:
            usuariFiltre,
          serveiId:
            serveiFiltre,
        },
      );

    return res.json({
      ok: true,
      data: reserves,
    });
  } catch (error) {
    console.error(
      "Error obtenint reserves:",
      error,
    );

    return res
      .status(500)
      .json({
        ok: false,
        message:
          "Error obtenint les reserves",
      });
  }
}


// =====================================================
// OBTENIR UNA RESERVA
// =====================================================

async function obtenirReservaPerId(
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

    const reserva =
      await reservesService.obtenirReservaPerId(
        req.params.id,
        organitzacioId,
      );

    if (!reserva) {
      return res
        .status(404)
        .json({
          ok: false,
          message:
            "Reserva no trobada",
        });
    }

    return res.json({
      ok: true,
      data: reserva,
    });
  } catch (error) {
    console.error(
      "Error obtenint reserva:",
      error,
    );

    return res
      .status(500)
      .json({
        ok: false,
        message:
          "Error obtenint la reserva",
      });
  }
}


// =====================================================
// CREAR RESERVA
// =====================================================

async function crearReserva(
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

    const {
      vehicleId,
      usuariId,
      serveiId,
      inici,
      fi,
      observacions,
    } = req.body;

    if (
      !vehicleId ||
      !inici ||
      !fi
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          message:
            "Cal indicar vehicle, data inicial i data final",
        });
    }

    const rol =
      String(
        req.user.rol ||
          "",
      ).toUpperCase();

    let usuariReserva;

    let serveiReserva;


    // =================================================
    // BASIC
    // =================================================

    if (
      rol ===
      "BASIC"
    ) {
      usuariReserva =
        req.user.id;

      serveiReserva =
        req.user.serveiId;
    }


    // =================================================
    // TECNIC
    // =================================================

    else if (
      rol ===
      "TECNIC"
    ) {
      usuariReserva =
        usuariId ||
        req.user.id;

      const usuariDesti =
        await reservesService.obtenirUsuariReserva(
          usuariReserva,
          organitzacioId,
        );

      if (!usuariDesti) {
        return res
          .status(400)
          .json({
            ok: false,
            message:
              "L'usuari no existeix dins aquesta organització",
          });
      }

      if (
        Number(
          usuariDesti.servei_id,
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
              "Només pots crear reserves per usuaris del teu servei",
          });
      }

      serveiReserva =
        req.user.serveiId;
    }


    // =================================================
    // MASTER / SUPERADMIN
    // =================================================

    else if (
      rol ===
        "MASTER" ||
      rol ===
        "SUPERADMIN"
    ) {
      usuariReserva =
        usuariId ||
        req.user.id;

      const usuariDesti =
        await reservesService.obtenirUsuariReserva(
          usuariReserva,
          organitzacioId,
        );

      if (!usuariDesti) {
        return res
          .status(400)
          .json({
            ok: false,
            message:
              "L'usuari seleccionat no pertany a aquesta organització",
          });
      }

      serveiReserva =
        serveiId !==
        undefined
          ? serveiId
          : usuariDesti.servei_id;
    }


    // =================================================
    // ROL DESCONEGUT
    // =================================================

    else {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "No tens permisos per crear reserves",
        });
    }


    const reserva =
      await reservesService.crearReserva(
        {
          organitzacioId,
          vehicleId,
          usuariId:
            usuariReserva,
          serveiId:
            serveiReserva,
          inici,
          fi,
          observacions,
        },
      );

    return res
      .status(201)
      .json({
        ok: true,
        message:
          "Reserva creada correctament",
        data: reserva,
      });
  } catch (error) {
    console.error(
      "Error creant reserva:",
      error,
    );

    return res
      .status(400)
      .json({
        ok: false,
        message:
          error.message,
      });
  }
}


// =====================================================
// ACTUALITZAR RESERVA
// =====================================================

async function actualitzarReserva(
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

    const reservaActual =
      await reservesService.obtenirReservaPerId(
        req.params.id,
        organitzacioId,
      );

    if (!reservaActual) {
      return res
        .status(404)
        .json({
          ok: false,
          message:
            "Reserva no trobada",
        });
    }

    const rol =
      String(
        req.user.rol ||
          "",
      ).toUpperCase();


    // =================================================
    // BASIC
    // =================================================

    if (
      rol ===
        "BASIC" &&
      Number(
        reservaActual.usuari_id,
      ) !==
        Number(
          req.user.id,
        )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "No tens permisos per modificar aquesta reserva",
        });
    }


    // =================================================
    // TECNIC
    // =================================================

    if (
      rol ===
        "TECNIC" &&
      Number(
        reservaActual.servei_id,
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
            "Només pots modificar reserves del teu servei",
        });
    }


    const dades = {
      ...req.body,
      organitzacioId,
    };


    // =================================================
    // BASIC
    // =================================================

    if (
      rol ===
      "BASIC"
    ) {
      dades.usuariId =
        req.user.id;

      dades.serveiId =
        req.user.serveiId;
    }


    // =================================================
    // TECNIC
    // =================================================

    if (
      rol ===
      "TECNIC"
    ) {
      dades.serveiId =
        req.user.serveiId;

      if (
        dades.usuariId !==
        undefined
      ) {
        const usuariDesti =
          await reservesService.obtenirUsuariReserva(
            dades.usuariId,
            organitzacioId,
          );

        if (!usuariDesti) {
          return res
            .status(400)
            .json({
              ok: false,
              message:
                "L'usuari no existeix dins aquesta organització",
            });
        }

        if (
          Number(
            usuariDesti.servei_id,
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
                "Només pots assignar reserves a usuaris del teu servei",
            });
        }
      }
    }


    // =================================================
    // MASTER / SUPERADMIN
    // =================================================

    if (
      rol ===
        "MASTER" ||
      rol ===
        "SUPERADMIN"
    ) {
      if (
        dades.usuariId !==
        undefined
      ) {
        const usuariDesti =
          await reservesService.obtenirUsuariReserva(
            dades.usuariId,
            organitzacioId,
          );

        if (!usuariDesti) {
          return res
            .status(400)
            .json({
              ok: false,
              message:
                "L'usuari seleccionat no pertany a aquesta organització",
            });
        }

        if (
          dades.serveiId ===
          undefined
        ) {
          dades.serveiId =
            usuariDesti.servei_id;
        }
      }
    }


    const reserva =
      await reservesService.actualitzarReserva(
        req.params.id,
        dades,
        organitzacioId,
      );

    return res.json({
      ok: true,
      message:
        "Reserva actualitzada correctament",
      data: reserva,
    });
  } catch (error) {
    console.error(
      "Error actualitzant reserva:",
      error,
    );

    return res
      .status(400)
      .json({
        ok: false,
        message:
          error.message,
      });
  }
}


// =====================================================
// CANCEL·LAR RESERVA
// =====================================================

async function cancelarReserva(
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

    const reservaActual =
      await reservesService.obtenirReservaPerId(
        req.params.id,
        organitzacioId,
      );

    if (!reservaActual) {
      return res
        .status(404)
        .json({
          ok: false,
          message:
            "Reserva no trobada",
        });
    }

    const rol =
      String(
        req.user.rol ||
          "",
      ).toUpperCase();


    // =================================================
    // BASIC
    // =================================================

    if (
      rol ===
        "BASIC" &&
      Number(
        reservaActual.usuari_id,
      ) !==
        Number(
          req.user.id,
        )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          message:
            "No tens permisos per cancel·lar aquesta reserva",
        });
    }


    // =================================================
    // TECNIC
    // =================================================

    if (
      rol ===
        "TECNIC" &&
      Number(
        reservaActual.servei_id,
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
            "Només pots cancel·lar reserves del teu servei",
        });
    }


    const reserva =
      await reservesService.cancelarReserva(
        req.params.id,
        organitzacioId,
      );

    return res.json({
      ok: true,
      message:
        "Reserva cancel·lada correctament",
      data: reserva,
    });
  } catch (error) {
    console.error(
      "Error cancel·lant reserva:",
      error,
    );

    return res
      .status(400)
      .json({
        ok: false,
        message:
          error.message,
      });
  }
}


// =====================================================
// SINCRONITZAR RESERVES GLOBALSAT
// =====================================================

async function sincronitzarReservesGlobalsat(
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

    const {
      diaDesde,
      diaHasta,
    } = req.body;


    // =================================================
    // VALIDAR DATES
    // =================================================

    if (
      !diaDesde ||
      !diaHasta
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          message:
            "Cal indicar diaDesde i diaHasta en format YYMMDD",
        });
    }

    const regexData =
      /^\d{6}$/;

    if (
      !regexData.test(
        String(
          diaDesde,
        ),
      ) ||
      !regexData.test(
        String(
          diaHasta,
        ),
      )
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          message:
            "Les dates han de tenir format YYMMDD. Exemple: 261020",
        });
    }


    // =================================================
    // SINCRONITZAR
    // =================================================

    const resultat =
      await globalsatReservesService.sincronitzarReservesGlobalsat(
        organitzacioId,
        String(
          diaDesde,
        ),
        String(
          diaHasta,
        ),
      );


    return res.json({
      ok: true,

      message:
        "Sincronització de reserves de Globalsat finalitzada",

      data:
        resultat,
    });
  } catch (error) {
    console.error(
      "Error sincronitzant reserves de Globalsat:",
      error,
    );

    return res
      .status(500)
      .json({
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
  obtenirReserves,
  obtenirReservaPerId,

  crearReserva,
  actualitzarReserva,
  cancelarReserva,

  sincronitzarReservesGlobalsat,
};