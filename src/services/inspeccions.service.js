const pool = require("../config/database");


// =====================================================
// OBTENIR INSPECCIONS
// =====================================================

async function obtenirInspeccions(
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

  valors.push(organitzacioId);

  condicions.push(
    `i.id_organitzacio = $${valors.length}`,
  );

  if (filtres.vehicleId) {
    valors.push(
      filtres.vehicleId,
    );

    condicions.push(
      `i.vehicle_id = $${valors.length}`,
    );
  }

  if (filtres.inspectorId) {
    valors.push(
      filtres.inspectorId,
    );

    condicions.push(
      `i.inspector_id = $${valors.length}`,
    );
  }

  if (filtres.resultat) {
    valors.push(
      filtres.resultat,
    );

    condicions.push(
      `i.resultat = $${valors.length}`,
    );
  }

  if (filtres.desde) {
    valors.push(
      filtres.desde,
    );

    condicions.push(
      `i.data_inspeccio >= $${valors.length}::timestamptz`,
    );
  }

  if (filtres.fins) {
    valors.push(
      filtres.fins,
    );

    condicions.push(
      `i.data_inspeccio <= ($${valors.length}::date + INTERVAL '1 day')`,
    );
  }

  const where =
    condicions.length > 0
      ? `WHERE ${condicions.join(" AND ")}`
      : "";

  const resultat =
    await pool.query(
      `
        SELECT
          i.id,
          i.id AS inspeccio_id,

          i.id_organitzacio,

          i.vehicle_id,
          v.vehicle,

          i.inspector_id,
          u.usuari AS inspector_usuari,
          u.nom AS inspector_nom,

          i.data_inspeccio,
          i.kms,

          i.exterior,
          i.interior,
          i.pneumatics,
          i.llums,
          i.neteja,
          i.documentacio,

          i.puntuacio_mitjana,

          i.resultat,
          i.observacions,

          i.bloqueig_generat,
          i.bloqueig_id,

          i.creat_a,
          i.actualitzat_a

        FROM inspeccions i

        INNER JOIN vehicles v
          ON v.id = i.vehicle_id

        INNER JOIN usuaris u
          ON u.id = i.inspector_id

        ${where}

        ORDER BY
          i.data_inspeccio DESC
      `,
      valors,
    );

  return resultat.rows;
}


// =====================================================
// OBTENIR INSPECCIÓ PER ID
// =====================================================

