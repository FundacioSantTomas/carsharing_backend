// =====================================================
// GLOBALSAT5 SERVICE
// =====================================================

const GLOBALSAT_BASE_URL =
  "https://globalsat5.org/obtenerJSON/obtenerJSON.aspx";


// =====================================================
// PETICIÓ JSON GLOBALSAT
// =====================================================

async function consultarGlobalsat(
  params,
  missatgeError = "Error consultant Globalsat5",
) {
  const query =
    new URLSearchParams(
      params,
    );

  const url =
    `${GLOBALSAT_BASE_URL}?${query.toString()}`;

  const resposta =
    await fetch(url);

  if (!resposta.ok) {
    throw new Error(
      `${missatgeError}. HTTP ${resposta.status}`,
    );
  }

  try {
    return await resposta.json();
  } catch {
    throw new Error(
      "Globalsat5 ha retornat una resposta que no és JSON",
    );
  }
}


// =====================================================
// OBTENIR VEHICLES
// =====================================================

async function obtenirVehiclesGlobalsat5() {
  const dades =
    await consultarGlobalsat(
      {
        accion:
          "obtener_vehiculos_stomas",
      },
      "Error consultant els vehicles de Globalsat5",
    );

  const vehicles =
    Array.isArray(
      dades,
    )
      ? dades
      : Array.isArray(
          dades?.vehiculos,
        )
        ? dades.vehiculos
        : [];


  return vehicles.map(
    (item) => ({
      idVehiculo:
        String(
          item?.idVehiculo ??
            "",
        ).trim(),

      vehiculo:
        String(
          item?.vehiculo ??
            "",
        ).trim(),

      key_vehiculo:
        String(
          item?.key_vehiculo ??
            "",
        ).trim(),
    }),
  );
}


// =====================================================
// OBTENIR USUARIS
// =====================================================

async function obtenirUsuarisGlobalsat5() {
  const dades =
    await consultarGlobalsat(
      {
        accion:
          "obtener_usr_pwd_sant_tomas",
      },
      "Error consultant els usuaris de Globalsat5",
    );

  return Array.isArray(
    dades,
  )
    ? dades
    : [];
}


// =====================================================
// OBTENIR SERVEIS
// =====================================================

async function obtenirServeisGlobalsat5() {
  const dades =
    await consultarGlobalsat(
      {
        accion:
          "obtener_servicios_santtomas",
      },
      "Error consultant els serveis de Globalsat5",
    );

  if (
    Array.isArray(
      dades,
    )
  ) {
    return dades;
  }

  if (
    Array.isArray(
      dades?.servicios,
    )
  ) {
    return dades.servicios;
  }

  return [];
}


// =====================================================
// OBTENIR RESERVES ANTIGUES GLOBALSAT5
// =====================================================

async function obtenirReservesDiaGlobalsat5(
  dia,
) {
  const dades =
    await consultarGlobalsat(
      {
        accion:
          "obtener_reservas_sant_tomas",

        dia:
          String(dia),
      },
      "Error obtenint les reserves de Globalsat5",
    );

  return Array.isArray(
    dades?.reservas,
  )
    ? dades.reservas
    : [];
}


// =====================================================
// FORMATEJAR DATA PER GLOBALSAT5
// =====================================================
//
// Format:
// yyMMddHHmmss
//

function formatDataHoraGlobalsat5(
  data,
) {
  const date =
    new Date(
      data,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      "Data no vàlida per consultar Globalsat5",
    );
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/Madrid",

        year:
          "2-digit",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          false,
      },
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  function obtenirPart(
    tipus,
  ) {
    return (
      parts.find(
        (part) =>
          part.type ===
          tipus,
      )?.value ??
      ""
    );
  }

  const yy =
    obtenirPart(
      "year",
    );

  const mm =
    obtenirPart(
      "month",
    );

  const dd =
    obtenirPart(
      "day",
    );

  const hh =
    obtenirPart(
      "hour",
    );

  const min =
    obtenirPart(
      "minute",
    );

  const ss =
    obtenirPart(
      "second",
    );

  if (
    !yy ||
    !mm ||
    !dd ||
    !hh ||
    !min ||
    !ss
  ) {
    throw new Error(
      "No s'ha pogut formatar la data per Globalsat5",
    );
  }

  return (
    `${yy}` +
    `${mm}` +
    `${dd}` +
    `${hh}` +
    `${min}` +
    `${ss}`
  );
}


