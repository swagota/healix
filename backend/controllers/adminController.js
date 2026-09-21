const pool = require("../config/db");
const bcrypt = require("bcrypt");


const get_admins = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                admin_id,
                admin_name,
                username,
                admin_email,
                admin_phone
            FROM admin
            ORDER BY admin_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch admins"
        });
    }

};

const get_admins_By_id = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                admin_id,
                admin_name,
                username,
                admin_email,
                admin_phone
            FROM admin
            WHERE admin_id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch admin"
        });
    }

};

const post_admins = async (req, res) => {
    try {
        const {
            admin_name,
            username,
            admin_password,
            admin_email,
            admin_phone
        } = req.body;

        if (!admin_name || !username || !admin_password) {
            return res.status(400).json({
                message: "Admin name, username and password are required"
            });
        }

        const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM admin");
        if (countResult.rows[0].count >= 1) {
            return res.status(409).json({
                message: "HEALIX is configured with a single administrator account."
            });
        }

        const hashedPassword = await bcrypt.hash(
            admin_password,
            10
        );

        const result = await pool.query(`
            INSERT INTO admin
            (
                admin_name,
                username,
                admin_password,
                admin_email,
                admin_phone
            )
            VALUES ($1,$2,$3,$4,$5)
            RETURNING
                admin_id,
                admin_name,
                username,
                admin_email,
                admin_phone
        `, [
            admin_name,
            username,
            hashedPassword,
            admin_email,
            admin_phone
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create admin"
        });
    }

};

const put_admins_By_id = async (req, res) => {
    try {
        const {
            admin_name,
            username,
            admin_password,
            admin_email,
            admin_phone
        } = req.body;

        const hashedPassword = admin_password
            ? await bcrypt.hash(admin_password, 10)
            : null;

        const result = await pool.query(`
            UPDATE admin
            SET
                admin_name = $1,
                username = $2,
                admin_password = COALESCE($3, admin_password),
                admin_email = $4,
                admin_phone = $5
            WHERE admin_id = $6
            RETURNING
                admin_id,
                admin_name,
                username,
                admin_email,
                admin_phone
        `, [
            admin_name,
            username,
            hashedPassword,
            admin_email,
            admin_phone,
            req.params.id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update admin"
        });
    }

};

const delete_admins_By_id = async (req, res) => {
    try {
        const result = await pool.query(`
            DELETE FROM admin
            WHERE admin_id = $1
            RETURNING admin_id, admin_name
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        res.json({
            message: "Admin deleted successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete admin"
        });
    }

};

module.exports = {
    get_admins,
    get_admins_By_id,
    post_admins,
    put_admins_By_id,
    delete_admins_By_id
};
