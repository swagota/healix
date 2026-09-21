const pool = require('../config/db');

const labSelect = `
  SELECT lr.request_id, lr.request_date, lr.status, lr.result,
         lr.scheduled_date, lr.scheduled_time,
         p.patient_id, p.patient_name, p.patient_phone,
         s.staff_id, s.staff_name, s.role AS staff_role,
         lt.test_id, lt.test_name, lt.cost, lt.description, lt.manufactured_by
  FROM lab_request lr
  LEFT JOIN patient p ON p.patient_id=lr.patient_id
  JOIN staff s ON s.staff_id=lr.staff_id
  JOIN lab_test lt ON lt.test_id=lr.test_id
`;

const get_lab_requests = async (req, res) => {
  try {
    const result = await pool.query(`${labSelect} ORDER BY lr.request_id DESC`);
    res.json(result.rows);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to fetch lab requests' }); }
};

const get_patient_lab_requests = async (req, res) => {
  try {
    const result = await pool.query(`${labSelect} WHERE lr.patient_id=$1 ORDER BY lr.request_id DESC`, [req.params.id]);
    res.json(result.rows);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to fetch patient lab requests' }); }
};

const get_lab_requests_By_id = async (req, res) => {
  try {
    const result = await pool.query(`${labSelect} WHERE lr.request_id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Lab request not found' });
    res.json(result.rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to fetch lab request' }); }
};

const create_patient_lab_request = async (req, res) => {
  try {
    const patientId = Number(req.user.id);
    const { test_id } = req.body || {};
    if (!test_id) return res.status(400).json({ message: 'Please select a lab test.' });
    const test = await pool.query('SELECT test_id, test_name, cost FROM lab_test WHERE test_id=$1', [test_id]);
    if (!test.rows.length) return res.status(404).json({ message: 'Lab test not found.' });
    const staff = await pool.query(`SELECT staff_id FROM staff WHERE lower(role) LIKE '%lab%' ORDER BY staff_id LIMIT 1`);
    if (!staff.rows.length) return res.status(409).json({ message: 'No laboratory staff is currently available to receive this request.' });
    const result = await pool.query(`
      INSERT INTO lab_request(request_date,status,staff_id,result,test_id,patient_id)
      VALUES (CURRENT_DATE,'Pending',$1,NULL,$2,$3) RETURNING request_id
    `, [staff.rows[0].staff_id, test_id, patientId]);
    const full = await pool.query(`${labSelect} WHERE lr.request_id=$1`, [result.rows[0].request_id]);
    res.status(201).json({ message: 'Lab test request submitted. Laboratory staff will accept it and schedule your test.', request: full.rows[0] });
  } catch (error) { console.error(error); res.status(400).json({ message: error.message || 'Failed to create lab request' }); }
};

const post_lab_requests = async (req, res) => {
  try {
    const { request_date, status, staff_id, result: testResult, test_id, patient_id, scheduled_date, scheduled_time } = req.body || {};
    if (!request_date || !staff_id || !test_id) return res.status(400).json({ message: 'request date, staff and lab test are required' });
    const result = await pool.query(`
      INSERT INTO lab_request(request_date,status,staff_id,result,test_id,patient_id,scheduled_date,scheduled_time)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [request_date, status || 'Pending', staff_id, testResult || null, test_id, patient_id || null, scheduled_date || null, scheduled_time || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) { console.error(error); res.status(400).json({ message: error.message || 'Failed to create lab request' }); }
};

const put_lab_requests_By_id = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await pool.query('SELECT * FROM lab_request WHERE request_id=$1', [id]);
    if (!current.rows.length) return res.status(404).json({ message: 'Lab request not found' });
    const old = current.rows[0];
    const body = req.body || {};
    const request_date = body.request_date ?? old.request_date;
    const status = body.status ?? old.status;
    const staff_id = body.staff_id ?? old.staff_id;
    const testResult = body.result ?? old.result;
    const test_id = body.test_id ?? old.test_id;
    const patient_id = body.patient_id ?? old.patient_id;
    const scheduled_date = body.scheduled_date ?? old.scheduled_date;
    const scheduled_time = body.scheduled_time ?? old.scheduled_time;
    const result = await pool.query(`
      UPDATE lab_request SET request_date=$1,status=$2,staff_id=$3,result=$4,test_id=$5,patient_id=$6,scheduled_date=$7,scheduled_time=$8
      WHERE request_id=$9 RETURNING *
    `, [request_date, status, staff_id, testResult, test_id, patient_id, scheduled_date, scheduled_time, id]);
    res.json(result.rows[0]);
  } catch (error) { console.error(error); res.status(400).json({ message: error.message || 'Failed to update lab request' }); }
};

const delete_lab_requests_By_id = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lab_request WHERE request_id=$1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Lab request not found' });
    res.json({ message: 'Lab request deleted successfully', request: result.rows[0] });
  } catch (error) { console.error(error); res.status(400).json({ message: error.message || 'Failed to delete lab request' }); }
};

module.exports = { get_lab_requests, get_patient_lab_requests, get_lab_requests_By_id, create_patient_lab_request, post_lab_requests, put_lab_requests_By_id, delete_lab_requests_By_id };