// =====================================================
// VALIDAR PERÍODE
// =====================================================

function validarPeriode(
  inici,
  fi,
) {
  if (
    !inici ||
    !fi
  ) {
    throw new Error(
      "Falta indicar el període",
    );
  }

  const dataInici =
    new Date(
      inici,
    );

  const dataFi =
    new Date(
      fi,
    );

  if (
    Number.isNaN(
      dataInici.getTime(),
    ) ||
    Number.isNaN(
      dataFi.getTime(),
    )
  ) {
    throw new Error(
      "Les dates indicades no són vàlides",
    );
  }

  if (
    dataFi <=
    dataInici
  ) {
    throw new Error(
      "La data final ha de ser posterior a la inicial",
    );
  }

  return {
    dataInici,
    dataFi,
  };
}


// =====================================================
// EXTREURE IDENTIFICADOR VEHICLE
// =====================================================
//
// "9293MCY - Toyota Yaris"
// -> "9293MCY"
//

function extreureVehicleGlobalsat(
  nomVehicle,
) {
  if (!nomVehicle) {
    return "";
  }

  const text =
    String(
      nomVehicle,
    ).trim();

  if (!text) {
    return "";
  }

  return (
    text
      .split(
        "-",
      )[0]
      ?.trim() ??
    ""
  );
}


// =====================================================
// EXTREURE VEHICLE PER CONSULTA KM
// =====================================================
//
// "9293MCY"
// -> "9293"
//
// Globalsat suma_kms_stomas treballa
// amb la part numèrica inicial.
// =====================================================

function extreureVehicleGlobalsatKms(
  nomVehicle,
) {
  const vehicle =
    extreureVehicleGlobalsat(
      nomVehicle,
    );

  if (!vehicle) {
    return "";
  }

  const coincidencia =
    vehicle.match(
      /^\d+/,
    );

  return coincidencia
    ? coincidencia[0]
    : vehicle;
}


// =====================================================
// CONVERTIR NÚMERO
// =====================================================

function convertirNumero(
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
    typeof valor ===
    "number"
  ) {
    return Number.isFinite(
      valor,
    )
      ? valor
      : null;
  }

  const text =
    String(
      valor,
    )
      .trim()
      .replace(
        ",",
        ".",
      );

  const numero =
    Number(
      text,
    );

  return Number.isFinite(
    numero,
  )
    ? numero
    : null;
}


// =====================================================
// CONVERTIR RESPOSTA KM
// =====================================================

function convertirKmsGlobalsat(
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
    typeof valor ===
    "number"
  ) {
    return Number.isFinite(
      valor,
    )
      ? valor
      : null;
  }

  const text =
    String(
      valor,
    ).trim();

  const match =
    text.match(
      /[\d.,]+/,
    );

  if (!match) {
    return null;
  }

  return convertirNumero(
    match[0],
  );
}


// =====================================================
// OBTENIR TRAÇABILITAT / KM VEHICLE
// =====================================================
//
// accion=suma_kms_stomas
//

async function obtenirTraçabilitatVehicle(
  vehicle,
  inici,
  fi,
) {
  if (!vehicle) {
    throw new Error(
      "Falta indicar el vehicle",
    );
  }


  validarPeriode(
    inici,
    fi,
  );


  // ===================================================
  // IDENTIFICADOR PER KM
  // ===================================================

  const vehicleGlobalsat =
    extreureVehicleGlobalsatKms(
      vehicle,
    );


  if (!vehicleGlobalsat) {
    throw new Error(
      "No s'ha pogut obtenir l'identificador del vehicle",
    );
  }


  const desde =
    formatDataHoraGlobalsat5(
      inici,
    );

  const hasta =
    formatDataHoraGlobalsat5(
      fi,
    );


  // ===================================================
  // DEBUG
  // ===================================================

  console.log(
    "[GLOBALSAT KM] Vehicle rebut:",
    vehicle,
  );

  console.log(
    "[GLOBALSAT KM] Vehicle consulta:",
    vehicleGlobalsat,
  );

  console.log(
    "[GLOBALSAT KM] Desde:",
    desde,
  );

  console.log(
    "[GLOBALSAT KM] Hasta:",
    hasta,
  );


  // ===================================================
  // CONSULTA
  // ===================================================

  const dades =
    await consultarGlobalsat(
      {
        accion:
          "suma_kms_stomas",

        vehiculo:
          vehicleGlobalsat,

        desde,

        hasta,
      },
      "Error consultant els quilòmetres de Globalsat5",
    );


  console.log(
    "[GLOBALSAT KM] Resposta:",
    JSON.stringify(
      dades,
      null,
      2,
    ),
  );


  const valorKms =
    dades?.kms ??
    dades?.suma ??
    dades?.total_kms ??
    dades?.totalKms ??
    dades?.rpta ??
    dades;


  const kms =
    convertirKmsGlobalsat(
      valorKms,
    );


  if (
    kms === null
  ) {
    throw new Error(
      `Globalsat5 no ha retornat uns quilòmetres vàlids. Resposta: ${JSON.stringify(dades)}`,
    );
  }


  return {
    kms,

    vehicle:
      vehicleGlobalsat,

    desde,

    hasta,

    respostaOriginal:
      dades,
  };
}


