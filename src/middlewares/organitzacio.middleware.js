function establirOrganitzacioActiva(req, res, next) {
  const rol = String(req.user?.rol || "").toUpperCase();

  // ---------------------------------------------------
  // SUPERADMIN
  // ---------------------------------------------------

  if (rol === "SUPERADMIN") {
    const header = req.headers["x-organitzacio-activa"];

    if (!header) {
      req.organitzacioId = null;
      return next();
    }

    const organitzacioId = Number(header);

    if (!Number.isInteger(organitzacioId) || organitzacioId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "L'organització activa no és vàlida",
      });
    }

    req.organitzacioId = organitzacioId;

    return next();
  }

  // ---------------------------------------------------
  // RESTA DE ROLS
  // ---------------------------------------------------

  if (!req.user?.organitzacioId) {
    return res.status(403).json({
      ok: false,
      message: "L'usuari no té cap organització assignada",
    });
  }

  req.organitzacioId = Number(req.user.organitzacioId);

  next();
}

module.exports = {
  establirOrganitzacioActiva,
};
