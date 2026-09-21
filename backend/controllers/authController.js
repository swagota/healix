const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { setSessionCookie, clearSessionCookie, revokeSession } = require('../middleware_auth');

function cleanUser(role, row) {
  const user = { ...row };
  delete user.patient_password;
  delete user.doctor_password;
  delete user.staff_password;
  delete user.admin_password;
  return user;
}

async function findMatches(username, password) {
  const queries = [
    ['patient', 'SELECT * FROM patient WHERE patient_phone = $1', 'patient_password', 'patient_id'],
    ['doctor', 'SELECT * FROM doctor WHERE doctor_phone = $1', 'doctor_password', 'doctor_id'],
    ['staff', 'SELECT * FROM staff WHERE staff_phone = $1', 'staff_password', 'staff_id'],
    ['admin', 'SELECT * FROM admin WHERE username = $1', 'admin_password', 'admin_id']
  ];
  const matches = [];
  for (const [role, sql, passwordField, idField] of queries) {
    const result = await pool.query(sql, [username]);
    for (const row of result.rows) {
      if (await bcrypt.compare(password, row[passwordField])) {
        matches.push({ role, id: row[idField], user: cleanUser(role, row) });
      }
    }
  }
  return matches;
}

const post_login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const matches = await findMatches(username.trim(), password);
    if (matches.length === 0) return res.status(401).json({ message: 'Invalid username or password' });
    if (matches.length > 1) return res.status(409).json({ message: 'Multiple accounts match these credentials. Ask an administrator to make the login identifier unique.' });
    const match = matches[0];
    setSessionCookie(res, match);
    return res.status(200).json({ message: 'Login successful', role: match.role, user: match.user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

const get_me = async (req, res) => {
  try {
    const { role, id } = req.user;
    const config = {
      patient: ['SELECT patient_id,patient_name,patient_gender,dob,patient_phone,address,blood_group FROM patient WHERE patient_id=$1', 'patient_id'],
      doctor: ['SELECT doctor_id,doctor_name,doctor_gender,doctor_phone,doctor_email,doctor_salary,consultation_fee,department_id,specialization_id FROM doctor WHERE doctor_id=$1', 'doctor_id'],
      staff: ['SELECT staff_id,staff_name,role,staff_phone,staff_email,staff_salary FROM staff WHERE staff_id=$1', 'staff_id'],
      admin: ['SELECT admin_id,admin_name,username,admin_email,admin_phone FROM admin WHERE admin_id=$1', 'admin_id']
    }[role];
    const result = await pool.query(config[0], [id]);
    if (!result.rows.length) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Account no longer exists' });
    }
    return res.json({ role, user: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load session' });
  }
};

const post_logout = async (req, res) => {
  revokeSession(req);
  clearSessionCookie(res);
  return res.status(200).json({ message: 'Logged out successfully' });
};

const post_patient_register = async (req, res) => {
  try {
    const { patient_name, patient_gender, dob, patient_phone, address, blood_group, patient_password } = req.body || {};
    if (!patient_name?.trim() || !patient_phone?.trim() || !patient_password) return res.status(400).json({ message: 'Name, phone number and password are required' });
    if (patient_password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const exists = await pool.query(`
      SELECT 1 FROM patient WHERE patient_phone=$1
      UNION ALL SELECT 1 FROM doctor WHERE doctor_phone=$1
      UNION ALL SELECT 1 FROM staff WHERE staff_phone=$1
      UNION ALL SELECT 1 FROM admin WHERE admin_phone=$1
      LIMIT 1
    `, [patient_phone.trim()]);
    if (exists.rows.length) return res.status(409).json({ message: 'This phone number is already registered. Please use a different phone number.' });
    const hash = await bcrypt.hash(patient_password, 12);
    const result = await pool.query(`INSERT INTO patient (patient_name,patient_gender,dob,patient_phone,address,blood_group,patient_password) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING patient_id,patient_name,patient_gender,dob,patient_phone,address,blood_group`, [patient_name.trim(), patient_gender || null, dob || null, patient_phone.trim(), address || null, blood_group || null, hash]);
    const match = { role: 'patient', id: result.rows[0].patient_id, user: result.rows[0] };
    setSessionCookie(res, match);
    return res.status(201).json({ message: 'Registration successful', role: 'patient', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

module.exports = { post_login, get_me, post_logout, post_patient_register };