// =====================================================
// EXTREURE ARRAY TRAJECTÒRIA
// =====================================================

function extreurePuntsTrajectoria(
  dades,
) {
  if (
    Array.isArray(
      dades,
    )
  ) {
    return dades;
  }

  const possibles =
    [
      dades?.trayectoria,
      dades?.trajectoria,
      dades?.puntos,
      dades?.punts,
      dades?.data,
    ];

  for (
    const valor
    of possibles
  ) {
    if (
      Array.isArray(
        valor,
      )
    ) {
      return valor;
    }
  }

  return [];
}


// =====================================================
// NORMALITZAR PUNT GPS
// =====================================================

function normalitzarPuntTrajectoria(
  punt,
) {
  if (
    !punt ||
    typeof punt !==
      "object"
  ) {
    return null;
  }


  // ===================================================
  // DATA / HORA
  // ===================================================

  const fechaHora =
    punt["fecha-hora"] ??
    punt.fechaHora ??
    punt.fecha_hora ??
    punt.fecha ??
    punt.fechaGPS ??
    punt.fecha_gps ??
    punt.fechaPosicion ??
    punt.fecha_posicion ??
    punt.dataHora ??
    punt.data_hora ??
    punt.datetime ??
    punt.dateTime ??
    punt.timestamp ??
    null;


  // ===================================================
  // LATITUD
  // ===================================================

  const latitud =
    convertirNumero(
      punt.latitud ??
        punt.latitude ??
        punt.lat ??
        punt.Latitud ??
        punt.Latitude,
    );


  // ===================================================
  // LONGITUD
  // ===================================================

  const longitud =
    convertirNumero(
      punt.longitud ??
        punt.longitude ??
        punt.lng ??
        punt.lon ??
        punt.Longitud ??
        punt.Longitude,
    );


  if (
    latitud === null ||
    longitud === null
  ) {
    return null;
  }


  if (
    latitud < -90 ||
    latitud > 90 ||
    longitud < -180 ||
    longitud > 180
  ) {
    return null;
  }


  // ===================================================
  // VELOCITAT
  // ===================================================

  const velocidad =
    convertirNumero(
      punt.velocidad ??
        punt.velocitat ??
        punt.speed ??
        punt.Velocidad ??
        punt.Speed,
    );


  // ===================================================
  // KM
  // ===================================================

  const kms =
    convertirNumero(
      punt.kms ??
        punt.kilometros ??
        punt.kilometres ??
        punt.odometro ??
        punt.odometer ??
        punt.Kms,
    );


  // ===================================================
  // RUMB
  // ===================================================

  const rumbo =
    convertirNumero(
      punt.rumbo ??
        punt.heading ??
        punt.course ??
        punt.Rumbo,
    );


  // ===================================================
  // CONTACTE
  // ===================================================

  const contacto =
    punt.estado_contacto ??
    punt.contacto ??
    punt.contacte ??
    punt.ignition ??
    punt.Contacto ??
    punt.Ignition ??
    null;


  // ===================================================
  // DIRECCIÓ
  // ===================================================

  const direccion =
    punt.direccion ??
    punt.direccio ??
    punt.address ??
    punt.Direccion ??
    null;


  return {
    fechaHora,

    latitud,

    longitud,

    velocidad:
      velocidad ??
      0,

    kms,

    rumbo,

    contacto,

    direccion,
  };
}


// =====================================================
// CONVERTIR DATA GPS A TIMESTAMP
// =====================================================

