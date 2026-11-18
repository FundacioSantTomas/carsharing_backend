const reservesService = require("../services/reserves.service");
const integracionsService = require("../services/integracions.service");

const integrationDispatcher = require(
  "../integrations/integration-dispatcher.service",
);

let executant = false;
let temporitzador = null;

const CINC_MINUTS = 5 * 60 * 1000;

// =====================================================
// SINCRONITZAR INTEGRACIONS
// =====================================================

async function sincronitzarIntegracions(integracions) {
  if (!integracions.length) {
    console.log("[AUTO] No hi ha integracions actives");
    return;
  }

  for (const integracio of integracions) {
    try {
      const organitzacio =
        integracio.organitzacio_codi ||
        integracio.organitzacio_nom ||
        integracio.id_organitzacio;

      console.log(
        `[AUTO][${organitzacio}] Processant integració ${integracio.tipus}`,
      );

      const resultat =
        await integrationDispatcher.sincronitzarIntegracio(
          integracio,
        );

      if (!resultat) {
        continue;
      }

      // -----------------------------------------------
      // RESULTAT RESERVES
      // -----------------------------------------------

      if (resultat.reserves) {
        const reserves = resultat.reserves;

        console.log(
          `[AUTO][${organitzacio}] Reserves: ` +
            `${reserves.totalGlobalsat ?? reserves.total ?? 0} rebudes | ` +
            `${reserves.creades ?? 0} creades | ` +
            `${reserves.actualitzades ?? 0} actualitzades | ` +
            `${reserves.ignorades ?? 0} ignorades | ` +
            `${reserves.errors ?? 0} errors`,
        );

        if ((reserves.errors ?? 0) > 0) {
          console.warn(
            `[AUTO][${organitzacio}] ` +
              `${reserves.errors} errors durant la sincronització de reserves`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[AUTO][${integracio.organitzacio_codi || integracio.id_organitzacio}] ` +
          `Error processant integració ${integracio.tipus}:`,
        error.message,
      );
    }
  }
}

// =====================================================
// ACTUALITZAR ESTATS
// =====================================================

async function actualitzarEstats() {
  try {
    const estats =
      await reservesService.actualitzarEstatsReserves();

    if (
      estats.enCurs > 0 ||
      estats.finalitzades > 0
    ) {
      console.log(
        `[AUTO] Estats actualitzats: ` +
          `${estats.enCurs} en curs, ` +
          `${estats.finalitzades} finalitzades`,
      );
    }
  } catch (error) {
    console.error(
      "[AUTO] Error actualitzant estats:",
      error.message,
    );
  }
}

// =====================================================
// SINCRONITZAR KM
// =====================================================

async function sincronitzarKms(integracions) {
  try {
    const pendents =
      await reservesService.obtenirReservesPendentsKms();

    if (pendents.length === 0) {
      console.log(
        "[AUTO] No hi ha reserves pendents de km",
      );

      return;
    }

    console.log(
      `[AUTO] ${pendents.length} reserves pendents de km`,
    );

    for (const reserva of pendents) {
      try {
        const organitzacioId = Number(
          reserva.id_organitzacio,
        );

        if (
          !Number.isInteger(organitzacioId) ||
          organitzacioId <= 0
        ) {
          console.error(
            `[AUTO] Reserva ${reserva.id}: organització no vàlida`,
          );

          continue;
        }

        const resultat =
          await integrationDispatcher.sincronitzarKmsReserva(
            reserva,
            integracions,
          );

        if (!resultat?.sincronitzat) {
          if (
            resultat?.motiu ===
            "SENSE_INTEGRACIO_KM"
          ) {
            continue;
          }

          console.log(
            `[AUTO] Reserva ${reserva.id}: km no sincronitzats`,
          );

          continue;
        }

        const kms =
          resultat.resultat?.globalsat?.kms ??
          resultat.resultat?.kms ??
          null;

        if (kms !== null) {
          console.log(
            `[AUTO] Reserva ${reserva.id}: ${kms} km`,
          );
        } else {
          console.log(
            `[AUTO] Reserva ${reserva.id}: km sincronitzats`,
          );
        }
      } catch (error) {
        console.error(
          `[AUTO] Error km reserva ${reserva.id}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "[AUTO] Error processant km:",
      error.message,
    );
  }
}

// =====================================================
// PROCESSAR AUTOMATITZACIONS
// =====================================================

async function processarReserves() {
  if (executant) {
    console.log(
      "[AUTO] Procés ja en execució",
    );

    return;
  }

  executant = true;

  const iniciProces = Date.now();

  try {
    console.log(
      "======================================",
    );

    console.log(
      "[AUTO] Iniciant automatitzacions...",
    );

    // ===============================================
    // CARREGAR INTEGRACIONS ACTIVES
    // ===============================================

    const integracions =
      await integracionsService.obtenirIntegracionsActives();

    console.log(
      `[AUTO] ${integracions.length} integracions actives`,
    );

    // ===============================================
    // 1. SINCRONITZACIONS EXTERNES
    // ===============================================

    await sincronitzarIntegracions(
      integracions,
    );

    // ===============================================
    // 2. ESTATS DE RESERVES
    // ===============================================

    await actualitzarEstats();

    // ===============================================
    // 3. KM
    // ===============================================

    await sincronitzarKms(
      integracions,
    );

    const segons = (
      (Date.now() - iniciProces) /
      1000
    ).toFixed(1);

    console.log(
      `[AUTO] Procés finalitzat en ${segons}s`,
    );

    console.log(
      "======================================",
    );
  } catch (error) {
    console.error(
      "[AUTO] Error general:",
      error,
    );
  } finally {
    executant = false;
  }
}

// =====================================================
// INICIAR AUTOMATITZACIONS
// =====================================================

function iniciarAutomatitzacions() {
  if (temporitzador) {
    console.log(
      "[AUTO] Les automatitzacions ja estan iniciades",
    );

    return;
  }

  console.log(
    "[AUTO] Automatització iniciada",
  );

  console.log(
    "[AUTO] Interval: 5 minuts",
  );

  processarReserves();

  temporitzador = setInterval(
    processarReserves,
    CINC_MINUTS,
  );
}

// =====================================================
// ATURAR AUTOMATITZACIONS
// =====================================================

function aturarAutomatitzacions() {
  if (!temporitzador) {
    return;
  }

  clearInterval(
    temporitzador,
  );

  temporitzador = null;

  console.log(
    "[AUTO] Automatitzacions aturades",
  );
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  iniciarAutomatitzacions,
  aturarAutomatitzacions,
  processarReserves,
};