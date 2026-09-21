const pool = require("../config/db");


const get_medical_records = async (req, res) => {
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
                mr.record_id,
                mr.diagnosis,
                mr.treatment,
                mr.admission_date,
                p.patient_id,
                p.patient_name
            FROM medical_record mr
            JOIN patient p
                ON mr.patient_id = p.patient_id
            ${doctorFilter}
            ORDER BY mr.record_id
        `, params);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch medical records"
        });
    }

};

const get_medical_records_By_id = async (req, res) => {
    try {
        const recordId = req.params.id;

        const result = await pool.query(`
            SELECT
                mr.record_id,
                mr.diagnosis,
                mr.treatment,
                mr.admission_date,
                p.patient_id,
                p.patient_name
            FROM medical_record mr
            JOIN patient p
                ON mr.patient_id = p.patient_id
            WHERE mr.record_id = $1
        `, [recordId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch medical record"
        });
    }

};

const post_medical_records = async (req, res) => {
    try {
        const {
            diagnosis,
            treatment,
            admission_date,
            patient_id
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                message: "patient_id is required"
            });
        }

        const result = await pool.query(`
            INSERT INTO medical_record
            (
                diagnosis,
                treatment,
                admission_date,
                patient_id
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [
            diagnosis,
            treatment,
            admission_date,
            patient_id
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create medical record"
        });
    }

};

const put_medical_records_By_id = async (req, res) => {
    try {
        const recordId = req.params.id;

        const {
            diagnosis,
            treatment,
            admission_date,
            patient_id
        } = req.body;

        const result = await pool.query(`
            UPDATE medical_record
            SET
                diagnosis = $1,
                treatment = $2,
                admission_date = $3,
                patient_id = $4
            WHERE record_id = $5
            RETURNING *
        `, [
            diagnosis,
            treatment,
            admission_date,
            patient_id,
            recordId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update medical record"
        });
    }

};

const delete_medical_records_By_id = async (req, res) => {
    try {
        const recordId = req.params.id;

        const result = await pool.query(`
            DELETE FROM medical_record
            WHERE record_id = $1
            RETURNING *
        `, [recordId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        res.json({
            message: "Medical record deleted successfully",
            record: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete medical record"
        });
    }

};

module.exports = {
    get_medical_records,
    get_medical_records_By_id,
    post_medical_records,
    put_medical_records_By_id,
    delete_medical_records_By_id
};
