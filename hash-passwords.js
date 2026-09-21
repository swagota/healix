const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function hashPasswords() {
    try {
        console.log("Connected to:", process.env.DB_NAME);

        let updated = 0;

        // =========================
        // PATIENT
        // =========================
        const patients = await pool.query(
            "SELECT patient_id, patient_password FROM patient"
        );

        for (const patient of patients.rows) {
            const password = patient.patient_password || "";

            if (
                password.startsWith("$2a$") ||
                password.startsWith("$2b$") ||
                password.startsWith("$2y$")
            ) continue;

            const hash = await bcrypt.hash(password, 10);

            await pool.query(
                `UPDATE patient
                 SET patient_password = $1
                 WHERE patient_id = $2`,
                [hash, patient.patient_id]
            );

            updated++;
        }

        // =========================
        // DOCTOR
        // =========================
        const doctors = await pool.query(
            "SELECT doctor_id, doctor_password FROM doctor"
        );

        for (const doctor of doctors.rows) {
            const password = doctor.doctor_password || "";

            if (
                password.startsWith("$2a$") ||
                password.startsWith("$2b$") ||
                password.startsWith("$2y$")
            ) continue;

            const hash = await bcrypt.hash(password, 10);

            await pool.query(
                `UPDATE doctor
                 SET doctor_password = $1
                 WHERE doctor_id = $2`,
                [hash, doctor.doctor_id]
            );

            updated++;
        }

        // =========================
        // STAFF
        // =========================
        const staff = await pool.query(
            "SELECT staff_id, staff_password FROM staff"
        );

        for (const member of staff.rows) {
            const password = member.staff_password || "";

            if (
                password.startsWith("$2a$") ||
                password.startsWith("$2b$") ||
                password.startsWith("$2y$")
            ) continue;

            const hash = await bcrypt.hash(password, 10);

            await pool.query(
                `UPDATE staff
                 SET staff_password = $1
                 WHERE staff_id = $2`,
                [hash, member.staff_id]
            );

            console.log(`Staff password hashed: ${member.staff_id} - ${member.staff_password}`);

            updated++;
        }

        // =========================
        // ADMIN
        // =========================
        const admins = await pool.query(
            "SELECT admin_id, admin_password FROM admin"
        );

        for (const admin of admins.rows) {
            const password = admin.admin_password || "";

            if (
                password.startsWith("$2a$") ||
                password.startsWith("$2b$") ||
                password.startsWith("$2y$")
            ) continue;

            const hash = await bcrypt.hash(password, 10);

            await pool.query(
                `UPDATE admin
                 SET admin_password = $1
                 WHERE admin_id = $2`,
                [hash, admin.admin_id]
            );

            updated++;
        }

        console.log("----------------------------------");
        console.log(`Passwords updated: ${updated}`);
        console.log("All passwords processed successfully!");
        console.log("----------------------------------");

    } catch (error) {
        console.error("ERROR:", error);
    } finally {
        await pool.end();
    }
}

hashPasswords();