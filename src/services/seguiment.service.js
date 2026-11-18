const vehiclesService =
  require("./vehicles.service");

const globalsatService =
  require("../integrations/globalsat/globalsat.service");


// =====================================================
// CONFIGURACIÓ PARADES
// =====================================================

const VELOCITAT_PARADA_DEFAULT = 3;
const MINUTS_PARADA_DEFAULT = 5;
const RADI_PARADA_METRES_DEFAULT = 80;
const MARGE_MOVIMENT_MINUTS_DEFAULT = 2;
const DISTANCIA_FUSIO_METRES_DEFAULT = 120;


// =====================================================
// DISTÀNCIA ENTRE DOS PUNTS
// =====================================================

function calcularDistanciaMetres(
  lat1,
  lon1,
  lat2,
  lon2,
) {
  const R = 6371000;

  const convertirRadians =
    (graus) =>
      (graus * Math.PI) / 180;

  const phi1 =
    convertirRadians(lat1);

  const phi2 =
    convertirRadians(lat2);

  const deltaPhi =
    convertirRadians(
      lat2 - lat1,
    );

  const deltaLambda =
    convertirRadians(
      lon2 - lon1,
    );

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return R * c;
}


// =====================================================
// DATA VÀLIDA
// =====================================================

function obtenirTimestamp(
  valor,
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }


  if (
    valor instanceof Date
  ) {
    const timestamp =
      valor.getTime();

    return Number.isNaN(
      timestamp,
    )
      ? null
      : timestamp;
  }


  if (
    typeof valor ===
    "number"
  ) {
    if (
      valor >
        1_000_000_000 &&
      valor <
        10_000_000_000
    ) {
      return valor * 1000;
    }

    if (
      valor >
      1_000_000_000_000
    ) {
      return valor;
    }
  }


  const text =
    String(valor)
      .trim();


  if (!text) {
    return null;
  }


  // Unix segons

  if (
    /^\d{10}$/.test(
      text,
    )
  ) {
    return Number(text) * 1000;
  }


  // Unix ms

  if (
    /^\d{13}$/.test(
      text,
    )
  ) {
    return Number(text);
  }


  // GLOBALSAT yyMMddHHmmss

  if (
    /^\d{12}$/.test(
      text,
    )
  ) {
    const yy =
      Number(
        text.slice(0, 2),
      );

    const mes =
      Number(
        text.slice(2, 4),
      );

    const dia =
      Number(
        text.slice(4, 6),
      );

    const hora =
      Number(
        text.slice(6, 8),
      );

    const minut =
      Number(
        text.slice(8, 10),
      );

    const segon =
      Number(
        text.slice(10, 12),
      );


    const data =
      new Date(
        2000 + yy,
        mes - 1,
        dia,
        hora,
        minut,
        segon,
      );


    const timestamp =
      data.getTime();


    return Number.isNaN(
      timestamp,
    )
      ? null
      : timestamp;
  }


  // dd/MM/yyyy HH:mm:ss

  let match =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );


  if (match) {
    const [
      ,
      dia,
      mes,
      any,
      hora,
      minut,
      segon = "00",
    ] =
      match;


    const data =
      new Date(
        Number(any),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minut),
        Number(segon),
      );


    const timestamp =
      data.getTime();


    return Number.isNaN(
      timestamp,
    )
      ? null
      : timestamp;
  }


  // dd-MM-yyyy HH:mm:ss

  match =
    text.match(
      /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );


  if (match) {
    const [
      ,
      dia,
      mes,
      any,
      hora,
      minut,
      segon = "00",
    ] =
      match;


    const data =
      new Date(
        Number(any),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minut),
        Number(segon),
      );


    const timestamp =
      data.getTime();


    return Number.isNaN(
      timestamp,
    )
      ? null
      : timestamp;
  }


  // yyyy-MM-dd HH:mm:ss

  match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );


  if (match) {
    const [
      ,
      any,
      mes,
      dia,
      hora,
      minut,
      segon = "00",
    ] =
      match;


    const data =
      new Date(
        Number(any),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minut),
        Number(segon),
      );


    const timestamp =
      data.getTime();


    return Number.isNaN(
      timestamp,
    )
      ? null
      : timestamp;
  }


  // ISO / JS

  const data =
    new Date(
      text,
    );


  const timestamp =
    data.getTime();


  return Number.isNaN(
    timestamp,
  )
    ? null
    : timestamp;
}


// =====================================================
// NORMALITZAR VELOCITAT
// =====================================================

