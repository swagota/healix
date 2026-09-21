const pool = require("../config/db");


const get_bills = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                b.bill_id,
                b.total_amount,
                b.payment_method,
                b.payment_status,
                b.payment_date,

                a.appointment_id,
                a.appointment_date,
                a.status AS appointment_status,

                p.patient_id,
                p.patient_name,

                d.doctor_id,
                d.doctor_name,
                b.ambulance_booking_id,
                ab.pickup_location,
                ab.destination,
                ab.actual_distance_km,
                ab.rate_per_km

            FROM bill b

            LEFT JOIN appointment a
                ON b.appointment_id = a.appointment_id

            LEFT JOIN ambulance_booking ab
                ON b.ambulance_booking_id = ab.booking_id

            JOIN patient p
                ON p.patient_id = COALESCE(a.patient_id, ab.patient_id)

            LEFT JOIN doctor_room_slot drs
                ON a.assignment_id = drs.assignment_id

            LEFT JOIN doctor d
                ON drs.doctor_id = d.doctor_id

            ORDER BY b.bill_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch bills"
        });
    }

};

const get_bills_By_id = async (req, res) => {
    try {
        const billId = req.params.id;

        const result = await pool.query(`
            SELECT
                b.bill_id,
                b.total_amount,
                b.payment_method,
                b.payment_status,
                b.payment_date,

                a.appointment_id,
                a.appointment_date,
                a.status AS appointment_status,

                p.patient_id,
                p.patient_name,

                d.doctor_id,
                d.doctor_name,
                b.ambulance_booking_id,
                ab.pickup_location,
                ab.destination,
                ab.actual_distance_km,
                ab.rate_per_km,
                d.consultation_fee

            FROM bill b

            LEFT JOIN appointment a
                ON b.appointment_id = a.appointment_id

            LEFT JOIN ambulance_booking ab
                ON b.ambulance_booking_id = ab.booking_id

            JOIN patient p
                ON p.patient_id = COALESCE(a.patient_id, ab.patient_id)

            LEFT JOIN doctor_room_slot drs
                ON a.assignment_id = drs.assignment_id

            LEFT JOIN doctor d
                ON drs.doctor_id = d.doctor_id

            WHERE b.bill_id = $1
        `, [billId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Bill not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch bill"
        });
    }

};

const post_bills = async (req, res) => {
    try {
        const {
            total_amount,
            payment_method,
            payment_status,
            payment_date,
            appointment_id
        } = req.body;

        if (!total_amount || !appointment_id) {
            return res.status(400).json({
                message: "total_amount and appointment_id are required"
            });
        }

        const result = await pool.query(`
            INSERT INTO bill
            (
                total_amount,
                payment_method,
                payment_status,
                payment_date,
                appointment_id
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            total_amount,
            payment_method,
            payment_status || "Pending",
            payment_date,
            appointment_id
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create bill"
        });
    }

};

const put_bills_By_id = async (req, res) => {
    try {
        const billId = req.params.id;

        // Once a bill is Paid/Completed, its payment status is permanently locked.
        // This applies to every user through this endpoint, including admin.
        const currentBill = await pool.query(
            `SELECT bill_id, payment_status FROM bill WHERE bill_id = $1`,
            [billId]
        );
        if (currentBill.rows.length === 0) {
            return res.status(404).json({ message: "Bill not found" });
        }
        const currentStatus = String(currentBill.rows[0].payment_status || '').trim().toUpperCase();
        if (currentStatus === 'PAID' || currentStatus === 'COMPLETED') {
            return res.status(403).json({ message: "Paid bills cannot be changed." });
        }

        const {
            total_amount,
            payment_method,
            payment_status,
            payment_date,
            appointment_id
        } = req.body;

        const result = await pool.query(`
            UPDATE bill
            SET
                total_amount = COALESCE($1, total_amount),
                payment_method = COALESCE($2, payment_method),
                payment_status = COALESCE($3, payment_status),
                payment_date = COALESCE($4, payment_date),
                appointment_id = COALESCE($5, appointment_id)
            WHERE bill_id = $6
            RETURNING *
        `, [
            total_amount,
            payment_method,
            payment_status,
            payment_date,
            appointment_id,
            billId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Bill not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update bill"
        });
    }

};

const delete_bills_By_id = async (req, res) => {
    try {
        const billId = req.params.id;

        const result = await pool.query(`
            DELETE FROM bill
            WHERE bill_id = $1
            RETURNING *
        `, [billId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Bill not found"
            });
        }

        res.json({
            message: "Bill deleted successfully",
            bill: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete bill"
        });
    }

};


const sandbox_pay_bill = async (req, res) => {
    try {
        const billId = Number(req.params.id);
        const patientId = Number(req.user.id);

        if (!Number.isInteger(billId) || !Number.isInteger(patientId)) {
            return res.status(400).json({ message: "Invalid bill or patient" });
        }

        const bill = await pool.query(`
            SELECT b.bill_id, b.total_amount, b.payment_status, COALESCE(a.patient_id, ab.patient_id) AS patient_id
            FROM bill b
            LEFT JOIN appointment a ON a.appointment_id = b.appointment_id
            LEFT JOIN ambulance_booking ab ON ab.booking_id = b.ambulance_booking_id
            WHERE b.bill_id = $1
        `, [billId]);

        if (bill.rows.length === 0) {
            return res.status(404).json({ message: "Bill not found" });
        }

        const row = bill.rows[0];
        if (Number(row.patient_id) !== patientId) {
            return res.status(403).json({ message: "You can only pay your own bill" });
        }

        if (["Paid", "Completed"].includes(String(row.payment_status))) {
            return res.status(400).json({ message: "This bill is already paid" });
        }

        // HEALIX payment sandbox: no real gateway or card charge is performed.
        const result = await pool.query(`
            UPDATE bill
            SET payment_method = 'bKash SANDBOX',
                payment_status = 'Paid',
                payment_date = CURRENT_DATE
            WHERE bill_id = $1
            RETURNING *
        `, [billId]);

        res.json({
            message: "bKash payment successful.",
            sandbox: true,
            bill: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "bKash payment failed" });
    }
};

module.exports = {
    get_bills,
    get_bills_By_id,
    post_bills,
    put_bills_By_id,
    delete_bills_By_id,
    sandbox_pay_bill
};
