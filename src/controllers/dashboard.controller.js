const dashboardService = require("../services/dashboard.service");

// =====================================================
// OBTENIR DASHBOARD
// =====================================================

async function obtenirDashboard(req, res) {
  try {
    const organitzacioId = Number(req.organitzacioId);

    if (!Number.isInteger(organitzacioId) || organitzacioId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Cal seleccionar una organització activa",
      });
    }

    const rol = String(req.user?.rol || "")
      .trim()
      .toUpperCase();

    let serveiId = null;

    // =================================================
    // TECNIC
    // =================================================
    //
    // Només pot veure informació
    // del seu servei.
    // =================================================

    if (rol === "TECNIC") {
      serveiId = Number(req.user?.serveiId);

      if (!Number.isInteger(serveiId) || serveiId <= 0) {
        return res.status(403).json({
          ok: false,
          message: "L'usuari tècnic no té cap servei assignat",
        });
      }
    }

    // =================================================
    // ROLS PERMESOS
    // =================================================

    if (rol !== "TECNIC" && rol !== "MASTER" && rol !== "SUPERADMIN") {
      return res.status(403).json({
        ok: false,
        message: "No tens permisos per consultar el dashboard",
      });
    }

    const dades = await dashboardService.obtenirDashboard({
      organitzacioId,
      serveiId,
    });

    res.json({
      ok: true,
      data: dades,
    });
  } catch (error) {
    console.error("Error obtenint dashboard:", error);

    res.status(500).json({
      ok: false,
      message: "No s'ha pogut carregar el dashboard",
    });
  }
}

module.exports = {
  obtenirDashboard,
};