function obtenirVelocitat(
  punt,
) {
  const velocitat =
    Number(
      String(
        punt?.velocidad ??
          punt?.velocitat ??
          punt?.speed ??
          0,
      ).replace(
        ",",
        ".",
      ),
    );


  return Number.isFinite(
    velocitat,
  )
    ? velocitat
    : 0;
}


// =====================================================
// CALCULAR VELOCITAT MÀXIMA
// =====================================================

function calcularVelocitatMaxima(
  punts,
) {
  let maxima = 0;


  for (
    const punt
    of punts
  ) {
    const velocitat =
      obtenirVelocitat(
        punt,
      );


    if (
      velocitat >
      maxima
    ) {
      maxima =
        velocitat;
    }
  }


  return maxima;
}


// =====================================================
// CALCULAR CENTRE D'UN GRUP
// =====================================================

function calcularCentre(
  punts,
) {
  if (
    !punts.length
  ) {
    return null;
  }


  const latitud =
    punts.reduce(
      (
        total,
        punt,
      ) =>
        total +
        punt.latitud,
      0,
    ) /
    punts.length;


  const longitud =
    punts.reduce(
      (
        total,
        punt,
      ) =>
        total +
        punt.longitud,
      0,
    ) /
    punts.length;


  return {
    latitud,
    longitud,
  };
}


// =====================================================
// DETECTAR PARADES
// =====================================================

