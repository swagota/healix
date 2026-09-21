const pool = require('../config/db');

const appointmentSelect = `
  SELECT a.appointment_id, a.appointment_date, a.status,
         p.patient_id, p.patient_name, p.patient_phone,
         d.doctor_id, d.doctor_name, d.doctor_phone, d.consultation_fee,
         dep.department_name, s.specialization_name,
         r.room_no, ts.day, ts.start_time, ts.end_time
  FROM appointment a
  JOIN patient p ON a.patient_id = p.patient_id
  JOIN doctor_room_slot drs ON a.assignment_id = drs.assignment_id
  JOIN doctor d ON drs.doctor_id = d.doctor_id
  LEFT JOIN department dep ON d.department_id = dep.department_id
  LEFT JOIN specialization s ON d.specialization_id = s.specialization_id
  JOIN room r ON drs.room_id = r.room_id
  JOIN time_slot ts ON drs.slot_id = ts.slot_id
`;

const get_appointments = async (req, res) => {
  try {
    const result = await pool.query(`${appointmentSelect} ORDER BY a.appointment_id DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

const get_appointments_By_id = async (req, res) => {
  try {
    const result = await pool.query(`${appointmentSelect} WHERE a.appointment_id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Failed to fetch appointment' });
  }
};

async function checkOutstandingBills(patientId) {
  const result = await pool.query(`
    SELECT b.bill_id, b.total_amount, b.payment_status, a.appointment_date
    FROM bill b JOIN appointment a ON a.appointment_id=b.appointment_id
    WHERE a.patient_id=$1
      AND upper(coalesce(b.payment_status,'')) NOT IN ('PAID','COMPLETED')
    ORDER BY b.bill_id DESC
  `, [patientId]);
  return result.rows;
}

const post_appointments = async (req, res) => {
  try {
    const patientId = req.user?.role === 'patient' ? req.user.id : Number(req.body.patient_id);
    const { appointment_date, assignment_id } = req.body;
    if (!appointment_date || !patientId || !assignment_id) return res.status(400).json({ message: 'appointment date and doctor schedule are required' });

    const unpaid = await checkOutstandingBills(patientId);
    if (unpaid.length) {
      return res.status(409).json({
        code: 'OUTSTANDING_BILL',
        message: `Appointment request blocked: this patient has ${unpaid.length} unpaid bill(s). Please clear the outstanding bill before requesting another appointment.`,
        bills: unpaid
      });
    }

    const result = await pool.query(`
      INSERT INTO appointment (appointment_date,status,patient_id,assignment_id)
      VALUES ($1,'Pending',$2,$3) RETURNING *
    `, [appointment_date, patientId, assignment_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    const msg = error.message || '';
    if (msg.includes('Appointment date does not match')) return res.status(409).json({ message: 'Request declined. The selected date does not match the doctor schedule day.' });
    if (msg.includes('already booked')) return res.status(409).json({ message: 'This doctor time slot is already booked for that date.' });
    res.status(400).json({ message: msg || 'Failed to create appointment' });
  }
};

const put_appointments_By_id = async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const { role, id: userId } = req.user || {};
    if (role === 'doctor' && Object.keys(req.body || {}).some(k => k !== 'status')) {
      return res.status(403).json({ message: 'Doctors can change appointment status only.' });
    }

    const current = await pool.query(`
      SELECT a.*, drs.doctor_id, d.consultation_fee
      FROM appointment a JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id
      JOIN doctor d ON d.doctor_id=drs.doctor_id WHERE a.appointment_id=$1
    `, [appointmentId]);
    if (!current.rows.length) return res.status(404).json({ message: 'Appointment not found' });
    const row = current.rows[0];
    if (role === 'doctor' && Number(row.doctor_id) !== Number(userId)) return res.status(403).json({ message: 'You can only update your own appointments.' });

    const status = role === 'doctor' ? req.body.status : (req.body.status || row.status);
    const result = await pool.query(`UPDATE appointment SET status=$1 WHERE appointment_id=$2 RETURNING *`, [status, appointmentId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error); res.status(400).json({ message: error.message || 'Failed to update appointment' });
  }
};

const complete_appointment = async (req, res) => {
  const client = await pool.connect();
  try {
    const appointmentId = Number(req.params.id);
    const doctorId = Number(req.user.id);
    await client.query('BEGIN');
    const found = await client.query(`
      SELECT a.appointment_id, a.patient_id, a.status, drs.doctor_id, d.consultation_fee
      FROM appointment a JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id
      JOIN doctor d ON d.doctor_id=drs.doctor_id
      WHERE a.appointment_id=$1
      FOR UPDATE
    `, [appointmentId]);
    if (!found.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Appointment not found' }); }
    const a = found.rows[0];
    if (Number(a.doctor_id) !== doctorId) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'You can only complete your own appointments.' }); }
    if (String(a.status).toUpperCase() === 'CANCELLED') { await client.query('ROLLBACK'); return res.status(409).json({ message: 'A cancelled appointment cannot be completed.' }); }

    let bill = await client.query('SELECT * FROM bill WHERE appointment_id=$1 ORDER BY bill_id LIMIT 1', [appointmentId]);
    if (!bill.rows.length) {
      bill = await client.query(`
        INSERT INTO bill(total_amount,payment_status,appointment_id)
        VALUES ($1,'Pending',$2) RETURNING *
      `, [a.consultation_fee || 0, appointmentId]);
    }
    await client.query(`UPDATE appointment SET status='Completed' WHERE appointment_id=$1`, [appointmentId]);
    const unpaid = String(bill.rows[0].payment_status || '').toUpperCase() !== 'PAID' && String(bill.rows[0].payment_status || '').toUpperCase() !== 'COMPLETED';
    await client.query('COMMIT');
    res.json({ message: unpaid ? 'Appointment completed. Warning: consultation fee is still unpaid.' : 'Appointment completed successfully.', paymentWarning: unpaid, bill: bill.rows[0] });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(error); res.status(400).json({ message: error.message || 'Failed to complete appointment' });
  } finally { client.release(); }
};

const delete_appointments_By_id = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM appointment WHERE appointment_id=$1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully', appointment: result.rows[0] });
  } catch (error) { console.error(error); res.status(400).json({ message: error.message || 'Failed to delete appointment' }); }
};

module.exports = { get_appointments, get_appointments_By_id, post_appointments, put_appointments_By_id, complete_appointment, delete_appointments_By_id };
