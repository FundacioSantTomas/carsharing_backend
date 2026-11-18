const pool = require("../../config/database");
const globalsatService = require("./globalsat.service");
const reservesService = require("../../services/reserves.service");

// =====================================================
// CONVERTIR DIA + HORA GLOBALSAT
// =====================================================

function convertirDiaHoraGlobalsat(dia, hora) {
  if (!dia || String(dia).length !== 6) {
    return null;
  }

  const diaText = String(dia);

  const any = Number(`20${diaText.substring(0, 2)}`);
  const mes = Number(diaText.substring(2, 4));
  const diaMes = Number(diaText.substring(4, 6));

  const partsHora = String(hora || "00:00")
    .trim()
    .split(":");

  const hores = Number(partsHora[0] || 0);
  const minuts = Number(partsHora[1] || 0);

  const data = new Date(any, mes - 1, diaMes, hores, minuts, 0, 0);

  return Number.isNaN(data.getTime()) ? null : data;
}

// =====================================================
// GENERAR ID EXTERN
// =====================================================

function generarIdExternReservaGlobalsat(reserva) {
  return [
    reserva.dia || "",
    reserva.idVehiculo || "",
    reserva.horaDesde || "",
    reserva.horaHasta || "",
    reserva.idUsuario || "",
  ]
    .join("_")
    .replace(/\s+/g, "")
    .replace(/:/g, "");
}

// =====================================================
// EXTREURE KM
// =====================================================

function extreureKmsGlobalsat(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }

  const coincidencia = String(valor).match(/([\d.,]+)/);

  if (!coincidencia) {
    return null;
  }

  const kms = Number(coincidencia[1].replace(",", "."));

  return Number.isFinite(kms) ? kms : null;
}

// =====================================================
// NORMALITZAR RESPOSTA GLOBALSAT
// =====================================================

function normalitzarReservesGlobalsat(resposta) {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  if (resposta && Array.isArray(resposta.reservas)) {
    return resposta.reservas;
  }

  if (resposta && Array.isArray(resposta.reserves)) {
    return resposta.reserves;
  }

  if (resposta && Array.isArray(resposta.data)) {
    return resposta.data;
  }

  return [];
}

// =====================================================
// VALIDAR ORGANITZACIÓ
// =====================================================

async function comprovarOrganitzacioGlobalsat(organitzacioId) {
  const id = Number(organitzacioId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("L'organització indicada no és vàlida");
  }

  const resultat = await pool.query(
    `
      SELECT
        id,
        nom,
        codi,
        actiu

      FROM organitzacions

      WHERE
        id = $1
        AND actiu = TRUE

      LIMIT 1
    `,
    [id],
  );

  const organitzacio = resultat.rows[0];

  if (!organitzacio) {
    throw new Error("Organització no trobada");
  }

  return organitzacio;
}

// =====================================================
// OBTENIR VEHICLE LOCAL
// =====================================================

