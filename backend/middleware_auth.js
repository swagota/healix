const crypto = require('crypto');
const pool = require('./config/db');

const COOKIE_NAME = 'healix_session';
const SECRET = process.env.AUTH_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters long');
}
const MAX_AGE_SECONDS = 8 * 60 * 60;
const revokedTokens = new Set();

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verify(token) {
  if (!token || !token.includes('.') || revokedTokens.has(token)) return null;
  const [encoded, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function setSessionCookie(res, user) {
  const payload = {
    sub: String(user.id),
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  };
  const token = sign(payload);
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

async function authenticate(req, res, next) {
  if (isPublicGet(req)) return next();
  const token = getCookie(req, COOKIE_NAME);
  const payload = verify(token);
  if (!payload) return res.status(401).json({ message: 'Authentication required' });

  req.user = { id: Number(payload.sub), role: payload.role };
  if (req.user.role === 'staff') {
    const staffResult = await pool.query('SELECT role FROM staff WHERE staff_id=$1', [req.user.id]);
    req.user.staffSubtype = String(staffResult.rows[0]?.role || '').trim().toLowerCase();
  }
  next();
}

const publicGetPaths = new Set([
  '/', '/test-db', '/api/test-db', '/doctors', '/departments', '/specializations',
  '/admin-data/specializations', '/lab-tests', '/facility-stats'
]);

function isPublicGet(req) {
  return req.method === 'GET' && publicGetPaths.has(req.path);
}

function deny(res, message = 'Forbidden') {
  return res.status(403).json({ message });
}

const STAFF_ROLE_ALIASES = {
  'lab technician': 'lab staff',
  'nurse': 'nursing staff',
  'receptionist': 'reception staff'
};

function staffSubtype(req) {
  const raw = String(req.user?.staffSubtype || '').trim().toLowerCase();
  return STAFF_ROLE_ALIASES[raw] || raw;
}

function staffCan(req, resource, method) {
  const role = staffSubtype(req);
  const permissions = {
    'front desk staff': {
      '/patients': ['GET','POST','PUT'], '/appointments': ['GET','POST','PUT'], '/doctors': ['GET'], '/dashboard-stats': ['GET']
    },
    'admission staff': {
      '/patients': ['GET','POST','PUT'], '/appointments': ['GET','PUT'], '/doctors': ['GET'], '/wards': ['GET'], '/dashboard-stats': ['GET']
    },
    'billing staff': {
      '/patients': ['GET'], '/appointments': ['GET'], '/doctors': ['GET'], '/bills': ['GET','POST','PUT','DELETE'], '/dashboard-stats': ['GET']
    },
    'lab staff': {
      '/patients': ['GET'], '/appointments': ['GET'], '/doctors': ['GET'], '/lab-requests': ['GET','POST','PUT','DELETE'], '/lab-tests': ['GET','POST','PUT','DELETE'], '/dashboard-stats': ['GET']
    },
    'pharmacy staff': {
      '/patients': ['GET'], '/doctors': ['GET'], '/prescriptions': ['GET'], '/prescription-medicines': ['GET','POST'], '/medicines': ['GET','POST'], '/dashboard-stats': ['GET']
    },
    'reception staff': {
      '/patients': ['GET','POST','PUT'], '/appointments': ['GET','POST','PUT'], '/doctors': ['GET'], '/dashboard-stats': ['GET']
    },
    'nursing staff': {
      '/patients': ['GET'], '/appointments': ['GET','PUT'], '/doctors': ['GET'], '/medical-records': ['GET'], '/lab-requests': ['GET'], '/lab-tests': ['GET'], '/surgeries': ['GET'], '/dashboard-stats': ['GET']
    },
    'ambulance staff': { '/ambulances': ['GET','POST','PUT'], '/ambulance-bookings': ['GET','PUT'], '/patients': ['GET'], '/dashboard-stats': ['GET'] },
    'support staff': {
      '/patients': ['GET'], '/appointments': ['GET'], '/doctors': ['GET'], '/dashboard-stats': ['GET']
    },
    'general staff': {
      '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/dashboard-stats': ['GET']
    },
    'hr': { '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/staff': ['GET','POST'], '/dashboard-stats': ['GET'] },
    'hr staff': { '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/staff': ['GET','POST'], '/dashboard-stats': ['GET'] },
    'hr manager': { '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/staff': ['GET','POST'], '/dashboard-stats': ['GET'] },
    'senior staff': { '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/staff': ['GET','POST'], '/dashboard-stats': ['GET'] },
    'staff manager': { '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/staff': ['GET','POST'], '/dashboard-stats': ['GET'] },
    'manager': { '/patients': ['GET'], '/doctors': ['GET'], '/appointments': ['GET'], '/staff': ['GET','POST'], '/dashboard-stats': ['GET'] }
  };
  return Boolean(permissions[role]?.[resource]?.includes(method));
}

function staffCanPath(req, method) {
  const path = req.path;
  if (path.startsWith('/patients/')) {
    if (path.includes('/ambulance-bookings')) return staffCan(req, '/ambulance-bookings', method);
    if (path.includes('/lab-requests')) return staffCan(req, '/lab-requests', method);
    if (path.includes('/bills')) return staffCan(req, '/bills', method);
    if (path.includes('/medical-records')) return staffCan(req, '/medical-records', method);
    if (path.includes('/prescriptions')) return staffCan(req, '/prescriptions', method);
    if (path.includes('/appointments')) return staffCan(req, '/appointments', method);
    if (path.includes('/surgeries')) return staffCan(req, '/surgeries', method);
    return staffCan(req, '/patients', method);
  }
  const base = path.split('/').filter(Boolean)[0];
  return staffCan(req, `/${base}`, method);
}

async function objectOwnerAllowed(req) {
  const { role, id: userId } = req.user;
  const path = req.path;
  const method = req.method;
  if (role === 'admin') return true;

  // Patient object and patient-owned subresources.
  if (path.startsWith('/patients/')) {
    const parts = path.split('/').filter(Boolean);
    const patientId = Number(parts[1]);
    if (!Number.isInteger(patientId)) return false;
    if (role === 'patient') return patientId === userId;
    if (role === 'staff') return staffCanPath(req, method);
    return role === 'doctor';
  }

  // Staff operate the shared laboratory request queue; patients use /patients/:id/lab-requests.
  if (path.startsWith('/lab-requests')) {
    return role === 'staff' && staffCan(req, '/lab-requests', method);
  }

  // Appointment ownership: patients own their appointments; doctors own appointments assigned to them.
  if (path.startsWith('/appointments')) {
    const id = Number(path.split('/').filter(Boolean)[1]);
    if (role === 'patient') {
      if (method === 'POST') return Number(req.body.patient_id) === userId;
      if (!Number.isInteger(id)) return false;
      const r = await pool.query('SELECT patient_id FROM appointment WHERE appointment_id=$1', [id]);
      return r.rows.length > 0 && Number(r.rows[0].patient_id) === userId;
    }
    if (role === 'doctor') {
      if (method === 'POST' && path.endsWith('/complete')) {
        if (!Number.isInteger(id)) return false;
        const r = await pool.query(`SELECT drs.doctor_id FROM appointment a JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id WHERE a.appointment_id=$1`, [id]);
        return r.rows.length > 0 && Number(r.rows[0].doctor_id) === userId;
      }
      if (method === 'POST') return false;
      if (method === 'PUT' && Object.keys(req.body || {}).some(k => k !== 'status')) return false;
      if (!Number.isInteger(id)) return false;
      const r = await pool.query(`SELECT drs.doctor_id FROM appointment a JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id WHERE a.appointment_id=$1`, [id]);
      return r.rows.length > 0 && Number(r.rows[0].doctor_id) === userId;
    }
    return role === 'staff' && staffCan(req, '/appointments', method);
  }

  if (path.startsWith('/doctors/') && path.endsWith('/consultation-fee')) {
    const parts = path.split('/').filter(Boolean);
    const doctorId = Number(parts[1]);
    if (role === 'doctor') return doctorId === userId;
    return false;
  }

  // Doctor-specific collections.
  if (path.startsWith('/doctors/')) {
    const parts = path.split('/').filter(Boolean);
    const doctorId = Number(parts[1]);
    // Doctors may view only their own profile. Their only editable
    // doctor field is the consultation fee via the dedicated endpoint above.
    if (role === 'doctor') {
      return method === 'GET' && Number.isInteger(doctorId) && doctorId === userId;
    }
    return role === 'staff' && staffCan(req, '/doctors', method);
  }

  // Generic patient-owned resources by primary key.
  if (path.startsWith('/medical-records')) {
    if (role === 'doctor') {
      if (method === 'POST') {
        const patientId = Number(req.body.patient_id);
        if (!Number.isInteger(patientId)) return false;
        const r = await pool.query(`SELECT 1 FROM appointment a JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id WHERE drs.doctor_id=$1 AND a.patient_id=$2 LIMIT 1`, [userId, patientId]);
        return r.rows.length > 0;
      }
      const id = Number(path.split('/').filter(Boolean)[1]);
      if (!Number.isInteger(id)) return true;
      const r = await pool.query(`SELECT 1 FROM medical_record mr JOIN appointment a ON a.patient_id=mr.patient_id JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id WHERE mr.record_id=$1 AND drs.doctor_id=$2 LIMIT 1`, [id, userId]);
      return r.rows.length > 0;
    }
    if (role !== 'patient') return role === 'staff' && staffCan(req, '/medical-records', method);
    const id = Number(path.split('/').filter(Boolean)[1]);
    if (!Number.isInteger(id)) return false;
    const r = await pool.query('SELECT patient_id FROM medical_record WHERE record_id=$1', [id]);
    return r.rows.length > 0 && Number(r.rows[0].patient_id) === userId;
  }

  if (path.startsWith('/prescriptions')) {
    if (role === 'doctor') {
      if (method === 'POST') {
        const recordId = Number(req.body.record_id);
        if (!Number.isInteger(recordId)) return false;
        const r = await pool.query(`SELECT 1 FROM medical_record mr JOIN appointment a ON a.patient_id=mr.patient_id JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id WHERE mr.record_id=$1 AND drs.doctor_id=$2 LIMIT 1`, [recordId, userId]);
        return r.rows.length > 0;
      }
      const id = Number(path.split('/').filter(Boolean)[1]);
      if (!Number.isInteger(id)) return true;
      const r = await pool.query(`SELECT 1 FROM prescription p JOIN medical_record mr ON mr.record_id=p.record_id JOIN appointment a ON a.patient_id=mr.patient_id JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id WHERE p.prescription_id=$1 AND drs.doctor_id=$2 LIMIT 1`, [id, userId]);
      return r.rows.length > 0;
    }
    if (role !== 'patient') return role === 'staff' && staffCan(req, '/prescriptions', method);
    const id = Number(path.split('/').filter(Boolean)[1]);
    if (!Number.isInteger(id)) return false;
    const r = await pool.query(`SELECT mr.patient_id FROM prescription p JOIN medical_record mr ON mr.record_id=p.record_id WHERE p.prescription_id=$1`, [id]);
    return r.rows.length > 0 && Number(r.rows[0].patient_id) === userId;
  }

  if (path.startsWith('/bills/') && path.endsWith('/pay')) {
    if (role !== 'patient' || method !== 'POST') return false;
    const id = Number(path.split('/').filter(Boolean)[1]);
    if (!Number.isInteger(id)) return false;
    const r = await pool.query(`
      SELECT COALESCE(a.patient_id, ab.patient_id) AS patient_id
      FROM bill b
      LEFT JOIN appointment a ON a.appointment_id=b.appointment_id
      LEFT JOIN ambulance_booking ab ON ab.booking_id=b.ambulance_booking_id
      WHERE b.bill_id=$1
    `, [id]);
    return r.rows.length > 0 && Number(r.rows[0].patient_id) === userId;
  }

  if (path.startsWith('/bills')) {
    if (role !== 'patient') return role === 'doctor' || (role === 'staff' && staffCan(req, '/bills', method));
    const parts = path.split('/').filter(Boolean);
    const id = Number(parts[1]);
    if (!Number.isInteger(id)) return true;
    const r = await pool.query(`
      SELECT COALESCE(a.patient_id, ab.patient_id) AS patient_id
      FROM bill b
      LEFT JOIN appointment a ON a.appointment_id=b.appointment_id
      LEFT JOIN ambulance_booking ab ON ab.booking_id=b.ambulance_booking_id
      WHERE b.bill_id=$1
    `, [id]);
    return r.rows.length > 0 && Number(r.rows[0].patient_id) === userId;
  }

  if (path.startsWith('/patients/') && path.includes('/ambulance-bookings')) {
    if (role === 'patient') {
      const patientId=Number(path.split('/').filter(Boolean)[1]);
      if (method === 'POST') return patientId===userId;
      return patientId===userId && method==='GET';
    }
    return role==='staff' && staffCan(req,'/ambulance-bookings',method);
  }
  if (path.startsWith('/ambulance-bookings')) {
    return role==='staff' && staffCan(req,'/ambulance-bookings',method);
  }
  if (path.startsWith('/ambulances')) {
    return role==='staff' && staffCan(req,'/ambulances',method);
  }

  if (path.startsWith('/medicines')) {
    return role === 'staff' && staffCan(req, '/medicines', method);
  }

  if (path.startsWith('/lab-tests')) {
    return role === 'staff' && staffCan(req, '/lab-tests', method);
  }

  if (path.startsWith('/prescription-medicines')) {
    return role === 'staff' && staffCan(req, '/prescription-medicines', method);
  }

  if (path.startsWith('/surgeries')) {
    if (role === 'staff') return staffCan(req, '/surgeries', method);
    if (role === 'doctor') {
      if (method === 'POST') return Number(req.body.doctor_id) === userId;
      const id = Number(path.split('/').filter(Boolean)[1]);
      if (!Number.isInteger(id)) return true;
      const r = await pool.query('SELECT doctor_id FROM surgery WHERE surgery_id=$1', [id]);
      return r.rows.length > 0 && Number(r.rows[0].doctor_id) === userId;
    }
    if (role === 'patient') {
      if (method === 'POST') return Number(req.body.patient_id) === userId;
      const id = Number(path.split('/').filter(Boolean)[1]);
      if (!Number.isInteger(id)) return false;
      const r = await pool.query('SELECT patient_id FROM surgery WHERE surgery_id=$1', [id]);
      return r.rows.length > 0 && Number(r.rows[0].patient_id) === userId;
    }
  }

  return null;
}

async function authorize(req, res, next) {
  if (isPublicGet(req)) return next();
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role === 'admin') return next();

  const path = req.path;
  const method = req.method;

  // Patients may see ambulance availability/rate before submitting a booking.
  if (path.startsWith('/ambulances') && method === 'GET') {
    return ['patient','staff'].includes(req.user.role) ? next() : deny(res);
  }

  // Role-independent reference data.
  if (['/departments', '/specializations', '/rooms', '/wards', '/time-slots', '/doctor-room-slots', '/admin-data/specializations'].includes(path)) {
    return ['patient', 'doctor', 'staff'].includes(req.user.role) && method === 'GET' ? next() : deny(res);
  }

  const ownerDecision = await objectOwnerAllowed(req);
  if (ownerDecision === true) return next();
  if (ownerDecision === false) return deny(res, 'You are not allowed to access this resource');

  // Collections / CRUD permissions.
  // Staff account management is delegated to designated HR/Senior staff.
  // The database `staff.role` field is the staff subtype; the session role remains `staff`.
  if (path === '/staff' && ['GET', 'POST'].includes(method)) {
    if (req.user.role !== 'staff') return deny(res);
    const result = await pool.query('SELECT role FROM staff WHERE staff_id=$1', [req.user.id]);
    const staffRole = String(result.rows[0]?.role || '').trim().toLowerCase();
    const canManageStaff = ['hr', 'hr staff', 'hr manager', 'senior staff', 'staff manager', 'manager'].includes(staffRole);
    return canManageStaff ? next() : deny(res, 'Only HR or Senior Staff can manage staff accounts');
  }

  const rules = {
    doctor: {
      '/doctors': ['GET'], '/patients': ['GET'], '/appointments': ['GET'],
      '/medical-records': ['GET', 'POST', 'PUT'], '/prescriptions': ['GET', 'POST', 'PUT'],
      '/prescription-medicines': ['GET'], '/lab-tests': ['GET'], '/surgeries': ['GET', 'POST', 'PUT'],
      '/dashboard-stats': ['GET']
    },
    staff: {},
    patient: {
      '/doctors': ['GET'], '/appointments': ['GET', 'POST'], '/medical-records': ['GET'],
      '/prescriptions': ['GET'], '/bills': ['GET'], '/surgeries': ['GET'], '/dashboard-stats': []
    }
  };

  const base = path.split('/').filter(Boolean)[0];
  const key = base ? `/${base}` : path;
  if (req.user.role === 'staff') {
    if (key === '/staff' && ['GET','POST'].includes(method)) {
      return staffCan(req, '/staff', method) ? next() : deny(res);
    }
    return staffCan(req, key, method) ? next() : deny(res);
  }
  const allowed = rules[req.user.role]?.[key];
  if (allowed?.includes(method)) return next();
  return deny(res);
}

function revokeSession(req) {
  const token = getCookie(req, COOKIE_NAME);
  if (token) revokedTokens.add(token);
}

module.exports = { authenticate, authorize, setSessionCookie, clearSessionCookie, getCookie, verify, revokeSession };
