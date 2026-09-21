const pool = require("../config/db");


const get_root = async (req, res) => {
    res.send("HEALIX Backend is running!");

};

const get_test_db = async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connected successfully!",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }

};

module.exports = {
    get_root,
    get_test_db
};
