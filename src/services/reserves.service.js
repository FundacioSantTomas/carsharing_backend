const pool = require("../config/database");

// =====================================================
// OBTENIR RESERVES
// =====================================================

async function obtenirReserves(filtres = {}) {
  const { organitzacioId, desde, fins, vehicleId, usuariId, serveiId } =
    filtres;

  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const condicions = [];
  const valors = [];

  valors.push(organitzacioId);
  condicions.push(`r.id_organitzacio = $${valors.length}`);

  condicions.push(`r.estat <> 'CANCELADA'`);

  if (desde && fins) {
    valors.push(fins);
    const posFi = valors.length;

    valors.push(desde);
    const posInici = valors.length;

    condicions.push(`r.inici < $${posFi} AND r.fi > $${posInici}`);
  } else {
    if (desde) {
      valors.push(desde);

      condicions.push(`r.fi > $${valors.length}`);
    }

    if (fins) {
      valors.push(fins);

      condicions.push(`r.inici < $${valors.length}`);
    }
  }

  if (vehicleId) {
    valors.push(vehicleId);

    condicions.push(`r.vehicle_id = $${valors.length}`);
  }

  if (usuariId) {
    valors.push(usuariId);

    condicions.push(`r.usuari_id = $${valors.length}`);
  }

  if (serveiId) {
    valors.push(serveiId);

    condicions.push(`r.servei_id = $${valors.length}`);
  }

  const where = `WHERE ${condicions.join(" AND ")}`;

  const resultat = await pool.query(
    `
      SELECT
        r.id,
        r.id_organitzacio,

        r.vehicle_id,
        v.vehicle,
        v.id_extern AS vehicle_id_extern,
        v.key_vehiculo,

        r.usuari_id,
        u.id_extern AS usuari_id_extern,
        u.usuari,
        u.nom AS usuari_nom,

        r.servei_id,
        s.nom AS servei,

        r.inici,
        r.fi,

        r.estat,
        r.observacions,

        r.kms_realitzats,
        r.kms_estat,
        r.kms_sincronitzat_a,
        r.kms_error,

        r.creat_a,
        r.actualitzat_a

      FROM reserves r

      INNER JOIN vehicles v
        ON v.id = r.vehicle_id

      INNER JOIN usuaris u
        ON u.id = r.usuari_id

      LEFT JOIN serveis s
        ON s.id = r.servei_id

      ${where}

      ORDER BY
        r.inici ASC
    `,
    valors,
  );

  return resultat.rows;
}

// =====================================================
// OBTENIR UNA RESERVA
// =====================================================

