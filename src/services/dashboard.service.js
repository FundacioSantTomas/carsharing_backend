const pool = require("../config/database");

// =====================================================
// DASHBOARD
// =====================================================

async function obtenirDashboard({ organitzacioId, serveiId = null }) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  // ===================================================
  // FILTRES GENERALS
  // ===================================================

  const condicions = ["r.id_organitzacio = $1", "r.estat <> 'CANCELADA'"];

  const valors = [organitzacioId];

  if (serveiId) {
    valors.push(serveiId);

    condicions.push(`r.servei_id = $${valors.length}`);
  }

  const where = condicions.join(" AND ");

  // ===================================================
  // KPI
  // ===================================================

  const resumResultat = await pool.query(
    `
      SELECT

        COUNT(*) FILTER (
          WHERE
            r.inici >= CURRENT_DATE
            AND r.inici <
              CURRENT_DATE + INTERVAL '1 day'
        )::int AS reserves_avui,


        COUNT(*) FILTER (
          WHERE
            r.estat = 'EN_CURS'
        )::int AS reserves_en_curs,


        COALESCE(
          SUM(r.kms_realitzats) FILTER (
            WHERE
              r.inici >=
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )

              AND r.inici <
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )
                + INTERVAL '1 month'
          ),
          0
        ) AS kms_mes,


        COALESCE(
          SUM(
            EXTRACT(
              EPOCH FROM (
                r.fi - r.inici
              )
            ) / 3600
          ) FILTER (
            WHERE
              r.inici >=
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )

              AND r.inici <
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )
                + INTERVAL '1 month'
          ),
          0
        ) AS hores_mes,


        COUNT(
          DISTINCT r.vehicle_id
        ) FILTER (
          WHERE
            r.inici >=
              DATE_TRUNC(
                'month',
                CURRENT_DATE
              )

            AND r.inici <
              DATE_TRUNC(
                'month',
                CURRENT_DATE
              )
              + INTERVAL '1 month'
        )::int AS vehicles_utilitzats_mes


      FROM reserves r

      WHERE
        ${where}
    `,
    valors,
  );

  // ===================================================
  // PROPERES RESERVES
  // ===================================================

  const properesResultat = await pool.query(
    `
      SELECT

        r.id,

        r.vehicle_id,
        v.vehicle,

        r.usuari_id,

        u.nom AS usuari_nom,
        u.usuari,

        r.servei_id,
        s.nom AS servei,

        r.inici,
        r.fi,

        r.estat

      FROM reserves r

      INNER JOIN vehicles v
        ON v.id = r.vehicle_id

      INNER JOIN usuaris u
        ON u.id = r.usuari_id

      LEFT JOIN serveis s
        ON s.id = r.servei_id

      WHERE
        ${where}

        AND r.inici >= NOW()

      ORDER BY
        r.inici ASC

      LIMIT 10
    `,
    valors,
  );

  // ===================================================
  // EVOLUCIÓ ÚLTIMS 30 DIES
  // ===================================================

  const evolucioResultat = await pool.query(
    `
      WITH dies AS (

        SELECT
          generate_series(
            CURRENT_DATE
              - INTERVAL '29 days',

            CURRENT_DATE,

            INTERVAL '1 day'
          )::date AS dia

      )

      SELECT

        d.dia,

        COUNT(r.id)::int AS reserves

      FROM dies d

      LEFT JOIN reserves r

        ON DATE(r.inici) = d.dia

        AND ${where}

      GROUP BY
        d.dia

      ORDER BY
        d.dia ASC
    `,
    valors,
  );

  // ===================================================
  // VEHICLES MÉS UTILITZATS
  // ===================================================

  const vehiclesResultat = await pool.query(
    `
      SELECT

        v.id,

        v.vehicle,

        COUNT(
          r.id
        )::int AS reserves,

        COALESCE(
          SUM(
            r.kms_realitzats
          ),
          0
        ) AS kms,

        COALESCE(
          SUM(
            EXTRACT(
              EPOCH FROM (
                r.fi - r.inici
              )
            ) / 3600
          ),
          0
        ) AS hores

      FROM reserves r

      INNER JOIN vehicles v
        ON v.id = r.vehicle_id

      WHERE
        ${where}

        AND r.inici >=
          DATE_TRUNC(
            'month',
            CURRENT_DATE
          )

        AND r.inici <
          DATE_TRUNC(
            'month',
            CURRENT_DATE
          )
          + INTERVAL '1 month'

      GROUP BY
        v.id,
        v.vehicle

      ORDER BY
        COUNT(r.id) DESC,
        hores DESC

      LIMIT 5
    `,
    valors,
  );

  // ===================================================
  // USUARIS QUE MÉS RESERVEN
  // ===================================================

  const usuarisResultat = await pool.query(
    `
      SELECT

        u.id,

        u.nom,

        u.usuari,

        COUNT(
          r.id
        )::int AS reserves,

        COALESCE(
          SUM(
            EXTRACT(
              EPOCH FROM (
                r.fi - r.inici
              )
            ) / 3600
          ),
          0
        ) AS hores,

        COALESCE(
          SUM(
            r.kms_realitzats
          ),
          0
        ) AS kms

      FROM reserves r

      INNER JOIN usuaris u
        ON u.id = r.usuari_id

      WHERE
        ${where}

        AND r.inici >=
          DATE_TRUNC(
            'month',
            CURRENT_DATE
          )

        AND r.inici <
          DATE_TRUNC(
            'month',
            CURRENT_DATE
          )
          + INTERVAL '1 month'

      GROUP BY
        u.id,
        u.nom,
        u.usuari

      ORDER BY
        COUNT(r.id) DESC,

        SUM(
          EXTRACT(
            EPOCH FROM (
              r.fi - r.inici
            )
          )
        ) DESC

      LIMIT 10
    `,
    valors,
  );

  // ===================================================
  // RESUM
  // ===================================================

  const resum = resumResultat.rows[0] || {};

  // ===================================================
  // RETURN
  // ===================================================

  return {
    resum: {
      reservesAvui: Number(resum.reserves_avui || 0),

      reservesEnCurs: Number(resum.reserves_en_curs || 0),

      kmsMes: Number(resum.kms_mes || 0),

      horesMes: Number(resum.hores_mes || 0),

      vehiclesUtilitzatsMes: Number(resum.vehicles_utilitzats_mes || 0),
    },

    // ---------------------------------------------------
    // PROPERES RESERVES
    // ---------------------------------------------------

    properesReserves: properesResultat.rows,

    // ---------------------------------------------------
    // EVOLUCIÓ
    // ---------------------------------------------------

    evolucio30Dies: evolucioResultat.rows.map((dia) => ({
      ...dia,

      reserves: Number(dia.reserves || 0),
    })),

    // ---------------------------------------------------
    // VEHICLES MÉS UTILITZATS
    // ---------------------------------------------------

    vehiclesMesUtilitzats: vehiclesResultat.rows.map((vehicle) => ({
      ...vehicle,

      reserves: Number(vehicle.reserves || 0),

      kms: Number(vehicle.kms || 0),

      hores: Number(vehicle.hores || 0),
    })),

    // ---------------------------------------------------
    // USUARIS QUE MÉS RESERVEN
    // ---------------------------------------------------

    usuarisMesActius: usuarisResultat.rows.map((usuari) => ({
      ...usuari,

      reserves: Number(usuari.reserves || 0),

      hores: Number(usuari.hores || 0),

      kms: Number(usuari.kms || 0),
    })),
  };
}

module.exports = {
  obtenirDashboard,
};
