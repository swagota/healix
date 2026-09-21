const pool = require("../config/db");


const get_departments = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                department_id,
                department_name,
                floor
            FROM department
            ORDER BY department_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch departments"
        });
    }

};

const get_specializations = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                specialization_id,
                specialization_name
            FROM specialization
            ORDER BY specialization_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch specializations"
        });
    }

};

const get_rooms = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                room_id,
                room_no,
                room_type,
                floor
            FROM room
            ORDER BY room_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch rooms"
        });
    }

};

const get_wards = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ward_id,
                ward_name,
                ward_type,
                floor,
                total_bed,
                available_bed,
                discharge_date
            FROM ward
            ORDER BY ward_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch wards"
        });
    }

};

const get_time_slots = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                slot_id,
                day,
                start_time,
                end_time
            FROM time_slot
            ORDER BY slot_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch time slots"
        });
    }

};

module.exports = {
    get_departments,
    get_specializations,
    get_rooms,
    get_wards,
    get_time_slots
};
