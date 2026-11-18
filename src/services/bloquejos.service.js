const pool = require("../config/database");

// =====================================================
// OBTENIR BLOQUEJOS
// =====================================================

async function obtenirBloquejos(organitzacioId, filtres = {}) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const { vehicleId, desde, fins, actiu } = filtres;

  const condicions = ["b.id_organitzacio = $1"];

  const valors = [organitzacioId];

  if (vehicleId) {
    valors.push(vehicleId);

    condicions.push(`b.vehicle_id = $${valors.length}`);
  }

  if (desde && fins) {
    valors.push(fins);
    const posFi = valors.length;

    valors.push(desde);
    const posInici = valors.length;

    condicions.push(`b.inici < $${posFi} AND b.fi > $${posInici}`);
  } else {
    if (desde) {
      valors.push(desde);

      condicions.push(`b.fi > $${valors.length}`);
    }

    if (fins) {
      valors.push(fins);

      condicions.push(`b.inici < $${valors.length}`);
    }
  }

  if (actiu !== undefined) {
    const actiuBoolean = actiu === true || actiu === "true" || actiu === "1";

    valors.push(actiuBoolean);

    condicions.push(`b.actiu = $${valors.length}`);
  }

  const resultat = await pool.query(
    `
      SELECT
        b.id,
        b.id_organitzacio,

        b.vehicle_id,
        v.vehicle,
        v.id_extern AS vehicle_id_extern,

        b.inici,
        b.fi,

        b.motiu,
        b.observacions,

        b.creat_per,
        u.nom AS creat_per_nom,
        u.usuari AS creat_per_usuari,

        b.actiu,

        b.creat_a,
        b.actualitzat_a

      FROM bloquejos_vehicles b

      INNER JOIN vehicles v
        ON v.id = b.vehicle_id
        AND v.id_organitzacio = b.id_organitzacio

      LEFT JOIN usuaris u
        ON u.id = b.creat_per
        AND u.id_organitzacio = b.id_organitzacio

      WHERE
        ${condicions.join(" AND ")}

      ORDER BY b.inici ASC
      `,
    valors,
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR BLOQUEIG PER ID
// =====================================================

async function obtenirBloqueigPerId(id, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const resultat = await pool.query(
    `
      SELECT
        b.id,
        b.id_organitzacio,

        b.vehicle_id,
        v.vehicle,
        v.id_extern AS vehicle_id_extern,

        b.inici,
        b.fi,

        b.motiu,
        b.observacions,

        b.creat_per,
        u.nom AS creat_per_nom,
        u.usuari AS creat_per_usuari,

        b.actiu,

        b.creat_a,
        b.actualitzat_a

      FROM bloquejos_vehicles b

      INNER JOIN vehicles v
        ON v.id = b.vehicle_id
        AND v.id_organitzacio = b.id_organitzacio

      LEFT JOIN usuaris u
        ON u.id = b.creat_per
        AND u.id_organitzacio = b.id_organitzacio

      WHERE b.id = $1
        AND b.id_organitzacio = $2
      `,
    [id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR VEHICLE
// =====================================================

async function comprovarVehicle(vehicleId, organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        vehicle

      FROM vehicles

      WHERE id = $1
        AND id_organitzacio = $2
        AND actiu = TRUE
      `,
    [vehicleId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR RESERVES SOLAPADES
// =====================================================

async function hiHaReserva(vehicleId, inici, fi, organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT id

      FROM reserves

      WHERE vehicle_id = $1
        AND id_organitzacio = $4
        AND estat <> 'CANCELADA'

        AND inici < $3
        AND fi > $2

      LIMIT 1
      `,
    [vehicleId, inici, fi, organitzacioId],
  );

  return resultat.rows.length > 0;
}

// =====================================================
// COMPROVAR ALTRE BLOQUEIG
// =====================================================

async function hiHaBloqueig(
  vehicleId,
  inici,
  fi,
  organitzacioId,
  bloqueigIgnorar = null,
) {
  const valors = [vehicleId, inici, fi, organitzacioId];

  let ignorar = "";

  if (bloqueigIgnorar) {
    valors.push(bloqueigIgnorar);

    ignorar = `AND id <> $${valors.length}`;
  }

  const resultat = await pool.query(
    `
      SELECT id

      FROM bloquejos_vehicles

      WHERE vehicle_id = $1
        AND id_organitzacio = $4
        AND actiu = TRUE

        AND inici < $3
        AND fi > $2

        ${ignorar}

      LIMIT 1
      `,
    valors,
  );

  return resultat.rows.length > 0;
}

// =====================================================
// CREAR BLOQUEIG
// =====================================================

async function crearBloqueig(dades) {
  const {
    organitzacioId,
    vehicleId,
    inici,
    fi,
    motiu,
    observacions,
    creatPer,
  } = dades;

  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const dataInici = new Date(inici);

  const dataFi = new Date(fi);

  if (Number.isNaN(dataInici.getTime()) || Number.isNaN(dataFi.getTime())) {
    throw new Error("Les dates del bloqueig no són vàlides");
  }

  if (dataFi <= dataInici) {
    throw new Error("La data/hora final ha de ser posterior a la inicial");
  }

  const vehicle = await comprovarVehicle(vehicleId, organitzacioId);

  if (!vehicle) {
    throw new Error(
      "El vehicle no existeix, no està actiu o pertany a una altra organització",
    );
  }

  const reservaSolapada = await hiHaReserva(
    vehicleId,
    inici,
    fi,
    organitzacioId,
  );

  if (reservaSolapada) {
    throw new Error(
      "No es pot bloquejar el vehicle perquè té una reserva en aquesta franja",
    );
  }

  const bloqueigSolapat = await hiHaBloqueig(
    vehicleId,
    inici,
    fi,
    organitzacioId,
  );

  if (bloqueigSolapat) {
    throw new Error("El vehicle ja té un bloqueig en aquesta franja");
  }

  const resultat = await pool.query(
    `
      INSERT INTO bloquejos_vehicles (
        id_organitzacio,
        vehicle_id,
        inici,
        fi,
        motiu,
        observacions,
        creat_per,
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
        TRUE
      )

      RETURNING *
      `,
    [
      organitzacioId,
      vehicleId,
      inici,
      fi,
      motiu || null,
      observacions || null,
      creatPer || null,
    ],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR BLOQUEIG
// =====================================================

async function actualitzarBloqueig(id, dades, organitzacioId) {
  const actual = await obtenirBloqueigPerId(id, organitzacioId);

  if (!actual) {
    return null;
  }

  const vehicleId = dades.vehicleId ?? actual.vehicle_id;

  const inici = dades.inici ?? actual.inici;

  const fi = dades.fi ?? actual.fi;

  const motiu = dades.motiu !== undefined ? dades.motiu : actual.motiu;

  const observacions =
    dades.observacions !== undefined ? dades.observacions : actual.observacions;

  const dataInici = new Date(inici);

  const dataFi = new Date(fi);

  if (Number.isNaN(dataInici.getTime()) || Number.isNaN(dataFi.getTime())) {
    throw new Error("Les dates del bloqueig no són vàlides");
  }

  if (dataFi <= dataInici) {
    throw new Error("La data/hora final ha de ser posterior a la inicial");
  }

  const vehicle = await comprovarVehicle(vehicleId, organitzacioId);

  if (!vehicle) {
    throw new Error(
      "El vehicle no existeix o pertany a una altra organització",
    );
  }

  const reservaSolapada = await hiHaReserva(
    vehicleId,
    inici,
    fi,
    organitzacioId,
  );

  if (reservaSolapada) {
    throw new Error(
      "No es pot modificar el bloqueig perquè hi ha una reserva en aquesta franja",
    );
  }

  const bloqueigSolapat = await hiHaBloqueig(
    vehicleId,
    inici,
    fi,
    organitzacioId,
    id,
  );

  if (bloqueigSolapat) {
    throw new Error("El vehicle ja té un altre bloqueig en aquesta franja");
  }

  const resultat = await pool.query(
    `
      UPDATE bloquejos_vehicles

      SET
        vehicle_id = $1,
        inici = $2,
        fi = $3,
        motiu = $4,
        observacions = $5,
        actualitzat_a = NOW()

      WHERE id = $6
        AND id_organitzacio = $7

      RETURNING *
      `,
    [
      vehicleId,
      inici,
      fi,
      motiu || null,
      observacions || null,
      id,
      organitzacioId,
    ],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// ELIMINAR BLOQUEIG
// =====================================================

async function eliminarBloqueig(id, organitzacioId) {
  const actual = await obtenirBloqueigPerId(id, organitzacioId);

  if (!actual) {
    return null;
  }

  const resultat = await pool.query(
    `
      UPDATE bloquejos_vehicles

      SET
        actiu = FALSE,
        actualitzat_a = NOW()

      WHERE id = $1
        AND id_organitzacio = $2

      RETURNING *
      `,
    [id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirBloquejos,
  obtenirBloqueigPerId,
  crearBloqueig,
  actualitzarBloqueig,
  eliminarBloqueig,
};
