const pool = require("../config/db");


const get_surgeries = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                s.surgery_id,
                s.surgery_name,
                s.surgery_type,
                s.status,
                s.cost,
                s.surgery_date,

                p.patient_id,
                p.patient_name,
                p.patient_phone,

                d.doctor_id,
                d.doctor_name,
                d.doctor_phone

            FROM surgery s

            JOIN patient p
                ON s.patient_id = p.patient_id

            JOIN doctor d
                ON s.doctor_id = d.doctor_id

            ORDER BY s.surgery_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch surgeries"
        });
    }

};

const get_surgeries_By_id = async (req, res) => {
    try {
        const surgeryId = req.params.id;

        const result = await pool.query(`
            SELECT
                s.surgery_id,
                s.surgery_name,
                s.surgery_type,
                s.status,
                s.cost,
                s.surgery_date,

                p.patient_id,
                p.patient_name,
                p.patient_phone,

                d.doctor_id,
                d.doctor_name,
                d.doctor_phone,
                d.doctor_email

            FROM surgery s

            JOIN patient p
                ON s.patient_id = p.patient_id

            JOIN doctor d
                ON s.doctor_id = d.doctor_id

            WHERE s.surgery_id = $1
        `, [surgeryId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Surgery not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch surgery"
        });
    }

};

const post_surgeries = async (req, res) => {
    try {
        const {
            surgery_name,
            surgery_type,
            status,
            cost,
            surgery_date,
            patient_id,
            doctor_id
        } = req.body;

        if (!surgery_name || !patient_id || !doctor_id) {
            return res.status(400).json({
                message: "surgery_name, patient_id and doctor_id are required"
            });
        }

        const result = await pool.query(`
            INSERT INTO surgery
            (
                surgery_name,
                surgery_type,
                status,
                cost,
                surgery_date,
                patient_id,
                doctor_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            surgery_name,
            surgery_type,
            status || "Scheduled",
            cost,
            surgery_date,
            patient_id,
            doctor_id
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create surgery"
        });
    }

};

const put_surgeries_By_id = async (req, res) => {
    try {
        const surgeryId = req.params.id;

        const {
            surgery_name,
            surgery_type,
            status,
            cost,
            surgery_date,
            patient_id,
            doctor_id
        } = req.body;

        const result = await pool.query(`
            UPDATE surgery
            SET
                surgery_name = $1,
                surgery_type = $2,
                status = $3,
                cost = $4,
                surgery_date = $5,
                patient_id = $6,
                doctor_id = $7
            WHERE surgery_id = $8
            RETURNING *
        `, [
            surgery_name,
            surgery_type,
            status,
            cost,
            surgery_date,
            patient_id,
            doctor_id,
            surgeryId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Surgery not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update surgery"
        });
    }

};

const delete_surgeries_By_id = async (req, res) => {
    try {
        const surgeryId = req.params.id;

        const result = await pool.query(`
            DELETE FROM surgery
            WHERE surgery_id = $1
            RETURNING *
        `, [surgeryId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Surgery not found"
            });
        }

        res.json({
            message: "Surgery deleted successfully",
            surgery: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete surgery"
        });
    }

};

module.exports = {
    get_surgeries,
    get_surgeries_By_id,
    post_surgeries,
    put_surgeries_By_id,
    delete_surgeries_By_id
};