async function obtenirInspeccioPerId(
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
          i.id,
          i.id AS inspeccio_id,

          i.id_organitzacio,

          i.vehicle_id,
          v.vehicle,

          i.inspector_id,
          u.usuari AS inspector_usuari,
          u.nom AS inspector_nom,

          i.data_inspeccio,
          i.kms,

          i.exterior,
          i.interior,
          i.pneumatics,
          i.llums,
          i.neteja,
          i.documentacio,

          i.puntuacio_mitjana,

          i.resultat,
          i.observacions,

          i.bloqueig_generat,
          i.bloqueig_id,

          i.creat_a,
          i.actualitzat_a

        FROM inspeccions i

        INNER JOIN vehicles v
          ON v.id = i.vehicle_id

        INNER JOIN usuaris u
          ON u.id = i.inspector_id

        WHERE
          i.id = $1
          AND i.id_organitzacio = $2

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
// COMPROVAR VEHICLE
// =====================================================

async function comprovarVehicle(
  vehicleId,
  organitzacioId,
) {
  const resultat =
    await pool.query(
      `
        SELECT
          id,
          vehicle,
          actiu,
          inspeccionable

        FROM vehicles

        WHERE
          id = $1
          AND id_organitzacio = $2
          AND actiu = TRUE
          AND inspeccionable = TRUE

        LIMIT 1
      `,
      [
        vehicleId,
        organitzacioId,
      ],
    );

  return (
    resultat.rows[0] ||
    null
  );
}


// =====================================================
// COMPROVAR INSPECTOR
// =====================================================

async function comprovarInspector(
  inspectorId,
  organitzacioId,
) {
  const resultat =
    await pool.query(
      `
        SELECT
          id,
          usuari,
          nom,
          rol,
          actiu

        FROM usuaris

        WHERE
          id = $1
          AND id_organitzacio = $2
          AND actiu = TRUE

        LIMIT 1
      `,
      [
        inspectorId,
        organitzacioId,
      ],
    );

  return (
    resultat.rows[0] ||
    null
  );
}


// =====================================================
// VALIDAR PUNTUACIÓ
// =====================================================

function validarPuntuacio(
  valor,
  nomCamp,
) {
  const numero =
    Number(valor);

  if (
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 5
  ) {
    throw new Error(
      `La puntuació de ${nomCamp} ha d'estar entre 1 i 5`,
    );
  }

  return numero;
}


// =====================================================
// CREAR INSPECCIÓ
// =====================================================

async function crearInspeccio({
  organitzacioId,
  vehicleId,
  inspectorId,

  kms,

  exterior,
  interior,
  pneumatics,
  llums,
  neteja,
  documentacio,

  observacions,
}) {
  if (!organitzacioId) {
    throw new Error(
      "Cal indicar l'organització",
    );
  }

  if (!vehicleId) {
    throw new Error(
      "Cal indicar el vehicle",
    );
  }

  if (!inspectorId) {
    throw new Error(
      "Cal indicar l'inspector",
    );
  }


  // ---------------------------------------------------
  // VEHICLE
  // ---------------------------------------------------

  const vehicle =
    await comprovarVehicle(
      vehicleId,
      organitzacioId,
    );

  if (!vehicle) {
    throw new Error(
      "El vehicle no existeix, no està actiu o no és inspeccionable",
    );
  }


  // ---------------------------------------------------
  // INSPECTOR
  // ---------------------------------------------------

  const inspector =
    await comprovarInspector(
      inspectorId,
      organitzacioId,
    );

  if (!inspector) {
    throw new Error(
      "L'inspector no existeix o no pertany a l'organització",
    );
  }


  // ---------------------------------------------------
  // PUNTUACIONS
  // ---------------------------------------------------

  const puntuacions = {
    exterior:
      validarPuntuacio(
        exterior,
        "l'exterior",
      ),

    interior:
      validarPuntuacio(
        interior,
        "l'interior",
      ),

    pneumatics:
      validarPuntuacio(
        pneumatics,
        "pneumàtics",
      ),

    llums:
      validarPuntuacio(
        llums,
        "llums",
      ),

    neteja:
      validarPuntuacio(
        neteja,
        "neteja",
      ),

    documentacio:
      validarPuntuacio(
        documentacio,
        "documentació",
      ),
  };


  // ---------------------------------------------------
  // KM
  // ---------------------------------------------------

  let kmsNumero = null;

  if (
    kms !== undefined &&
    kms !== null &&
    kms !== ""
  ) {
    kmsNumero =
      Number(kms);

    if (
      !Number.isInteger(
        kmsNumero,
      ) ||
      kmsNumero < 0
    ) {
      throw new Error(
        "El valor de quilòmetres no és vàlid",
      );
    }
  }


  // ---------------------------------------------------
  // MITJANA
  // ---------------------------------------------------

  const valors =
    Object.values(
      puntuacions,
    );

  const suma =
    valors.reduce(
      (acumulat, valor) =>
        acumulat + valor,
      0,
    );

  const puntuacioMitjana =
    Number(
      (
        suma /
        valors.length
      ).toFixed(2),
    );


  // ---------------------------------------------------
  // RESULTAT
  // ---------------------------------------------------

  const teIncidencia =
    valors.some(
      (valor) =>
        valor <= 2,
    );

  const resultatInspeccio =
    teIncidencia
      ? "INCIDENCIA"
      : "CORRECTA";


  // ---------------------------------------------------
  // INSERT
  // ---------------------------------------------------

  const resultat =
    await pool.query(
      `
        INSERT INTO inspeccions (
          id_organitzacio,
          vehicle_id,
          inspector_id,

          data_inspeccio,
          kms,

          exterior,
          interior,
          pneumatics,
          llums,
          neteja,
          documentacio,

          puntuacio_mitjana,

          resultat,
          observacions,

          bloqueig_generat,

          creat_a,
          actualitzat_a
        )

        VALUES (
          $1,
          $2,
          $3,

          NOW(),
          $4,

          $5,
          $6,
          $7,
          $8,
          $9,
          $10,

          $11,

          $12,
          $13,

          FALSE,

          NOW(),
          NOW()
        )

        RETURNING *
      `,
      [
        organitzacioId,
        vehicleId,
        inspectorId,

        kmsNumero,

        puntuacions.exterior,
        puntuacions.interior,
        puntuacions.pneumatics,
        puntuacions.llums,
        puntuacions.neteja,
        puntuacions.documentacio,

        puntuacioMitjana,

        resultatInspeccio,
        observacions ||
          null,
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
  obtenirInspeccions,
  obtenirInspeccioPerId,
  crearInspeccio,
};