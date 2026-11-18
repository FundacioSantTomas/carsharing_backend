const pool = require("../config/database");

const globalsatService = require(
  "../integrations/globalsat/globalsat.service",
);


// =====================================================
// HELPERS
// =====================================================

function convertirBooleanQuery(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return undefined;
  }

  if (typeof valor === "boolean") {
    return valor;
  }

  const valorNormalitzat = String(valor)
    .trim()
    .toLowerCase();

  if (
    valorNormalitzat === "true" ||
    valorNormalitzat === "1"
  ) {
    return true;
  }

  if (
    valorNormalitzat === "false" ||
    valorNormalitzat === "0"
  ) {
    return false;
  }

  throw new Error(
    "El filtre booleà indicat no és vàlid",
  );
}


// =====================================================
// OBTENIR VEHICLES
// =====================================================

async function obtenirVehicles(
  organitzacioId,
  filtres = {},
) {
  if (!organitzacioId) {
    throw new Error(
      "Cal indicar l'organització",
    );
  }

  const condicions = [];
  const valors = [];


  // ---------------------------------------------------
  // ORGANITZACIÓ
  // ---------------------------------------------------

  valors.push(
    organitzacioId,
  );

  condicions.push(
    `id_organitzacio = $${valors.length}`,
  );


  // ---------------------------------------------------
  // FILTRE RESERVABLE
  // ---------------------------------------------------

  const reservable =
    convertirBooleanQuery(
      filtres.reservable,
    );

  if (
    reservable !== undefined
  ) {
    valors.push(
      reservable,
    );

    condicions.push(
      `reservable = $${valors.length}`,
    );
  }


  // ---------------------------------------------------
  // FILTRE INSPECCIONABLE
  // ---------------------------------------------------

  const inspeccionable =
    convertirBooleanQuery(
      filtres.inspeccionable,
    );

  if (
    inspeccionable !== undefined
  ) {
    valors.push(
      inspeccionable,
    );

    condicions.push(
      `inspeccionable = $${valors.length}`,
    );
  }


  // ---------------------------------------------------
  // FILTRE SEGUIMENT
  // ---------------------------------------------------

  const seguiment =
    convertirBooleanQuery(
      filtres.seguiment,
    );

  if (
    seguiment !== undefined
  ) {
    valors.push(
      seguiment,
    );

    condicions.push(
      `seguiment = $${valors.length}`,
    );
  }


  // ---------------------------------------------------
  // FILTRE ACTIU
  // ---------------------------------------------------

  const actiu =
    convertirBooleanQuery(
      filtres.actiu,
    );

  if (
    actiu !== undefined
  ) {
    valors.push(
      actiu,
    );

    condicions.push(
      `actiu = $${valors.length}`,
    );
  }


  // ---------------------------------------------------
  // WHERE
  // ---------------------------------------------------

  const where =
    condicions.length > 0
      ? `WHERE ${condicions.join(" AND ")}`
      : "";


  // ---------------------------------------------------
  // CONSULTA
  // ---------------------------------------------------

  const resultat =
    await pool.query(
      `
        SELECT
          id,
          id_extern,
          vehicle,
          key_vehiculo,
          actiu,

          reservable,
          inspeccionable,
          seguiment,

          tipus_vehicle,
          combustible,
          places,
          imatge_url,

          disponible_dilluns,
          disponible_dimarts,
          disponible_dimecres,
          disponible_dijous,
          disponible_divendres,
          disponible_dissabte,
          disponible_diumenge,

          manteniment,

          sincronitzat_a,
          creat_a,
          actualitzat_a,

          id_organitzacio

        FROM vehicles

        ${where}

        ORDER BY
          vehicle ASC
      `,
      valors,
    );

  return resultat.rows;
}


// =====================================================
// OBTENIR VEHICLE PER ID
// =====================================================

async function obtenirVehiclePerId(
  id,
  organitzacioId,
) {
  if (!organitzacioId) {
    throw new Error(
      "Cal indicar l'organització",
    );
  }

  const resultat =
    await pool.query(
      `
        SELECT
          id,
          id_extern,
          vehicle,
          key_vehiculo,
          actiu,

          reservable,
          inspeccionable,
          seguiment,

          tipus_vehicle,
          combustible,
          places,
          imatge_url,

          disponible_dilluns,
          disponible_dimarts,
          disponible_dimecres,
          disponible_dijous,
          disponible_divendres,
          disponible_dissabte,
          disponible_diumenge,

          manteniment,

          sincronitzat_a,
          creat_a,
          actualitzat_a,

          id_organitzacio

        FROM vehicles

        WHERE
          id = $1
          AND id_organitzacio = $2

        LIMIT 1
      `,
      [
        id,
        organitzacioId,
      ],
    );

  return (
    resultat.rows[0] ||
    null
  );
}


