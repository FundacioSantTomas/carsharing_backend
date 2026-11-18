const pool = require("../../config/database");
const bcrypt = require("bcrypt");

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

function normalitzarRolGlobalsat(rol) {
  const valor = String(rol || "BASIC")
    .trim()
    .toUpperCase();

  switch (valor) {
    case "MASTER":
      return "MASTER";

    case "TECNIC":
    case "TÈCNIC":
      return "TECNIC";

    default:
      return "BASIC";
  }
}

function estaActiuGlobalsat(valorBaixa) {
  const baixa = String(valorBaixa ?? "")
    .trim()
    .toLowerCase();

  return !["1", "true", "si", "sí", "yes"].includes(baixa);
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
// NORMALITZAR USUARI GLOBALSAT
// =====================================================

function normalitzarUsuariGlobalsat(usuari) {
  return {
    idExtern: normalitzarText(usuari?.id),

    usuari: normalitzarText(usuari?.usr),

    password: String(usuari?.pwd ?? ""),

    nom: normalitzarText(usuari?.nombre),

    codi: normalitzarText(usuari?.codigo),

    serveiExtern: normalitzarText(usuari?.idServicio),

    rol: normalitzarRolGlobalsat(usuari?.role),

    actiu: estaActiuGlobalsat(usuari?.baja),
  };
}

// =====================================================
// CARREGAR SERVEIS LOCALS
// =====================================================

async function carregarServeis(organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern

      FROM serveis

      WHERE
        id_organitzacio = $1
    `,
    [organitzacioId],
  );

  const serveis = new Map();

  for (const servei of resultat.rows) {
    if (!servei.id_extern) {
      continue;
    }

    serveis.set(String(servei.id_extern).trim(), servei.id);
  }

  return serveis;
}

// =====================================================
// CARREGAR USUARIS LOCALS
// =====================================================

async function carregarUsuaris(organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        usuari,
        password_hash,
        nom,
        codi,
        rol,
        servei_id,
        actiu

      FROM usuaris

      WHERE
        id_organitzacio = $1
        AND id_extern IS NOT NULL
    `,
    [organitzacioId],
  );

  const usuaris = new Map();

  for (const usuari of resultat.rows) {
    usuaris.set(String(usuari.id_extern).trim(), usuari);
  }

  return usuaris;
}

// =====================================================
// CREAR HASH DE CONTRASENYA INICIAL
// =====================================================
//
// IMPORTANT:
//
// Només utilitzem la contrasenya de Globalsat
// quan CREEM l'usuari per primera vegada.
//
// Un cop existeix al Carsharing,
// la sincronització NO torna a tocar
// password_hash.
//

async function obtenirPasswordHashInicial(password) {
  if (!password) {
    return null;
  }

  return bcrypt.hash(password, 12);
}

// =====================================================
// CREAR USUARI
// =====================================================