function detectarParades(
  punts,
  opcions = {},
) {
  const velocitatMaximaParada =
    Number(
      opcions.velocitatMaximaParada ??
        VELOCITAT_PARADA_DEFAULT,
    );


  const minutsMinims =
    Number(
      opcions.minutsMinims ??
        MINUTS_PARADA_DEFAULT,
    );


  const radiMetres =
    Number(
      opcions.radiMetres ??
        RADI_PARADA_METRES_DEFAULT,
    );


  const margeMovimentMinuts =
    Number(
      opcions.margeMovimentMinuts ??
        MARGE_MOVIMENT_MINUTS_DEFAULT,
    );


  const distanciaFusioMetres =
    Number(
      opcions.distanciaFusioMetres ??
        DISTANCIA_FUSIO_METRES_DEFAULT,
    );


  // ===================================================
  // NORMALITZAR PUNTS
  // ===================================================

  const puntsValids =
    punts
      .map(
        (punt) => {
          const latitud =
            Number(
              punt?.latitud,
            );

          const longitud =
            Number(
              punt?.longitud,
            );

          const timestamp =
            obtenirTimestamp(
              punt?.fechaHora,
            );


          if (
            !Number.isFinite(
              latitud,
            ) ||
            !Number.isFinite(
              longitud,
            ) ||
            timestamp ===
              null
          ) {
            return null;
          }


          return {
            ...punt,

            latitud,

            longitud,

            velocidad:
              obtenirVelocitat(
                punt,
              ),

            timestamp,
          };
        },
      )
      .filter(
        Boolean,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.timestamp -
          b.timestamp,
      );


  if (
    puntsValids.length <
    2
  ) {
    return [];
  }


  // ===================================================
  // CREAR PARADA
  // ===================================================

  function crearParada(
    grup,
  ) {
    if (
      grup.length <
      2
    ) {
      return null;
    }


    const primer =
      grup[0];

    const ultim =
      grup[
        grup.length - 1
      ];


    const duradaMinuts =
      (
        ultim.timestamp -
        primer.timestamp
      ) /
      60000;


    if (
      duradaMinuts <
      minutsMinims
    ) {
      return null;
    }


    const centre =
      calcularCentre(
        grup,
      );


    if (!centre) {
      return null;
    }


    // -------------------------------------------------
    // DISTÀNCIA MÀXIMA AL CENTRE
    // -------------------------------------------------

    let distanciaMaxima =
      0;


    for (
      const punt
      of grup
    ) {
      const distancia =
        calcularDistanciaMetres(
          centre.latitud,
          centre.longitud,
          punt.latitud,
          punt.longitud,
        );


      if (
        distancia >
        distanciaMaxima
      ) {
        distanciaMaxima =
          distancia;
      }
    }


    if (
      distanciaMaxima >
      radiMetres
    ) {
      return null;
    }


    // -------------------------------------------------
    // VELOCITAT MITJANA
    // -------------------------------------------------

    const velocitatMitjana =
      grup.reduce(
        (
          total,
          punt,
        ) =>
          total +
          punt.velocidad,
        0,
      ) /
      grup.length;


    return {
      inici:
        primer.fechaHora,

      fi:
        ultim.fechaHora,

      iniciTimestamp:
        primer.timestamp,

      fiTimestamp:
        ultim.timestamp,

      duradaMinuts:
        Number(
          duradaMinuts.toFixed(
            1,
          ),
        ),

      latitud:
        Number(
          centre.latitud.toFixed(
            6,
          ),
        ),

      longitud:
        Number(
          centre.longitud.toFixed(
            6,
          ),
        ),

      velocitatMitjana:
        Number(
          velocitatMitjana.toFixed(
            1,
          ),
        ),

      punts:
        grup.length,

      contacte:
        ultim.contacto ??
        primer.contacto ??
        null,
    };
  }


  // ===================================================
  // GENERAR CANDIDATS
  // ===================================================

  const candidats =
    [];

  let grup =
    [];


  function tancarGrup() {
    if (
      grup.length ===
      0
    ) {
      return;
    }


    const parada =
      crearParada(
        grup,
      );


    if (parada) {
      candidats.push(
        parada,
      );
    }


    grup =
      [];
  }


  for (
    let i = 0;
    i <
    puntsValids.length;
    i += 1
  ) {
    const punt =
      puntsValids[i];


    // -------------------------------------------------
    // VEHICLE QUIET / MOLT LENT
    // -------------------------------------------------

    if (
      punt.velocidad <=
      velocitatMaximaParada
    ) {
      grup.push(
        punt,
      );

      continue;
    }


    // -------------------------------------------------
    // PERMETRE PUNTS DE MOVIMENT CURT
    // -------------------------------------------------

    if (
      grup.length >
      0
    ) {
      const ultimQuiet =
        grup[
          grup.length - 1
        ];


      const diferenciaMinuts =
        (
          punt.timestamp -
          ultimQuiet.timestamp
        ) /
        60000;


      const seguent =
        puntsValids[
          i + 1
        ];


      if (
        diferenciaMinuts <=
          margeMovimentMinuts &&
        seguent &&
        seguent.velocidad <=
          velocitatMaximaParada
      ) {
        grup.push(
          punt,
        );

        continue;
      }
    }


    tancarGrup();
  }


  tancarGrup();


  // ===================================================
  // SENSE CANDIDATS
  // ===================================================

  if (
    candidats.length ===
    0
  ) {
    return [];
  }


  // ===================================================
  // FUSIONAR PARADES PROPERES
  // ===================================================

  const fusionades =
    [];

  let actual = {
    ...candidats[0],
  };


  for (
    let i = 1;
    i <
    candidats.length;
    i += 1
  ) {
    const seguent =
      candidats[i];


    const diferenciaMinuts =
      (
        seguent.iniciTimestamp -
        actual.fiTimestamp
      ) /
      60000;


    const distancia =
      calcularDistanciaMetres(
        actual.latitud,
        actual.longitud,
        seguent.latitud,
        seguent.longitud,
      );


    // -------------------------------------------------
    // FUSIONAR
    // -------------------------------------------------

    if (
      diferenciaMinuts <=
        margeMovimentMinuts &&
      distancia <=
        distanciaFusioMetres
    ) {
      const puntsTotals =
        actual.punts +
        seguent.punts;


      const novaLatitud =
        (
          actual.latitud *
            actual.punts +
          seguent.latitud *
            seguent.punts
        ) /
        puntsTotals;


      const novaLongitud =
        (
          actual.longitud *
            actual.punts +
          seguent.longitud *
            seguent.punts
        ) /
        puntsTotals;


      const duradaMinuts =
        (
          seguent.fiTimestamp -
          actual.iniciTimestamp
        ) /
        60000;


      actual = {
        ...actual,

        fi:
          seguent.fi,

        fiTimestamp:
          seguent.fiTimestamp,

        duradaMinuts:
          Number(
            duradaMinuts.toFixed(
              1,
            ),
          ),

        latitud:
          Number(
            novaLatitud.toFixed(
              6,
            ),
          ),

        longitud:
          Number(
            novaLongitud.toFixed(
              6,
            ),
          ),

        punts:
          puntsTotals,

        contacte:
          seguent.contacte ??
          actual.contacte,
      };


      continue;
    }


    fusionades.push(
      actual,
    );


    actual = {
      ...seguent,
    };
  }


  fusionades.push(
    actual,
  );


  // ===================================================
  // NETEJAR CAMPS INTERNS
  // ===================================================

  return fusionades.map(
    ({
      iniciTimestamp,
      fiTimestamp,
      ...parada
    }) =>
      parada,
  );
}


// =====================================================
// CALCULAR TEMPS ATURAT
// =====================================================

function calcularTempsAturat(
  parades,
) {
  return parades.reduce(
    (
      total,
      parada,
    ) =>
      total +
      Number(
        parada.duradaMinuts ||
          0,
      ),
    0,
  );
}


