const pool = require("../../config/database");
const globalsatService = require("./globalsat.service");

// =====================================================
// HELPERS
// =====================================================

function normalitzarText(valor) {
  if (valor === undefined || valor === null) {
    return null;
  }

  const text = String(valor).trim();

  return text || null;
}

function normalitzarActiu(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return true;
  }

  const text = String(valor).trim().toLowerCase();

  return !["0", "false", "no", "baixa", "inactiu", "inactive"].includes(text);
}

// =====================================================
// VALIDAR ORGANITZACIÓ
// =====================================================

async function comprovarOrganitzacio(organitzacioId) {
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
// NORMALITZAR VEHICLE GLOBALSAT
// =====================================================

function normalitzarVehicleGlobalsat(vehicle) {
  const idExtern = normalitzarText(
    vehicle?.idVehiculo ?? vehicle?.idVehicle ?? vehicle?.id,
  );

  const nom = normalitzarText(
    vehicle?.vehiculo ?? vehicle?.vehicle ?? vehicle?.nom ?? vehicle?.nombre,
  );

  const keyVehiculo = normalitzarText(
    vehicle?.key_vehiculo ?? vehicle?.keyVehiculo ?? vehicle?.key,
  );

  const actiu = normalitzarActiu(
    vehicle?.baja ?? vehicle?.actiu ?? vehicle?.activo,
  );

  return {
    idExtern,
    nom,
    keyVehiculo,
    actiu,
  };
}

// =====================================================
// OBTENIR VEHICLE EXISTENT
// =====================================================

async function obtenirVehicleExistent(organitzacioId, idExtern) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        vehicle,
        key_vehiculo,
        actiu

      FROM vehicles

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
// CREAR VEHICLE
// =====================================================

async function crearVehicle({
  organitzacioId,
  idExtern,
  nom,
  keyVehiculo,
  actiu,
}) {
  const resultat = await pool.query(
    `
      INSERT INTO vehicles (
        id_organitzacio,
        id_extern,
        vehicle,
        key_vehiculo,
        actiu
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
      )

      RETURNING
        id,
        id_organitzacio,
        id_extern,
        vehicle,
        key_vehiculo,
        actiu
    `,
    [organitzacioId, idExtern, nom, keyVehiculo, actiu],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR VEHICLE
// =====================================================

async function actualitzarVehicle({
  vehicleId,
  organitzacioId,
  nom,
  keyVehiculo,
  actiu,
}) {
  const resultat = await pool.query(
    `
      UPDATE vehicles

      SET
        vehicle = $1,
        key_vehiculo = $2,
        actiu = $3,
        actualitzat_a = NOW()

      WHERE
        id = $4
        AND id_organitzacio = $5

      RETURNING
        id,
        id_organitzacio,
        id_extern,
        vehicle,
        key_vehiculo,
        actiu
    `,
    [nom, keyVehiculo, actiu, vehicleId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// SINCRONITZAR VEHICLES
// =====================================================

async function sincronitzarVehicles(organitzacioId) {
  await comprovarOrganitzacio(organitzacioId);

  const resposta = await globalsatService.obtenirVehiclesGlobalsat5();

  const vehiclesGlobalsat = Array.isArray(resposta) ? resposta : [];

  let creats = 0;
  let actualitzats = 0;
  let ignorats = 0;
  let errors = 0;

  const detallsErrors = [];

  for (const vehicleGlobalsat of vehiclesGlobalsat) {
    try {
      const vehicle = normalitzarVehicleGlobalsat(vehicleGlobalsat);

      if (!vehicle.idExtern || !vehicle.nom) {
        ignorats++;

        detallsErrors.push({
          tipus: "DADES_INCOMPLETES",
          vehicle: vehicleGlobalsat,
        });

        continue;
      }

      const existent = await obtenirVehicleExistent(
        organitzacioId,
        vehicle.idExtern,
      );

      if (!existent) {
        await crearVehicle({
          organitzacioId,
          idExtern: vehicle.idExtern,
          nom: vehicle.nom,
          keyVehiculo: vehicle.keyVehiculo,
          actiu: vehicle.actiu,
        });

        creats++;

        continue;
      }

      const haCanviat =
        existent.vehicle !== vehicle.nom ||
        (existent.key_vehiculo || null) !== (vehicle.keyVehiculo || null) ||
        Boolean(existent.actiu) !== Boolean(vehicle.actiu);

      if (!haCanviat) {
        continue;
      }

      await actualitzarVehicle({
        vehicleId: existent.id,
        organitzacioId,
        nom: vehicle.nom,
        keyVehiculo: vehicle.keyVehiculo,
        actiu: vehicle.actiu,
      });

      actualitzats++;
    } catch (error) {
      errors++;

      detallsErrors.push({
        tipus: "ERROR",
        missatge: error.message,
        vehicle: vehicleGlobalsat,
      });

      console.error(
        "[GLOBALSAT][VEHICLES] Error processant vehicle:",
        error.message,
      );
    }
  }

  return {
    totalGlobalsat: vehiclesGlobalsat.length,

    creats,
    actualitzats,
    ignorats,
    errors,
    detallsErrors,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarVehicles,
};
