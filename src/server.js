const express = require("express");
const cors = require("cors");
require("dotenv").config();

const vehiclesRoutes = require("./routes/vehicles.routes");
const usuarisRoutes = require("./routes/usuaris.routes");
const serveisRoutes = require("./routes/serveis.routes");
const reservesRoutes = require("./routes/reserves.routes");
const bloquejosRoutes = require("./routes/bloquejos.routes");
const tracabilitatRoutes = require("./routes/tracabilitat.routes");
const authRoutes = require("./routes/auth.routes");
const organitzacionsRoutes = require("./routes/organitzacions.routes");
const inspeccionsRoutes = require("./routes/inspeccions.routes");
const reportsRoutes = require("./routes/reports.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const incidenciesReservaRoutes = require("./routes/incidencies-reserva.routes");
const seguimentRoutes = require("./routes/seguiment.routes");

const automatitzacionsService = require("./automations/automatitzacions.service");

const pool = require("./config/database");

const app = express();

// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors());

app.use(express.json());

// =====================================================
// RUTES API
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/organitzacions", organitzacionsRoutes);

app.use("/api/usuaris", usuarisRoutes);

app.use("/api/vehicles", vehiclesRoutes);

app.use("/api/serveis", serveisRoutes);

app.use("/api/reserves", reservesRoutes);

app.use("/api/bloquejos", bloquejosRoutes);

app.use("/api/seguiment", seguimentRoutes);

// =====================================================
// TRAÇABILITAT
// =====================================================
//
// Les rutes internes ja són:
//
// /reserves/:id/sync-kms
// /reserves/:id/trajectoria
//
// Per tant, les muntem directament sobre /api.
//
// Resultat:
//
// /api/reserves/:id/sync-kms
// /api/reserves/:id/trajectoria
//
// =====================================================

app.use("/api", tracabilitatRoutes);

app.use("/api/inspeccions", inspeccionsRoutes);

app.use("/api/reports", reportsRoutes);

app.use("/api/dashboard", dashboardRoutes);

// =====================================================
// INCIDÈNCIES RESERVA
// =====================================================
//
// Les rutes internes ja són:
//
// /reserves/:id/incidencies
// /incidencies
// /incidencies/:id
// /incidencies/:id/resoldre
//
// Per tant, les muntem directament sobre /api.
//
// Resultat:
//
// /api/reserves/:id/incidencies
// /api/incidencies
// /api/incidencies/:id
// /api/incidencies/:id/resoldre
//
// =====================================================

app.use("/api", incidenciesReservaRoutes);

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,

    message: "Carsharing API funcionant",
  });
});

// =====================================================
// TEST BASE DE DADES
// =====================================================

app.get("/api/db-test", async (req, res) => {
  try {
    const resultat = await pool.query("SELECT NOW()");

    res.json({
      ok: true,

      message: "Connexió amb Supabase correcta",

      data: resultat.rows[0],
    });
  } catch (error) {
    console.error("Error Supabase:", error);

    res.status(500).json({
      ok: false,

      message: "Error connectant amb Supabase",
    });
  }
});

// =====================================================
// RUTA NO TROBADA
// =====================================================
//
// IMPORTANT:
// Ha d'estar després de totes les rutes.
//
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    ok: false,

    message: "Ruta no trobada",
  });
});

// =====================================================
// GESTOR GENERAL D'ERRORS
// =====================================================

app.use((error, req, res, next) => {
  console.error("Error general:", error);

  res.status(500).json({
    ok: false,

    message: "S'ha produït un error intern",
  });
});

// =====================================================
// SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor executant-se al port ${PORT}`);

  automatitzacionsService.iniciarAutomatitzacions();
});
