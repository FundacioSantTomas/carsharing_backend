const pool = require("../config/database");
const bcrypt = require("bcrypt");

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

function normalitzarRol(rol) {
  const valor = String(rol || "")
    .trim()
    .toUpperCase();

  const rolsValids = [
    "SUPERADMIN",
    "MASTER",
    "TECNIC",
    "BASIC",
  ];

  if (!rolsValids.includes(valor)) {
    throw new Error("El rol indicat no és vàlid");
  }

  return valor;
}

// =====================================================
// COMPROVAR SERVEI
// =====================================================

async function comprovarServei(serveiId, organitzacioId) {
  if (
    serveiId === undefined ||
    serveiId === null ||
    serveiId === ""
  ) {
    return null;
  }

  const resultat = await pool.query(
    `
      SELECT
        id,
        nom

      FROM serveis

      WHERE
        id = $1
        AND id_organitzacio = $2
        AND actiu = TRUE

      LIMIT 1
    `,
    [serveiId, organitzacioId],
  );

  if (resultat.rows.length === 0) {
    throw new Error(
      "El servei seleccionat no existeix dins aquesta organització",
    );
  }

  return resultat.rows[0];
}

// =====================================================
// OBTENIR USUARIS
// =====================================================

async function obtenirUsuaris(organitzacioId, filtres = {}) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const {
    serveiId,
    usuariId,
  } = filtres;

  const condicions = [
    "u.id_organitzacio = $1",
  ];

  const valors = [
    organitzacioId,
  ];

  if (serveiId) {
    valors.push(serveiId);

    condicions.push(
      `u.servei_id = $${valors.length}`,
    );
  }

  if (usuariId) {
    valors.push(usuariId);

    condicions.push(
      `u.id = $${valors.length}`,
    );
  }

  const resultat = await pool.query(
    `
      SELECT
        u.id,
        u.id_extern,
        u.id_organitzacio,
        u.usuari,
        u.nom,
        u.codi,
        u.rol,
        u.servei_id,

        s.nom AS servei,

        u.actiu,
        u.creat_a,
        u.actualitzat_a

      FROM usuaris u

      LEFT JOIN serveis s
        ON s.id = u.servei_id
        AND s.id_organitzacio = u.id_organitzacio

      WHERE
        ${condicions.join(" AND ")}

      ORDER BY
        u.nom,
        u.usuari
    `,
    valors,
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR USUARI PER ID
// =====================================================

async function obtenirUsuariPerId(id, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const resultat = await pool.query(
    `
      SELECT
        u.id,
        u.id_extern,
        u.id_organitzacio,
        u.usuari,
        u.nom,
        u.codi,
        u.rol,
        u.servei_id,

        s.nom AS servei,

        u.actiu,
        u.creat_a,
        u.actualitzat_a

      FROM usuaris u

      LEFT JOIN serveis s
        ON s.id = u.servei_id
        AND s.id_organitzacio = u.id_organitzacio

      WHERE
        u.id = $1
        AND u.id_organitzacio = $2

      LIMIT 1
    `,
    [
      id,
      organitzacioId,
    ],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// CREAR USUARI
// =====================================================

async function crearUsuari(organitzacioId, dades) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const usuari = normalitzarText(
    dades.usuari,
  );

  const nom = normalitzarText(
    dades.nom,
  );

  const codi = normalitzarText(
    dades.codi,
  );

  const password = String(
    dades.password || "",
  );

  const rol = normalitzarRol(
    dades.rol || "BASIC",
  );

  const serveiId =
    dades.serveiId ||
    dades.servei_id ||
    null;

  if (!usuari) {
    throw new Error(
      "El nom d'usuari és obligatori",
    );
  }

  if (!password) {
    throw new Error(
      "La contrasenya és obligatòria",
    );
  }

  if (password.length < 6) {
    throw new Error(
      "La contrasenya ha de tenir com a mínim 6 caràcters",
    );
  }

  await comprovarServei(
    serveiId,
    organitzacioId,
  );

  const existent = await pool.query(
    `
      SELECT
        id

      FROM usuaris

      WHERE
        LOWER(usuari) = LOWER($1)
        AND id_organitzacio = $2

      LIMIT 1
    `,
    [
      usuari,
      organitzacioId,
    ],
  );

  if (existent.rows.length > 0) {
    throw new Error(
      "Ja existeix un usuari amb aquest identificador",
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    );

  const resultat = await pool.query(
    `
      INSERT INTO usuaris (
        id_extern,
        id_organitzacio,
        usuari,
        password_hash,
        nom,
        codi,
        rol,
        servei_id,
        actiu
      )

      VALUES (
        NULL,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        TRUE
      )

      RETURNING id
    `,
    [
      organitzacioId,
      usuari,
      passwordHash,
      nom,
      codi,
      rol,
      serveiId,
    ],
  );

  return obtenirUsuariPerId(
    resultat.rows[0].id,
    organitzacioId,
  );
}

// =====================================================
// ACTUALITZAR USUARI
// =====================================================

async function actualitzarUsuari(
  id,
  organitzacioId,
  dades,
) {
  const actual =
    await obtenirUsuariPerId(
      id,
      organitzacioId,
    );

  if (!actual) {
    throw new Error(
      "Usuari no trobat",
    );
  }

  const usuari =
    normalitzarText(
      dades.usuari ??
        actual.usuari,
    );

  const nom =
    dades.nom !== undefined
      ? normalitzarText(
          dades.nom,
        )
      : actual.nom;

  const codi =
    dades.codi !== undefined
      ? normalitzarText(
          dades.codi,
        )
      : actual.codi;

  const rol =
    dades.rol !== undefined
      ? normalitzarRol(
          dades.rol,
        )
      : actual.rol;

  const serveiId =
    dades.serveiId !== undefined
      ? dades.serveiId || null
      : dades.servei_id !== undefined
        ? dades.servei_id || null
        : actual.servei_id;

  if (!usuari) {
    throw new Error(
      "El nom d'usuari és obligatori",
    );
  }

  await comprovarServei(
    serveiId,
    organitzacioId,
  );

  const duplicat =
    await pool.query(
      `
        SELECT
          id

        FROM usuaris

        WHERE
          LOWER(usuari) = LOWER($1)
          AND id_organitzacio = $2
          AND id <> $3

        LIMIT 1
      `,
      [
        usuari,
        organitzacioId,
        id,
      ],
    );

  if (
    duplicat.rows.length >
    0
  ) {
    throw new Error(
      "Ja existeix un altre usuari amb aquest identificador",
    );
  }

  await pool.query(
    `
      UPDATE usuaris

      SET
        usuari = $1,
        nom = $2,
        codi = $3,
        rol = $4,
        servei_id = $5,
        actualitzat_a = NOW()

      WHERE
        id = $6
        AND id_organitzacio = $7
    `,
    [
      usuari,
      nom,
      codi,
      rol,
      serveiId,
      id,
      organitzacioId,
    ],
  );

  return obtenirUsuariPerId(
    id,
    organitzacioId,
  );
}

// =====================================================
// CANVIAR CONTRASENYA
// =====================================================

async function canviarContrasenya(
  id,
  organitzacioId,
  password,
) {
  const actual =
    await obtenirUsuariPerId(
      id,
      organitzacioId,
    );

  if (!actual) {
    throw new Error(
      "Usuari no trobat",
    );
  }

  const passwordText =
    String(
      password || "",
    );

  if (!passwordText) {
    throw new Error(
      "La contrasenya és obligatòria",
    );
  }

  if (
    passwordText.length <
    6
  ) {
    throw new Error(
      "La contrasenya ha de tenir com a mínim 6 caràcters",
    );
  }

  const passwordHash =
    await bcrypt.hash(
      passwordText,
      12,
    );

  await pool.query(
    `
      UPDATE usuaris

      SET
        password_hash = $1,
        actualitzat_a = NOW()

      WHERE
        id = $2
        AND id_organitzacio = $3
    `,
    [
      passwordHash,
      id,
      organitzacioId,
    ],
  );

  return true;
}

// =====================================================
// ACTIVAR / DESACTIVAR
// =====================================================

async function establirEstatUsuari(
  id,
  organitzacioId,
  actiu,
) {
  const resultat =
    await pool.query(
      `
        UPDATE usuaris

        SET
          actiu = $1,
          actualitzat_a = NOW()

        WHERE
          id = $2
          AND id_organitzacio = $3

        RETURNING id
      `,
      [
        actiu,
        id,
        organitzacioId,
      ],
    );

  if (
    resultat.rows.length ===
    0
  ) {
    throw new Error(
      "Usuari no trobat",
    );
  }

  return obtenirUsuariPerId(
    id,
    organitzacioId,
  );
}

async function activarUsuari(
  id,
  organitzacioId,
) {
  return establirEstatUsuari(
    id,
    organitzacioId,
    true,
  );
}

async function desactivarUsuari(
  id,
  organitzacioId,
) {
  return establirEstatUsuari(
    id,
    organitzacioId,
    false,
  );
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirUsuaris,
  obtenirUsuariPerId,

  crearUsuari,
  actualitzarUsuari,
  canviarContrasenya,

  activarUsuari,
  desactivarUsuari,
};