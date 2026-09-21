const pool = require("../config/db");
const bcrypt = require("bcrypt");


const get_patients = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                patient_id,
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group
            FROM patient
            ORDER BY patient_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patients"
        });
    }

};

const get_patients_By_id = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                patient_id,
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group
            FROM patient
            WHERE patient_id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient"
        });
    }

};

const post_patients = async (req, res) => {
    try {
        const {
            patient_name,
            patient_gender,
            dob,
            patient_phone,
            address,
            blood_group,
            patient_password
        } = req.body;

        if (!patient_name || !patient_password) {
            return res.status(400).json({
                message: "Patient name and password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(
            patient_password,
            10
        );

        const result = await pool.query(`
            INSERT INTO patient
            (
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group,
                patient_password
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING
                patient_id,
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group
        `, [
            patient_name,
            patient_gender,
            dob,
            patient_phone,
            address,
            blood_group,
            hashedPassword
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        const msg = error.message || '';
        res.status(msg.includes('Phone number') || error.code === '23505' ? 409 : 500).json({
            message: msg.includes('Phone number') ? 'This phone number is already registered. Please use a different phone number.' : 'Failed to create patient'
        });
    }

};

const put_patients_By_id = async (req, res) => {
    try {
        const {
            patient_name,
            patient_gender,
            dob,
            patient_phone,
            address,
            blood_group,
            patient_password
        } = req.body;

        let result;

        if (patient_password) {

            const hashedPassword = await bcrypt.hash(
                patient_password,
                10
            );

            result = await pool.query(`
                UPDATE patient
                SET
                    patient_name = $1,
                    patient_gender = $2,
                    dob = $3,
                    patient_phone = $4,
                    address = $5,
                    blood_group = $6,
                    patient_password = $7
                WHERE patient_id = $8
                RETURNING
                    patient_id,
                    patient_name,
                    patient_gender,
                    dob,
                    patient_phone,
                    address,
                    blood_group
            `, [
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group,
                hashedPassword,
                req.params.id
            ]);

        } else {

            result = await pool.query(`
                UPDATE patient
                SET
                    patient_name = $1,
                    patient_gender = $2,
                    dob = $3,
                    patient_phone = $4,
                    address = $5,
                    blood_group = $6
                WHERE patient_id = $7
                RETURNING
                    patient_id,
                    patient_name,
                    patient_gender,
                    dob,
                    patient_phone,
                    address,
                    blood_group
            `, [
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group,
                req.params.id
            ]);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        const msg = error.message || '';
        res.status(msg.includes('Phone number') || error.code === '23505' ? 409 : 500).json({
            message: msg.includes('Phone number') ? 'This phone number is already registered. Please use a different phone number.' : 'Failed to update patient'
        });
    }

};

const delete_patients_By_id = async (req, res) => {
    try {
        const result = await pool.query(`
            DELETE FROM patient
            WHERE patient_id = $1
            RETURNING
                patient_id,
                patient_name,
                patient_gender,
                dob,
                patient_phone,
                address,
                blood_group
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        res.json({
            message: "Patient deleted successfully",
            patient: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete patient"
        });
    }

};

const get_patients_By_id_appointments = async (req, res) => {
    try {
        const patientId = req.params.id;

        const result = await pool.query(`
            SELECT
                a.appointment_id,
                a.appointment_date,
                a.status,

                d.doctor_id,
                d.doctor_name,
                d.doctor_phone,

                dep.department_name,
                s.specialization_name,

                r.room_no,
                ts.day,
                ts.start_time,
                ts.end_time

            FROM appointment a

            JOIN doctor_room_slot drs
                ON a.assignment_id = drs.assignment_id

            JOIN doctor d
                ON drs.doctor_id = d.doctor_id

            LEFT JOIN department dep
                ON d.department_id = dep.department_id

            LEFT JOIN specialization s
                ON d.specialization_id = s.specialization_id

            JOIN room r
                ON drs.room_id = r.room_id

            JOIN time_slot ts
                ON drs.slot_id = ts.slot_id

            WHERE a.patient_id = $1

            ORDER BY a.appointment_date DESC
        `, [patientId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient appointments"
        });
    }

};

const get_patients_By_id_medical_records = async (req, res) => {
    try {
        const patientId = req.params.id;

        const result = await pool.query(`
            SELECT
                record_id,
                diagnosis,
                treatment,
                admission_date
            FROM medical_record
            WHERE patient_id = $1
            ORDER BY admission_date DESC
        `, [patientId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient medical records"
        });
    }

};

const get_patients_By_id_prescriptions = async (req, res) => {
    try {
        const patientId = req.params.id;

        const result = await pool.query(`
            SELECT
                pr.prescription_id,
                pr.date,
                pr.advice,
                mr.record_id,
                mr.diagnosis
            FROM prescription pr
            JOIN medical_record mr
                ON pr.record_id = mr.record_id
            WHERE mr.patient_id = $1
            ORDER BY pr.date DESC
        `, [patientId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient prescriptions"
        });
    }

};

const get_patients_By_id_prescriptions_details = async (req, res) => {
    try {
        const patientId = req.params.id;

        const result = await pool.query(`
            SELECT
                pr.prescription_id,
                pr.date,
                pr.advice,

                mr.record_id,
                mr.diagnosis,
                mr.treatment,

                m.medicine_id,
                m.medicine_name,
                m.generic_name,
                m.unit_price,

                pm.dosage,
                pm.duration,
                pm.frequency

            FROM prescription pr

            JOIN medical_record mr
                ON pr.record_id = mr.record_id

            JOIN prescription_medicine pm
                ON pr.prescription_id = pm.prescription_id

            JOIN medicine m
                ON pm.medicine_id = m.medicine_id

            WHERE mr.patient_id = $1

            ORDER BY pr.date DESC, m.medicine_id
        `, [patientId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient prescription details"
        });
    }

};

const get_patients_By_id_bills = async (req, res) => {
    try {
        const patientId = req.params.id;

        const result = await pool.query(`
            SELECT
                b.bill_id,
                b.total_amount,
                b.payment_method,
                b.payment_status,
                b.payment_date,

                a.appointment_id,
                a.appointment_date,

                d.doctor_id,
                d.doctor_name,
                ab.booking_id AS ambulance_booking_id,
                ab.pickup_location,
                ab.destination,
                ab.actual_distance_km,
                ab.rate_per_km

            FROM bill b

            LEFT JOIN appointment a
                ON b.appointment_id = a.appointment_id

            LEFT JOIN doctor_room_slot drs
                ON a.assignment_id = drs.assignment_id

            LEFT JOIN doctor d
                ON drs.doctor_id = d.doctor_id

            LEFT JOIN ambulance_booking ab
                ON b.ambulance_booking_id = ab.booking_id

            WHERE COALESCE(a.patient_id, ab.patient_id) = $1

            ORDER BY b.bill_id DESC
        `, [patientId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient bills"
        });
    }

};

const get_patients_By_id_surgeries = async (req, res) => {
    try {
        const patientId = req.params.id;

        const result = await pool.query(`
            SELECT
                s.surgery_id,
                s.surgery_name,
                s.surgery_type,
                s.status,
                s.cost,
                s.surgery_date,

                d.doctor_id,
                d.doctor_name,
                d.doctor_phone,
                d.doctor_email

            FROM surgery s

            JOIN doctor d
                ON s.doctor_id = d.doctor_id

            WHERE s.patient_id = $1

            ORDER BY s.surgery_id DESC
        `, [patientId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch patient surgeries"
        });
    }

};

module.exports = {
    get_patients,
    get_patients_By_id,
    post_patients,
    put_patients_By_id,
    delete_patients_By_id,
    get_patients_By_id_appointments,
    get_patients_By_id_medical_records,
    get_patients_By_id_prescriptions,
    get_patients_By_id_prescriptions_details,
    get_patients_By_id_bills,
    get_patients_By_id_surgeries
};
