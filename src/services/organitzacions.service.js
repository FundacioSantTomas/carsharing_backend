const pool = require("../config/database");

// =====================================================
// OBTENIR ORGANITZACIONS
// =====================================================

async function obtenirOrganitzacions() {
  const resultat = await pool.query(
    `
      SELECT
        id,
        nom,
        codi,
        actiu,
        creat_a,
        actualitzat_a

      FROM organitzacions

      WHERE actiu = TRUE

      ORDER BY nom ASC
      `,
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR ORGANITZACIÓ
// =====================================================

async function obtenirOrganitzacioPerId(id) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        nom,
        codi,
        actiu,
        creat_a,
        actualitzat_a

      FROM organitzacions

      WHERE id = $1
      `,
    [id],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// CREAR ORGANITZACIÓ
// =====================================================

async function crearOrganitzacio(dades) {
  const { nom, codi } = dades;

  const resultat = await pool.query(
    `
      INSERT INTO organitzacions (
        nom,
        codi
      )

      VALUES (
        $1,
        $2
      )

      RETURNING *
      `,
    [nom, codi || null],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR
// =====================================================

async function actualitzarOrganitzacio(id, dades) {
  const actual = await obtenirOrganitzacioPerId(id);

  if (!actual) {
    return null;
  }

  const nom = dades.nom ?? actual.nom;

  const codi = dades.codi !== undefined ? dades.codi : actual.codi;

  const actiu = dades.actiu !== undefined ? dades.actiu : actual.actiu;

  const resultat = await pool.query(
    `
      UPDATE organitzacions

      SET
        nom = $1,
        codi = $2,
        actiu = $3,
        actualitzat_a = NOW()

      WHERE id = $4

      RETURNING *
      `,
    [nom, codi, actiu, id],
  );

  return resultat.rows[0];
}

module.exports = {
  obtenirOrganitzacions,
  obtenirOrganitzacioPerId,
  crearOrganitzacio,
  actualitzarOrganitzacio,
};
