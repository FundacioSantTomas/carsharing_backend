const pool = require("../config/database");

// =====================================================
// HELPERS
// =====================================================

function normalitzarTipus(tipus) {
  const valor = String(tipus || "")
    .trim()
    .toUpperCase();

  if (!valor) {
    throw new Error("Cal indicar el tipus d'integració");
  }

  return valor;
}

function normalitzarConfiguracio(configuracio) {
  if (configuracio === undefined || configuracio === null) {
    return {};
  }

  if (typeof configuracio === "object" && !Array.isArray(configuracio)) {
    return configuracio;
  }

  throw new Error("La configuració de la integració no és vàlida");
}

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
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (resultat.rows.length === 0) {
    throw new Error("Organització no trobada");
  }

  return resultat.rows[0];
}

// =====================================================
// OBTENIR TOTES LES INTEGRACIONS ACTIVES
// =====================================================

async function obtenirIntegracionsActives() {
  const resultat = await pool.query(`
    SELECT
      io.id,
      io.id_organitzacio,
      o.nom AS organitzacio_nom,
      o.codi AS organitzacio_codi,

      io.tipus,
      io.actiu,

      io.sync_usuaris,
      io.sync_vehicles,
      io.sync_serveis,
      io.sync_reserves,
      io.sync_kms,

      io.configuracio,

      io.creat_a,
      io.actualitzat_a

    FROM integracions_organitzacio io

    INNER JOIN organitzacions o
      ON o.id = io.id_organitzacio

    WHERE
      io.actiu = TRUE
      AND o.actiu = TRUE

    ORDER BY
      o.nom ASC,
      io.tipus ASC
  `);

  return resultat.rows;
}

// =====================================================
// OBTENIR INTEGRACIONS D'UNA ORGANITZACIÓ
// =====================================================