// =====================================================
// CONSULTAR SEGUIMENT VEHICLE
// =====================================================

async function consultarSeguimentVehicle({
  vehicleId,
  organitzacioId,
  desde,
  hasta,
  minutsParada = 5,
}) {
  // ===================================================
  // VALIDACIONS
  // ===================================================

  if (
    !organitzacioId
  ) {
    throw new Error(
      "Cal indicar l'organització",
    );
  }


  if (
    !vehicleId
  ) {
    throw new Error(
      "Cal indicar el vehicle",
    );
  }


  if (
    !desde ||
    !hasta
  ) {
    throw new Error(
      "Cal indicar el període de consulta",
    );
  }


  const inici =
    new Date(
      desde,
    );

  const fi =
    new Date(
      hasta,
    );


  if (
    Number.isNaN(
      inici.getTime(),
    ) ||
    Number.isNaN(
      fi.getTime(),
    )
  ) {
    throw new Error(
      "El període indicat no és vàlid",
    );
  }


  if (
    fi <= inici
  ) {
    throw new Error(
      "La data final ha de ser posterior a la inicial",
    );
  }


  // ===================================================
  // VEHICLE
  // ===================================================

  const vehicle =
    await vehiclesService.obtenirVehiclePerId(
      vehicleId,
      organitzacioId,
    );


  if (!vehicle) {
    throw new Error(
      "Vehicle no trobat",
    );
  }


  if (
    vehicle.seguiment !==
    true
  ) {
    throw new Error(
      "Aquest vehicle no té activat el seguiment GPS",
    );
  }


  // ===================================================
  // KM
  // ===================================================

  const resultatKms =
    await globalsatService.obtenirTraçabilitatVehicle(
      vehicle.vehicle,
      inici,
      fi,
    );


  // ===================================================
  // TRAJECTÒRIA
  // ===================================================

  if (
    typeof globalsatService.obtenirTrajectoriaVehicle !==
    "function"
  ) {
    throw new Error(
      "El servei de Globalsat no té disponible la consulta de trajectòria",
    );
  }


  const resultatTrajectoria =
    await globalsatService.obtenirTrajectoriaVehicle(
      vehicle.vehicle,
      inici,
      fi,
    );


  const trajectoria =
    Array.isArray(
      resultatTrajectoria?.trajectoria,
    )
      ? resultatTrajectoria.trajectoria
      : [];


  // ===================================================
  // DEBUG
  // ===================================================

  console.log(
    "[SEGUIMENT] Vehicle:",
    vehicle.vehicle,
  );

  console.log(
    "[SEGUIMENT] Punts GPS:",
    trajectoria.length,
  );


  // ===================================================
  // PARADES
  // ===================================================

  const parades =
    detectarParades(
      trajectoria,
      {
        minutsMinims:
          minutsParada,

        velocitatMaximaParada:
          3,

        radiMetres:
          80,

        margeMovimentMinuts:
          2,

        distanciaFusioMetres:
          120,
      },
    );


  console.log(
    "[SEGUIMENT] Parades detectades:",
    parades.length,
  );


  // ===================================================
  // TEMPS ATURAT
  // ===================================================

  const tempsAturatMinuts =
    calcularTempsAturat(
      parades,
    );


  // ===================================================
  // DURADA TOTAL
  // ===================================================

  const duradaTotalMinuts =
    (
      fi.getTime() -
      inici.getTime()
    ) /
    60000;


  // ===================================================
  // TEMPS MOVIMENT
  // ===================================================

  const tempsMovimentMinuts =
    Math.max(
      0,
      duradaTotalMinuts -
        tempsAturatMinuts,
    );


  // ===================================================
  // RESULTAT
  // ===================================================

  return {
    vehicle: {
      id:
        vehicle.id,

      idExtern:
        vehicle.id_extern,

      nom:
        vehicle.vehicle,

      reservable:
        vehicle.reservable,

      seguiment:
        vehicle.seguiment,
    },


    periode: {
      desde:
        inici.toISOString(),

      hasta:
        fi.toISOString(),
    },


    resum: {
      kms:
        Number(
          resultatKms?.kms ??
            0,
        ),

      puntsGps:
        trajectoria.length,

      velocitatMaxima:
        calcularVelocitatMaxima(
          trajectoria,
        ),

      parades:
        parades.length,

      tempsAturatMinuts:
        Number(
          tempsAturatMinuts.toFixed(
            1,
          ),
        ),

      tempsMovimentMinuts:
        Number(
          tempsMovimentMinuts.toFixed(
            1,
          ),
        ),
    },


    parades,

    trajectoria,
  };
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  consultarSeguimentVehicle,
  detectarParades,
};