// =====================================================
// SINCRONITZAR VEHICLES GLOBALSAT
// =====================================================
//
// LÒGICA:
//
// VEHICLE NOU
// ------------------------------------------
// reservable      = false
// inspeccionable  = false
// seguiment       = false
//
// VEHICLE EXISTENT
// ------------------------------------------
// conserva tota la configuració de l'app
//
// Només actualitzem:
// - id_extern
// - vehicle
// - key_vehiculo
// - actiu
// - sincronitzat_a
//
// IMPORTANT:
// NO sobreescrivim reservable.
//

async function sincronitzarVehiclesGlobalsat(
  organitzacioId,
) {
  if (!organitzacioId) {
    throw new Error(
      "Cal indicar l'organització",
    );
  }


  // ---------------------------------------------------
  // CONSULTAR GLOBALSAT
  // ---------------------------------------------------

  const vehiclesGlobalsat =
    await globalsatService.obtenirVehiclesGlobalsat5();


  if (
    !Array.isArray(
      vehiclesGlobalsat,
    )
  ) {
    throw new Error(
      "Globalsat no ha retornat una llista de vehicles vàlida",
    );
  }


  // ---------------------------------------------------
  // RESULTATS
  // ---------------------------------------------------

  let nous = 0;

  let actualitzats = 0;

  let ignorats = 0;


  // ---------------------------------------------------
  // TRANSACCIÓ
  // ---------------------------------------------------

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN",
    );


    // -------------------------------------------------
    // RECÓRRER VEHICLES GLOBALSAT
    // -------------------------------------------------

    for (
      const vehicleGlobalsat
      of vehiclesGlobalsat
    ) {
      const idExtern =
        String(
          vehicleGlobalsat?.idVehiculo ??
            "",
        ).trim();

      const nomVehicle =
        String(
          vehicleGlobalsat?.vehiculo ??
            "",
        ).trim();

      const keyVehiculo =
        String(
          vehicleGlobalsat?.key_vehiculo ??
            "",
        ).trim();


      // -----------------------------------------------
      // VALIDACIÓ
      // -----------------------------------------------

      if (
        !idExtern ||
        !nomVehicle
      ) {
        ignorats += 1;

        continue;
      }


      // -----------------------------------------------
      // COMPROVAR SI EXISTEIX
      // -----------------------------------------------

      const existent =
        await client.query(
          `
            SELECT
              id,
              reservable,
              inspeccionable,
              seguiment

            FROM vehicles

            WHERE
              id_organitzacio = $1
              AND id_extern = $2

            LIMIT 1
          `,
          [
            organitzacioId,
            idExtern,
          ],
        );


      // -----------------------------------------------
      // VEHICLE EXISTENT
      // -----------------------------------------------

      if (
        existent.rows.length > 0
      ) {
        await client.query(
          `
            UPDATE vehicles

            SET
              vehicle = $1,
              key_vehiculo = $2,
              actiu = true,
              sincronitzat_a = NOW(),
              actualitzat_a = NOW()

            WHERE
              id = $3
              AND id_organitzacio = $4
          `,
          [
            nomVehicle,
            keyVehiculo || null,
            existent.rows[0].id,
            organitzacioId,
          ],
        );

        actualitzats += 1;

        continue;
      }


      // -----------------------------------------------
      // VEHICLE NOU
      // -----------------------------------------------
      //
      // IMPORTANT:
      //
      // reservable = false
      //
      // Per tant el vehicle NO apareixerà
      // disponible per reserves fins que un
      // MASTER o SUPERADMIN l'activi.
      //
      // -----------------------------------------------

      await client.query(
        `
          INSERT INTO vehicles (
            id_extern,
            vehicle,
            key_vehiculo,

            actiu,

            reservable,
            inspeccionable,
            seguiment,

            sincronitzat_a,
            creat_a,
            actualitzat_a,

            id_organitzacio
          )

          VALUES (
            $1,
            $2,
            $3,

            true,

            false,
            false,
            false,

            NOW(),
            NOW(),
            NOW(),

            $4
          )
        `,
        [
          idExtern,
          nomVehicle,
          keyVehiculo || null,
          organitzacioId,
        ],
      );

      nous += 1;
    }


    // -------------------------------------------------
    // COMMIT
    // -------------------------------------------------

    await client.query(
      "COMMIT",
    );


    // -------------------------------------------------
    // RETORN
    // -------------------------------------------------

    return {
      totalGlobalsat:
        vehiclesGlobalsat.length,

      nous,

      actualitzats,

      ignorats,
    };
  } catch (error) {
    await client.query(
      "ROLLBACK",
    );

    throw error;
  } finally {
    client.release();
  }
}


