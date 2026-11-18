const pool = require("../config/database");

// =====================================================
// REPORT DE RESERVES
// =====================================================

async function reportReserves(organitzacioId, filtres = {}) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const { desde, fins, vehicleId, serveiId, usuariId, estat } = filtres;

  const condicions = ["r.id_organitzacio = $1"];

  const valors = [organitzacioId];

  // ---------------------------------------------------
  // DATA DES DE
  // ---------------------------------------------------

  if (desde) {
    valors.push(desde);

    condicions.push(`r.inici >= $${valors.length}`);
  }

  // ---------------------------------------------------
  // DATA FINS
  // ---------------------------------------------------

  if (fins) {
    valors.push(fins);

    condicions.push(`r.inici <= $${valors.length}`);
  }

  // ---------------------------------------------------
  // VEHICLE
  // ---------------------------------------------------

  if (vehicleId) {
    valors.push(vehicleId);

    condicions.push(`r.vehicle_id = $${valors.length}`);
  }

  // ---------------------------------------------------
  // SERVEI
  // ---------------------------------------------------

  if (serveiId) {
    valors.push(serveiId);

    condicions.push(`r.servei_id = $${valors.length}`);
  }

  // ---------------------------------------------------
  // USUARI
  // ---------------------------------------------------

  if (usuariId) {
    valors.push(usuariId);

    condicions.push(`r.usuari_id = $${valors.length}`);
  }

  // ---------------------------------------------------
  // ESTAT
  // ---------------------------------------------------

  if (estat) {
    valors.push(String(estat).toUpperCase());

    condicions.push(`r.estat = $${valors.length}`);
  }

  const resultat = await pool.query(
    `
      SELECT
        r.id AS reserva_id,

        r.id_organitzacio,

        o.nom AS organitzacio,

        r.usuari_id,
        u.usuari,
        u.nom AS usuari_nom,

        r.servei_id,
        s.nom AS servei,

        r.vehicle_id,
        v.vehicle,

        r.inici,
        r.fi,

        ROUND(
          (
            EXTRACT(
              EPOCH FROM (
                r.fi - r.inici
              )
            ) / 3600
          )::numeric,
          2
        ) AS durada_hores,

        r.estat,

        r.kms_realitzats,

        r.kms_estat,

        r.observacions,

        r.creat_a

      FROM reserves r

      INNER JOIN organitzacions o
        ON o.id = r.id_organitzacio

      INNER JOIN usuaris u
        ON u.id = r.usuari_id
        AND u.id_organitzacio =
            r.id_organitzacio

      INNER JOIN vehicles v
        ON v.id = r.vehicle_id
        AND v.id_organitzacio =
            r.id_organitzacio

      LEFT JOIN serveis s
        ON s.id = r.servei_id
        AND s.id_organitzacio =
            r.id_organitzacio

      WHERE
        ${condicions.join(" AND ")}

      ORDER BY
        r.inici ASC
      `,
    valors,
  );

  const reserves = resultat.rows;

  // ===================================================
  // TOTALS
  // ===================================================

  const totalReserves = reserves.length;

  const vehiclesUnics = new Set(reserves.map((reserva) => reserva.vehicle_id))
    .size;

  const totalKm = reserves.reduce(
    (total, reserva) => total + Number(reserva.kms_realitzats || 0),
    0,
  );

  const totalHores = reserves.reduce(
    (total, reserva) => total + Number(reserva.durada_hores || 0),
    0,
  );

  return {
    resum: {
      reserves: totalReserves,

      vehicles: vehiclesUnics,

      kms: Number(totalKm.toFixed(2)),

      hores: Number(totalHores.toFixed(2)),
    },

    files: reserves,
  };
}

// =====================================================
// REPORT D'INSPECCIONS
// =====================================================

async function reportInspeccions(organitzacioId, filtres = {}) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const { desde, fins, vehicleId, inspectorId, resultat } = filtres;

  const condicions = ["i.id_organitzacio = $1"];

  const valors = [organitzacioId];

  // ---------------------------------------------------
  // DES DE
  // ---------------------------------------------------

  if (desde) {
    valors.push(desde);

    condicions.push(`i.data_inspeccio >= $${valors.length}`);
  }

  // ---------------------------------------------------
  // FINS
  // ---------------------------------------------------

  if (fins) {
    valors.push(fins);

    condicions.push(`i.data_inspeccio <= $${valors.length}`);
  }

  // ---------------------------------------------------
  // VEHICLE
  // ---------------------------------------------------

  if (vehicleId) {
    valors.push(vehicleId);

    condicions.push(`i.vehicle_id = $${valors.length}`);
  }

  // ---------------------------------------------------
  // INSPECTOR
  // ---------------------------------------------------

  if (inspectorId) {
    valors.push(inspectorId);

    condicions.push(`i.inspector_id = $${valors.length}`);
  }

  // ---------------------------------------------------
  // RESULTAT
  // ---------------------------------------------------

  if (resultat) {
    valors.push(String(resultat).toUpperCase());

    condicions.push(`i.resultat = $${valors.length}`);
  }

  const resposta = await pool.query(
    `
      SELECT
        i.id AS inspeccio_id,

        i.id_organitzacio,

        o.nom AS organitzacio,

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

        i.resultat,

        i.observacions,

        i.bloqueig_generat,
        i.bloqueig_id,

        i.creat_a

      FROM inspeccions i

      INNER JOIN organitzacions o
        ON o.id =
           i.id_organitzacio

      INNER JOIN vehicles v
        ON v.id =
           i.vehicle_id

        AND v.id_organitzacio =
            i.id_organitzacio

      INNER JOIN usuaris u
        ON u.id =
           i.inspector_id

        AND u.id_organitzacio =
            i.id_organitzacio

      WHERE
        ${condicions.join(" AND ")}

      ORDER BY
        i.data_inspeccio DESC
      `,
    valors,
  );

  const inspeccions = resposta.rows;

  // ===================================================
  // TOTALS
  // ===================================================

  const total = inspeccions.length;

  const correctes = inspeccions.filter(
    (inspeccio) => inspeccio.resultat === "CORRECTA",
  ).length;

  const incidencies = inspeccions.filter(
    (inspeccio) => inspeccio.resultat === "INCIDENCIA",
  ).length;

  return {
    resum: {
      inspeccions: total,

      correctes,

      incidencies,
    },

    files: inspeccions,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  reportReserves,
  reportInspeccions,
};
