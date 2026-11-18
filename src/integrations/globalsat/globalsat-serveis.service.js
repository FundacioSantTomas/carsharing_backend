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
// NORMALITZAR SERVEI GLOBALSAT
// =====================================================

function normalitzarServeiGlobalsat(servei) {
  const idExtern = normalitzarText(
    servei?.id ??
      servei?.idServicio ??
      servei?.idServei ??
      servei?.codigo ??
      servei?.codi,
  );

  const nom = normalitzarText(
    servei?.servicio ?? servei?.servei ?? servei?.nombre ?? servei?.nom,
  );

  const actiu = normalitzarActiu(
    servei?.baja ?? servei?.actiu ?? servei?.activo,
  );

  return {
    idExtern,
    nom,
    actiu,
  };
}

// =====================================================
// OBTENIR SERVEI EXISTENT
// =====================================================

async function obtenirServeiExistent(organitzacioId, idExtern) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        nom,
        actiu

      FROM serveis

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
// CREAR SERVEI
// =====================================================

async function crearServei({ organitzacioId, idExtern, nom, actiu }) {
  const resultat = await pool.query(
    `
      INSERT INTO serveis (
        id_organitzacio,
        id_extern,
        nom,
        actiu
      )

      VALUES (
        $1,
        $2,
        $3,
        $4
      )

      RETURNING
        id,
        id_organitzacio,
        id_extern,
        nom,
        actiu
    `,
    [organitzacioId, idExtern, nom, actiu],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR SERVEI
// =====================================================

async function actualitzarServei({ serveiId, organitzacioId, nom, actiu }) {
  const resultat = await pool.query(
    `
      UPDATE serveis

      SET
        nom = $1,
        actiu = $2,
        actualitzat_a = NOW()

      WHERE
        id = $3
        AND id_organitzacio = $4

      RETURNING
        id,
        id_organitzacio,
        id_extern,
        nom,
        actiu
    `,
    [nom, actiu, serveiId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// SINCRONITZAR SERVEIS
// =====================================================

async function sincronitzarServeis(organitzacioId) {
  await comprovarOrganitzacio(organitzacioId);

  const resposta = await globalsatService.obtenirServeisGlobalsat5();

  const serveisGlobalsat = Array.isArray(resposta) ? resposta : [];

  let creats = 0;
  let actualitzats = 0;
  let ignorats = 0;
  let errors = 0;

  const detallsErrors = [];

  for (const serveiGlobalsat of serveisGlobalsat) {
    try {
      const servei = normalitzarServeiGlobalsat(serveiGlobalsat);

      if (!servei.idExtern || !servei.nom) {
        ignorats++;

        detallsErrors.push({
          tipus: "DADES_INCOMPLETES",
          servei: serveiGlobalsat,
        });

        continue;
      }

      const existent = await obtenirServeiExistent(
        organitzacioId,
        servei.idExtern,
      );

      if (!existent) {
        await crearServei({
          organitzacioId,
          idExtern: servei.idExtern,
          nom: servei.nom,
          actiu: servei.actiu,
        });

        creats++;

        continue;
      }

      const haCanviat =
        existent.nom !== servei.nom ||
        Boolean(existent.actiu) !== Boolean(servei.actiu);

      if (!haCanviat) {
        continue;
      }

      await actualitzarServei({
        serveiId: existent.id,
        organitzacioId,
        nom: servei.nom,
        actiu: servei.actiu,
      });

      actualitzats++;
    } catch (error) {
      errors++;

      detallsErrors.push({
        tipus: "ERROR",
        missatge: error.message,
        servei: serveiGlobalsat,
      });

      console.error(
        "[GLOBALSAT][SERVEIS] Error processant servei:",
        error.message,
      );
    }
  }

  return {
    totalGlobalsat: serveisGlobalsat.length,

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
  sincronitzarServeis,
};
