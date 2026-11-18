const reservesService = require("../../services/reserves.service");

const globalsatService = require("./globalsat.service");

// =====================================================
// SINCRONITZAR KM D'UNA RESERVA AMB GLOBALSAT
// =====================================================

async function sincronitzarKmsReserva(reservaId, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  // ===================================================
  // OBTENIR RESERVA
  // ===================================================

  const reserva = await reservesService.obtenirReservaPerId(
    reservaId,
    organitzacioId,
  );

  if (!reserva) {
    throw new Error("Reserva no trobada");
  }

  // ===================================================
  // RESERVA CANCEL·LADA
  // ===================================================

  if (reserva.estat === "CANCELADA") {
    throw new Error(
      "No es poden sincronitzar els km d'una reserva cancel·lada",
    );
  }

  // ===================================================
  // COMPROVAR QUE HA FINALITZAT
  // ===================================================

  const ara = new Date();

  const fiReserva = new Date(reserva.fi);

  if (Number.isNaN(fiReserva.getTime())) {
    throw new Error("La data final de la reserva no és vàlida");
  }

  if (fiReserva > ara) {
    throw new Error("La reserva encara no ha finalitzat");
  }

  // ===================================================
  // VEHICLE
  // ===================================================

  if (!reserva.vehicle) {
    await reservesService.marcarErrorKms(
      reserva.id,
      "La reserva no té vehicle associat",
      "SENSE_DADES",
      organitzacioId,
    );

    throw new Error("La reserva no té vehicle associat");
  }

  // ===================================================
  // CONSULTAR GLOBALSAT
  // ===================================================

  try {
    const resultatGlobalsat = await globalsatService.obtenirTraçabilitatVehicle(
      reserva.vehicle,
      reserva.inici,
      reserva.fi,
    );

    // =================================================
    // VALIDAR RESPOSTA
    // =================================================

    if (!resultatGlobalsat) {
      await reservesService.marcarErrorKms(
        reserva.id,
        "Globalsat5 no ha retornat dades",
        "SENSE_DADES",
        organitzacioId,
      );

      const error = new Error("Globalsat5 no ha retornat dades");

      error.kmsJaMarcat = true;

      throw error;
    }

    const kms = Number(resultatGlobalsat.kms);

    if (!Number.isFinite(kms)) {
      await reservesService.marcarErrorKms(
        reserva.id,
        "Globalsat5 no ha retornat uns quilòmetres vàlids",
        "SENSE_DADES",
        organitzacioId,
      );

      const error = new Error(
        "Globalsat5 no ha retornat uns quilòmetres vàlids",
      );

      error.kmsJaMarcat = true;

      throw error;
    }

    if (kms < 0) {
      await reservesService.marcarErrorKms(
        reserva.id,
        "Globalsat5 ha retornat uns quilòmetres negatius",
        "ERROR",
        organitzacioId,
      );

      const error = new Error(
        "Globalsat5 ha retornat uns quilòmetres no vàlids",
      );

      error.kmsJaMarcat = true;

      throw error;
    }

    // =================================================
    // GUARDAR KM
    // =================================================

    const reservaActualitzada = await reservesService.guardarKmsReserva(
      reserva.id,
      kms,
      organitzacioId,
    );

    if (!reservaActualitzada) {
      throw new Error("No s'han pogut guardar els quilòmetres de la reserva");
    }

    // =================================================
    // RESULTAT
    // =================================================

    return {
      reserva: reservaActualitzada,

      globalsat: {
        kms: resultatGlobalsat.kms,

        vehicle: resultatGlobalsat.vehicle,

        desde: resultatGlobalsat.desde,

        hasta: resultatGlobalsat.hasta,
      },
    };
  } catch (error) {
    if (!error.kmsJaMarcat) {
      try {
        await reservesService.marcarErrorKms(
          reserva.id,
          error.message,
          "ERROR",
          organitzacioId,
        );
      } catch (errorGuardar) {
        console.error(
          "Error guardant l'error de sincronització de km:",
          errorGuardar,
        );
      }
    }

    throw error;
  }
}

// =====================================================
// OBTENIR TRAJECTÒRIA GPS D'UNA RESERVA
// =====================================================
//
// No guardem la trajectòria a la base de dades.
//
// Cada vegada que es consulta, demanem els punts
// directament a Globalsat.
//
// Si la reserva encara està en curs,
// consultem només fins al moment actual.
//
// =====================================================

