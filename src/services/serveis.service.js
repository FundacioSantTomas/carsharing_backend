const pool = require("../config/database");

const globalsat5Service = require("../integrations/globalsat/globalsat.service")

// =====================================================
// OBTENIR SERVEIS
// =====================================================

async function obtenirServeis(organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        id_organitzacio,
        nom,
        actiu,
        creat_a,
        actualitzat_a

      FROM serveis

      WHERE id_organitzacio = $1
        AND actiu = TRUE

      ORDER BY nom ASC
      `,
    [organitzacioId],
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR SERVEI PER ID
// =====================================================

async function obtenirServeiPerId(id, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        id_organitzacio,
        nom,
        actiu,
        creat_a,
        actualitzat_a

      FROM serveis

      WHERE id = $1
        AND id_organitzacio = $2
      `,
    [id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR ORGANITZACIÓ GLOBALSAT
// =====================================================

async function comprovarOrganitzacioGlobalsat(organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        nom,
        codi

      FROM organitzacions

      WHERE id = $1
        AND actiu = TRUE

      LIMIT 1
      `,
    [organitzacioId],
  );

  const organitzacio = resultat.rows[0];

  if (!organitzacio) {
    throw new Error("Organització no trobada");
  }

  if (String(organitzacio.codi || "").toUpperCase() !== "SANTTOMAS") {
    throw new Error(
      "La sincronització amb Globalsat5 només està disponible per Sant Tomàs",
    );
  }

  return organitzacio;
}

// =====================================================
// SINCRONITZAR SERVEIS
// =====================================================

async function sincronitzarServeis(organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  await comprovarOrganitzacioGlobalsat(organitzacioId);

  const serveisGlobalsat = await globalsat5Service.obtenirServeisGlobalsat5();

  let creats = 0;
  let actualitzats = 0;

  for (const serveiGlobalsat of serveisGlobalsat) {
    const idExtern = String(
      serveiGlobalsat.id ??
        serveiGlobalsat.idServicio ??
        serveiGlobalsat.id_servicio ??
        "",
    ).trim();

    const nom = String(
      serveiGlobalsat.servicio ??
        serveiGlobalsat.nom ??
        serveiGlobalsat.nombre ??
        "",
    ).trim();

    if (!idExtern || !nom) {
      continue;
    }

    // -----------------------------------------------
    // BUSCAR EXISTENT
    // -----------------------------------------------

    const existent = await pool.query(
      `
        SELECT
          id

        FROM serveis

        WHERE id_extern = $1
          AND id_organitzacio = $2

        LIMIT 1
        `,
      [idExtern, organitzacioId],
    );

    // -----------------------------------------------
    // ACTUALITZAR
    // -----------------------------------------------

    if (existent.rows.length > 0) {
      await pool.query(
        `
        UPDATE serveis

        SET
          nom = $1,
          actiu = TRUE,
          actualitzat_a = NOW()

        WHERE id = $2
          AND id_organitzacio = $3
        `,
        [nom, existent.rows[0].id, organitzacioId],
      );

      actualitzats++;
    }

    // -----------------------------------------------
    // CREAR
    // -----------------------------------------------
    else {
      await pool.query(
        `
        INSERT INTO serveis (
          id_extern,
          id_organitzacio,
          nom,
          actiu
        )

        VALUES (
          $1,
          $2,
          $3,
          TRUE
        )
        `,
        [idExtern, organitzacioId, nom],
      );

      creats++;
    }
  }

  return {
    processats: serveisGlobalsat.length,

    creats,

    actualitzats,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirServeis,
  obtenirServeiPerId,
  sincronitzarServeis,
};