// =====================================================
// ACTUALITZAR VEHICLE
// =====================================================

async function actualitzarVehicle(
  id,
  organitzacioId,
  dades,
) {
  if (!organitzacioId) {
    throw new Error(
      "Cal indicar l'organització",
    );
  }

  const vehicle =
    await obtenirVehiclePerId(
      id,
      organitzacioId,
    );

  if (!vehicle) {
    throw new Error(
      "Vehicle no trobat",
    );
  }


  // ---------------------------------------------------
  // DADES GENERALS
  // ---------------------------------------------------

  const tipusVehicle =
    dades.tipus_vehicle ??
    vehicle.tipus_vehicle ??
    null;

  const combustible =
    dades.combustible ??
    vehicle.combustible ??
    null;

  let places =
    dades.places ??
    vehicle.places ??
    null;

  if (
    places !== null &&
    places !== ""
  ) {
    places =
      Number(places);

    if (
      !Number.isInteger(
        places,
      ) ||
      places < 1 ||
      places > 20
    ) {
      throw new Error(
        "El nombre de places no és vàlid",
      );
    }
  } else {
    places = null;
  }

  const imatgeUrl =
    dades.imatge_url ??
    vehicle.imatge_url ??
    null;


  // ---------------------------------------------------
  // FUNCIONALITATS VEHICLE
  // ---------------------------------------------------

  const reservable =
    dades.reservable ??
    vehicle.reservable ??
    false;

  const inspeccionable =
    dades.inspeccionable ??
    vehicle.inspeccionable ??
    false;

  const seguiment =
    dades.seguiment ??
    vehicle.seguiment ??
    false;


  // ---------------------------------------------------
  // DISPONIBILITAT
  // ---------------------------------------------------

  const disponibleDilluns =
    dades.disponible_dilluns ??
    vehicle.disponible_dilluns;

  const disponibleDimarts =
    dades.disponible_dimarts ??
    vehicle.disponible_dimarts;

  const disponibleDimecres =
    dades.disponible_dimecres ??
    vehicle.disponible_dimecres;

  const disponibleDijous =
    dades.disponible_dijous ??
    vehicle.disponible_dijous;

  const disponibleDivendres =
    dades.disponible_divendres ??
    vehicle.disponible_divendres;

  const disponibleDissabte =
    dades.disponible_dissabte ??
    vehicle.disponible_dissabte;

  const disponibleDiumenge =
    dades.disponible_diumenge ??
    vehicle.disponible_diumenge;

  const manteniment =
    dades.manteniment ??
    vehicle.manteniment;


  // ---------------------------------------------------
  // ACTUALITZAR
  // ---------------------------------------------------

  const resultat =
    await pool.query(
      `
        UPDATE vehicles

        SET
          tipus_vehicle = $1,
          combustible = $2,
          places = $3,
          imatge_url = $4,

          reservable = $5,
          inspeccionable = $6,
          seguiment = $7,

          disponible_dilluns = $8,
          disponible_dimarts = $9,
          disponible_dimecres = $10,
          disponible_dijous = $11,
          disponible_divendres = $12,
          disponible_dissabte = $13,
          disponible_diumenge = $14,

          manteniment = $15,

          actualitzat_a = NOW()

        WHERE
          id = $16
          AND id_organitzacio = $17

        RETURNING *
      `,
      [
        tipusVehicle,
        combustible,
        places,
        imatgeUrl,

        reservable,
        inspeccionable,
        seguiment,

        disponibleDilluns,
        disponibleDimarts,
        disponibleDimecres,
        disponibleDijous,
        disponibleDivendres,
        disponibleDissabte,
        disponibleDiumenge,

        manteniment,

        id,
        organitzacioId,
      ],
    );

  return (
    resultat.rows[0] ||
    null
  );
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirVehicles,
  obtenirVehiclePerId,
  sincronitzarVehiclesGlobalsat,
  actualitzarVehicle,
};