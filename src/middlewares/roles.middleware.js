// =====================================================
// COMPROVAR ROLS
// =====================================================

function permetreRols(...rolsPermesos) {
  return (req, res, next) => {
    // -------------------------------------------------
    // COMPROVAR USUARI AUTENTICAT
    // -------------------------------------------------

    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuari no autenticat",
      });
    }

    // -------------------------------------------------
    // NORMALITZAR ROL
    // -------------------------------------------------

    const rol = String(req.user.rol || "")
      .trim()
      .toUpperCase();

    // -------------------------------------------------
    // SUPERADMIN
    // -------------------------------------------------
    //
    // SUPERADMIN té accés a qualsevol ruta
    // protegida per aquest middleware.
    // -------------------------------------------------

    if (rol === "SUPERADMIN") {
      return next();
    }

    // -------------------------------------------------
    // NORMALITZAR ROLS PERMESOS
    // -------------------------------------------------

    const rolsNormalitzats = rolsPermesos.map((r) =>
      String(r).trim().toUpperCase(),
    );

    // -------------------------------------------------
    // COMPROVAR PERMISOS
    // -------------------------------------------------

    if (!rolsNormalitzats.includes(rol)) {
      return res.status(403).json({
        ok: false,
        message: "No tens permisos per fer aquesta acció",
      });
    }

    // -------------------------------------------------
    // CONTINUAR
    // -------------------------------------------------

    next();
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  permetreRols,
};
