require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const { authenticate, authorize } = require('./middleware_auth');
const { runStartupMigrations } = require('./config/startupMigrations');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes Import
const systemRoutes = require("./routes/systemRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const staffRoutes = require("./routes/staffRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const billRoutes = require("./routes/billRoutes");
const labTestRoutes = require("./routes/labTestRoutes");
const labRequestRoutes = require("./routes/labRequestRoutes");
const surgeryRoutes = require("./routes/surgeryRoutes");
const referenceRoutes = require("./routes/referenceRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const specializationRoutes = require("./routes/specializationRoutes");
const wardRoutes = require("./routes/wardRoutes");
const roomRoutes = require("./routes/roomRoutes");
const timeSlotRoutes = require("./routes/timeSlotRoutes");
const doctorRoomSlotRoutes = require("./routes/doctorRoomSlotRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const prescriptionMedicineRoutes = require("./routes/prescriptionMedicineRoutes");
const adminDataRoutes = require("./routes/adminDataRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");

// Authentication routes are public except /me and /logout, which authenticate themselves.
app.use('/', authRoutes);

// Public homepage facility statistics. Values are read live from PostgreSQL.
app.get('/facility-stats', async (req, res) => {
  try {
    const result = await Promise.all([
      db.query(`SELECT COALESCE(SUM(total_bed), 0)::int AS total_beds FROM ward`),
      db.query(`SELECT COALESCE(SUM(total_bed), 0)::int AS icu_nicu_beds FROM ward WHERE LOWER(TRIM(COALESCE(ward_type, ''))) IN ('icu','nicu','icu & nicu','icu/nicu') OR LOWER(COALESCE(ward_name, '')) LIKE '%icu%' OR LOWER(COALESCE(ward_name, '')) LIKE '%nicu%'`),
      db.query(`SELECT COUNT(*)::int AS ambulances FROM ambulance WHERE active = TRUE`),
      db.query(`SELECT COUNT(*)::int AS lab_tests FROM lab_test`),
      db.query(`SELECT COALESCE(value, 0)::int AS ventilators FROM facility_inventory WHERE item_key = 'ventilators' LIMIT 1`)
    ]);

    res.json({
      totalBeds: result[0].rows[0].total_beds,
      icuNicuBeds: result[1].rows[0].icu_nicu_beds,
      ventilators: result[4].rows[0]?.ventilators ?? 0,
      ambulances: result[2].rows[0].ambulances,
      labTests: result[3].rows[0].lab_tests
    });
  } catch (error) {
    console.error('Failed to fetch facility statistics:', error);
    res.status(500).json({ message: 'Failed to fetch facility statistics' });
  }
});

// Every non-public API request must be authenticated and then authorized server-side.
app.use(authenticate);
app.use(authorize);

// Routes Mount
app.use("/", systemRoutes);
app.use("/", patientRoutes);
app.use("/", doctorRoutes);
app.use("/", staffRoutes);
app.use("/", adminRoutes);
app.use("/", appointmentRoutes);
app.use("/", medicalRecordRoutes);
app.use("/", prescriptionRoutes);
app.use("/", billRoutes);
app.use("/", labTestRoutes);
app.use("/", labRequestRoutes);
app.use("/", surgeryRoutes);
app.use("/", referenceRoutes);
app.use("/", departmentRoutes);
app.use("/", specializationRoutes);
app.use("/", wardRoutes);
app.use("/", roomRoutes);
app.use("/", timeSlotRoutes);
app.use("/", doctorRoomSlotRoutes);
app.use("/", medicineRoutes);
app.use("/", prescriptionMedicineRoutes);
app.use("/admin-data", adminDataRoutes);
app.use("/", ambulanceRoutes);

// Test Route
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.status(200).json({
      message: 'Database connection is active!',
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/dashboard-stats', async (req, res) => {
    try {
        const queries = [
            db.query('SELECT COUNT(*) FROM patient'),
            db.query('SELECT COUNT(*) FROM doctor'),
            db.query('SELECT COUNT(*) FROM appointment'),
            db.query('SELECT COUNT(*) FROM bill'),
            db.query('SELECT COUNT(*) FROM staff'),
            db.query('SELECT COUNT(*) FROM lab_request'),
            db.query('SELECT COUNT(*) FROM medicine WHERE stock_quantity <= reorder_level'),
            db.query("SELECT COUNT(*) FROM bill WHERE LOWER(payment_status) NOT IN ('paid', 'completed')"),
            db.query("SELECT COUNT(*) FROM bed_assignment WHERE UPPER(status) = 'ADMITTED'"),
            db.query("SELECT COUNT(*) FROM appointment WHERE appointment_date = CURRENT_DATE"),
            db.query("SELECT COUNT(*) FROM appointment WHERE appointment_date = CURRENT_DATE AND LOWER(COALESCE(status,'')) = 'pending'"),
            db.query("SELECT COALESCE(SUM(total_amount),0) AS today_revenue FROM bill WHERE payment_date = CURRENT_DATE AND LOWER(COALESCE(payment_status,'')) IN ('paid','completed')")
        ];

        const results = await Promise.all(queries);

        res.json({
            patients: parseInt(results[0].rows[0].count),
            doctors: parseInt(results[1].rows[0].count),
            appointments: parseInt(results[2].rows[0].count),
            bills: parseInt(results[3].rows[0].count),
            staff: parseInt(results[4].rows[0].count),
            labRequests: parseInt(results[5].rows[0].count),
            alerts: {
                lowStock: parseInt(results[6].rows[0].count),
                unpaidBills: parseInt(results[7].rows[0].count),
                activeBeds: parseInt(results[8].rows[0].count)
            },
            todayAppointments: parseInt(results[9].rows[0].count),
            todayPendingAppointments: parseInt(results[10].rows[0].count),
            todayRevenue: Number(results[11].rows[0].today_revenue || 0)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

runStartupMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error('HEALIX startup migration failed:', error);
    process.exit(1);
  });