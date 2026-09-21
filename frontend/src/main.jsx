import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { api } from './api';

const STAFF_NAV_BY_SUBTYPE = {
  'front desk staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['profile','◎','My Profile']],
  'admission staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['wards','▤','Wards'],['profile','◎','My Profile']],
  'billing staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['bills','৳','Billing'],['profile','◎','My Profile']],
  'lab staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['lab','⌁','Laboratory'],['profile','◎','My Profile']],
  'lab technician': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['lab','⌁','Laboratory'],['profile','◎','My Profile']],
  'pharmacy staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['prescriptions','✚','Prescriptions'],['medicines','▤','Medicines'],['profile','◎','My Profile']],
  'reception staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['profile','◎','My Profile']],
  'receptionist': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['profile','◎','My Profile']],
  'nursing staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['records','▣','Medical Records'],['lab','⌁','Laboratory'],['surgeries','◇','Surgeries'],['profile','◎','My Profile']],
  'nurse': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['records','▣','Medical Records'],['lab','⌁','Laboratory'],['surgeries','◇','Surgeries'],['profile','◎','My Profile']],
  'ambulance staff': [['overview','⌂','Overview'],['ambulances','🚑','Ambulances'],['ambulance-bookings','◷','Ambulance Bookings'],['profile','◎','My Profile']],
  'support staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['profile','◎','My Profile']],
  'general staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['profile','◎','My Profile']],
  'hr': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['staff-management','◉','Staff Management'],['profile','◎','My Profile']],
  'hr staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['staff-management','◉','Staff Management'],['profile','◎','My Profile']],
  'hr manager': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['staff-management','◉','Staff Management'],['profile','◎','My Profile']],
  'senior staff': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['staff-management','◉','Staff Management'],['profile','◎','My Profile']],
  'staff manager': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['staff-management','◉','Staff Management'],['profile','◎','My Profile']],
  'manager': [['overview','⌂','Overview'],['patients','♙','Patients'],['doctors','✚','Doctors'],['appointments','◷','Appointments'],['staff-management','◉','Staff Management'],['profile','◎','My Profile']]
};

const ROLE_NAV = {
  patient: [['overview','⌂','Overview'],['appointments','◷','Appointments'],['records','▣','Medical Records'],['prescriptions','✚','Prescriptions'],['lab','⌁','Lab Tests'],['bills','৳','Bills'],['ambulance-bookings','🚑','Ambulance'],['surgeries','◇','Surgeries'],['profile','◎','My Profile']],
  doctor: [['overview','⌂','Overview'],['appointments','◷','Appointments'],['patients','♙','Patients'],['records','▣','Medical Records'],['prescriptions','✚','Prescriptions'],['surgeries','◇','Surgeries'],['profile','◎','My Profile']],
  staff: STAFF_NAV_BY_SUBTYPE['general staff'],
  admin: [['overview','⌂','Dashboard'],['patients','♙','Patients'],['doctors','✚','Doctors'],['staff','◉','Staff'],['departments','▦','Departments'],['specializations','✦','Specializations'],['schedules','◫','Doctor Schedules'],['wards','▤','Wards'],['beds','▥','Bed Assignments'],['rooms','▥','Rooms'],['time-slots','◷','Time Slots'],['medicines','▧','Medicines'],['reports','▥','Reports'],['ambulances','🚑','Ambulances'],['lab-tests','⌁','Lab Tests'],['profile','◎','Admin Profile']]
};

const STAFF_MANAGER_ROLES = ['hr','hr staff','hr manager','senior staff','staff manager','manager'];
const getStaffSubtype = session => String(session?.user?.role || 'general staff').trim().toLowerCase();
const getStaffNav = session => STAFF_NAV_BY_SUBTYPE[getStaffSubtype(session)] || STAFF_NAV_BY_SUBTYPE['general staff'];


const LABELS = Object.fromEntries(Object.values(ROLE_NAV).flat().map(([id, , label]) => [id, label]));
const empty = v => v === null || v === undefined || v === '' ? '—' : v;
const dateOnly = v => v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const money = v => v === null || v === undefined || v === '' ? '—' : `৳ ${Number(v).toLocaleString('en-BD')}`;
const normalize = data => Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : data);

const scheduleLabel = r => `Dr. ${r.doctor_name || r.doctor_id} · ${r.day || ''} ${String(r.start_time || '').slice(0, 5)}–${String(r.end_time || '').slice(0, 5)} · Room ${r.room_no || r.room_id}`;
const slotLabel = r => `${r.day} · ${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`;
const recordLabel = r => `#${r.record_id} · ${r.patient_name || ''} · ${r.diagnosis || 'Record'}`;
const appointmentLabel = r => `#${r.appointment_id} · ${r.patient_name || ''} · ${dateOnly(r.appointment_date)}`;

const patientCols = [
  { key: 'patient_id', label: 'ID' }, { key: 'patient_name', label: 'Patient' }, 
  { key: 'patient_phone', label: 'Phone' }, { key: 'patient_gender', label: 'Gender' }, 
  { key: 'blood_group', label: 'Blood' }, { key: 'dob', label: 'DOB', render: r => dateOnly(r.dob) }
];
const doctorPatientCols = [
  { key: 'patient_id', label: 'ID' }, { key: 'patient_name', label: 'Patient' },
  { key: 'patient_phone', label: 'Phone' }, { key: 'patient_gender', label: 'Gender' },
  { key: 'blood_group', label: 'Blood' }, { key: 'department_names', label: 'Departments' },
  { key: 'doctor_names', label: 'Doctors' }, { key: 'dob', label: 'DOB', render: r => dateOnly(r.dob) }
];

const doctorCols = [
  { key: 'doctor_id', label: 'ID' }, { key: 'doctor_name', label: 'Doctor', render: r => `Dr. ${r.doctor_name}` }, 
  { key: 'doctor_phone', label: 'Phone' }, { key: 'doctor_email', label: 'Email' }, 
  { key: 'consultation_fee', label: 'Fee', render: r => money(r.consultation_fee) }
];
const staffCols = [
  { key: 'staff_id', label: 'ID' }, { key: 'staff_name', label: 'Staff' }, { key: 'role', label: 'Role' }, 
  { key: 'staff_phone', label: 'Phone' }, { key: 'staff_email', label: 'Email' }, 
  { key: 'staff_salary', label: 'Salary', render: r => money(r.staff_salary) }
];
const appointmentCols = [
  { key: 'appointment_id', label: 'ID' }, { key: 'patient_name', label: 'Patient' }, 
  { key: 'doctor_name', label: 'Doctor', render: r => r.doctor_name ? `Dr. ${r.doctor_name}` : '—' }, 
  { key: 'appointment_date', label: 'Date', render: r => dateOnly(r.appointment_date) }, 
  { key: 'room_no', label: 'Room' }, 
  { key: 'start_time', label: 'Time', render: r => r.start_time ? `${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}` : '—' }, 
  { key: 'status', label: 'Status', render: r => <Status value={r.status} /> }
];
const recordCols = [
  { key: 'record_id', label: 'ID' }, { key: 'patient_name', label: 'Patient' }, 
  { key: 'diagnosis', label: 'Diagnosis' }, { key: 'treatment', label: 'Treatment' }, 
  { key: 'admission_date', label: 'Admission', render: r => dateOnly(r.admission_date) }
];
const prescriptionBaseCols = [
  { key: 'prescription_id', label: 'ID' }, { key: 'patient_name', label: 'Patient' }, 
  { key: 'date', label: 'Date', render: r => dateOnly(r.date) }, 
  { key: 'diagnosis', label: 'Diagnosis' }, { key: 'advice', label: 'Advice' }
];
const prescriptionCols = [
  { key: 'prescription_date', label: 'Date', render: r => dateOnly(r.prescription_date) }, 
  { key: 'medicine_name', label: 'Medicine' }, { key: 'generic_name', label: 'Generic' }, 
  { key: 'dosage', label: 'Dosage' }, { key: 'frequency', label: 'Frequency' }, { key: 'duration', label: 'Duration' }
];
const patientBillCols = [
  { key: 'bill_id', label: 'Bill' }, { key: 'ambulance_booking_id', label: 'Service', render: r => r.ambulance_booking_id ? 'Ambulance' : 'Hospital' }, { key: 'total_amount', label: 'Amount', render: r => money(r.total_amount) }, 
  { key: 'payment_method', label: 'Method' }, { key: 'payment_status', label: 'Status', render: r => <Status value={r.payment_status} /> }, 
  { key: 'payment_date', label: 'Paid on', render: r => dateOnly(r.payment_date) }
];
const billCols = [
  { key: 'bill_id', label: 'Bill' }, { key: 'ambulance_booking_id', label: 'Service', render: r => r.ambulance_booking_id ? 'Ambulance' : 'Consultation' }, { key: 'patient_name', label: 'Patient' }, { key: 'doctor_name', label: 'Doctor' }, 
  { key: 'appointment_date', label: 'Visit', render: r => dateOnly(r.appointment_date) }, 
  { key: 'total_amount', label: 'Amount', render: r => money(r.total_amount) }, 
  { key: 'payment_status', label: 'Status', render: r => <Status value={r.payment_status} /> }
];
const ambulanceBookingCols = [
  { key: 'booking_id', label: 'Booking' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'booking_date', label: 'Date', render: r => dateOnly(r.booking_date) },
  { key: 'booking_time', label: 'Time', render: r => String(r.booking_time || '').slice(0,5) },
  { key: 'pickup_location', label: 'Pickup' },
  { key: 'destination', label: 'Destination' },
  { key: 'ambulance_no', label: 'Ambulance' },
  { key: 'status', label: 'Status', render: r => <Status value={r.status} /> },
  { key: 'actual_distance_km', label: 'Actual km', render: r => r.actual_distance_km ? `${r.actual_distance_km} km` : '—' },
  { key: 'final_amount', label: 'Final bill', render: r => r.final_amount ? money(r.final_amount) : '—' }
];
const ambulanceFleetCols = [
  { key:'ambulance_id', label:'ID' }, { key:'ambulance_no', label:'Ambulance' }, { key:'ambulance_type', label:'Type' },
  { key:'status', label:'Status', render:r=><Status value={r.status} /> }, { key:'active', label:'Active', render:r=>r.active?'Yes':'No' }
];