async function crearUsuari({ organitzacioId, usuari, serveiId }) {
  const passwordHash = await obtenirPasswordHashInicial(usuari.password);

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
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )

        RETURNING
          id,
          id_extern,
          usuari,
          password_hash,
          nom,
          codi,
          rol,
          servei_id,
          actiu
      `,
    [
      usuari.idExtern,
      organitzacioId,
      usuari.usuari,
      passwordHash,
      usuari.nom,
      usuari.codi,
      usuari.rol,
      serveiId,
      usuari.actiu,
    ],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR USUARI
// =====================================================
//
// IMPORTANT:
//
// NO actualitzem password_hash.
//
// Això permet que una contrasenya modificada
// des del Carsharing no sigui sobreescrita
// per la següent sincronització de Globalsat.
//

async function actualitzarUsuari({
  organitzacioId,
  usuariExistent,
  usuari,
  serveiId,
}) {
  // Mai deixem que Globalsat degradi
  // un SUPERADMIN.

  const rolFinal =
    String(usuariExistent.rol || "").toUpperCase() === "SUPERADMIN"
      ? "SUPERADMIN"
      : usuari.rol;

  const resultat = await pool.query(
    `
        UPDATE usuaris

        SET
          usuari = $1,
          nom = $2,
          codi = $3,
          rol = $4,
          servei_id = $5,
          actiu = $6,
          actualitzat_a = NOW()

        WHERE
          id = $7
          AND id_organitzacio = $8

        RETURNING
          id,
          id_extern,
          usuari,
          password_hash,
          nom,
          codi,
          rol,
          servei_id,
          actiu
      `,
    [
      usuari.usuari,
      usuari.nom,
      usuari.codi,
      rolFinal,
      serveiId,
      usuari.actiu,
      usuariExistent.id,
      organitzacioId,
    ],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR SI HAN CANVIAT DADES
// =====================================================
//
// La contrasenya NO forma part
// de la sincronització d'usuaris existents.
//

function dadesHanCanviat(existent, usuari, serveiId) {
  const rolFinal =
    String(existent.rol || "").toUpperCase() === "SUPERADMIN"
      ? "SUPERADMIN"
      : usuari.rol;

  return (
    String(existent.usuari || "") !== String(usuari.usuari || "") ||
    (existent.nom || null) !== (usuari.nom || null) ||
    (existent.codi || null) !== (usuari.codi || null) ||
    String(existent.rol || "") !== String(rolFinal || "") ||
    Number(existent.servei_id || 0) !== Number(serveiId || 0) ||
    Boolean(existent.actiu) !== Boolean(usuari.actiu)
  );
}

// =====================================================
// SINCRONITZAR USUARIS
// =====================================================

async function sincronitzarUsuaris(organitzacioId) {
  const organitzacio = await comprovarOrganitzacio(organitzacioId);

  const resposta = await globalsatService.obtenirUsuarisGlobalsat5();

  const usuarisGlobalsat = Array.isArray(resposta)
    ? resposta
    : Array.isArray(resposta?.usuarios)
      ? resposta.usuarios
      : Array.isArray(resposta?.usuaris)
        ? resposta.usuaris
        : [];

  const serveis = await carregarServeis(organitzacio.id);

  const usuarisLocals = await carregarUsuaris(organitzacio.id);

  let creats = 0;
  let actualitzats = 0;
  let senseCanvis = 0;
  let ignorats = 0;
  let errors = 0;

  const detallsErrors = [];

  for (const usuariGlobalsat of usuarisGlobalsat) {
    try {
      const usuari = normalitzarUsuariGlobalsat(usuariGlobalsat);

      // ===============================================
      // VALIDACIÓ
      // ===============================================

      if (!usuari.idExtern || !usuari.usuari) {
        ignorats++;

        detallsErrors.push({
          tipus: "DADES_INCOMPLETES",

          usuari: usuariGlobalsat,
        });

        continue;
      }

      // ===============================================
      // SERVEI
      // ===============================================

      let serveiId = null;

      if (usuari.serveiExtern) {
        serveiId = serveis.get(usuari.serveiExtern) || null;
      }

      // ===============================================
      // USUARI EXISTENT
      // ===============================================

      const existent = usuarisLocals.get(usuari.idExtern);

      // ===============================================
      // CREAR
      // ===============================================
      //
      // Només en aquest moment importem
      // la contrasenya de Globalsat.
      //

      if (!existent) {
        const nouUsuari = await crearUsuari({
          organitzacioId: organitzacio.id,

          usuari,
          serveiId,
        });

        usuarisLocals.set(usuari.idExtern, nouUsuari);

        creats++;

        continue;
      }

      // ===============================================
      // COMPROVAR CANVIS
      // ===============================================
      //
      // IMPORTANT:
      //
      // No comparem la contrasenya
      // de Globalsat amb password_hash.
      //
      // Si l'usuari l'ha canviat
      // al Carsharing, és normal que
      // no coincideixi.
      //

      const haCanviat = dadesHanCanviat(existent, usuari, serveiId);

      if (!haCanviat) {
        senseCanvis++;

        continue;
      }

      // ===============================================
      // ACTUALITZAR
      // ===============================================
      //
      // Actualitza:
      // - usuari
      // - nom
      // - codi
      // - rol
      // - servei
      // - actiu
      //
      // NO actualitza password_hash.
      //

      const usuariActualitzat = await actualitzarUsuari({
        organitzacioId: organitzacio.id,

        usuariExistent: existent,

        usuari,
        serveiId,
      });

      if (usuariActualitzat) {
        usuarisLocals.set(usuari.idExtern, usuariActualitzat);
      }

      actualitzats++;
    } catch (error) {
      errors++;

      detallsErrors.push({
        tipus: "ERROR",

        missatge: error.message,

        usuari: usuariGlobalsat,
      });

      console.error(
        "[GLOBALSAT][USUARIS] Error processant usuari:",
        error.message,
      );
    }
  }

  return {
    totalGlobalsat: usuarisGlobalsat.length,

    creats,
    actualitzats,
    senseCanvis,
    ignorats,
    errors,

    detallsErrors,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarUsuaris,
};