async function obtenirReservaPerId(id, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const resultat = await pool.query(
    `
      SELECT
        r.id,
        r.id_organitzacio,

        r.vehicle_id,
        v.vehicle,
        v.id_extern AS vehicle_id_extern,
        v.key_vehiculo,

        r.usuari_id,
        u.id_extern AS usuari_id_extern,
        u.usuari,
        u.nom AS usuari_nom,

        r.servei_id,
        s.nom AS servei,

        r.inici,
        r.fi,

        r.estat,
        r.observacions,

        r.kms_realitzats,
        r.kms_estat,
        r.kms_sincronitzat_a,
        r.kms_error,

        r.creat_a,
        r.actualitzat_a

      FROM reserves r

      INNER JOIN vehicles v
        ON v.id = r.vehicle_id

      INNER JOIN usuaris u
        ON u.id = r.usuari_id

      LEFT JOIN serveis s
        ON s.id = r.servei_id

      WHERE
        r.id = $1
        AND r.id_organitzacio = $2
    `,
    [id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// OBTENIR USUARI PER VALIDAR RESERVES
// =====================================================

async function obtenirUsuariReserva(usuariId, organitzacioId) {
  if (!organitzacioId) {
    return null;
  }

  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        usuari,
        nom,
        servei_id,
        id_organitzacio,
        actiu

      FROM usuaris

      WHERE
        id = $1
        AND id_organitzacio = $2
        AND actiu = TRUE
    `,
    [usuariId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR VEHICLE RESERVABLE
// =====================================================

async function comprovarVehicle(vehicleId, organitzacioId) {
  const resultat = await pool.query(
    `
      SELECT
        id,
        id_extern,
        vehicle,
        key_vehiculo,
        id_organitzacio,
        actiu,
        reservable,
        inspeccionable,
        seguiment,

        manteniment,

        disponible_dilluns,
        disponible_dimarts,
        disponible_dimecres,
        disponible_dijous,
        disponible_divendres,
        disponible_dissabte,
        disponible_diumenge

      FROM vehicles

      WHERE
        id = $1
        AND id_organitzacio = $2
        AND actiu = TRUE
        AND reservable = TRUE
    `,
    [vehicleId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// DATA LOCAL EUROPE/MADRID
// =====================================================

function obtenirDataLocalMadrid(data) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).formatToParts(data);

  const any = parts.find((part) => part.type === "year")?.value;

  const mes = parts.find((part) => part.type === "month")?.value;

  const dia = parts.find((part) => part.type === "day")?.value;

  return `${any}-${mes}-${dia}`;
}

// =====================================================
// DIES QUE OCUPA UNA RESERVA
// =====================================================

function obtenirDiesReserva(inici, fi) {
  const dataInici = new Date(inici);

  const dataFi = new Date(new Date(fi).getTime() - 1);

  const iniciLocal = obtenirDataLocalMadrid(dataInici);

  const fiLocal = obtenirDataLocalMadrid(dataFi);

  const [anyInici, mesInici, diaInici] = iniciLocal.split("-").map(Number);

  const [anyFi, mesFi, diaFi] = fiLocal.split("-").map(Number);

  let cursor = new Date(Date.UTC(anyInici, mesInici - 1, diaInici, 12));

  const final = new Date(Date.UTC(anyFi, mesFi - 1, diaFi, 12));

  const dies = [];

  while (cursor <= final) {
    dies.push(new Date(cursor));

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dies;
}

// =====================================================
// VALIDAR DISPONIBILITAT VEHICLE
// =====================================================

function validarDisponibilitatVehicle(vehicle, inici, fi) {
  if (vehicle.manteniment === true) {
    throw new Error("El vehicle està en manteniment i no es pot reservar");
  }

  const campsDies = {
    0: {
      camp: "disponible_diumenge",
      nom: "diumenge",
    },

    1: {
      camp: "disponible_dilluns",
      nom: "dilluns",
    },

    2: {
      camp: "disponible_dimarts",
      nom: "dimarts",
    },

    3: {
      camp: "disponible_dimecres",
      nom: "dimecres",
    },

    4: {
      camp: "disponible_dijous",
      nom: "dijous",
    },

    5: {
      camp: "disponible_divendres",
      nom: "divendres",
    },

    6: {
      camp: "disponible_dissabte",
      nom: "dissabte",
    },
  };

  const dies = obtenirDiesReserva(inici, fi);

  for (const dia of dies) {
    const configuracio = campsDies[dia.getUTCDay()];

    if (vehicle[configuracio.camp] === false) {
      throw new Error(`El vehicle no està disponible els ${configuracio.nom}`);
    }
  }
}

// =====================================================
// COMPROVAR USUARI
// =====================================================

async function comprovarUsuari(usuariId, organitzacioId) {
  const resultat = await pool.query(
    `
        SELECT
          id,
          id_extern,
          usuari,
          nom,
          servei_id,
          id_organitzacio

        FROM usuaris

        WHERE
          id = $1
          AND id_organitzacio = $2
          AND actiu = TRUE
      `,
    [usuariId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR SERVEI
// =====================================================

async function comprovarServei(serveiId, organitzacioId) {
  if (serveiId === null || serveiId === undefined) {
    return null;
  }

  const resultat = await pool.query(
    `
        SELECT
          id,
          nom,
          id_organitzacio

        FROM serveis

        WHERE
          id = $1
          AND id_organitzacio = $2
          AND actiu = TRUE
      `,
    [serveiId, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR SOLAPAMENT
// =====================================================

async function hiHaSolapament(
  vehicleId,
  inici,
  fi,
  organitzacioId,
  reservaIgnorar = null,
) {
  if (!vehicleId || !inici || !fi || !organitzacioId) {
    throw new Error("Falten dades per comprovar el solapament");
  }

  const valors = [vehicleId, inici, fi, organitzacioId];

  let filtreIgnorar = "";

  if (reservaIgnorar) {
    valors.push(reservaIgnorar);

    filtreIgnorar = `AND r.id <> $${valors.length}`;
  }

  const resultat = await pool.query(
    `
        SELECT
          r.id,
          r.vehicle_id,
          r.inici,
          r.fi,
          r.estat

        FROM reserves r

        WHERE
          r.vehicle_id = $1

          AND
          r.id_organitzacio = $4

          AND
          r.estat <> 'CANCELADA'

          AND
          r.inici < $3::timestamptz

          AND
          r.fi > $2::timestamptz

          ${filtreIgnorar}

        ORDER BY
          r.inici ASC

        LIMIT 1
      `,
    valors,
  );

  return resultat.rows[0] || null;
}

// =====================================================
// COMPROVAR BLOQUEIG
// =====================================================

async function hiHaBloqueig(vehicleId, inici, fi, organitzacioId) {
  const resultat = await pool.query(
    `
        SELECT
          id

        FROM bloquejos_vehicles

        WHERE
          vehicle_id = $1

          AND
          id_organitzacio = $4

          AND
          actiu = TRUE

          AND
          inici < $3

          AND
          fi > $2

        LIMIT 1
      `,
    [vehicleId, inici, fi, organitzacioId],
  );

  return resultat.rows.length > 0;
}

// =====================================================
// CREAR RESERVA
// =====================================================

async function crearReserva(dades) {
  const {
    organitzacioId,
    vehicleId,
    usuariId,
    serveiId,
    inici,
    fi,
    observacions,
  } = dades;

  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const dataInici = new Date(inici);

  const dataFi = new Date(fi);

  if (Number.isNaN(dataInici.getTime()) || Number.isNaN(dataFi.getTime())) {
    throw new Error("Les dates de la reserva no són vàlides");
  }

  if (dataFi <= dataInici) {
    throw new Error("La data/hora final ha de ser posterior a la inicial");
  }

  const vehicle = await comprovarVehicle(vehicleId, organitzacioId);

  if (!vehicle) {
    throw new Error(
      "El vehicle no existeix, no està actiu o no està habilitat per a reserves",
    );
  }

  validarDisponibilitatVehicle(vehicle, inici, fi);

  const usuari = await comprovarUsuari(usuariId, organitzacioId);

  if (!usuari) {
    throw new Error(
      "L'usuari no existeix, no està actiu o pertany a una altra organització",
    );
  }

  if (serveiId) {
    const servei = await comprovarServei(serveiId, organitzacioId);

    if (!servei) {
      throw new Error(
        "El servei no existeix o pertany a una altra organització",
      );
    }
  }

  const solapament = await hiHaSolapament(vehicleId, inici, fi, organitzacioId);

  if (solapament) {
    throw new Error(
      `El vehicle ja té la reserva #${solapament.id} en aquesta franja horària`,
    );
  }

  const bloquejat = await hiHaBloqueig(vehicleId, inici, fi, organitzacioId);

  if (bloquejat) {
    throw new Error("El vehicle no està disponible en aquesta franja");
  }

  const resultat = await pool.query(
    `
        INSERT INTO reserves (
          id_organitzacio,
          vehicle_id,
          usuari_id,
          servei_id,
          inici,
          fi,
          estat,
          observacions
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'RESERVADA',
          $7
        )

        RETURNING *
      `,
    [
      organitzacioId,
      vehicleId,
      usuariId,
      serveiId || null,
      inici,
      fi,
      observacions || null,
    ],
  );

  return resultat.rows[0];
}

// =====================================================
// ACTUALITZAR RESERVA
// =====================================================

async function actualitzarReserva(id, dades, organitzacioId) {
  if (!organitzacioId) {
    throw new Error("Cal indicar l'organització");
  }

  const reservaActual = await obtenirReservaPerId(id, organitzacioId);

  if (!reservaActual) {
    return null;
  }

  if (reservaActual.estat === "CANCELADA") {
    throw new Error("No es pot modificar una reserva cancel·lada");
  }

  const vehicleId = dades.vehicleId ?? reservaActual.vehicle_id;

  const usuariId = dades.usuariId ?? reservaActual.usuari_id;

  const serveiId =
    dades.serveiId !== undefined ? dades.serveiId : reservaActual.servei_id;

  const inici = dades.inici ?? reservaActual.inici;

  const fi = dades.fi ?? reservaActual.fi;

  const observacions =
    dades.observacions !== undefined
      ? dades.observacions
      : reservaActual.observacions;

  const dataInici = new Date(inici);

  const dataFi = new Date(fi);

  if (Number.isNaN(dataInici.getTime()) || Number.isNaN(dataFi.getTime())) {
    throw new Error("Les dates de la reserva no són vàlides");
  }

  if (dataFi <= dataInici) {
    throw new Error("La data/hora final ha de ser posterior a la inicial");
  }

  const vehicle = await comprovarVehicle(vehicleId, organitzacioId);

  if (!vehicle) {
    throw new Error(
      "El vehicle no existeix, no està actiu o no està habilitat per a reserves",
    );
  }

  validarDisponibilitatVehicle(vehicle, inici, fi);

  const usuari = await comprovarUsuari(usuariId, organitzacioId);

  if (!usuari) {
    throw new Error("L'usuari no existeix o pertany a una altra organització");
  }

  if (serveiId) {
    const servei = await comprovarServei(serveiId, organitzacioId);

    if (!servei) {
      throw new Error(
        "El servei no existeix o pertany a una altra organització",
      );
    }
  }

  const solapament = await hiHaSolapament(
    vehicleId,
    inici,
    fi,
    organitzacioId,
    id,
  );

  if (solapament) {
    throw new Error(
      `El vehicle ja té la reserva #${solapament.id} en aquesta franja horària`,
    );
  }

  const bloquejat = await hiHaBloqueig(vehicleId, inici, fi, organitzacioId);

  if (bloquejat) {
    throw new Error("El vehicle no està disponible en aquesta franja");
  }

  const resultat = await pool.query(
    `
        UPDATE reserves

        SET
          vehicle_id = $1,
          usuari_id = $2,
          servei_id = $3,
          inici = $4,
          fi = $5,
          observacions = $6,

          kms_realitzats = NULL,
          kms_estat = 'PENDENT',
          kms_sincronitzat_a = NULL,
          kms_error = NULL,

          actualitzat_a = NOW()

        WHERE
          id = $7

          AND
          id_organitzacio = $8

        RETURNING *
      `,
    [
      vehicleId,
      usuariId,
      serveiId || null,
      inici,
      fi,
      observacions || null,
      id,
      organitzacioId,
    ],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// CANCEL·LAR RESERVA
// =====================================================

async function cancelarReserva(id, organitzacioId) {
  const reserva = await obtenirReservaPerId(id, organitzacioId);

  if (!reserva) {
    return null;
  }

  if (reserva.estat === "CANCELADA") {
    return reserva;
  }

  const resultat = await pool.query(
    `
        UPDATE reserves

        SET
          estat = 'CANCELADA',
          actualitzat_a = NOW()

        WHERE
          id = $1

          AND
          id_organitzacio = $2

        RETURNING *
      `,
    [id, organitzacioId],
  );

  return resultat.rows[0] || null;
}

// =====================================================
// ACTUALITZAR ESTATS AUTOMÀTICAMENT
// =====================================================

async function actualitzarEstatsReserves() {
  const enCurs = await pool.query(
    `
        UPDATE reserves

        SET
          estat = 'EN_CURS',
          actualitzat_a = NOW()

        WHERE
          estat = 'RESERVADA'

          AND
          inici <= NOW()

          AND
          fi > NOW()

        RETURNING id
      `,
  );

  const finalitzades = await pool.query(
    `
        UPDATE reserves

        SET
          estat = 'FINALITZADA',
          actualitzat_a = NOW()

        WHERE
          estat IN (
            'RESERVADA',
            'EN_CURS'
          )

          AND
          fi <= NOW()

        RETURNING id
      `,
  );

  return {
    enCurs: enCurs.rowCount,

    finalitzades: finalitzades.rowCount,
  };
}

// =====================================================
// RESERVES PENDENTS DE KM
// =====================================================

async function obtenirReservesPendentsKms() {
  const resultat = await pool.query(
    `
        SELECT
          id,
          id_organitzacio

        FROM reserves

        WHERE
          estat = 'FINALITZADA'

          AND
          kms_estat = 'PENDENT'

        ORDER BY
          fi ASC
      `,
  );

  return resultat.rows;
}

// =====================================================
// GUARDAR KM
// =====================================================

async function guardarKmsReserva(id, kms, organitzacioId = null) {
  const kmsNumero = Number(kms);

  if (!Number.isFinite(kmsNumero) || kmsNumero < 0) {
    throw new Error("El valor de quilòmetres no és vàlid");
  }

  const valors = [kmsNumero, id];

  let filtreOrganitzacio = "";

  if (organitzacioId) {
    valors.push(organitzacioId);

    filtreOrganitzacio = `AND id_organitzacio = $${valors.length}`;
  }

  const resultat = await pool.query(
    `
        UPDATE reserves

        SET
          kms_realitzats = $1,
          kms_estat = 'SINCRONITZAT',
          kms_sincronitzat_a = NOW(),
          kms_error = NULL,
          actualitzat_a = NOW()

        WHERE
          id = $2

          ${filtreOrganitzacio}

        RETURNING *
      `,
    valors,
  );

  return resultat.rows[0] || null;
}

// =====================================================
// ERROR SINCRONITZACIÓ KM
// =====================================================

async function marcarErrorKms(
  id,
  missatge,
  estat = "ERROR",
  organitzacioId = null,
) {
  const valors = [estat, missatge, id];

  let filtreOrganitzacio = "";

  if (organitzacioId) {
    valors.push(organitzacioId);

    filtreOrganitzacio = `AND id_organitzacio = $${valors.length}`;
  }

  await pool.query(
    `
      UPDATE reserves

      SET
        kms_estat = $1,
        kms_error = $2,
        actualitzat_a = NOW()

      WHERE
        id = $3

        ${filtreOrganitzacio}
    `,
    valors,
  );
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirReserves,
  obtenirReservaPerId,
  obtenirUsuariReserva,

  crearReserva,
  actualitzarReserva,
  cancelarReserva,

  actualitzarEstatsReserves,
  obtenirReservesPendentsKms,

  guardarKmsReserva,
  marcarErrorKms,

  // Utilitzada per integracions externes
  hiHaSolapament,
};