const surgeryCols = [
  { key: 'surgery_id', label: 'ID' }, { key: 'surgery_name', label: 'Surgery' }, 
  { key: 'patient_name', label: 'Patient' }, { key: 'doctor_name', label: 'Doctor' }, 
  { key: 'surgery_date', label: 'Date', render: r => dateOnly(r.surgery_date) }, 
  { key: 'cost', label: 'Cost', render: r => money(r.cost) }, { key: 'status', label: 'Status', render: r => <Status value={r.status} /> }
];
const departmentCols = [
  { key: 'department_id', label: 'ID' }, { key: 'department_name', label: 'Department' }, { key: 'floor', label: 'Floor' }
];
const specializationCols = [
  { key: 'specialization_id', label: 'ID' }, { key: 'specialization_name', label: 'Specialization' }
];
const scheduleCols = [
  { key: 'assignment_id', label: 'ID' }, { key: 'doctor_name', label: 'Doctor' }, { key: 'room_no', label: 'Room' }, 
  { key: 'day', label: 'Day' }, { key: 'start_time', label: 'Start' }, { key: 'end_time', label: 'End' }
];
const wardCols = [
  { key: 'ward_id', label: 'ID' }, { key: 'ward_name', label: 'Ward' }, { key: 'ward_type', label: 'Type' }, 
  { key: 'floor', label: 'Floor' }, { key: 'total_bed', label: 'Beds' }, { key: 'available_bed', label: 'Available' }
];
const bedCols = [
  { key: 'bed_assignment_id', label: 'ID' }, { key: 'patient_name', label: 'Patient' }, { key: 'ward_name', label: 'Ward' }, 
  { key: 'admission_date', label: 'Admission', render: r => dateOnly(r.admission_date) }, 
  { key: 'discharge_date', label: 'Discharge', render: r => dateOnly(r.discharge_date) }, 
  { key: 'status', label: 'Status', render: r => <Status value={r.status} /> }
];
const roomCols = [
  { key: 'room_id', label: 'ID' }, { key: 'room_no', label: 'Room' }, { key: 'room_type', label: 'Type' }, { key: 'floor', label: 'Floor' }
];
const timeSlotCols = [
  { key: 'slot_id', label: 'ID' }, { key: 'day', label: 'Day' }, { key: 'start_time', label: 'Start' }, { key: 'end_time', label: 'End' }
];
const medicineCols = [
  { key: 'medicine_id', label: 'ID' }, { key: 'medicine_name', label: 'Medicine' }, { key: 'generic_name', label: 'Generic' }, 
  { key: 'unit_price', label: 'Price', render: r => money(r.unit_price) }, 
  { key: 'stock_quantity', label: 'Stock' }, { key: 'reorder_level', label: 'Reorder' }
];
const labTestCols = [
  { key: 'test_id', label: 'ID' }, { key: 'test_name', label: 'Test' }, 
  { key: 'cost', label: 'Cost', render: r => money(r.cost) }, { key: 'description', label: 'Description' }, 
  { key: 'manufactured_by', label: 'Manufacturer' }
];
const labRequestCols = [
  { key: 'request_id', label: 'ID' }, { key: 'request_date', label: 'Requested', render: r => dateOnly(r.request_date) },
  { key: 'patient_name', label: 'Patient' }, { key: 'test_name', label: 'Test' }, { key: 'staff_name', label: 'Staff' },
  { key: 'scheduled_date', label: 'Scheduled', render: r => r.scheduled_date ? `${dateOnly(r.scheduled_date)}${r.scheduled_time ? ` · ${String(r.scheduled_time).slice(0,5)}` : ''}` : 'Not scheduled' },
  { key: 'status', label: 'Status', render: r => <Status value={r.status} /> }, { key: 'result', label: 'Result' }
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CREATEABLE_STAFF_ROLES = [
  'General Staff', 'Front Desk Staff', 'Admission Staff', 'Billing Staff',
  'Lab Staff', 'Pharmacy Staff', 'Ambulance Staff', 'Reception Staff', 'Nursing Staff', 'Support Staff'
];
const canManageStaffAccounts = session => session?.role === 'staff' && STAFF_MANAGER_ROLES.includes(String(session?.user?.role || '').trim().toLowerCase());

const ADMIN_CONFIG = {
  patients: { title: 'Patients', endpoint: '/patients', columns: patientCols, form: [['patient_name', 'Full name'], ['patient_gender', 'Gender', 'gender'], ['dob', 'Date of birth', 'date'], ['patient_phone', 'Phone'], ['address', 'Address'], ['blood_group', 'Blood group'], ['patient_password', 'Password', 'password']] },
  doctors: { title: 'Doctors', endpoint: '/doctors', columns: doctorCols, form: [['doctor_name', 'Name'], ['doctor_gender', 'Gender', 'gender'], ['doctor_phone', 'Phone'], ['doctor_email', 'Email'], ['doctor_password', 'Password', 'password'], ['doctor_salary', 'Salary', 'number'], ['consultation_fee', 'Consultation fee', 'number'], ['department_id', 'Department', 'select', '/departments', 'department_id', 'department_name'], ['specialization_id', 'Specialization', 'select', '/specializations', 'specialization_id', 'specialization_name']] },
  staff: { title: 'Staff', endpoint: '/admin-data/staff', columns: staffCols, form: [['staff_name', 'Name'], ['staff_password', 'Password', 'password'], ['role', 'Role'], ['staff_phone', 'Phone'], ['staff_email', 'Email'], ['staff_salary', 'Salary', 'number']] },
  appointments: { title: 'Appointments', endpoint: '/appointments', columns: appointmentCols, form: [['appointment_date', 'Date', 'date'], ['status', 'Status'], ['patient_id', 'Patient', 'select', '/patients', 'patient_id', 'patient_name'], ['assignment_id', 'Doctor / room / slot', 'select', '/doctor-room-slots', 'assignment_id', 'scheduleLabel']] },
  departments: { title: 'Departments', endpoint: '/admin-data/departments', columns: departmentCols, form: [['department_name', 'Department name'], ['floor', 'Floor', 'number']] },
  specializations: { title: 'Specializations', endpoint: '/admin-data/specializations', columns: specializationCols, form: [['specialization_name', 'Specialization name']] },
  schedules: { title: 'Doctor schedules', endpoint: '/doctor-room-slots', columns: scheduleCols, form: [['doctor_id', 'Doctor', 'select', '/doctors', 'doctor_id', 'doctor_name'], ['room_id', 'Room', 'select', '/rooms', 'room_id', 'room_no'], ['slot_id', 'Time slot', 'select', '/time-slots', 'slot_id', 'slotLabel']] },
  //wards: { title: 'Wards', endpoint: '/admin-data/wards', columns: wardCols, form: [['ward_name', 'Ward name'], ['ward_type', 'Ward type'], ['floor', 'Floor', 'number'], ['total_bed', 'Total beds', 'number'], ['available_bed', 'Available beds', 'number'], ['discharge_date', 'Discharge date', 'date']] },
  wards:{
  title:'Wards',
  endpoint:'/admin-data/wards',
  columns:wardCols,
  form:[
    ['ward_name','Ward name'],
    ['ward_type','Ward type'],
    ['floor','Floor','number'],
    ['total_bed','Total beds','number'],
    ['available_bed','Available beds','number'],
    ['department_id','Department','select','/departments','department_id','department_name'] 
  ]
},

  beds: { title: 'Bed assignments', endpoint: '/admin-data/bed-assignments', columns: bedCols, form: [['patient_id', 'Patient', 'select', '/patients', 'patient_id', 'patient_name'], ['ward_id', 'Ward', 'select', '/wards', 'ward_id', 'ward_name'], ['admission_date', 'Admission date', 'date'], ['discharge_date', 'Discharge date', 'date'], ['status', 'Status']] },
  rooms: { title: 'Rooms', endpoint: '/admin-data/rooms', columns: roomCols, form: [['room_no', 'Room no'], ['room_type', 'Room type'], ['floor', 'Floor', 'number']] },
  'time-slots': { title: 'Time slots', endpoint: '/admin-data/time-slots', columns: timeSlotCols, form: [['day', 'Day'], ['start_time', 'Start time', 'time'], ['end_time', 'End time', 'time']] },
  medicines: { title: 'Medicines', endpoint: '/admin-data/medicines', columns: medicineCols, form: [['medicine_name', 'Medicine name'], ['generic_name', 'Generic name'], ['unit_price', 'Unit price', 'number'], ['stock_quantity', 'Stock quantity', 'number'], ['reorder_level', 'Reorder level', 'number']] },
  'lab-tests': { title: 'Lab tests', endpoint: '/lab-tests', columns: labTestCols, form: [['test_name', 'Test name'], ['cost', 'Cost', 'number'], ['description', 'Description'], ['manufactured_by', 'Manufactured by']] },
  lab: { title: 'Laboratory requests', endpoint: '/lab-requests', columns: labRequestCols, form: [['request_date', 'Request date', 'date'], ['status', 'Status'], ['staff_id', 'Staff', 'select', '/admin-data/staff', 'staff_id', 'staff_name'], ['scheduled_date', 'Scheduled date', 'date'], ['scheduled_time', 'Scheduled time', 'time'], ['result', 'Result'], ['test_id', 'Lab test', 'select', '/lab-tests', 'test_id', 'test_name']] },
  records: { title: 'Medical records', endpoint: '/medical-records', columns: recordCols, form: [['diagnosis', 'Diagnosis'], ['treatment', 'Treatment'], ['admission_date', 'Admission date', 'date'], ['patient_id', 'Patient', 'select', '/patients', 'patient_id', 'patient_name']] },
  prescriptions: { title: 'Prescriptions', endpoint: '/prescriptions', columns: prescriptionBaseCols, form: [['date', 'Date', 'date'], ['advice', 'Advice'], ['record_id', 'Medical record', 'select', '/medical-records', 'record_id', 'recordLabel']] },
  surgeries: { title: 'Surgeries', endpoint: '/surgeries', columns: surgeryCols, form: [['surgery_name', 'Surgery name'], ['surgery_type', 'Surgery type'], ['status', 'Status'], ['cost', 'Cost', 'number'], ['surgery_date', 'Surgery date', 'date'], ['patient_id', 'Patient', 'select', '/patients', 'patient_id', 'patient_name'], ['doctor_id', 'Doctor', 'select', '/doctors', 'doctor_id', 'doctor_name']] },
  bills: { title: 'Billing', endpoint: '/bills', columns: billCols, form: [['total_amount', 'Total amount', 'number'], ['payment_method', 'Payment method'], ['payment_status', 'Payment status'], ['payment_date', 'Payment date', 'date'], ['appointment_id', 'Appointment', 'select', '/appointments', 'appointment_id', 'appointmentLabel']] }
};

function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [portal, setPortal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [publicPage, setPublicPage] = useState('home');
  const [view, setView] = useState('overview');

  useEffect(() => {
    api.get('/me').then(setSession).catch(() => setSession(null)).finally(() => setCheckingSession(false));
  }, []);

  const login = data => { setSession(data); setPortal(false); setView('overview'); };
  const logout = async () => {
    try { await api.post('/logout', {}); } catch (_) {}
    setSession(null); setPortal(false); setPublicPage('home'); setView('overview');
  };

  if (checkingSession) return <div className="auth-loading">Loading HEALIX…</div>;
  if (session) return <DashboardShell session={session} view={view} setView={setView} logout={logout} />;
  if (portal) return <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={login} onBack={() => setPortal(false)} />;
  return <PublicSite page={publicPage} setPage={setPublicPage} openPortal={(mode = 'signin') => { setAuthMode(mode); setPortal(true) }} />;
}

function PublicSite({ page, setPage, openPortal }) {
  const doctors = useFetch('/doctors').data || [];
  const departments = useFetch('/departments').data || [];
  const labTests = useFetch('/lab-tests').data || [];
  const specializations = useFetch('/admin-data/specializations').data || [];
  const facilityStats = useFetch('/facility-stats').data || {};
  const [search, setSearch] = useState('');
  const filtered = doctors.filter(d => `${d.doctor_name} ${d.doctor_email || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="public-site">
      <header className="public-nav">
        <Brand onClick={() => setPage('home')} />
        <nav>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Home</button>
          <button className={page === 'doctors' ? 'active' : ''} onClick={() => setPage('doctors')}>Find a Doctor</button>
          <button className={page === 'departments' ? 'active' : ''} onClick={() => setPage('departments')}>Departments</button>
          <button className={page === 'services' ? 'active' : ''} onClick={() => setPage('services')}>Patient Care</button>
          <button className={page==='labtests'?'active':''} onClick={()=>setPage('labtests')}>Lab Tests</button>
        </nav>
        <div className="nav-actions">
          <button className="text-btn" onClick={() => openPortal('signin')}>Sign in</button>
          <button className="primary-btn small" onClick={() => openPortal('signup')}>Create Patient Account</button>
        </div>
      </header>
      
      {page === 'home' && <>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">HEALIX HOSPITAL MANAGEMENT SYSTEM</span>
            <h1>Care that is <span>connected</span>, clear and convenient.</h1>
            <p>Find doctors, explore hospital departments and manage appointments, records, prescriptions and billing from one place.</p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => openPortal('signup')}>Create patient account →</button>
              <button className="outline-btn" onClick={() => setPage('doctors')}>Find a doctor</button>
            </div>
            <div className="trust-row">
              <span>✓ Secure portal</span><span>✓ Connected hospital records</span><span>✓ Easy scheduling</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-top"><span>HEALIX</span><b>Care overview</b></div>
            <div className="hero-metrics">
              <div><strong>{doctors.length}</strong><span>Doctors</span></div>
              <div><strong>{departments.length}</strong><span>Departments</span></div>
            </div>
            <div className="hero-lines"><i /><i /><i /><i /></div>
            <div className="hero-note"><span>✓</span><div><b>Everything connected</b><small>Appointments · Records · Billing</small></div></div>
          </div>
        </section>
        
        <section className="public-section">
          <div className="section-intro">
            <div><span className="eyebrow">PATIENT SERVICES</span><h2>Important things, without the runaround.</h2></div>
            <p>Use the portal for the parts of your hospital journey that belong to you.</p>
          </div>
          <div className="service-grid">
            <Service icon="◷" title="Appointments" text="Request and review visits with available doctors." onClick={() => openPortal('signin')} />
            <Service icon="▣" title="Medical records" text="Review diagnoses, treatments and admission history." onClick={() => openPortal('signin')} />
            <Service icon="✚" title="Prescriptions" text="See prescribed medicines, dosage and advice." onClick={() => openPortal('signin')} />
            <Service icon="৳" title="Billing" text="Review charges, payment method and payment status." onClick={() => openPortal('signin')} />
          </div>
        </section>
        <AboutHospital doctorsCount={doctors.length} facilityStats={facilityStats} />
        <EmergencyHelpline />
        <FAQSection />
        <ProjectCredits />
      </>}
      
      {page==='doctors' && <PublicDoctors doctors={filtered} departments={departments} specializations={specializations} search={search} setSearch={setSearch} openPortal={openPortal}/>}
      {page === 'departments' && <PublicDepartments departments={departments} />}
      {page === 'services' && <PublicServices openPortal={openPortal} />}
      {page==='labtests' && <PublicLabTests labTests={labTests} />}

      <footer className="public-footer">
        <Brand /><span>HEALIX · Hospital Management System</span>
        <button onClick={() => setPage('home')}>Back to top ↑</button>
      </footer>
    </div>
  );
}

function PublicDoctors({ doctors, departments, specializations, search, setSearch, openPortal }) {
  return (
    <section className="public-section page-public">
      <span className="eyebrow">FIND A DOCTOR</span>
      <h1>Meet the HEALIX care team.</h1>
      <p className="lead">Search the doctors already stored in your hospital database.</p>
      
      <div className="public-search">
        ⌕<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by doctor name…" />
      </div>
      
      <div className="doctor-grid">
        {doctors.map(d => {
          const deptName = departments?.find(dep => dep.department_id === d.department_id)?.department_name || `Department #${empty(d.department_id)}`;
          const specName = specializations?.find(s => s.specialization_id === d.specialization_id)?.specialization_name || `Specialization #${empty(d.specialization_id)}`;
          
          return (
            <div className="doctor-card" key={d.doctor_id}>
              <div className="doctor-avatar">{initials(d.doctor_name)}</div>
              <div className="doctor-info">
                <h3>Dr. {d.doctor_name}</h3>
                <span>{deptName} · {specName}</span>
                <small>{d.doctor_email || d.doctor_phone || 'HEALIX medical team'}</small>
              </div>
              <button className="outline-btn" onClick={() => openPortal('signin')}>Book</button>
            </div>
          );
        })}
        {!doctors.length && <Empty text="No doctor found" />}
      </div>
    </section>
  );
}