async function obtenirIntegracionsOrganitzacio(organitzacioId) {
  const organitzacio = await comprovarOrganitzacio(organitzacioId);

  const resultat = await pool.query(
    `
      SELECT
        id,
        id_organitzacio,
        tipus,
        actiu,

        sync_usuaris,
        sync_vehicles,
        sync_serveis,
        sync_reserves,
        sync_kms,

        configuracio,

        creat_a,
        actualitzat_a

      FROM integracions_organitzacio

      WHERE id_organitzacio = $1

      ORDER BY tipus ASC
    `,
    [organitzacio.id],
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR UNA INTEGRACIÓ CONCRETA
// =====================================================

async function obtenirIntegracio(organitzacioId, tipus) {
  const organitzacio = await comprovarOrganitzacio(organitzacioId);

  const tipusNormalitzat = normalitzarTipus(tipus);

  const resultat = await pool.query(
    `
      SELECT
        id,
        id_organitzacio,
        tipus,
        actiu,

        sync_usuaris,
        sync_vehicles,
        sync_serveis,
        sync_reserves,
        sync_kms,

        configuracio,

        creat_a,
        actualitzat_a

      FROM integracions_organitzacio

      WHERE
        id_organitzacio = $1
        AND UPPER(tipus) = $2

      LIMIT 1
    `,
    [
      organitzacio.id,
      tipusNormalitzat,
    ],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// OBTENIR UNA INTEGRACIÓ ACTIVA
// =====================================================

async function obtenirIntegracioActiva(organitzacioId, tipus) {
  const organitzacio = await comprovarOrganitzacio(organitzacioId);

  const tipusNormalitzat = normalitzarTipus(tipus);

  const resultat = await pool.query(
    `
      SELECT
        id,
        id_organitzacio,
        tipus,
        actiu,

        sync_usuaris,
        sync_vehicles,
        sync_serveis,
        sync_reserves,
        sync_kms,

        configuracio,

        creat_a,
        actualitzat_a

      FROM integracions_organitzacio

      WHERE
        id_organitzacio = $1
        AND UPPER(tipus) = $2
        AND actiu = TRUE

      LIMIT 1
    `,
    [
      organitzacio.id,
      tipusNormalitzat,
    ],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// CREAR INTEGRACIÓ
// =====================================================

async function crearIntegracio(
  organitzacioId,
  {
    tipus,
    actiu = true,
    syncUsuaris = false,
    syncVehicles = false,
    syncServeis = false,
    syncReserves = false,
    syncKms = false,
    configuracio = {},
  },
) {
  const organitzacio = await comprovarOrganitzacio(organitzacioId);

  const tipusNormalitzat = normalitzarTipus(tipus);

  const configuracioNormalitzada =
    normalitzarConfiguracio(configuracio);

  const existent = await pool.query(
    `
      SELECT id
      FROM integracions_organitzacio
      WHERE
        id_organitzacio = $1
        AND UPPER(tipus) = $2
      LIMIT 1
    `,
    [
      organitzacio.id,
      tipusNormalitzat,
    ],
  );

  if (existent.rows.length > 0) {
    throw new Error(
      "Aquesta organització ja té configurada una integració d'aquest tipus",
    );
  }

  const resultat = await pool.query(
    `
      INSERT INTO integracions_organitzacio (
        id_organitzacio,
        tipus,
        actiu,

        sync_usuaris,
        sync_vehicles,
        sync_serveis,
        sync_reserves,
        sync_kms,

        configuracio
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
        $9::jsonb
      )

      RETURNING
        id,
        id_organitzacio,
        tipus,
        actiu,

        sync_usuaris,
        sync_vehicles,
        sync_serveis,
        sync_reserves,
        sync_kms,

        configuracio,

        creat_a,
        actualitzat_a
    `,
    [
      organitzacio.id,
      tipusNormalitzat,
      Boolean(actiu),

      Boolean(syncUsuaris),
      Boolean(syncVehicles),
      Boolean(syncServeis),
      Boolean(syncReserves),
      Boolean(syncKms),

      JSON.stringify(configuracioNormalitzada),
    ],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR INTEGRACIÓ
// =====================================================

async function actualitzarIntegracio(
  organitzacioId,
  tipus,
  dades = {},
) {
  const organitzacio = await comprovarOrganitzacio(organitzacioId);

  const tipusNormalitzat = normalitzarTipus(tipus);

  const integracio = await obtenirIntegracio(
    organitzacio.id,
    tipusNormalitzat,
  );

  if (!integracio) {
    throw new Error("Integració no trobada");
  }

  const actiu =
    dades.actiu !== undefined
      ? Boolean(dades.actiu)
      : integracio.actiu;

  const syncUsuaris =
    dades.syncUsuaris !== undefined
      ? Boolean(dades.syncUsuaris)
      : integracio.sync_usuaris;

  const syncVehicles =
    dades.syncVehicles !== undefined
      ? Boolean(dades.syncVehicles)
      : integracio.sync_vehicles;

  const syncServeis =
    dades.syncServeis !== undefined
      ? Boolean(dades.syncServeis)
      : integracio.sync_serveis;

  const syncReserves =
    dades.syncReserves !== undefined
      ? Boolean(dades.syncReserves)
      : integracio.sync_reserves;

  const syncKms =
    dades.syncKms !== undefined
      ? Boolean(dades.syncKms)
      : integracio.sync_kms;

  const configuracio =
    dades.configuracio !== undefined
      ? normalitzarConfiguracio(dades.configuracio)
      : integracio.configuracio || {};

  const resultat = await pool.query(
    `
      UPDATE integracions_organitzacio

      SET
        actiu = $1,

        sync_usuaris = $2,
        sync_vehicles = $3,
        sync_serveis = $4,
        sync_reserves = $5,
        sync_kms = $6,

        configuracio = $7::jsonb,

        actualitzat_a = NOW()

      WHERE
        id_organitzacio = $8
        AND UPPER(tipus) = $9

      RETURNING
        id,
        id_organitzacio,
        tipus,
        actiu,

        sync_usuaris,
        sync_vehicles,
        sync_serveis,
        sync_reserves,
        sync_kms,

        configuracio,

        creat_a,
        actualitzat_a
    `,
    [
      actiu,

      syncUsuaris,
      syncVehicles,
      syncServeis,
      syncReserves,
      syncKms,

      JSON.stringify(configuracio),

      organitzacio.id,
      tipusNormalitzat,
    ],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTIVAR INTEGRACIÓ
// =====================================================

async function activarIntegracio(organitzacioId, tipus) {
  return actualitzarIntegracio(
    organitzacioId,
    tipus,
    {
      actiu: true,
    },
  );
}

// =====================================================
// DESACTIVAR INTEGRACIÓ
// =====================================================

async function desactivarIntegracio(organitzacioId, tipus) {
  return actualitzarIntegracio(
    organitzacioId,
    tipus,
    {
      actiu: false,
    },
  );
}

// =====================================================
// COMPROVAR SI UNA SINCRONITZACIÓ ESTÀ ACTIVA
// =====================================================

async function teSincronitzacioActiva(
  organitzacioId,
  tipus,
  sincronitzacio,
) {
  const integracio = await obtenirIntegracioActiva(
    organitzacioId,
    tipus,
  );

  if (!integracio) {
    return false;
  }

  const campsValids = {
    usuaris: "sync_usuaris",
    vehicles: "sync_vehicles",
    serveis: "sync_serveis",
    reserves: "sync_reserves",
    kms: "sync_kms",
  };

  const camp = campsValids[String(sincronitzacio || "").toLowerCase()];

  if (!camp) {
    throw new Error("Tipus de sincronització no vàlid");
  }

  return Boolean(integracio[camp]);
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirIntegracionsActives,
  obtenirIntegracionsOrganitzacio,
  obtenirIntegracio,
  obtenirIntegracioActiva,

  crearIntegracio,
  actualitzarIntegracio,

  activarIntegracio,
  desactivarIntegracio,

  teSincronitzacioActiva,
};