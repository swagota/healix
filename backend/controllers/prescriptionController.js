const pool = require("../config/db");


const get_prescriptions = async (req, res) => {
    try {
        const doctorFilter = req.user?.role === 'doctor' ? `
            WHERE EXISTS (
                SELECT 1
                FROM appointment a
                JOIN doctor_room_slot drs ON a.assignment_id = drs.assignment_id
                WHERE a.patient_id = mr.patient_id AND drs.doctor_id = $1
            )` : '';
        const params = req.user?.role === 'doctor' ? [req.user.id] : [];

        const result = await pool.query(`
            SELECT
                pr.prescription_id,
                pr.date,
                pr.advice,
                mr.record_id,
                mr.diagnosis,
                p.patient_id,
                p.patient_name
            FROM prescription pr
            JOIN medical_record mr
                ON pr.record_id = mr.record_id
            JOIN patient p
                ON mr.patient_id = p.patient_id
            ${doctorFilter}
            ORDER BY pr.prescription_id
        `, params);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch prescriptions"
        });
    }

};

const get_prescriptions_By_id = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        const result = await pool.query(`
            SELECT
                pr.prescription_id,
                pr.date,
                pr.advice,
                mr.record_id,
                mr.diagnosis,
                p.patient_id,
                p.patient_name
            FROM prescription pr
            JOIN medical_record mr
                ON pr.record_id = mr.record_id
            JOIN patient p
                ON mr.patient_id = p.patient_id
            WHERE pr.prescription_id = $1
        `, [prescriptionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Prescription not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch prescription"
        });
    }

};

const post_prescriptions = async (req, res) => {
    try {
        const {
            date,
            advice,
            record_id
        } = req.body;

        if (!date || !record_id) {
            return res.status(400).json({
                message: "date and record_id are required"
            });
        }

        const result = await pool.query(`
            INSERT INTO prescription
            (
                date,
                advice,
                record_id
            )
            VALUES ($1, $2, $3)
            RETURNING *
        `, [
            date,
            advice,
            record_id
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create prescription"
        });
    }

};

const put_prescriptions_By_id = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        const {
            date,
            advice,
            record_id
        } = req.body;

        const result = await pool.query(`
            UPDATE prescription
            SET
                date = $1,
                advice = $2,
                record_id = $3
            WHERE prescription_id = $4
            RETURNING *
        `, [
            date,
            advice,
            record_id,
            prescriptionId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Prescription not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update prescription"
        });
    }

};

const delete_prescriptions_By_id = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        const result = await pool.query(`
            DELETE FROM prescription
            WHERE prescription_id = $1
            RETURNING *
        `, [prescriptionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Prescription not found"
            });
        }

        res.json({
            message: "Prescription deleted successfully",
            prescription: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete prescription"
        });
    }

};

const get_prescription_medicines = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                pm.prescription_id,
                pr.date AS prescription_date,
                pr.advice,

                p.patient_id,
                p.patient_name,

                m.medicine_id,
                m.medicine_name,
                m.generic_name,
                m.unit_price,

                pm.dosage,
                pm.duration,
                pm.frequency

            FROM prescription_medicine pm

            JOIN prescription pr
                ON pm.prescription_id = pr.prescription_id

            JOIN medical_record mr
                ON pr.record_id = mr.record_id

            JOIN patient p
                ON mr.patient_id = p.patient_id

            JOIN medicine m
                ON pm.medicine_id = m.medicine_id

            ORDER BY pm.prescription_id, m.medicine_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch prescription medicines"
        });
    }

};

const get_prescriptions_By_id_medicines = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        const result = await pool.query(`
            SELECT
                m.medicine_id,
                m.medicine_name,
                m.generic_name,
                m.unit_price,
                pm.dosage,
                pm.duration,
                pm.frequency

            FROM prescription_medicine pm

            JOIN medicine m
                ON pm.medicine_id = m.medicine_id

            WHERE pm.prescription_id = $1

            ORDER BY m.medicine_id
        `, [prescriptionId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch prescription medicines"
        });
    }

};

const post_prescriptions_By_id_medicines = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        const {
            medicine_id,
            dosage,
            duration,
            frequency
        } = req.body;

        if (!medicine_id) {
            return res.status(400).json({
                message: "medicine_id is required"
            });
        }

        const result = await pool.query(`
            INSERT INTO prescription_medicine
            (
                prescription_id,
                medicine_id,
                dosage,
                duration,
                frequency
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            prescriptionId,
            medicine_id,
            dosage,
            duration,
            frequency
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add medicine to prescription"
        });
    }

};

const put_prescriptions_By_id_medicines_By_medicineId = async (req, res) => {
    try {
        const prescriptionId = req.params.id;
        const medicineId = req.params.medicineId;

        const {
            dosage,
            duration,
            frequency
        } = req.body;

        const result = await pool.query(`
            UPDATE prescription_medicine
            SET
                dosage = $1,
                duration = $2,
                frequency = $3
            WHERE prescription_id = $4
              AND medicine_id = $5
            RETURNING *
        `, [
            dosage,
            duration,
            frequency,
            prescriptionId,
            medicineId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Prescription medicine not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update prescription medicine"
        });
    }

};

const delete_prescriptions_By_id_medicines_By_medicineId = async (req, res) => {
    try {
        const prescriptionId = req.params.id;
        const medicineId = req.params.medicineId;

        const result = await pool.query(`
            DELETE FROM prescription_medicine
            WHERE prescription_id = $1
              AND medicine_id = $2
            RETURNING *
        `, [
            prescriptionId,
            medicineId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Prescription medicine not found"
            });
        }

        res.json({
            message: "Medicine removed from prescription successfully",
            medicine: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete prescription medicine"
        });
    }

};

module.exports = {
    get_prescriptions,
    get_prescriptions_By_id,
    post_prescriptions,
    put_prescriptions_By_id,
    delete_prescriptions_By_id,
    get_prescription_medicines,
    get_prescriptions_By_id_medicines,
    post_prescriptions_By_id_medicines,
    put_prescriptions_By_id_medicines_By_medicineId,
    delete_prescriptions_By_id_medicines_By_medicineId
};