function PublicDepartments({ departments }) {
  return (
    <section className="public-section page-public">
      <span className="eyebrow">DEPARTMENTS</span>
      <h1>Hospital departments and services.</h1>
      <p className="lead">Department information is loaded from the <b>department</b> table.</p>
      <div className="department-grid">
        {departments.map(d => (
          <div className="department-card" key={d.department_id}>
            <span>✚</span>
            <div>
              <h3>{d.department_name}</h3>
              <p>Floor {empty(d.floor)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicServices({ openPortal }) {
  return (
    <section className="public-section page-public">
      <span className="eyebrow">PATIENT CARE</span>
      <h1>Your hospital journey, organized.</h1>
      <div className="care-list">
        <Care title="Before your visit" text="Find a doctor and request an appointment from the patient portal." action="Book an appointment" onClick={() => openPortal('signin')} />
        <Care title="During your care" text="Your medical records, prescriptions and surgery history are linked to your patient account." action="Open patient portal" onClick={() => openPortal('signin')} />
        <Care title="After your visit" text="Review bills and payment status without losing track of your appointment." action="View billing" onClick={() => openPortal('signin')} />
      </div>
    </section>
  );
}

function Service({ icon, title, text, onClick }) {
  return (
    <button className="service-card" onClick={onClick}>
      <span>{icon}</span><h3>{title}</h3><p>{text}</p><b>Open →</b>
    </button>
  );
}

function Care({ title, text, action, onClick }) {
  return (
    <div className="care-row">
      <div>
        <span className="eyebrow">HEALIX CARE</span>
        <h3>{title}</h3><p>{text}</p>
      </div>
      <button className="outline-btn" onClick={onClick}>{action} →</button>
    </div>
  );
}

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick}>
      <span className="brand-mark">+</span>
      <span><b>HEALIX</b><small>Hospital Management</small></span>
    </button>
  );
}

function AuthScreen({ mode, setMode, onLogin, onBack }) {
  return (
    <div className="auth-page">
      <div className="auth-side">
        <Brand />
        <span className="eyebrow">CONNECTED HOSPITAL CARE</span>
        <h1>{mode === 'signin' ? 'Welcome back.' : 'Start your patient journey.'}</h1>
        <p>One portal for appointments, medical records, prescriptions, surgeries and billing.</p>
        <div className="auth-points">
          <span>✓ Patient access</span><span>✓ Doctor access</span><span>✓ Staff access</span><span>✓ Admin access</span>
        </div>
      </div>
      <div className="auth-card">
        <button className="back-link" onClick={onBack}>← Back to website</button>
        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
        </div>
        {mode === 'signin' ? <SignIn onLogin={onLogin} onCreate={() => setMode('signup')} /> : <PatientSignup onLogin={onLogin} />}
      </div>
    </div>
  );
}

function SignIn({ onLogin, onCreate }) {
  const [role, setRole] = useState('patient');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const roleLabels = { patient: 'Patient', doctor: 'Doctor', staff: 'Staff', admin: 'Admin' };

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError(`Enter your ${role === 'admin' ? 'admin username' : 'phone number'} and password.`);
    setBusy(true);
    try {
      // The selected role is a UI convenience only. It is deliberately NOT sent to
      // the server; the backend verifies credentials and resolves the real role
      // from the database. This preserves the separate role-login experience
      // without trusting client-supplied authorization data.
      onLogin(await api.post('/login', { username: username.trim(), password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className="eyebrow">SECURE ACCESS</span>
      <h2>Sign in to HEALIX</h2>
      <p className="auth-sub">Select your account type, then enter the credentials issued for that role. HEALIX verifies the credentials and resolves the actual role from the database.</p>
      <div className="role-switch" aria-label="Account type">
        {Object.entries(roleLabels).map(([value, label]) => (
          <button type="button" className={role === value ? 'active' : ''} onClick={() => { setRole(value); setError(''); setUsername(''); }} key={value}>
            {label}
          </button>
        ))}
      </div>
      <form className="form-stack" onSubmit={submit}>
        <Field
          label={role === 'admin' ? 'Admin username' : `${roleLabels[role]} phone number`}
          value={username}
          setValue={setUsername}
          placeholder={role === 'admin' ? 'e.g. admin1' : 'e.g. 017XXXXXXXX'}
        />
        <Field label="Password" type="password" value={password} setValue={setPassword} placeholder={`Enter ${roleLabels[role].toLowerCase()} password`} />
        {error && <div className="error-box">{error}</div>}
        <button className="primary-btn full" disabled={busy}>{busy ? 'Signing in…' : `Sign in as ${roleLabels[role]} →`}</button>
      </form>
      <div className="account-note">
        New patient? Use <button type="button" onClick={onCreate}>Create account</button>. Doctor, staff and admin accounts are hospital-managed.
      </div>
    </>
  );
}

function PatientSignup({ onLogin }) {
  const initial = { patient_name: '', patient_gender: '', dob: '', patient_phone: '', address: '', blood_group: '', patient_password: '' };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (k, v) => setForm({ ...form, [k]: v });

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.patient_name || !form.patient_phone || !form.patient_password) return setError('Name, phone number and password are required.');
    setBusy(true);
    try {
      onLogin(await api.post('/register/patient', form));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className="eyebrow">PATIENT REGISTRATION</span>
      <h2>Create your patient account</h2>
      <p className="auth-sub">Public self-registration is intentionally available only for patients. Staff create clinical accounts.</p>
      <form className="form-stack two-fields" onSubmit={submit}>
        <Field label="Full name" value={form.patient_name} setValue={v => change('patient_name', v)} />
        <Field label="Phone number" value={form.patient_phone} setValue={v => change('patient_phone', v)} />
        <SelectField label="Gender" value={form.patient_gender} setValue={v => change('patient_gender', v)} options={GENDER_OPTIONS} placeholder="Select gender" />
        <Field label="Date of birth" type="date" value={form.dob} setValue={v => change('dob', v)} />
        <Field label="Blood group" value={form.blood_group} setValue={v => change('blood_group', v)} placeholder="A+ / O+ …" />
        <Field label="Address" value={form.address} setValue={v => change('address', v)} />
        <Field label="Password" type="password" value={form.patient_password} setValue={v => change('patient_password', v)} />
        <div />
        {error && <div className="error-box span-two">{error}</div>}
        <button className="primary-btn full span-two" disabled={busy}>{busy ? 'Creating…' : 'Create patient account →'}</button>
      </form>
    </>
  );
}

function Field({ label, value, setValue, type = 'text', placeholder = '' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} onChange={e => setValue(e.target.value)} placeholder={placeholder} /></label>;
}
function SelectField({ label, value, setValue, options, placeholder }) {
  return <label className="field"><span>{label}</span><select value={value ?? ''} onChange={e => setValue(e.target.value)}><option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;
}

function DashboardShell({ session, view, setView, logout }) {
  const [mobile, setMobile] = useState(false);
  const nav = session.role === 'staff'
    ? getStaffNav(session)
    : (ROLE_NAV[session.role] || ROLE_NAV.patient);
  const user = session.user || {};
  const name = user.patient_name || user.doctor_name || user.staff_name || user.admin_name || 'User';

  return (
    <div className="dashboard">
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="side-head">
          <Brand onClick={() => setView('overview')} />
        </div>
        <span className="side-caption">{session.role.toUpperCase()} WORKSPACE</span>
        <nav>
          {nav.map(([id, icon, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setMobile(false) }}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="side-help">
            <b>HEALIX</b><span>Connected hospital care</span>
          </div>
          <button className="logout" onClick={logout}>↪ Sign out</button>
        </div>
      </aside>
      {mobile && <div className="mobile-cover" onClick={() => setMobile(false)} />}
      <main className="dash-main">
        <header className="dash-top">
          <button className="hamburger" onClick={() => setMobile(true)}>☰</button>
          <div className="dash-search">⌕ <input placeholder="Search this workspace…" /></div>
          <div className="user-chip">
            <span>{initials(name)}</span>
            <div><b>{name}</b><small>{session.role}</small></div>
          </div>
        </header>
        <div className="dash-content">
          <PageTitle session={session} view={view} setView={setView} />
          <ViewRouter session={session} view={view} setView={setView} />
        </div>
      </main>
    </div>
  );
}

function PageTitle({ session, view, setView }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">HEALIX / {session.role.toUpperCase()}</span>
        <h1>{LABELS[view] || 'Dashboard'}</h1>
        <p>{view === 'overview' ? 'A connected view of what needs attention today.' : `View and manage ${LABELS[view]?.toLowerCase() || 'hospital information'}.`}</p>
      </div>
      {session.role === 'patient' && view === 'overview' && (
        <button className="primary-btn" onClick={() => setView('appointments')}>
          + Book appointment
        </button>
      )}
    </div>
  );
}

function ViewRouter({ session, view, setView }) {
  if (session.role === 'patient') return <PatientViews session={session} view={view} setView={setView} />;
  if (session.role === 'doctor') return <DoctorViews session={session} view={view} />;
  if (session.role === 'staff') return <StaffViews session={session} view={view} />;
  return <AdminViews session={session} view={view} />;
}

function PatientViews({ session, view, setView }) {
  const id = session.user.patient_id;
  switch (view) {
    case 'appointments': return <PatientAppointments id={id} />;
    case 'records': return <ScopedTable title="My medical records" endpoint={`/patients/${id}/medical-records`} columns={recordCols} />;
    case 'prescriptions': return <ScopedTable title="My prescriptions" endpoint={`/patients/${id}/prescriptions/details`} columns={prescriptionCols} />;
    case 'bills': return <PatientBills patientId={id} />;
    case 'ambulance-bookings': return <PatientAmbulance patientId={id} />;
    case 'lab': return <PatientLabRequests patientId={id} />;
    case 'surgeries': return <ScopedTable title="My surgeries" endpoint={`/patients/${id}/surgeries`} columns={surgeryCols} />;
    case 'profile': return <ProfilePage session={session} />;
    default: return <PatientOverview session={session} setView={setView} />;
  }
}


function PatientBills({ patientId }) {
  const [refresh, setRefresh] = useState(0);
  const state = useFetch(`/patients/${patientId}/bills`, true, refresh);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const pay = async (payment = {}) => {
    if (!selected) return;
    setBusy(true); setMsg('');
    try {
      const result = await api.post(`/bills/${selected.bill_id}/pay`, { sandbox: true, method: 'bkash', reference: payment.reference, bkash_number: payment.number });
      setMsg(result.message || 'bKash payment successful.');
      setSelected(null);
      setRefresh(x => x + 1);
    } catch (e) {
      setMsg(e.message || 'bKash payment failed.');
    } finally { setBusy(false); }
  };

  return <div className="stack">
    <Section title="My bills" subtitle="Review your charges and pay your outstanding bills with bKash." action={<span className="record-count">{state.data?.length || 0} records</span>}>
      {msg && <div className={msg.toLowerCase().includes('successful') ? 'success-box' : 'error-box'} style={{marginBottom:'14px'}}>{msg}</div>}
      <DataState state={state} render={rows => <Table rows={rows} columns={patientBillCols} actions={r => {
        const unpaid = !['Paid', 'Completed'].includes(String(r.payment_status));
        return unpaid ? <button className="primary-btn small" onClick={() => setSelected(r)}>Pay now</button> : <span className="paid-note">Paid</span>;
      }} />} />
    </Section>
    {selected && <SandboxPaymentModal row={selected} busy={busy} onClose={() => !busy && setSelected(null)} onPay={pay} />}
  </div>;
}

function SandboxPaymentModal({ row, busy, onClose, onPay }) {
  const [form, setForm] = useState({ number: '', reference: '' });
  const valid = /^01[3-9]\d{8}$/.test(form.number) && form.reference.trim().length >= 4;
  return <Modal title={`bKash Payment · Bill #${row.bill_id}`}>
    <form className="modal-form" onSubmit={e => { e.preventDefault(); if (valid) onPay(form); }}>
            <div className="info" style={{marginBottom:'15px'}}><span>Patient · Amount</span><b>{row.patient_name || 'My bill'} · {money(row.total_amount)}</b></div>
      <div className="modal-grid">
        <Field label="bKash number" value={form.number} setValue={v => setForm({...form, number:v.replace(/\D/g,'').slice(0,11)})} placeholder="01XXXXXXXXX" />
        <Field label="Reference" value={form.reference} setValue={v => setForm({...form, reference:v.slice(0,20)})} placeholder="HEALIX1234" />
      </div>
      <div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-btn bkash-pay-btn" disabled={!valid || busy}>{busy ? 'Processing…' : `Pay ${money(row.total_amount)} with bKash`}</button></div>
    </form>
  </Modal>;
}
function PatientOverview({ session, setView }) {
  const id = session.user.patient_id;
  const a = useFetch(`/patients/${id}/appointments`).data || [];
  const r = useFetch(`/patients/${id}/medical-records`).data || [];
  const b = useFetch(`/patients/${id}/bills`).data || [];

  return (
    <>
      <Banner title={`Hello, ${session.user.patient_name?.split(' ')[0] || 'there'}`} text="Your appointments, records and billing are connected to your patient account." tag="PATIENT PORTAL" />
      <div className="stats-grid">
        <Stat icon="◷" label="Appointments" value={a.length} />
        <Stat icon="▣" label="Medical records" value={r.length} />
        <Stat icon="৳" label="Bills" value={b.length} />
      </div>
      <div className="quick-grid">
        <Quick icon="◷" title="Appointments" text="Book or review visits" onClick={() => setView('appointments')} />
        <Quick icon="▣" title="Medical records" text="Review your history" onClick={() => setView('records')} />
        <Quick icon="✚" title="Prescriptions" text="Medicines and advice" onClick={() => setView('prescriptions')} />
        <Quick icon="⌁" title="Lab tests" text="Request a diagnostic test" onClick={() => setView('lab')} />
        <Quick icon="৳" title="Billing" text="Payment status" onClick={() => setView('bills')} />
      </div>
    </>
  );
}

function PatientAppointments({ id }) {
  return (
    <div className="stack">
      <AppointmentBooking patientId={id} />
      <ScopedTable title="My appointments" endpoint={`/patients/${id}/appointments`} columns={appointmentCols} />
    </div>
  );
}

function PatientAmbulance({ patientId }) {
  const [refresh,setRefresh]=useState(0); const fleet=useFetch('/ambulances'); const state=useFetch(`/patients/${patientId}/ambulance-bookings`,true,refresh);
  const [form,setForm]=useState({booking_date:'',booking_time:'',pickup_location:'',destination:'',notes:''}); const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false);
  const available=Number(fleet.data?.available||0); const rate=Number(fleet.data?.rate_per_km||50);
  const submit=async e=>{e.preventDefault();setBusy(true);setMsg('');try{await api.post(`/patients/${patientId}/ambulance-bookings`,form);setMsg('Ambulance request submitted. Staff will review and approve it.');setForm({booking_date:'',booking_time:'',pickup_location:'',destination:'',notes:''});setRefresh(x=>x+1);}catch(e){setMsg(e.message)}finally{setBusy(false)}};
  return <div className="stack">
    <Section title="Ambulance booking" subtitle="Request an ambulance for your required date and time. Actual distance is recorded by ambulance staff after the service.">
      <div className="info" style={{marginBottom:'15px'}}><span>Ambulances available · Rate</span><b>{available} available · {money(rate)} / km</b></div>
      {available===0 && <div className="error-box">No ambulance is currently available, so a new request cannot be submitted.</div>}
      <form className="form-stack two-fields" onSubmit={submit}>
        <Field label="Required date" type="date" value={form.booking_date} setValue={v=>setForm({...form,booking_date:v})}/><Field label="Required time" type="time" value={form.booking_time} setValue={v=>setForm({...form,booking_time:v})}/>
        <Field label="Pickup location" value={form.pickup_location} setValue={v=>setForm({...form,pickup_location:v})}/><Field label="Destination" value={form.destination} setValue={v=>setForm({...form,destination:v})}/>
        <Field label="Note (optional)" value={form.notes} setValue={v=>setForm({...form,notes:v})}/><div />
        {msg&&<div className={msg.toLowerCase().includes('submitted')?'success-box':'error-box'}>{msg}</div>}
        <button className="primary-btn full span-two" disabled={busy||available===0}>{busy?'Sending…':'Request ambulance →'}</button>
      </form>
      <div className="bkash-demo-box" style={{marginTop:'15px'}}><strong>Fare rule</strong><span>Current ambulance rate: {money(rate)} per km. The final bill is calculated from the actual total distance entered by ambulance staff after the service.</span></div>
    </Section>
    <Section title="My ambulance bookings"><DataState state={state} render={rows=><Table rows={rows} columns={ambulanceBookingCols} actions={r=><span>{r.bill_id ? `${money(r.billed_amount)} · ${r.payment_status}` : '—'}</span>} />} /></Section>
  </div>;
}

function AmbulanceStaffBookings() {
  const [refresh,setRefresh]=useState(0); const state=useFetch('/ambulance-bookings',true,refresh); const [editing,setEditing]=useState(null); const [error,setError]=useState('');
  const update=async payload=>{try{await api.put(`/ambulance-bookings/${editing.booking_id}`,payload);setEditing(null);setRefresh(x=>x+1)}catch(e){setError(e.message)}};
  return <><Section title="Ambulance booking requests" subtitle="Approve/reject requests, mark trips in service, and enter actual distance after service."><DataState state={state} render={rows=><Table rows={rows} columns={ambulanceBookingCols} actions={r=><button onClick={()=>{setEditing(r);setError('')}}>{['COMPLETED','REJECTED','CANCELLED'].includes(String(r.status).toUpperCase())?'View / update':'Process'}</button>} />} /></Section>{editing&&<AmbulanceBookingModal row={editing} error={error} onClose={()=>setEditing(null)} onSave={update}/>}</>;
}
function AmbulanceBookingModal({row,error,onClose,onSave}) {
  const fleet=useFetch('/ambulances').data?.ambulances||[];
  const [form,setForm]=useState({status:row.status,ambulance_id:row.ambulance_id||'',actual_distance_km:row.actual_distance_km||''});
  const status=String(form.status).toUpperCase();
  const finalAmount=form.actual_distance_km ? Number(form.actual_distance_km)*Number(row.rate_per_km||50) : 0;
  return <Modal title={`Ambulance booking #${row.booking_id}`}><form className="modal-form" onSubmit={async e=>{e.preventDefault();await onSave({...form,ambulance_id:form.ambulance_id?Number(form.ambulance_id):undefined,actual_distance_km:form.actual_distance_km?Number(form.actual_distance_km):undefined})}}>
    <div className="info" style={{marginBottom:'15px'}}><span>Patient · Requested</span><b>{row.patient_name} · {dateOnly(row.booking_date)} · {String(row.booking_time||'').slice(0,5)}</b></div>
    <div className="info" style={{marginBottom:'15px'}}><span>Route</span><b>{row.pickup_location} → {row.destination}</b></div>
    <div className="modal-grid">
      <label className="field"><span>Status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['PENDING','APPROVED','REJECTED','CANCELLED','IN_SERVICE','COMPLETED'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="field"><span>Assign ambulance</span><select value={form.ambulance_id} onChange={e=>setForm({...form,ambulance_id:e.target.value})}><option value="">Select ambulance</option>{fleet.filter(a=>a.active && ['AVAILABLE','RESERVED'].includes(a.status) || Number(a.ambulance_id)===Number(row.ambulance_id)).map(a=><option key={a.ambulance_id} value={a.ambulance_id}>{a.ambulance_no} · {a.ambulance_type} · {a.status}</option>)}</select></label>
      <Field label="Actual total distance (km)" type="number" value={form.actual_distance_km} setValue={v=>setForm({...form,actual_distance_km:v})}/>
    </div>
    {status==='COMPLETED'&&<div className="bkash-demo-box"><strong>Final bill</strong><span>{form.actual_distance_km ? `${money(finalAmount)} = ${form.actual_distance_km} km × ${money(row.rate_per_km||50)}/km` : 'Enter actual total distance after service.'}</span></div>}
    {error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Save</button></div>
  </form></Modal>;
}

function AmbulanceFleetManagement() {
  const [refresh,setRefresh]=useState(0); const state=useFetch('/ambulances',true,refresh); const [form,setForm]=useState({ambulance_no:'',ambulance_type:'Standard'}); const [msg,setMsg]=useState('');
  const add=async e=>{e.preventDefault();try{await api.post('/ambulances',form);setForm({ambulance_no:'',ambulance_type:'Standard'});setMsg('Ambulance added.');setRefresh(x=>x+1)}catch(e){setMsg(e.message)}};
  const toggle=async r=>{try{await api.put(`/ambulances/${r.ambulance_id}`,{active:!r.active,status:!r.active?'AVAILABLE':'INACTIVE'});setRefresh(x=>x+1)}catch(e){setMsg(e.message)}};
  const rows=state.data?.ambulances||[];
  return <div className="stack"><Section title="Ambulance fleet" subtitle="Total and available counts are tracked automatically from the ambulance fleet. Staff can add ambulances and place them in maintenance/inactive status."><div className="stats-grid"><Stat icon="🚑" label="Total ambulances" value={state.data?.total||0}/><Stat icon="✓" label="Available now" value={state.data?.available||0}/><Stat icon="৳" label="Rate per km" value={money(state.data?.rate_per_km||50)}/></div><form className="inline-form" onSubmit={add}><Field label="Ambulance number" value={form.ambulance_no} setValue={v=>setForm({...form,ambulance_no:v})}/><Field label="Type" value={form.ambulance_type} setValue={v=>setForm({...form,ambulance_type:v})}/><button className="primary-btn">+ Add ambulance</button></form>{msg&&<div className="error-box">{msg}</div>}</Section><Section title="Fleet details"><DataState state={state} render={()=> <Table rows={rows} columns={ambulanceFleetCols} actions={r=><button onClick={()=>toggle(r)}>{r.active?'Set inactive':'Set available'}</button>} />}/></Section></div>;
}

function PatientLabRequests({ patientId }) {
  const tests = useFetch('/lab-tests').data || [];
  const [refresh,setRefresh]=useState(0);
  const state = useFetch(`/patients/${patientId}/lab-requests`, true, refresh);
  const [testId, setTestId] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setMsg(''); setBusy(true);
    try { await api.post(`/patients/${patientId}/lab-requests`, { test_id: Number(testId) }); setTestId(''); setMsg('Lab test request submitted. Staff will accept and schedule it.'); setRefresh(x => x + 1); }
    catch (err) { setMsg(err.message); } finally { setBusy(false); }
  };
  return <div className="stack">
    <Section title="Request a lab test" subtitle="Choose a test. Laboratory staff will accept the request and assign a schedule.">
      <form className="inline-form" onSubmit={submit}>
        <label className="field"><span>Lab test</span><select value={testId} onChange={e => setTestId(e.target.value)} required><option value="">Select test</option>{tests.map(t => <option key={t.test_id} value={t.test_id}>{t.test_name} · {money(t.cost)}</option>)}</select></label>
        <div></div><div></div><button className="primary-btn" disabled={!testId || busy}>{busy ? 'Sending…' : 'Request test →'}</button>
      </form>
      {msg && <div className={msg.toLowerCase().includes('submitted') ? 'success-box' : 'error-box'}>{msg}</div>}
    </Section>
    <Section title="My lab requests"><DataState state={state} render={rows => <Table rows={rows} columns={labRequestCols} />} /></Section>
  </div>;
}

function AppointmentBooking({ patientId }) {
  const docs = useFetch('/doctors').data || [];
  const assignments = useFetch('/doctor-room-slots').data || [];
  const [doctor, setDoctor] = useState('');
  const [assignment, setAssignment] = useState('');
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const available = assignments.filter(a => !doctor || String(a.doctor_id) === String(doctor));
  const todayStr = new Date().toISOString().split('T')[0];

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api.post('/appointments', {
        appointment_date: date,
        status: 'Pending',
        patient_id: Number(patientId),
        assignment_id: Number(assignment)
      });
      setMsg('Appointment request submitted successfully!');
      setDate('');
      setAssignment('');
    } catch (err) {
      const backendError = err.response?.data?.message || err.message || 'Failed to create appointment';
      setMsg(backendError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Request an appointment" subtitle="Choose a doctor, an assigned room/time slot and your preferred date.">
      <form className="inline-form" onSubmit={submit}>
        <label className="field">
          <span>Doctor</span>
          <select value={doctor} onChange={e => { setDoctor(e.target.value); setAssignment(''); }}>
            <option value="">Select doctor</option>
            {docs.map(d => <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.doctor_name}</option>)}
          </select>
        </label>
        
        <label className="field">
          <span>Available schedule</span>
          <select value={assignment} onChange={e => setAssignment(e.target.value)} disabled={!doctor}>
            <option value="">Select room & time</option>
            {available.map(a => (
              <option key={a.assignment_id} value={a.assignment_id}>
                {a.day} · {String(a.start_time).slice(0, 5)}–{String(a.end_time).slice(0, 5)} · Room {a.room_no}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Date</span>
          <input 
            type="date" 
            min={todayStr} 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            onKeyDown={e => e.preventDefault()} 
            required 
          />
        </label>

        <button className="primary-btn" disabled={!assignment || !date || busy}>
          {busy ? 'Sending…' : 'Request →'}
        </button>
      </form>
      {msg && <div className={msg.includes('success') ? "success-box" : "error-box"} style={{ marginTop: '10px' }}>{msg}</div>}
    </Section>
  );
}

function DoctorViews({ session, view }) {
  const id = session.user.doctor_id;
  switch (view) {
    case 'appointments': return <DoctorAppointments doctorId={id} />;
    case 'patients': return <DoctorPatients doctorId={id} />;
    case 'records': return <ScopedTable title="My patients' medical records" endpoint="/medical-records" columns={recordCols} />;
    case 'prescriptions': return <ScopedTable title="Prescriptions" endpoint="/prescriptions" columns={prescriptionBaseCols} />;
    case 'surgeries': return <ScopedTable title="My surgeries" endpoint={`/doctors/${id}/surgeries`} columns={surgeryCols} />;
    case 'profile': return <DoctorProfile session={session} />;
    default: return <RoleOverview role="doctor" session={session} />;
  }
}

function DoctorProfile({ session }) {
  const u=session.user||{}; const [fee,setFee]=useState(u.consultation_fee ?? ''); const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false);
  const save=async e=>{e.preventDefault();setBusy(true);setMsg('');try{const r=await api.put(`/doctors/${u.doctor_id}/consultation-fee`,{consultation_fee:Number(fee)});setFee(r.doctor.consultation_fee);setMsg('Consultation fee updated. Billing staff will handle payment and all other billing.');}catch(e){setMsg(e.message)}finally{setBusy(false)}};
  return <div className="stack"><ProfilePage session={session}/><Section title="Consultation fee" subtitle="This is the only billing-related value a doctor can control. Payment status and other charges are handled by billing staff."><form className="inline-form" onSubmit={save}><Field label="Consultation fee" type="number" value={fee} setValue={setFee}/><div></div><div></div><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Update fee'}</button></form>{msg&&<div className={msg.includes('updated')?'success-box':'error-box'}>{msg}</div>}</Section></div>;
}

function DoctorAppointments({ doctorId }) {
  const [refresh,setRefresh]=useState(0); const state = useFetch(`/doctors/${doctorId}/appointments`, true, refresh); const [msg,setMsg]=useState('');
  const complete = async id => { setMsg(''); try { const result=await api.post(`/appointments/${id}/complete`,{}); setMsg(result.message); setRefresh(x=>x+1); } catch(e){setMsg(e.message)} };
  return <Section title="My appointment queue" subtitle="Complete visits after the consultation. The system checks consultation payment automatically.">{msg&&<div className={msg.toLowerCase().includes('warning')?'error-box':'success-box'}>{msg}</div>}<DataState state={state} render={rows=><Table rows={rows} columns={appointmentCols} actions={r=><div className="row-actions">{['Accepted','Scheduled'].includes(r.status) && <button onClick={()=>complete(r.appointment_id)}>Complete visit</button>}{String(r.status).toLowerCase()==='pending'&&<span>Waiting for staff</span>}</div>} />}/></Section>;
}

function DoctorPatients({ doctorId }) {
  const state = useFetch(`/doctors/${doctorId}/patients`);
  const [selected, setSelected] = useState(null);
  const history = useFetch(
    selected ? `/doctors/${doctorId}/patients/${selected.patient_id}/medical-records` : '',
    Boolean(selected)
  );

  return (
    <>
      <Section title="Patients" action={<span className="record-count">{state.data?.length || 0} records</span>}>
        <DataState
          state={state}
          render={rows => (
            <Table
              rows={rows}
              columns={doctorPatientCols}
              actions={r => (
                <div className="row-actions">
                  <button onClick={() => setSelected(r)}>View history</button>
                </div>
              )}
            />
          )}
        />
      </Section>

      {selected && (
        <Modal title={`${selected.patient_name} · Medical history`}>
          <div className="modal-form">
            <div className="info" style={{ marginBottom: '14px' }}>
              <span>Patient</span>
              <b>{selected.patient_name} · {selected.department_names || 'Department not recorded'}</b>
            </div>
            <DataState
              state={history}
              render={rows => <Table rows={rows} columns={recordCols} />}
            />
            <div className="modal-actions">
              <button className="outline-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function StaffViews({ session, view }) {
  const subtype = getStaffSubtype(session);
  const canView = id => getStaffNav(session).some(([key]) => key === id);
  if (view === 'staff-management') return canManageStaffAccounts(session) ? <StaffAccountManagement /> : <RoleOverview role="staff" session={session} />;
  if (view === 'profile') return <ProfilePage session={session} />;
  if (view === 'overview') return <RoleOverview role="staff" session={session} />;
  if (!canView(view)) return <RoleOverview role="staff" session={session} />;

  switch (view) {
    case 'patients':
      return ['billing staff','lab staff','lab technician','pharmacy staff','nursing staff','nurse','support staff','general staff','hr','hr staff','hr manager','senior staff','staff manager','manager'].includes(subtype)
        ? <ScopedTable title="Patients" endpoint="/patients" columns={patientCols} />
        : <RoleOverview role="staff" session={session} />;
    case 'doctors':
      return <ScopedTable title="Doctors" endpoint="/doctors" columns={doctorCols} />;
    case 'appointments':
      return <StaffAppointments session={session} />;
    case 'wards':
      return <ScopedTable title="Wards" endpoint="/wards" columns={wardCols} />;
    case 'lab':
      return <StaffLabRequests />;
    case 'medicines':
      return <ScopedTable title="Medicines" endpoint="/medicines" columns={medicineCols} />;
    case 'prescriptions':
      return <ScopedTable title="Prescriptions" endpoint="/prescriptions" columns={prescriptionBaseCols} />;
    case 'records':
      return <ScopedTable title="Medical records" endpoint="/medical-records" columns={recordCols} />;
    case 'surgeries':
      return <ScopedTable title="Surgeries" endpoint="/surgeries" columns={surgeryCols} />;
    case 'bills':
      return <StaffBilling />;
    case 'ambulances':
      return <AmbulanceFleetManagement />;
    case 'ambulance-bookings':
      return <AmbulanceStaffBookings />;
    default:
      return <RoleOverview role="staff" session={session} />;
  }
}

function StaffAccountManagement() {
  const [refresh, setRefresh] = useState(0);
  const state = useFetch('/staff', true, refresh);
  const [form, setForm] = useState({ staff_name: '', staff_phone: '', staff_email: '', role: 'General Staff', staff_salary: '', staff_password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async e => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const result = await api.post('/staff', {
        ...form,
        staff_salary: form.staff_salary === '' ? null : Number(form.staff_salary)
      });
      setMsg(result.message || 'Staff account created successfully.');
      setForm({ staff_name: '', staff_phone: '', staff_email: '', role: 'General Staff', staff_salary: '', staff_password: '' });
      setRefresh(x => x + 1);
    } catch (e) {
      setMsg(e.message || 'Failed to create staff account.');
    } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <Section title="Staff account management" subtitle="Only HR / Senior Staff can create operational staff accounts. Admin remains the owner-level authority.">
        <form className="form-stack two-fields" onSubmit={submit}>
          <Field label="Full name" value={form.staff_name} setValue={v => change('staff_name', v)} />
          <Field label="Phone number" value={form.staff_phone} setValue={v => change('staff_phone', v)} />
          <Field label="Email" type="email" value={form.staff_email} setValue={v => change('staff_email', v)} />
          <SelectField label="Staff role" value={form.role} setValue={v => change('role', v)} options={CREATEABLE_STAFF_ROLES} placeholder="Select staff role" />
          <Field label="Salary" type="number" value={form.staff_salary} setValue={v => change('staff_salary', v)} />
          <Field label="Temporary password" type="password" value={form.staff_password} setValue={v => change('staff_password', v)} placeholder="Minimum 8 characters" />
          {msg && <div className={(msg.toLowerCase().includes('success') || msg.toLowerCase().includes('created')) ? 'success-box span-two' : 'error-box span-two'}>{msg}</div>}
          <button className="primary-btn full span-two" disabled={busy}>{busy ? 'Creating…' : 'Create staff account →'}</button>
        </form>
      </Section>

      <Section title="Existing staff" subtitle="Staff account credentials are never displayed here.">
        <DataState state={state} render={rows => <Table rows={rows} columns={staffCols} />} />
      </Section>
    </div>
  );
}

function StaffAppointments({ session }) {
  const [refresh, setRefresh] = useState(0);
  const state = useFetch('/appointments', true, refresh);
  const subtype = getStaffSubtype(session);
  const canUpdate = ['front desk staff','admission staff','reception staff','receptionist','nursing staff','nurse'].includes(subtype);
  const [msg, setMsg] = useState('');
  const act = async (id, status) => {
    setMsg('');
    try {
      await api.put(`/appointments/${id}`, { status });
      setRefresh(x => x + 1);
    } catch (e) { setMsg(e.message || 'Could not update appointment.'); }
  };
  return <Section title="Appointments" subtitle={canUpdate ? 'Review and process appointment requests assigned to your staff role.' : 'Read-only appointment information for your staff role.'}>
    {msg && <div className="error-box">{msg}</div>}
    <DataState state={state} render={rows => <Table rows={rows} columns={appointmentCols} actions={canUpdate ? (r => <div className="row-actions">{String(r.status).toLowerCase()==='pending' && <><button onClick={() => act(r.appointment_id,'Accepted')}>Accept</button><button className="danger" onClick={() => act(r.appointment_id,'Cancelled')}>Decline</button></>}</div>) : undefined} />} />
  </Section>;
}

function StaffLabRequests() {
  const [refresh, setRefresh] = useState(0);
  const state = useFetch('/lab-requests', true, refresh);
  const [editing, setEditing] = useState(null); const [error, setError] = useState('');
  const save = async payload => { try { await api.put(`/lab-requests/${editing.request_id}`, payload); setEditing(null); setRefresh(x => x+1); } catch(e) { setError(e.message); } };
  return <><Section title="Laboratory requests" subtitle="Accept requests and schedule tests for patients."><DataState state={state} render={rows => <Table rows={rows} columns={labRequestCols} actions={r => <div className="row-actions"><button onClick={() => setEditing(r)}>{String(r.status).toLowerCase()==='pending' ? 'Accept / Schedule' : 'Update'}</button></div>} />} /></Section>{editing && <LabScheduleModal row={editing} error={error} onClose={() => {setEditing(null);setError('')}} onSave={save}/>}</>;
}

function LabScheduleModal({ row, error, onClose, onSave }) {
  const [form,setForm]=useState({ status: row.status === 'Pending' ? 'Accepted' : row.status, staff_id: row.staff_id, scheduled_date: row.scheduled_date || '', scheduled_time: row.scheduled_time ? String(row.scheduled_time).slice(0,5) : '', result: row.result || '' });
  return <Modal title={`Lab request #${row.request_id}`}><form className="modal-form" onSubmit={async e => {e.preventDefault(); await onSave(form)}}><div className="info" style={{marginBottom:'15px'}}><span>Patient · Test</span><b>{row.patient_name || 'Legacy request'} · {row.test_name}</b></div><div className="modal-grid"><label className="field"><span>Status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Accepted','Scheduled','Completed','Rejected'].map(x=><option key={x}>{x}</option>)}</select></label><Field label="Scheduled date" type="date" value={form.scheduled_date} setValue={v=>setForm({...form,scheduled_date:v})}/><Field label="Scheduled time" type="time" value={form.scheduled_time} setValue={v=>setForm({...form,scheduled_time:v})}/><Field label="Result" value={form.result} setValue={v=>setForm({...form,result:v})}/></div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Save schedule</button></div></form></Modal>;
}

function StaffBilling() {
  const [refresh,setRefresh] = useState(0);
  const state = useFetch('/bills', true, refresh);
  const [editing,setEditing]=useState(null); const [error,setError]=useState('');
  const update = async payload => { try { await api.put(`/bills/${editing.bill_id}`, payload); setEditing(null); setRefresh(x=>x+1); } catch(e){setError(e.message)} };
  return <><Section title="Billing" subtitle="Billing staff control payments and non-clinical charges. Doctors do not edit bills."><DataState state={state} render={rows=><Table rows={rows} columns={billCols} actions={r=><div className="row-actions"><button onClick={()=>setEditing(r)}>Update payment</button></div>} />}/></Section>{editing&&<BillPaymentModal row={editing} error={error} onClose={()=>{setEditing(null);setError('')}} onSave={update}/>}</>;
}
function BillPaymentModal({row,error,onClose,onSave}) { const [form,setForm]=useState({payment_status:row.payment_status||'Pending',payment_method:row.payment_method||'',payment_date:row.payment_date||''}); return <Modal title={`Bill #${row.bill_id}`}><form className="modal-form" onSubmit={async e=>{e.preventDefault();await onSave(form)}}><div className="info" style={{marginBottom:'15px'}}><span>Patient · Amount</span><b>{row.patient_name} · {money(row.total_amount)}</b></div><div className="modal-grid"><label className="field"><span>Payment status</span><select value={form.payment_status} onChange={e=>setForm({...form,payment_status:e.target.value})}>{['Pending','Paid','Partial','Completed'].map(x=><option key={x}>{x}</option>)}</select></label><Field label="Payment method" value={form.payment_method} setValue={v=>setForm({...form,payment_method:v})}/><Field label="Payment date" type="date" value={form.payment_date} setValue={v=>setForm({...form,payment_date:v})}/></div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Save</button></div></form></Modal>; }


function RoleOverview({ role, session }) {
  const stats = useFetch('/dashboard-stats').data || { patients: 0, doctors: 0, appointments: 0, bills: 0, labRequests: 0 };
  const scopedAppointmentsEndpoint = role === 'doctor' ? `/doctors/${session.user.doctor_id}/appointments` : '/appointments';
  const a = useFetch(scopedAppointmentsEndpoint).data || [];

  return (
    <>
      <Banner title={role === 'doctor' ? `Good day, Dr. ${session.user.doctor_name}` : 'Hospital operations at a glance'} text={role === 'doctor' ? 'Manage your appointments, patients and procedures from one workspace.' : 'Coordinate patients, appointments, laboratory work and billing from one workspace.'} tag={role === 'doctor' ? 'CLINICIAN WORKSPACE' : 'OPERATIONS WORKSPACE'} />
      <div className="stats-grid six">
        <Stat icon="♙" label="Patients" value={stats.patients} />
        <Stat icon="✚" label="Doctors" value={stats.doctors} />
        <Stat icon="◷" label="Appointments" value={stats.appointments} />
        <Stat icon="৳" label="Bills" value={stats.bills} />
        {role === 'staff' && <Stat icon="⌁" label="Lab requests" value={stats.labRequests} />}
        <Stat icon="!" label="Pending today" value={stats.todayPendingAppointments || 0} />
      </div>
      <div className="admin-alerts">
        <div><b>Today's appointments</b><span>{stats.todayAppointments || 0} appointment(s) scheduled for today.</span></div>
        <div><b>Today's revenue</b><span>{money(stats.todayRevenue || 0)} recorded from paid bills today.</span></div>
      </div>
      <Section title="Recent appointments">
        <Table rows={a.slice(-8).reverse()} columns={appointmentCols} />
      </Section>
    </>
  );
}

function OperationsReports() {
  const stats = useFetch('/dashboard-stats').data || { patients:0, doctors:0, appointments:0, bills:0, staff:0, labRequests:0, todayAppointments:0, todayPendingAppointments:0, todayRevenue:0, alerts:{} };
  const appointments = useFetch('/appointments').data || [];
  const bills = useFetch('/bills').data || [];
  const paid = bills.filter(b => ['paid','completed'].includes(String(b.payment_status || '').toLowerCase()));
  const outstanding = bills.filter(b => !['paid','completed'].includes(String(b.payment_status || '').toLowerCase()));
  return <div className="stack">
    <Banner title="Hospital reports & insights" text="A quick operational summary for appointments, billing and daily workload." tag="REPORTING CENTER" />
    <div className="stats-grid six">
      <Stat icon="◷" label="Today visits" value={stats.todayAppointments || 0} />
      <Stat icon="৳" label="Today revenue" value={money(stats.todayRevenue || 0)} />
      <Stat icon="!" label="Pending visits" value={stats.todayPendingAppointments || 0} />
      <Stat icon="৳" label="Paid bills" value={paid.length} />
      <Stat icon="○" label="Outstanding" value={outstanding.length} />
      <Stat icon="⌁" label="Lab requests" value={stats.labRequests || 0} />
    </div>
    <div className="admin-alerts">
      <div><b>Workload</b><span>{appointments.filter(a => String(a.status).toLowerCase() === 'pending').length} appointment request(s) are waiting for action.</span></div>
      <div><b>Billing attention</b><span>{outstanding.length} bill(s) are not fully paid yet.</span></div>
    </div>
    <Section title="Recent appointments" subtitle="Latest appointment activity across the hospital."><Table rows={appointments.slice(-10).reverse()} columns={appointmentCols} /></Section>
    <Section title="Recent billing" subtitle="Latest bills and payment status."><Table rows={bills.slice(-10).reverse()} columns={billCols} /></Section>
  </div>;
}

function AdminViews({ session, view }) {
  if (view === 'overview') return <AdminDashboard />;
  if (view === 'profile') return <ProfilePage session={session} />;
  if (view === 'reports') return <OperationsReports />;
  if (view === 'ambulances') return <AmbulanceFleetManagement />;
  const cfg = ADMIN_CONFIG[view];
  return cfg ? <AdminCrud config={cfg} /> : <AdminDashboard />;
}

function AdminDashboard() {
  const stats = useFetch('/dashboard-stats').data || { patients: 0, doctors: 0, staff: 0, appointments: 0, bills: 0, alerts: { lowStock: 0, unpaidBills: 0, activeBeds: 0 } };
  const a = useFetch('/appointments').data || []; 

  return (
    <>
      <Banner title="Hospital operations, at a glance." text="The admin workspace exposes the hospital data and management functions represented in the database." tag="ADMIN CONTROL CENTER" />
      <div className="stats-grid six">
        <Stat icon="♙" label="Patients" value={stats.patients} />
        <Stat icon="✚" label="Doctors" value={stats.doctors} />
        <Stat icon="◉" label="Staff" value={stats.staff} />
        <Stat icon="◷" label="Appointments" value={stats.appointments} />
        <Stat icon="৳" label="Bills" value={stats.bills} />
        <Stat icon="▥" label="Active beds" value={stats.alerts?.activeBeds || 0} />
        <Stat icon="!" label="Pending today" value={stats.todayPendingAppointments || 0} />
        <Stat icon="৳" label="Today revenue" value={money(stats.todayRevenue || 0)} />
      </div>
      <div className="admin-alerts">
        <div>
          <b>Medicine stock</b><span>{stats.alerts?.lowStock || 0} item(s) at or below reorder level.</span>
        </div>
        <div>
          <b>Outstanding billing</b><span>{stats.alerts?.unpaidBills || 0} bill(s) still need attention.</span>
        </div>
      </div>
      <Section title="Latest appointments">
        <Table rows={a.slice(-8).reverse()} columns={appointmentCols} />
      </Section>
    </>
  );
}

function AdminCrud({ config }) {
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const state = useFetch(config.endpoint, true, refresh);

  const save = async payload => {
    setError('');
    try {
      if (editing) {
        await api.put(`${config.endpoint}/${editing.id}`, payload);
      } else {
        await api.post(config.endpoint, payload);
      }
      setEditing(null);
      setAdding(false);
      setRefresh(x => x + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async id => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.del(`${config.endpoint}/${id}`);
      setRefresh(x => x + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <Section title={config.title} action={<div className="section-actions"><span>{state.data?.length || 0} records</span><button className="primary-btn small" onClick={() => { setEditing(null); setAdding(true) }}>+ Add</button></div>}>
        <DataState state={state} render={rows => <Table rows={rows} columns={config.columns} actions={(row) => <div className="row-actions"><button onClick={() => setEditing({ id: getId(row), row })}>Edit</button><button className="danger" onClick={() => remove(getId(row))}>Delete</button></div>} />} />
      </Section>
      {(adding || editing) && <CrudModal config={config} initial={editing?.row} error={error} onClose={() => { setAdding(false); setEditing(null); setError('') }} onSave={save} />} 
      {error && !adding && !editing && <div className="error-box">{error}</div>}
    </>
  );
}

function CrudModal({ config, initial, error, onClose, onSave }) {
  const [form, setForm] = useState(() => initial ? stripId(initial) : {});
  const [busy, setBusy] = useState(false);

  return (
    <Modal title={`${initial ? 'Edit' : 'Add'} ${config.title}`}>
      <DynamicForm fields={config.form} value={form} setValue={setForm} initial={initial} error={error} onCancel={onClose} busy={busy} onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(form);
        } finally {
          setBusy(false);
        }
      }} />
    </Modal>
  );
}

function DynamicForm({ fields, value, setValue, error, onCancel, busy, onSubmit }) {
  const departments = useFetch('/departments', true).data || [];
  const specializations = useFetch('/specializations', true).data || [];
  return <form className="modal-form" onSubmit={onSubmit}><div className="modal-grid">{fields.map(f => <SmartInput key={f[0]} spec={f} value={value[f[0]] ?? ''} setValue={v => setValue({ ...value, [f[0]]: v })} formValue={value} departments={departments} specializations={specializations} />)}</div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={onCancel}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Save changes'}</button></div></form>;
}
function SmartInput({ spec, value, setValue, formValue, departments, specializations }) {
  const [key,label,type='text',endpoint,idKey,labelKey] = spec;
  const opts = useFetch(endpoint, Boolean(endpoint)).data || [];
  if (type === 'gender') return <SelectField label={label} value={value} setValue={setValue} options={GENDER_OPTIONS} placeholder="Select gender" />;
  if (type === 'select') {
    let options = opts;
    if (key === 'specialization_id' && formValue.department_id) {
      const dept = departments.find(d => String(d.department_id) === String(formValue.department_id));
      if (dept) { const match = specializations.filter(sp => String(sp.specialization_name||'').trim().toLowerCase() === String(dept.department_name||'').trim().toLowerCase()); if (match.length) options = match; }
    }
    if (key === 'department_id' && formValue.specialization_id) {
      const sp = specializations.find(x => String(x.specialization_id) === String(formValue.specialization_id));
      if (sp) { const match = departments.filter(d => String(d.department_name||'').trim().toLowerCase() === String(sp.specialization_name||'').trim().toLowerCase()); if (match.length) options = match; }
    }
    return <label className="field"><span>{label}</span><select value={value} onChange={e=>setValue(e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map(o=><option key={o[idKey]} value={o[idKey]}>{labelKey==='scheduleLabel'?scheduleLabel(o):labelKey==='slotLabel'?slotLabel(o):labelKey==='recordLabel'?recordLabel(o):labelKey==='appointmentLabel'?appointmentLabel(o):o[labelKey]}</option>)}</select></label>;
  }
  return <Field label={label} type={type} value={value} setValue={setValue} />;
}

function ProfilePage({ session }) {
  const u = session.user || {};
  return (
    <Section title="Profile">
      <div className="profile-card">
        <div className="profile-avatar">{initials(u.patient_name || u.doctor_name || u.staff_name || u.admin_name || 'U')}</div>
        <div className="profile-fields">
          {Object.entries(u).filter(([k]) => !k.toLowerCase().includes('password')).map(([k, v]) => (
            <Info key={k} label={pretty(k)} value={k.includes('date') || k === 'dob' ? dateOnly(v) : v} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScopedTable({ title, endpoint, columns }) {
  const state = useFetch(endpoint);
  return (
    <Section title={title} action={<span className="record-count">{state.data?.length || 0} records</span>}>
      <DataState state={state} render={rows => <Table rows={rows} columns={columns} />} />
    </Section>
  );
}

function Table({ rows, columns, actions }) {
  const [page, setPage] = useState(0);
  const limit = 10; 
  const total = Math.ceil((rows?.length || 0) / limit);
  const current = rows?.slice(page * limit, (page + 1) * limit) || [];

  useEffect(() => { setPage(0); }, [rows?.length]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {current.map((r, i) => (
            <tr key={getId(r) || i}>
              {columns.map(c => <td key={c.key}>{c.render ? c.render(r) : empty(r[c.key])}</td>)}
              {actions && <td>{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {total > 1 && (
        <div style={{ display: 'flex', gap: '15px', padding: '15px', justifyContent: 'center', alignItems: 'center', borderTop: '1px solid #eee' }}>
          <button className="outline-btn small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: '14px', color: '#666' }}>Page {page + 1} of {total}</span>
          <button className="outline-btn small" disabled={page === total - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Banner({ tag, title, text }) {
  return (
    <div className="banner">
      <div>
        <span className="banner-tag">{tag}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="banner-symbol">+</div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Quick({ icon, title, text, onClick }) {
  return (
    <button className="quick" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{text}</small>
      </div>
      <i>→</i>
    </button>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <b>{empty(value)}</b>
    </div>
  );
}

function Status({ value }) {
  const v = String(value || 'Unknown');
  return <span className={`status ${v.toLowerCase().replace(/\s+/g, '-')}`}>{v}</span>;
}

function DataState({ state, render }) {
  if (state.loading) return <Loader />;
  if (state.error) return <div className="error-box">{state.error}</div>;
  if (!state.data?.length) return <Empty />;
  return render(state.data);
}

function Empty({ text = 'Nothing to show yet.' }) {
  return (
    <div className="empty">
      <strong>{text}</strong>
      <span>When information is available, it will appear here.</span>
    </div>
  );
}

function Loader() {
  return <div className="loader"><i /><i /><i /></div>;
}

function Modal({ title, children }) {
  return (
    <div className="modal-cover">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function useFetch(path, enabled = true, refreshKey = 0) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' });
  
  useEffect(() => {
    let live = true;
    if (!enabled) return;
    setState({ data: null, loading: true, error: '' });
    
    api.get(path)
      .then(d => live && setState({ data: normalize(d), loading: false, error: '' }))
      .catch(e => live && setState({ data: null, loading: false, error: e.message }));
      
    return () => { live = false };
  }, [path, enabled, refreshKey]);
  
  return state;
}

function initials(s) {
  return String(s || 'U').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
}

function pretty(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
}

function getId(r) {
  return r.patient_id ?? r.doctor_id ?? r.staff_id ?? r.admin_id ?? r.appointment_id ?? r.department_id ?? r.specialization_id ?? r.assignment_id ?? r.ward_id ?? r.bed_assignment_id ?? r.room_id ?? r.slot_id ?? r.medicine_id ?? r.test_id ?? r.request_id ?? r.record_id ?? r.prescription_id ?? r.surgery_id ?? r.bill_id ?? r.id;
}

function stripId(r) {
  const copy = { ...r };
  delete copy.patient_id; delete copy.doctor_id; delete copy.staff_id; delete copy.admin_id; delete copy.appointment_id; delete copy.department_id; delete copy.specialization_id; delete copy.assignment_id; delete copy.ward_id; delete copy.bed_assignment_id; delete copy.room_id; delete copy.slot_id; delete copy.medicine_id; delete copy.test_id; delete copy.request_id; delete copy.record_id; delete copy.prescription_id; delete copy.surgery_id; delete copy.bill_id;
  return copy;
}

function AboutHospital({ doctorsCount, facilityStats }) {
  return (
    <section className="public-section">
      <div className="section-intro">
        <div>
          <span className="eyebrow">ABOUT HEALIX</span>
          <h2>Hospital Facilities & Infrastructure.</h2>
        </div>
        <p>Equipped with modern technology and a high-capacity infrastructure to ensure round-the-clock emergency and specialized care.</p>
      </div>
      
      <div className="stats-grid">
        <Stat icon="✚" label="Expert Doctors" value={doctorsCount} />
        <Stat icon="▥" label="Total Beds" value={facilityStats.totalBeds ?? '—'} />
        <Stat icon="⌁" label="ICU & NICU Beds" value={facilityStats.icuNicuBeds ?? '—'} />
        <Stat icon="༄" label="Ventilators" value={facilityStats.ventilators ?? '—'} />
        <Stat icon="🚑" label="Ambulances" value={facilityStats.ambulances ?? '—'} />
        <Stat icon="▧" label="Lab Tests Available" value={facilityStats.labTests ?? '—'} />
      </div>
    </section>
  );
}

function EmergencyHelpline() {
  return (
    <section className="public-section" style={{ textAlign: 'center', backgroundColor: '#e6f4f1', padding: '40px', borderRadius: '12px', marginTop: '40px' }}>
      <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🚑</span>
      <h2>24/7 Emergency Hotline</h2>
      <p>For medical emergencies and ambulance services, call us immediately.</p>
      <h1 style={{ color: '#0d7c66', fontSize: '3rem', margin: '15px 0' }}>16216</h1>
      <p>or call +880 17XX-XXXXXX</p>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="public-section">
      <div className="section-intro">
        <span className="eyebrow">FAQ</span>
        <h2>Frequently Asked Questions</h2>
      </div>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h4>How do I book an appointment?</h4>
          <p style={{ marginTop: '10px', color: '#666' }}>Create a patient account and use the secure portal to select your preferred doctor, room, and time slot.</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h4>Is the emergency service available 24/7?</h4>
          <p style={{ marginTop: '10px', color: '#666' }}>Yes, our emergency center, ICU support, and ambulance services operate 24 hours a day.</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h4>Can I view my medical records online?</h4>
          <p style={{ marginTop: '10px', color: '#666' }}>Absolutely. All your prescriptions, test results, and billing history are centrally stored in your patient workspace.</p>
        </div>
      </div>
    </section>
  );
}

function ProjectCredits() {
  return (
    <section className="public-section" style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '40px', marginTop: '40px', color: '#666' }}>
      <p style={{ fontWeight: 'bold', color: '#333', fontSize: '1.1rem' }}>HEALIX - Hospital Management System</p>
      <p style={{ marginTop: '10px' }}>Developed by <b>Swagota Saha</b></p>
      <p style={{ marginTop: '10px' }}>Developed by <b>Labiba Tasneem</b></p>
      <p>Under the supervision of <b>Niaz Rahman</b></p>
      <p style={{ fontSize: '14px', marginTop: '10px' }}>Department of Computer Science and Engineering,BUET</p>
    </section>
  );
}

function PublicLabTests({ labTests }) {
  const [testSearch, setTestSearch] = useState('');
  const filteredTests = labTests.filter(t => 
    (t.test_name || '').toLowerCase().includes(testSearch.toLowerCase())
  );

  return (
    <section className="public-section page-public">
      <span className="eyebrow">DIAGNOSTICS & LAB</span>
      <h1>Available Lab Tests</h1>
      <p className="lead">Explore the diagnostic tests and screening services available at HEALIX.</p>
      
      <div className="public-search">
        ⌕<input 
            value={testSearch} 
            onChange={e => setTestSearch(e.target.value)} 
            placeholder="Search for a test name..." 
          />
      </div>
      
      <div className="department-grid">
        {filteredTests.map(t => (
          <div className="department-card" key={t.test_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>⌁</span>
            <div style={{ marginTop: '10px' }}>
              <h3>{t.test_name}</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{t.description || 'Diagnostic Test'}</p>
              <b style={{ color: '#0d7c66', fontSize: '18px' }}>{money(t.cost)}</b>
            </div>
          </div>
        ))}
        {!filteredTests.length && <Empty text="No tests found matching your search." />}
      </div>
    </section>
  );
}


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);