async function obtenirVehicleLocal(organitzacioId, vehicleExtern) {
  const resultat = await pool.query(
    `
      SELECT
        id

      FROM vehicles

      WHERE
        id_organitzacio = $1
        AND id_extern = $2
        AND actiu = TRUE

      LIMIT 1
    `,
    [organitzacioId, vehicleExtern],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// OBTENIR USUARI LOCAL
// =====================================================

async function obtenirUsuariLocal(organitzacioId, usuariExtern) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        servei_id

      FROM usuaris

      WHERE
        id_organitzacio = $1
        AND id_extern = $2
        AND actiu = TRUE

      LIMIT 1
    `,
    [organitzacioId, usuariExtern],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// OBTENIR RESERVA EXISTENT
// =====================================================

async function obtenirReservaExistent(organitzacioId, idExtern) {
  const resultat = await pool.query(
    `
      SELECT
        id

      FROM reserves

      WHERE
        id_organitzacio = $1
        AND id_extern = $2

      LIMIT 1
    `,
    [organitzacioId, idExtern],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// ACTUALITZAR RESERVA EXISTENT
// =====================================================

async function actualitzarReservaExistent({
  reservaId,
  organitzacioId,
  vehicleId,
  usuariId,
  serveiId,
  inici,
  fi,
  kms,
}) {
  await pool.query(
    `
      UPDATE reserves

      SET
        vehicle_id = $1,
        usuari_id = $2,
        servei_id = $3,
        inici = $4,
        fi = $5,

        kms_realitzats =
          COALESCE(
            $6,
            kms_realitzats
          ),

        kms_estat =
          CASE
            WHEN $6::numeric IS NOT NULL
              THEN 'SINCRONITZAT'
            ELSE kms_estat
          END,

        kms_sincronitzat_a =
          CASE
            WHEN $6::numeric IS NOT NULL
              THEN NOW()
            ELSE kms_sincronitzat_a
          END,

        kms_error =
          CASE
            WHEN $6::numeric IS NOT NULL
              THEN NULL
            ELSE kms_error
          END,

        actualitzat_a = NOW()

      WHERE
        id = $7
        AND id_organitzacio = $8
    `,
    [vehicleId, usuariId, serveiId, inici, fi, kms, reservaId, organitzacioId],
  );
}

// =====================================================
// CALCULAR ESTAT
// =====================================================

function calcularEstatReserva(inici, fi) {
  const ara = new Date();

  if (fi <= ara) {
    return "FINALITZADA";
  }

  if (inici <= ara && fi > ara) {
    return "EN_CURS";
  }

  return "RESERVADA";
}

// =====================================================
// CREAR RESERVA
// =====================================================

async function crearReservaGlobalsat({
  organitzacioId,
  idExtern,
  vehicleId,
  usuariId,
  serveiId,
  inici,
  fi,
  kms,
}) {
  const estat = calcularEstatReserva(inici, fi);

  await pool.query(
    `
      INSERT INTO reserves (
        id_organitzacio,
        id_extern,
        vehicle_id,
        usuari_id,
        servei_id,
        inici,
        fi,
        estat,
        observacions,
        kms_realitzats,
        kms_estat,
        kms_sincronitzat_a
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12
      )
    `,
    [
      organitzacioId,
      idExtern,
      vehicleId,
      usuariId,
      serveiId,
      inici,
      fi,
      estat,
      "Importada de Globalsat",
      kms,
      kms !== null ? "SINCRONITZAT" : "PENDENT",
      kms !== null ? new Date() : null,
    ],
  );
}

// =====================================================
// SINCRONITZAR RESERVES GLOBALSAT
// =====================================================

async function sincronitzarReservesGlobalsat(
  organitzacioId,
  diaDesde,
  diaHasta,
) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  if (!diaDesde || !diaHasta) {
    throw new Error("Cal indicar diaDesde i diaHasta en format YYMMDD");
  }

  await comprovarOrganitzacioGlobalsat(organitzacioId);

  const respostaGlobalsat = await globalsatService.obtenirReservesSantTomas(
    diaDesde,
    diaHasta,
  );

  const reservesGlobalsat = normalitzarReservesGlobalsat(respostaGlobalsat);

  let creades = 0;
  let actualitzades = 0;
  let ignorades = 0;
  let errors = 0;

  const detallsErrors = [];

  for (const reserva of reservesGlobalsat) {
    try {
      // ===============================================
      // DADES BÀSIQUES
      // ===============================================

      const vehicleExtern = String(reserva.idVehiculo || "").trim();

      const usuariExtern = String(reserva.idUsuario || "").trim();

      if (
        !vehicleExtern ||
        !usuariExtern ||
        !reserva.dia ||
        !reserva.horaDesde ||
        !reserva.horaHasta
      ) {
        ignorades++;

        detallsErrors.push({
          tipus: "DADES_INCOMPLETES",
          reserva,
        });

        continue;
      }

      // ===============================================
      // VEHICLE
      // ===============================================

      const vehicle = await obtenirVehicleLocal(organitzacioId, vehicleExtern);

      if (!vehicle) {
        ignorades++;

        detallsErrors.push({
          tipus: "VEHICLE_NO_TROBAT",
          idExtern: vehicleExtern,
          reserva,
        });

        continue;
      }

      // ===============================================
      // USUARI
      // ===============================================

      const usuari = await obtenirUsuariLocal(organitzacioId, usuariExtern);

      if (!usuari) {
        ignorades++;

        detallsErrors.push({
          tipus: "USUARI_NO_TROBAT",
          idExtern: usuariExtern,
          reserva,
        });

        continue;
      }

      // ===============================================
      // DATES
      // ===============================================

      const inici = convertirDiaHoraGlobalsat(reserva.dia, reserva.horaDesde);

      const fi = convertirDiaHoraGlobalsat(reserva.dia, reserva.horaHasta);

      if (!inici || !fi || fi <= inici) {
        ignorades++;

        detallsErrors.push({
          tipus: "DATA_INVALIDA",
          reserva,
        });

        continue;
      }

      // ===============================================
      // KM
      // ===============================================

      const kms = extreureKmsGlobalsat(reserva.kms);

      // ===============================================
      // ID EXTERN
      // ===============================================

      const idExtern = generarIdExternReservaGlobalsat(reserva);

      // ===============================================
      // RESERVA EXISTENT
      // ===============================================

      const existent = await obtenirReservaExistent(organitzacioId, idExtern);

      if (existent) {
        await actualitzarReservaExistent({
          reservaId: existent.id,

          organitzacioId,

          vehicleId: vehicle.id,

          usuariId: usuari.id,

          serveiId: usuari.servei_id || null,

          inici,
          fi,
          kms,
        });

        actualitzades++;

        continue;
      }

      // ===============================================
      // SOLAPAMENT
      // ===============================================

      const solapament = await reservesService.hiHaSolapament(
        vehicle.id,
        inici,
        fi,
        organitzacioId,
      );

      if (solapament) {
        errors++;

        detallsErrors.push({
          tipus: "SOLAPAMENT",

          idExtern,

          reservaConflictivaId: solapament.id,

          reserva,
        });

        continue;
      }

      // ===============================================
      // CREAR
      // ===============================================

      await crearReservaGlobalsat({
        organitzacioId,

        idExtern,

        vehicleId: vehicle.id,

        usuariId: usuari.id,

        serveiId: usuari.servei_id || null,

        inici,
        fi,
        kms,
      });

      creades++;
    } catch (error) {
      errors++;

      detallsErrors.push({
        tipus: "ERROR",
        missatge: error.message,
        reserva,
      });

      console.error("[GLOBALSAT] Error processant reserva:", error.message);
    }
  }

  return {
    totalGlobalsat: reservesGlobalsat.length,

    creades,
    actualitzades,
    ignorades,
    errors,
    detallsErrors,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarReservesGlobalsat,
};
