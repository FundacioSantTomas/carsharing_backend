const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =====================================================
// LOGIN
// =====================================================

async function login(usuari, password) {
  if (!usuari || !password) {
    throw new Error("Cal indicar usuari i contrasenya");
  }

  // ---------------------------------------------------
  // BUSCAR USUARI
  // ---------------------------------------------------

  const resultat = await pool.query(
    `
    SELECT
      u.id,
      u.id_extern,
      u.usuari,
      u.password_hash,
      u.nom,
      u.codi,
      u.rol,
      u.servei_id,
      u.id_organitzacio,
      u.actiu,

      s.nom AS servei,

      o.nom AS organitzacio,
      o.codi AS organitzacio_codi

    FROM usuaris u

    LEFT JOIN serveis s
      ON s.id = u.servei_id

    LEFT JOIN organitzacions o
      ON o.id = u.id_organitzacio

    WHERE LOWER(u.usuari) = LOWER($1)

    LIMIT 1
    `,
    [String(usuari).trim()],
  );

  if (resultat.rows.length === 0) {
    throw new Error("Usuari o contrasenya incorrectes");
  }

  const user = resultat.rows[0];

  // ---------------------------------------------------
  // COMPROVAR ACTIU
  // ---------------------------------------------------

  if (!user.actiu) {
    throw new Error("Aquest usuari està desactivat");
  }

  // ---------------------------------------------------
  // COMPROVAR PASSWORD
  // ---------------------------------------------------

  if (!user.password_hash) {
    throw new Error("Aquest usuari no té contrasenya configurada");
  }

  const passwordCorrecte = await bcrypt.compare(password, user.password_hash);

  if (!passwordCorrecte) {
    throw new Error("Usuari o contrasenya incorrectes");
  }

  // ---------------------------------------------------
  // NORMALITZAR ROL
  // ---------------------------------------------------

  const rol = String(user.rol || "BASIC").toUpperCase();

  // ---------------------------------------------------
  // COMPROVAR ORGANITZACIÓ
  // ---------------------------------------------------
  //
  // SUPERADMIN pot existir sense organització fixa.
  //
  // La resta d'usuaris sí que han de pertànyer
  // obligatòriament a una organització.
  // ---------------------------------------------------

  if (rol !== "SUPERADMIN" && !user.id_organitzacio) {
    throw new Error("L'usuari no té cap organització assignada");
  }

  // ---------------------------------------------------
  // CREAR TOKEN
  // ---------------------------------------------------

  const token = jwt.sign(
    {
      id: user.id,

      usuari: user.usuari,

      rol,

      serveiId: user.servei_id,

      organitzacioId: user.id_organitzacio,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    },
  );

  // ---------------------------------------------------
  // RETORNAR USUARI
  // ---------------------------------------------------

  return {
    token,

    usuari: {
      id: user.id,

      idExtern: user.id_extern,

      usuari: user.usuari,

      nom: user.nom,

      codi: user.codi,

      rol,

      serveiId: user.servei_id,

      servei: user.servei,

      organitzacioId: user.id_organitzacio,

      organitzacio: user.organitzacio,

      organitzacioCodi: user.organitzacio_codi,
    },
  };
}

module.exports = {
  login,
};
