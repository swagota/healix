const pool = require("../config/db");


const get_lab_tests = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *
            FROM lab_test
            ORDER BY test_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch lab tests"
        });
    }

};

const get_lab_tests_By_id = async (req, res) => {
    try {
        const testId = req.params.id;

        const result = await pool.query(`
            SELECT *
            FROM lab_test
            WHERE test_id = $1
        `, [testId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Lab test not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch lab test"
        });
    }

};

const post_lab_tests = async (req, res) => {
    try {
        const {
            test_name,
            cost,
            description,
            manufactured_by
        } = req.body;

        if (!test_name) {
            return res.status(400).json({
                message: "test_name is required"
            });
        }

        const result = await pool.query(`
            INSERT INTO lab_test
            (
                test_name,
                cost,
                description,
                manufactured_by
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [
            test_name,
            cost,
            description,
            manufactured_by
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create lab test"
        });
    }

};

const put_lab_tests_By_id = async (req, res) => {
    try {
        const testId = req.params.id;

        const {
            test_name,
            cost,
            description,
            manufactured_by
        } = req.body;

        const result = await pool.query(`
            UPDATE lab_test
            SET
                test_name = $1,
                cost = $2,
                description = $3,
                manufactured_by = $4
            WHERE test_id = $5
            RETURNING *
        `, [
            test_name,
            cost,
            description,
            manufactured_by,
            testId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Lab test not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update lab test"
        });
    }

};

const delete_lab_tests_By_id = async (req, res) => {
    try {
        const testId = req.params.id;

        const result = await pool.query(`
            DELETE FROM lab_test
            WHERE test_id = $1
            RETURNING *
        `, [testId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Lab test not found"
            });
        }

        res.json({
            message: "Lab test deleted successfully",
            test: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete lab test"
        });
    }

};

module.exports = {
    get_lab_tests,
    get_lab_tests_By_id,
    post_lab_tests,
    put_lab_tests_By_id,
    delete_lab_tests_By_id
};