function convertirDataGpsTimestamp(
  valor,
) {
  if (!valor) {
    return null;
  }

  const text =
    String(
      valor,
    ).trim();


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
// OBTENIR TRAJECTÒRIA GPS VEHICLE
// =====================================================
//
// accion=trayectoria_stomas
//

async function obtenirTrajectoriaVehicle(
  vehicle,
  inici,
  fi,
) {
  if (!vehicle) {
    throw new Error(
      "Falta indicar el vehicle",
    );
  }


  validarPeriode(
    inici,
    fi,
  );


  // ===================================================
  // VEHICLE COMPLET
  // ===================================================

  const vehicleGlobalsat =
    extreureVehicleGlobalsat(
      vehicle,
    );


  if (!vehicleGlobalsat) {
    throw new Error(
      "No s'ha pogut obtenir l'identificador del vehicle",
    );
  }


  // ===================================================
  // PERÍODE
  // ===================================================

  const desde =
    formatDataHoraGlobalsat5(
      inici,
    );

  const hasta =
    formatDataHoraGlobalsat5(
      fi,
    );


  console.log(
    "[GLOBALSAT TRAJECTORIA]",
    vehicleGlobalsat,
    desde,
    hasta,
  );


  // ===================================================
  // CONSULTA
  // ===================================================

  const dades =
    await consultarGlobalsat(
      {
        accion:
          "trayectoria_stomas",

        vehiculo:
          vehicleGlobalsat,

        desde,

        hasta,
      },
      "Error consultant la trajectòria de Globalsat5",
    );


  // ===================================================
  // PUNTS
  // ===================================================

  const puntsOriginals =
    extreurePuntsTrajectoria(
      dades,
    );


  console.log(
    `[GLOBALSAT TRAJECTORIA] ${puntsOriginals.length} punts rebuts`,
  );


  if (
    puntsOriginals.length >
    0
  ) {
    console.log(
      "[GLOBALSAT TRAJECTORIA] Primer punt original:",
      puntsOriginals[0],
    );
  }


  // ===================================================
  // NORMALITZAR
  // ===================================================

  const trajectoria =
    puntsOriginals
      .map(
        normalitzarPuntTrajectoria,
      )
      .filter(
        Boolean,
      );


  // ===================================================
  // ORDENAR
  // ===================================================

  trajectoria.sort(
    (
      puntA,
      puntB,
    ) => {
      const timestampA =
        convertirDataGpsTimestamp(
          puntA.fechaHora,
        );

      const timestampB =
        convertirDataGpsTimestamp(
          puntB.fechaHora,
        );

      if (
        timestampA === null ||
        timestampB === null
      ) {
        return 0;
      }

      return (
        timestampA -
        timestampB
      );
    },
  );


  if (
    trajectoria.length >
    0
  ) {
    console.log(
      "[GLOBALSAT TRAJECTORIA] Primer punt normalitzat:",
      trajectoria[0],
    );

    console.log(
      "[GLOBALSAT TRAJECTORIA] Últim punt normalitzat:",
      trajectoria[
        trajectoria.length - 1
      ],
    );
  }


  return {
    vehicle:
      vehicleGlobalsat,

    desde,

    hasta,

    totalPunts:
      trajectoria.length,

    trajectoria,

    respostaOriginal:
      dades,
  };
}


// =====================================================
// OBTENIR RESERVES SANT TOMÀS
// =====================================================

async function obtenirReservesSantTomas(
  diaDesde,
  diaHasta,
) {
  const dades =
    await consultarGlobalsat(
      {
        accion:
          "obtener_reservas_sant_tomas2",

        diaDesde,

        diaHasta,
      },
      "Error consultant les reserves de Globalsat5",
    );


  let reserves =
    [];


  if (
    Array.isArray(
      dades,
    )
  ) {
    reserves =
      dades;
  } else if (
    Array.isArray(
      dades?.reservas,
    )
  ) {
    reserves =
      dades.reservas;
  } else if (
    Array.isArray(
      dades?.reserves,
    )
  ) {
    reserves =
      dades.reserves;
  } else if (
    Array.isArray(
      dades?.data,
    )
  ) {
    reserves =
      dades.data;
  }


  console.log(
    `[GLOBALSAT RESERVES] ${reserves.length} reserves trobades`,
  );


  return reserves;
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  obtenirVehiclesGlobalsat5,
  obtenirUsuarisGlobalsat5,
  obtenirServeisGlobalsat5,
  obtenirReservesDiaGlobalsat5,
  obtenirTraçabilitatVehicle,
  obtenirTrajectoriaVehicle,
  obtenirReservesSantTomas,
};