async function obtenirTrajectoriaReserva(reservaId, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  // ===================================================
  // VALIDAR ID RESERVA
  // ===================================================

  const id = Number(reservaId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("La reserva indicada no és vàlida");
  }

  // ===================================================
  // OBTENIR RESERVA
  // ===================================================

  const reserva = await reservesService.obtenirReservaPerId(id, organitzacioId);

  if (!reserva) {
    throw new Error("Reserva no trobada");
  }

  // ===================================================
  // RESERVA CANCEL·LADA
  // ===================================================

  if (reserva.estat === "CANCELADA") {
    throw new Error(
      "No es pot consultar la trajectòria d'una reserva cancel·lada",
    );
  }

  // ===================================================
  // VEHICLE
  // ===================================================

  if (!reserva.vehicle) {
    throw new Error("La reserva no té vehicle associat");
  }

  // ===================================================
  // VALIDAR DATES
  // ===================================================

  const iniciReserva = new Date(reserva.inici);

  const fiReserva = new Date(reserva.fi);

  if (
    Number.isNaN(iniciReserva.getTime()) ||
    Number.isNaN(fiReserva.getTime())
  ) {
    throw new Error("Les dates de la reserva no són vàlides");
  }

  if (fiReserva <= iniciReserva) {
    throw new Error("El període de la reserva no és vàlid");
  }

  // ===================================================
  // COMPROVAR SI LA RESERVA HA COMENÇAT
  // ===================================================

  const ara = new Date();

  if (iniciReserva > ara) {
    return {
      reserva: {
        id: reserva.id,

        vehicle_id: reserva.vehicle_id,

        vehicle: reserva.vehicle,

        usuari_id: reserva.usuari_id,

        servei_id: reserva.servei_id,

        inici: reserva.inici,

        fi: reserva.fi,

        estat: reserva.estat,
      },

      globalsat: {
        vehicle: null,

        desde: null,

        hasta: null,
      },

      totalPunts: 0,

      trajectoria: [],
    };
  }

  // ===================================================
  // DATA FINAL DE CONSULTA
  // ===================================================
  //
  // Si encara està en curs:
  //
  // inici reserva → ara
  //
  // Si ja ha finalitzat:
  //
  // inici reserva → fi reserva
  //
  // ===================================================

  const fiConsulta = fiReserva > ara ? ara : fiReserva;

  // ===================================================
  // CONSULTAR GLOBALSAT
  // ===================================================

  const resultatGlobalsat = await globalsatService.obtenirTrajectoriaVehicle(
    reserva.vehicle,
    iniciReserva,
    fiConsulta,
  );

  // ===================================================
  // SENSE RESPOSTA
  // ===================================================

  if (!resultatGlobalsat) {
    throw new Error("Globalsat5 no ha retornat dades de trajectòria");
  }

  // ===================================================
  // TRAJECTÒRIA
  // ===================================================

  const trajectoria = Array.isArray(resultatGlobalsat.trajectoria)
    ? resultatGlobalsat.trajectoria
    : [];

  // ===================================================
  // CALCULAR RESUM
  // ===================================================

  let velocitatMaxima = null;

  for (const punt of trajectoria) {
    const velocitat = Number(punt?.velocidad);

    if (!Number.isFinite(velocitat)) {
      continue;
    }

    if (velocitatMaxima === null || velocitat > velocitatMaxima) {
      velocitatMaxima = velocitat;
    }
  }

  // ===================================================
  // PRIMER / ÚLTIM PUNT
  // ===================================================

  const primerPunt = trajectoria.length > 0 ? trajectoria[0] : null;

  const ultimPunt =
    trajectoria.length > 0 ? trajectoria[trajectoria.length - 1] : null;

  // ===================================================
  // RESULTAT
  // ===================================================

  return {
    reserva: {
      id: reserva.id,

      vehicle_id: reserva.vehicle_id,

      vehicle: reserva.vehicle,

      usuari_id: reserva.usuari_id,

      usuari_nom: reserva.usuari_nom || reserva.usuari || null,

      servei_id: reserva.servei_id,

      servei: reserva.servei || null,

      inici: reserva.inici,

      fi: reserva.fi,

      estat: reserva.estat,

      kms_realitzats: reserva.kms_realitzats ?? null,
    },

    globalsat: {
      vehicle: resultatGlobalsat.vehicle,

      desde: resultatGlobalsat.desde,

      hasta: resultatGlobalsat.hasta,
    },

    resum: {
      totalPunts: trajectoria.length,

      velocitatMaxima,

      primerPunt,

      ultimPunt,
    },

    trajectoria,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarKmsReserva,
  obtenirTrajectoriaReserva,
};
