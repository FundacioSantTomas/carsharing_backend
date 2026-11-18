const globalsatServeisService = require("./globalsat/globalsat-serveis.service");

const globalsatVehiclesService = require("./globalsat/globalsat-vehicles.service");

const globalsatUsuarisService = require("./globalsat/globalsat-usuaris.service");

const globalsatReservesService = require("./globalsat/globalsat-reserves.service");

const globalsatTracabilitatService = require("./globalsat/globalsat-tracabilitat.service");

// =====================================================
// HELPERS
// =====================================================

function normalitzarTipus(tipus) {
  return String(tipus || "")
    .trim()
    .toUpperCase();
}

function validarOrganitzacioId(valor) {
  const organitzacioId = Number(valor);

  if (!Number.isInteger(organitzacioId) || organitzacioId <= 0) {
    throw new Error("L'organització de la integració no és vàlida");
  }

  return organitzacioId;
}

// =====================================================
// FORMAT DATA GLOBALSAT
// =====================================================

function formatDataGlobalsat(data) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const any = parts.find((part) => part.type === "year")?.value;

  const mes = parts.find((part) => part.type === "month")?.value;

  const dia = parts.find((part) => part.type === "day")?.value;

  return `${any}${mes}${dia}`;
}

function afegirDies(data, dies) {
  const resultat = new Date(data);

  resultat.setDate(resultat.getDate() + dies);

  return resultat;
}

// =====================================================
// SINCRONITZAR UNA INTEGRACIÓ
// =====================================================

async function sincronitzarIntegracio(integracio) {
  if (!integracio) {
    throw new Error("Cal indicar una integració");
  }

  const tipus = normalitzarTipus(integracio.tipus);

  if (!tipus) {
    throw new Error("La integració no té cap tipus definit");
  }

  switch (tipus) {
    case "GLOBALSAT":
      return sincronitzarIntegracioGlobalsat(integracio);

    default:
      console.warn(`[INTEGRACIO] Tipus no implementat: ${tipus}`);

      return {
        tipus,
        sincronitzat: false,
        motiu: "INTEGRACIO_NO_IMPLEMENTADA",
      };
  }
}

// =====================================================
// SINCRONITZACIÓ GLOBALSAT
// =====================================================

async function sincronitzarIntegracioGlobalsat(integracio) {
  const organitzacioId = validarOrganitzacioId(integracio.id_organitzacio);

  const resultats = {
    tipus: "GLOBALSAT",
    organitzacioId,
  };

  // ===================================================
  // 1. SERVEIS
  // ===================================================

  if (integracio.sync_serveis) {
    resultats.serveis =
      await globalsatServeisService.sincronitzarServeis(organitzacioId);
  }

  // ===================================================
  // 2. VEHICLES
  // ===================================================

  if (integracio.sync_vehicles) {
    resultats.vehicles =
      await globalsatVehiclesService.sincronitzarVehicles(organitzacioId);
  }

  // ===================================================
  // 3. USUARIS
  // ===================================================

  if (integracio.sync_usuaris) {
    resultats.usuaris =
      await globalsatUsuarisService.sincronitzarUsuaris(organitzacioId);
  }

  // ===================================================
  // 4. RESERVES
  // ===================================================

  if (integracio.sync_reserves) {
    const ara = new Date();

    const diaDesde = formatDataGlobalsat(afegirDies(ara, -2));

    const diaHasta = formatDataGlobalsat(afegirDies(ara, 365));

    resultats.reserves =
      await globalsatReservesService.sincronitzarReservesGlobalsat(
        organitzacioId,
        diaDesde,
        diaHasta,
      );
  }

  return resultats;
}

// =====================================================
// OBTENIR INTEGRACIÓ DE KM
// =====================================================

function obtenirIntegracioKms(organitzacioId, integracions) {
  if (!Array.isArray(integracions)) {
    return null;
  }

  return (
    integracions.find((integracio) => {
      return (
        Number(integracio.id_organitzacio) === organitzacioId &&
        integracio.actiu === true &&
        integracio.sync_kms === true
      );
    }) || null
  );
}

// =====================================================
// SINCRONITZAR KM D'UNA RESERVA
// =====================================================

async function sincronitzarKmsReserva(reserva, integracions) {
  if (!reserva) {
    throw new Error("Cal indicar una reserva");
  }

  const organitzacioId = validarOrganitzacioId(reserva.id_organitzacio);

  const integracio = obtenirIntegracioKms(organitzacioId, integracions);

  if (!integracio) {
    return {
      sincronitzat: false,
      motiu: "SENSE_INTEGRACIO_KM",
    };
  }

  const tipus = normalitzarTipus(integracio.tipus);

  switch (tipus) {
    case "GLOBALSAT": {
      const resultat =
        await globalsatTracabilitatService.sincronitzarKmsReserva(
          reserva.id,
          organitzacioId,
        );

      return {
        sincronitzat: true,
        tipus: "GLOBALSAT",
        resultat,
      };
    }

    default:
      return {
        sincronitzat: false,
        tipus,
        motiu: "INTEGRACIO_KM_NO_IMPLEMENTADA",
      };
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarIntegracio,
  sincronitzarKmsReserva,
};
