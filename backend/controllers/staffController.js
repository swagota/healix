const bcrypt = require("bcrypt");
const db = require('../config/db');

const PRIVILEGED_STAFF_ROLES = new Set([
  'hr', 'hr staff', 'hr manager', 'senior staff', 'staff manager', 'manager'
]);

const CREATEABLE_STAFF_ROLES = new Set([
  'general staff', 'front desk staff', 'admission staff', 'billing staff',
  'lab staff', 'pharmacy staff', 'reception staff', 'nursing staff', 'support staff'
]);

async function canManageStaff(req) {
  if (req.user?.role !== 'staff') return false;
  const result = await db.query('SELECT role FROM staff WHERE staff_id=$1', [req.user.id]);
  const role = String(result.rows[0]?.role || '').trim().toLowerCase();
  return PRIVILEGED_STAFF_ROLES.has(role);
}

exports.getAllStaff = async (req, res) => {
  try {
    if (!(await canManageStaff(req))) return res.status(403).json({ message: 'Only HR or Senior Staff can view staff accounts' });
    const result = await db.query('SELECT staff_id, staff_name, role, staff_phone, staff_email, staff_salary FROM staff ORDER BY staff_id ASC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to load staff accounts' });
  }
};

exports.createStaff = async (req, res) => {
  try {
    if (!(await canManageStaff(req))) {
      return res.status(403).json({ success: false, message: 'Only HR or Senior Staff can create staff accounts' });
    }

    const { staff_name, staff_password, role, staff_phone, staff_email, staff_salary } = req.body || {};
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (!staff_name?.trim() || !staff_password || !normalizedRole || !staff_phone?.trim()) {
      return res.status(400).json({ message: 'Name, phone, password and staff role are required' });
    }
    if (staff_password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    // HR/Senior Staff may create operational staff only. They cannot create another
    // privileged HR/manager account or an admin account.
    if (!CREATEABLE_STAFF_ROLES.has(normalizedRole)) {
      return res.status(403).json({
        message: 'This staff role cannot be created here. Only operational staff roles are allowed.'
      });
    }

    const phone = staff_phone.trim();
    const duplicate = await db.query(`
      SELECT 'patient' AS account_type FROM patient WHERE patient_phone=$1
      UNION ALL SELECT 'doctor' FROM doctor WHERE doctor_phone=$1
      UNION ALL SELECT 'staff' FROM staff WHERE staff_phone=$1
      UNION ALL SELECT 'admin' FROM admin WHERE admin_phone=$1
      LIMIT 1
    `, [phone]);
    if (duplicate.rows.length) {
      return res.status(409).json({ message: 'This phone number is already registered. Please use a different phone number.' });
    }

    const hash = await bcrypt.hash(staff_password, 12);
    const result = await db.query(
      `INSERT INTO staff (staff_name, staff_password, role, staff_phone, staff_email, staff_salary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING staff_id, staff_name, role, staff_phone, staff_email, staff_salary`,
      [staff_name.trim(), hash, normalizedRole.replace(/\b\w/g, c => c.toUpperCase()), phone, staff_email?.trim() || null, staff_salary ?? null]
    );

    res.status(201).json({ success: true, message: 'Staff account created successfully', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: 'Failed to create staff account', error: error.message });
  }
};
