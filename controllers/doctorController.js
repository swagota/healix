const pool = require("../config/db");
const bcrypt = require("bcrypt");


const get_doctors = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                doctor_id,
                doctor_name,
                doctor_gender,
                doctor_phone,
                doctor_email,
                doctor_salary,
                consultation_fee,
                department_id,
                specialization_id
            FROM doctor
            ORDER BY doctor_id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctors"
        });
    }

};

const get_doctors_By_id = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                doctor_id,
                doctor_name,
                doctor_gender,
                doctor_phone,
                doctor_email,
                doctor_salary,
                consultation_fee,
                department_id,
                specialization_id
            FROM doctor
            WHERE doctor_id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor"
        });
    }

};

const post_doctors = async (req, res) => {
    try {
        const {
            doctor_name,
            doctor_gender,
            doctor_phone,
            doctor_email,
            doctor_password,
            doctor_salary,
            consultation_fee,
            department_id,
            specialization_id
        } = req.body;

        if (!doctor_name || !doctor_password) {
            return res.status(400).json({
                message: "Doctor name and password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(
            doctor_password,
            10
        );

        const result = await pool.query(`
            INSERT INTO doctor
            (
                doctor_name,
                doctor_gender,
                doctor_phone,
                doctor_email,
                doctor_password,
                doctor_salary,
                consultation_fee,
                department_id,
                specialization_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING
                doctor_id,
                doctor_name,
                doctor_gender,
                doctor_phone,
                doctor_email,
                doctor_salary,
                consultation_fee,
                department_id,
                specialization_id
        `, [
            doctor_name,
            doctor_gender,
            doctor_phone,
            doctor_email,
            hashedPassword,
            doctor_salary,
            consultation_fee,
            department_id,
            specialization_id
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        const msg = error.message || '';
        res.status(msg.includes('different department') || msg.includes('Phone number') || error.code === '23505' ? 409 : 500).json({
            message: msg.includes('different department') ? msg : msg.includes('Phone number') ? 'This phone number is already registered. Please use a different phone number.' : 'Failed to create doctor'
        });
    }

};

const put_doctors_By_id = async (req, res) => {
    try {
        const {
            doctor_name,
            doctor_gender,
            doctor_phone,
            doctor_email,
            doctor_password,
            doctor_salary,
            consultation_fee,
            department_id,
            specialization_id
        } = req.body;

        const hashedPassword = doctor_password
            ? await bcrypt.hash(doctor_password, 10)
            : null;

        const result = await pool.query(`
            UPDATE doctor
            SET
                doctor_name = $1,
                doctor_gender = $2,
                doctor_phone = $3,
                doctor_email = $4,
                doctor_password = COALESCE($5, doctor_password),
                doctor_salary = $6,
                consultation_fee = $7,
                department_id = $8,
                specialization_id = $9
            WHERE doctor_id = $10
            RETURNING
                doctor_id,
                doctor_name,
                doctor_gender,
                doctor_phone,
                doctor_email,
                doctor_salary,
                consultation_fee,
                department_id,
                specialization_id
        `, [
            doctor_name,
            doctor_gender,
            doctor_phone,
            doctor_email,
            hashedPassword,
            doctor_salary,
            consultation_fee,
            department_id,
            specialization_id,
            req.params.id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        const msg = error.message || '';
        res.status(msg.includes('different department') || msg.includes('Phone number') || error.code === '23505' ? 409 : 500).json({
            message: msg.includes('different department') ? msg : msg.includes('Phone number') ? 'This phone number is already registered. Please use a different phone number.' : 'Failed to update doctor'
        });
    }

};

const delete_doctors_By_id = async (req, res) => {
    try {
        const result = await pool.query(`
            DELETE FROM doctor
            WHERE doctor_id = $1
            RETURNING doctor_id, doctor_name
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json({
            message: "Doctor deleted successfully",
            doctor: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete doctor"
        });
    }

};

const get_doctors_By_id_appointments = async (req, res) => {
    try {
        const doctorId = req.params.id;

        const result = await pool.query(`
            SELECT
                a.appointment_id,
                a.appointment_date,
                a.status,

                p.patient_id,
                p.patient_name,
                p.patient_phone,

                d.doctor_id,
                d.doctor_name,

                dept.department_name,
                sp.specialization_name,

                r.room_no,
                ts.day,
                ts.start_time,
                ts.end_time

            FROM appointment a

            JOIN patient p
                ON a.patient_id = p.patient_id

            JOIN doctor_room_slot drs
                ON a.assignment_id = drs.assignment_id

            JOIN doctor d
                ON drs.doctor_id = d.doctor_id

            LEFT JOIN department dept
                ON d.department_id = dept.department_id

            LEFT JOIN specialization sp
                ON d.specialization_id = sp.specialization_id

            JOIN room r
                ON drs.room_id = r.room_id

            JOIN time_slot ts
                ON drs.slot_id = ts.slot_id

            WHERE d.doctor_id = $1

            ORDER BY a.appointment_date
        `, [doctorId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor appointments"
        });
    }

};

const get_doctors_By_id_patients = async (req, res) => {
    try {
        const doctorId = req.params.id;

        const result = await pool.query(`
            SELECT
                p.patient_id,
                p.patient_name,
                p.patient_gender,
                p.dob,
                p.patient_phone,
                p.address,
                p.blood_group,
                COALESCE(pa.department_names, '—') AS department_names,
                COALESCE(pa.doctor_names, '—') AS doctor_names
            FROM patient p
            LEFT JOIN (
                SELECT
                    a.patient_id,
                    STRING_AGG(DISTINCT dept.department_name, ', ' ORDER BY dept.department_name) AS department_names,
                    STRING_AGG(DISTINCT d.doctor_name, ', ' ORDER BY d.doctor_name) AS doctor_names
                FROM appointment a
                JOIN doctor_room_slot drs ON a.assignment_id = drs.assignment_id
                JOIN doctor d ON drs.doctor_id = d.doctor_id
                LEFT JOIN department dept ON d.department_id = dept.department_id
                GROUP BY a.patient_id
            ) pa ON pa.patient_id = p.patient_id
            ORDER BY p.patient_id
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch doctor patient list" });
    }
};

const get_doctors_By_id_patient_history = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const patientId = req.params.patientId;

        const access = await pool.query(`
            SELECT 1
            FROM appointment a
            JOIN doctor_room_slot drs ON a.assignment_id = drs.assignment_id
            WHERE drs.doctor_id = $1 AND a.patient_id = $2
            LIMIT 1
        `, [doctorId, patientId]);

        if (access.rows.length === 0) {
            return res.status(403).json({ message: "This patient has no appointment relationship with this doctor" });
        }

        const result = await pool.query(`
            SELECT
                mr.record_id,
                mr.diagnosis,
                mr.treatment,
                mr.admission_date,
                p.patient_id,
                p.patient_name
            FROM medical_record mr
            JOIN patient p ON mr.patient_id = p.patient_id
            WHERE mr.patient_id = $1
            ORDER BY mr.admission_date DESC NULLS LAST, mr.record_id DESC
        `, [patientId]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch patient medical history" });
    }
};

const get_doctors_By_id_surgeries = async (req, res) => {
    try {
        const doctorId = req.params.id;

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

            WHERE s.doctor_id = $1

            ORDER BY s.surgery_date
        `, [doctorId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor surgeries"
        });
    }

};

const put_doctor_consultation_fee = async (req, res) => {
    try {
        // Consultation fee is controlled by the doctor themselves (or admin), never by staff.
        if (!req.user || !['doctor', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only the doctor or admin can update consultation fee.' });
        }
        if (req.user.role === 'doctor' && Number(req.user.id) !== Number(req.params.id)) {
            return res.status(403).json({ message: 'A doctor can update only their own consultation fee.' });
        }
        const fee = Number(req.body?.consultation_fee);
        if (!Number.isFinite(fee) || fee < 0) return res.status(400).json({ message: 'Consultation fee must be a non-negative number.' });
        const result = await pool.query(`UPDATE doctor SET consultation_fee=$1 WHERE doctor_id=$2 RETURNING doctor_id, doctor_name, consultation_fee`, [fee, req.params.id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Doctor not found' });
        res.json({ message: 'Consultation fee updated.', doctor: result.rows[0] });
    } catch (error) { console.error(error); res.status(400).json({ message: error.message || 'Failed to update consultation fee' }); }
};

module.exports = {
    get_doctors,
    get_doctors_By_id,
    post_doctors,
    put_doctors_By_id,
    delete_doctors_By_id,
    get_doctors_By_id_appointments,
    get_doctors_By_id_patients,
    get_doctors_By_id_patient_history,
    get_doctors_By_id_surgeries,
    put_doctor_consultation_fee,
};
