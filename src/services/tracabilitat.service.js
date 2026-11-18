const globalsatTracabilitatService = require("../integrations/globalsat/globalsat-tracabilitat.service");

// =====================================================
// SINCRONITZAR KM
// =====================================================
//
// TEMPORAL:
//
// De moment Sant Tomàs és l'única organització
// amb integració automàtica de quilòmetres.
//
// Quan afegim integracions_organitzacio,
// aquest servei decidirà quin connector utilitzar.
//
// =====================================================

async function sincronitzarKmsReserva(reservaId, organitzacioId) {
  return globalsatTracabilitatService.sincronitzarKmsReserva(
    reservaId,
    organitzacioId,
  );
}

// =====================================================
// OBTENIR TRAJECTÒRIA GPS RESERVA
// =====================================================
//
// TEMPORAL:
//
// De moment Sant Tomàs utilitza Globalsat.
//
// Aquest servei actua com a capa intermèdia entre
// els controllers de l'aplicació i la integració
// concreta de Globalsat.
//
// En el futur aquí podrem decidir el connector
// segons l'organització.
//
// =====================================================

async function obtenirTrajectoriaReserva(reservaId, organitzacioId) {
  return globalsatTracabilitatService.obtenirTrajectoriaReserva(
    reservaId,
    organitzacioId,
  );
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sincronitzarKmsReserva,
  obtenirTrajectoriaReserva,
};
