const pool = require("../config/database");

// =====================================================
// CONSTANTS
// =====================================================

const TIPUS_VALID = [
  "AVARIA",
  "NETEJA",
  "DANYS",
  "DOCUMENTACIO",
  "COMBUSTIBLE",
  "ALTRE",
];

const PRIORITATS_VALIDES = ["BAIXA", "NORMAL", "ALTA", "URGENT"];

const ESTATS_VALIDS = ["OBERTA", "EN_REVISIO", "RESOLTA"];

// =====================================================
// HELPERS
// =====================================================

async function obtenirReserva(reservaId, organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        r.id,
        r.id_organitzacio,
        r.vehicle_id,
        r.usuari_id,
        r.servei_id,
        r.inici,
        r.fi,
        r.estat

      FROM reserves r

      WHERE
        r.id = $1
        AND r.id_organitzacio = $2

      LIMIT 1
    `,
    [reservaId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// CREAR INCIDÈNCIA
// =====================================================

async function crearIncidencia(dades) {
  const { organitzacioId, reservaId, usuariId, tipus, prioritat, descripcio } =
    dades;

  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  if (!reservaId) {
    throw new Error("Cal indicar la reserva");
  }

  if (!usuariId) {
    throw new Error("Cal indicar l'usuari");
  }

  const tipusNormalitzat = String(tipus || "")
    .trim()
    .toUpperCase();

  const prioritatNormalitzada = String(prioritat || "NORMAL")
    .trim()
    .toUpperCase();

  const descripcioNormalitzada = String(descripcio || "").trim();

  if (!TIPUS_VALID.includes(tipusNormalitzat)) {
    throw new Error("El tipus d'incidència no és vàlid");
  }

  if (!PRIORITATS_VALIDES.includes(prioritatNormalitzada)) {
    throw new Error("La prioritat no és vàlida");
  }

  if (!descripcioNormalitzada) {
    throw new Error("Cal indicar una descripció");
  }

  const reserva = await obtenirReserva(reservaId, organitzacioId);

  if (!reserva) {
    throw new Error("Reserva no trobada");
  }

  const resultat = await pool.query(
    `
      INSERT INTO incidencies_reserva (
        id_organitzacio,
        reserva_id,
        vehicle_id,
        usuari_id,
        tipus,
        prioritat,
        descripcio,
        estat
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        'OBERTA'
      )

      RETURNING *
    `,
    [
      organitzacioId,
      reserva.id,
      reserva.vehicle_id,
      usuariId,
      tipusNormalitzat,
      prioritatNormalitzada,
      descripcioNormalitzada,
    ],
  );

  return resultat.rows[0];
}

// =====================================================
// INCIDÈNCIES D'UNA RESERVA
// =====================================================

async function obtenirIncidenciesReserva(reservaId, organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        i.*,

        u.nom AS usuari_nom,
        u.usuari,

        v.vehicle,

        ur.nom AS resolt_per_nom

      FROM incidencies_reserva i

      LEFT JOIN usuaris u
        ON u.id = i.usuari_id

      LEFT JOIN vehicles v
        ON v.id = i.vehicle_id

      LEFT JOIN usuaris ur
        ON ur.id = i.resolt_per

      WHERE
        i.id_organitzacio = $1
        AND i.reserva_id = $2

      ORDER BY
        i.creada_a DESC
    `,
    [organitzacioId, reservaId],
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR TOTES
// =====================================================

async function obtenirIncidencies(filtres = {}) {
  const { organitzacioId, estat, prioritat, tipus, serveiId } = filtres;

  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const condicions = ["i.id_organitzacio = $1"];

  const valors = [organitzacioId];

  // ---------------------------------------------------
  // ESTAT
  // ---------------------------------------------------

  if (estat) {
    const estatNormalitzat = String(estat).trim().toUpperCase();

    if (!ESTATS_VALIDS.includes(estatNormalitzat)) {
      throw new Error("L'estat no és vàlid");
    }

    valors.push(estatNormalitzat);

    condicions.push(`i.estat = $${valors.length}`);
  }

  // ---------------------------------------------------
  // PRIORITAT
  // ---------------------------------------------------

  if (prioritat) {
    const prioritatNormalitzada = String(prioritat).trim().toUpperCase();

    if (!PRIORITATS_VALIDES.includes(prioritatNormalitzada)) {
      throw new Error("La prioritat no és vàlida");
    }

    valors.push(prioritatNormalitzada);

    condicions.push(`i.prioritat = $${valors.length}`);
  }

  // ---------------------------------------------------
  // TIPUS
  // ---------------------------------------------------

  if (tipus) {
    const tipusNormalitzat = String(tipus).trim().toUpperCase();

    if (!TIPUS_VALID.includes(tipusNormalitzat)) {
      throw new Error("El tipus d'incidència no és vàlid");
    }

    valors.push(tipusNormalitzat);

    condicions.push(`i.tipus = $${valors.length}`);
  }

  // ---------------------------------------------------
  // SERVEI
  // ---------------------------------------------------
  //
  // Aquest filtre s'utilitza especialment per TECNIC.
  //
  // El controlador obté el servei del JWT.
  // No confiem en cap servei enviat pel frontend.
  //
  // ---------------------------------------------------

  if (serveiId) {
    const serveiNumero = Number(serveiId);

    if (!Number.isInteger(serveiNumero) || serveiNumero <= 0) {
      throw new Error("El servei no és vàlid");
    }

    valors.push(serveiNumero);

    condicions.push(`r.servei_id = $${valors.length}`);
  }

  // ---------------------------------------------------
  // QUERY
  // ---------------------------------------------------

  const resultat = await pool.query(
    `
      SELECT
        i.*,

        r.inici,
        r.fi,
        r.estat AS reserva_estat,

        r.servei_id,

        u.nom AS usuari_nom,
        u.usuari,

        v.vehicle,

        s.nom AS servei,

        ur.nom AS resolt_per_nom

      FROM incidencies_reserva i

      INNER JOIN reserves r
        ON r.id = i.reserva_id
        AND r.id_organitzacio = i.id_organitzacio

      INNER JOIN vehicles v
        ON v.id = i.vehicle_id

      INNER JOIN usuaris u
        ON u.id = i.usuari_id

      LEFT JOIN serveis s
        ON s.id = r.servei_id

      LEFT JOIN usuaris ur
        ON ur.id = i.resolt_per

      WHERE
        ${condicions.join(" AND ")}

      ORDER BY
        CASE i.prioritat
          WHEN 'URGENT' THEN 1
          WHEN 'ALTA' THEN 2
          WHEN 'NORMAL' THEN 3
          WHEN 'BAIXA' THEN 4
          ELSE 5
        END,

        CASE i.estat
          WHEN 'OBERTA' THEN 1
          WHEN 'EN_REVISIO' THEN 2
          WHEN 'RESOLTA' THEN 3
          ELSE 4
        END,

        i.creada_a DESC
    `,
    valors,
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR UNA
// =====================================================

async function obtenirIncidenciaPerId(id, organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        i.*,

        r.inici,
        r.fi,
        r.estat AS reserva_estat,
        r.servei_id,

        s.nom AS servei,

        v.vehicle,

        u.nom AS usuari_nom,
        u.usuari,

        ur.nom AS resolt_per_nom

      FROM incidencies_reserva i

      INNER JOIN reserves r
        ON r.id = i.reserva_id
        AND r.id_organitzacio = i.id_organitzacio

      INNER JOIN vehicles v
        ON v.id = i.vehicle_id

      INNER JOIN usuaris u
        ON u.id = i.usuari_id

      LEFT JOIN serveis s
        ON s.id = r.servei_id

      LEFT JOIN usuaris ur
        ON ur.id = i.resolt_per

      WHERE
        i.id = $1
        AND i.id_organitzacio = $2

      LIMIT 1
    `,
    [id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// ACTUALITZAR ESTAT / PRIORITAT
// =====================================================

async function actualitzarIncidencia(id, dades, organitzacioId) {
  const incidencia = await obtenirIncidenciaPerId(id, organitzacioId);

  if (!incidencia) {
    return null;
  }

  const estat = dades.estat
    ? String(dades.estat).trim().toUpperCase()
    : incidencia.estat;

  const prioritat = dades.prioritat
    ? String(dades.prioritat).trim().toUpperCase()
    : incidencia.prioritat;

  if (!ESTATS_VALIDS.includes(estat)) {
    throw new Error("L'estat no és vàlid");
  }

  if (!PRIORITATS_VALIDES.includes(prioritat)) {
    throw new Error("La prioritat no és vàlida");
  }

  const resultat = await pool.query(
    `
      UPDATE incidencies_reserva

      SET
        estat = $1,
        prioritat = $2,
        actualitzada_a = NOW()

      WHERE
        id = $3
        AND id_organitzacio = $4

      RETURNING *
    `,
    [estat, prioritat, id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// RESOLDRE
// =====================================================

async function resoldreIncidencia(id, dades, organitzacioId, resoltPer) {
  const resolucio = String(dades.resolucio || "").trim();

  if (!resolucio) {
    throw new Error("Cal indicar la resolució");
  }

  const resultat = await pool.query(
    `
      UPDATE incidencies_reserva

      SET
        estat = 'RESOLTA',
        resolucio = $1,
        resolt_per = $2,
        resolta_a = NOW(),
        actualitzada_a = NOW()

      WHERE
        id = $3
        AND id_organitzacio = $4

      RETURNING *
    `,
    [resolucio, resoltPer, id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  crearIncidencia,
  obtenirIncidenciesReserva,
  obtenirIncidencies,
  obtenirIncidenciaPerId,
  actualitzarIncidencia,
  resoldreIncidencia,
};
