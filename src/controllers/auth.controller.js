const authService = require("../services/auth.service");

// =====================================================
// LOGIN
// =====================================================

async function login(req, res) {
  try {
    const { usuari, password } = req.body;

    if (!usuari || !password) {
      return res.status(400).json({
        ok: false,
        message: "Cal indicar usuari i contrasenya",
      });
    }

    const resultat = await authService.login(usuari, password);

    res.json({
      ok: true,
      message: "Sessió iniciada correctament",

      data: resultat,
    });
  } catch (error) {
    console.error("Error login:", error.message);

    res.status(401).json({
      ok: false,
      message: error.message,
    });
  }
}

module.exports = {
  login,
};
