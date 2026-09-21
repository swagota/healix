INSERT INTO department (department_name, floor)
VALUES
('Cardiology', 2),
('Neurology', 3),
('Orthopedics', 4),
('Pediatrics', 5),
('Dermatology', 6);

INSERT INTO specialization (specialization_name)
VALUES
('Cardiology'),
('Neurology'),
('Orthopedics'),
('Pediatrics'),
('Dermatology');

INSERT INTO doctor
(doctor_name, doctor_gender, doctor_phone, doctor_email, doctor_password,
 doctor_salary, consultation_fee, department_id, specialization_id)
VALUES
('Dr. Rahim Ahmed', 'Male', '01710000001', 'rahim@healix.com', 'pass123',
 80000, 1000, 1, 1),

('Dr. Nusrat Jahan', 'Female', '01710000002', 'nusrat@healix.com', 'pass123',
 75000, 900, 2, 2),

('Dr. Karim Hasan', 'Male', '01710000003', 'karim@healix.com', 'pass123',
 70000, 800, 3, 3),

('Dr. Sadia Islam', 'Female', '01710000004', 'sadia@healix.com', 'pass123',
 65000, 700, 4, 4),

('Dr. Tanvir Hossain', 'Male', '01710000005', 'tanvir@healix.com', 'pass123',
 72000, 850, 5, 5);

 INSERT INTO patient
(patient_name, patient_gender, dob, patient_phone, address, blood_group, patient_password)
VALUES
('Ayesha Rahman', 'Female', '2001-05-12', '01810000001', 'Dhaka', 'A+', 'pass123'),
('Sakib Hasan', 'Male', '1998-09-20', '01810000002', 'Chittagong', 'B+', 'pass123'),
('Nabila Islam', 'Female', '2003-02-15', '01810000003', 'Dhaka', 'O+', 'pass123'),
('Tanvir Ahmed', 'Male', '1995-11-08', '01810000004', 'Rajshahi', 'AB+', 'pass123'),
('Mim Akter', 'Female', '2000-07-25', '01810000005', 'Khulna', 'O-', 'pass123');

INSERT INTO room
(room_no, room_type, floor)
VALUES
('R-101', 'General', 1),
('R-102', 'General', 1),
('R-201', 'Private', 2),
('R-202', 'Private', 2),
('R-301', 'ICU', 3);

INSERT INTO ward
(ward_name, ward_type, floor, total_bed, available_bed, discharge_date)
VALUES
('General Ward', 'General', 1, 30, 18, NULL),
('Cardiology Ward', 'Specialized', 2, 20, 10, NULL),
('Neurology Ward', 'Specialized', 3, 15, 7, NULL),
('Pediatric Ward', 'Pediatric', 5, 20, 12, NULL),
('ICU Ward', 'ICU', 3, 10, 4, NULL);

INSERT INTO time_slot
(day, start_time, end_time)
VALUES
('Sunday', '09:00', '12:00'),
('Sunday', '14:00', '17:00'),
('Monday', '09:00', '12:00'),
('Monday', '14:00', '17:00'),
('Tuesday', '09:00', '12:00'),
('Wednesday', '14:00', '17:00'),
('Thursday', '09:00', '12:00'),
('Friday', '10:00', '13:00');

INSERT INTO doctor_room_slot
(doctor_id, room_id, slot_id)
VALUES
(1, 1, 1),
(2, 2, 3),
(3, 3, 4),
(4, 4, 5),
(5, 5, 7);

INSERT INTO appointment
(appointment_date, status, patient_id, assignment_id)
VALUES
('2026-08-12', 'Scheduled', 1, 1),
('2026-08-12', 'Scheduled', 2, 2),
('2026-08-13', 'Completed', 3, 3),
('2026-08-13', 'Scheduled', 4, 4),
('2026-08-14', 'Cancelled', 5, 5);

INSERT INTO medical_record
(diagnosis, treatment, admission_date, patient_id)
VALUES
('Hypertension', 'Medication and regular monitoring', '2026-08-10', 1),
('Migraine', 'Pain management and rest', '2026-08-10', 2),
('Knee Pain', 'Physiotherapy and medication', '2026-08-11', 3),
('Skin Allergy', 'Antihistamine treatment', '2026-08-11', 4),
('Respiratory Infection', 'Antibiotics and rest', '2026-08-12', 5);

INSERT INTO prescription
(date, advice, record_id)
VALUES
('2026-08-10', 'Take medicine regularly and monitor blood pressure.', 1),
('2026-08-10', 'Take adequate rest and drink plenty of water.', 2),
('2026-08-11', 'Continue physiotherapy as advised.', 3),
('2026-08-11', 'Avoid known allergens and follow medication schedule.', 4),
('2026-08-12', 'Complete the prescribed course and take sufficient rest.', 5);

INSERT INTO medicine
(medicine_name, generic_name, unit_price)
VALUES
('Amlodipine 5mg', 'Amlodipine', 5.00),
('Paracetamol 500mg', 'Paracetamol', 2.00),
('Omeprazole 20mg', 'Omeprazole', 3.50),
('Cetirizine 10mg', 'Cetirizine', 2.50),
('Amoxicillin 500mg', 'Amoxicillin', 8.00),
('Ibuprofen 400mg', 'Ibuprofen', 4.00);

INSERT INTO prescription_medicine
(prescription_id, medicine_id, dosage, duration, frequency)
VALUES
(1, 1, '5mg', '30 days', 'Once daily'),
(1, 3, '20mg', '30 days', 'Once daily'),

(2, 2, '500mg', '5 days', 'Three times daily'),
(2, 3, '20mg', '5 days', 'Once daily'),

(3, 6, '400mg', '7 days', 'Twice daily'),

(4, 4, '10mg', '10 days', 'Once daily'),

(5, 5, '500mg', '7 days', 'Three times daily'),
(5, 2, '500mg', '5 days', 'Three times daily');

INSERT INTO bill
(total_amount, payment_method, payment_status, payment_date, appointment_id)
VALUES
(1200.00, 'Cash', 'Paid', '2026-08-12', 1),
(1000.00, 'Card', 'Paid', '2026-08-12', 2),
(800.00, 'Cash', 'Paid', '2026-08-13', 3),
(900.00, 'Mobile Banking', 'Paid', '2026-08-13', 4),
(850.00, 'Card', 'Pending', NULL, 5);

INSERT INTO lab_test
(test_name, cost, description, manufactured_by)
VALUES
('Complete Blood Count', 500.00, 'Basic blood test to evaluate overall health.', 'Square Pharmaceuticals'),
('Blood Glucose Test', 300.00, 'Measures blood glucose level.', 'Incepta Pharmaceuticals'),
('Lipid Profile', 800.00, 'Measures cholesterol and triglyceride levels.', 'Beximco Pharmaceuticals'),
('Urine Test', 400.00, 'Routine urine examination.', 'Renata Limited'),
('X-Ray', 1000.00, 'Diagnostic imaging examination.', 'Popular Diagnostic Center');

INSERT INTO staff
(staff_name, staff_password, role, staff_phone, staff_email, staff_salary)
VALUES
('Karim Ali', 'pass123', 'Lab Technician', '01910000001', 'karim@healix.com', 35000.00),
('Sadia Akter', 'pass123', 'Nurse', '01910000002', 'sadia.staff@healix.com', 32000.00),
('Rafiq Hasan', 'pass123', 'Receptionist', '01910000003', 'rafiq@healix.com', 28000.00),
('Nadia Rahman', 'pass123', 'Lab Technician', '01910000004', 'nadia@healix.com', 36000.00);
('Ayesha Rahman', 'pass123', 'Front Desk Staff', '01910000005', 'ayesha.frontdesk@healix.com', 30000.00),
('Tanvir Hossain', 'pass123', 'Admission Staff', '01910000006', 'tanvir.admission@healix.com', 30000.00),
('Mim Akter', 'pass123', 'Billing Staff', '01910000007', 'mim.billing@healix.com', 34000.00),
('Shakil Ahmed', 'pass123', 'Pharmacy Staff', '01910000008', 'shakil.pharmacy@healix.com', 33000.00),
('Jannatul Ferdous', 'pass123', 'Reception Staff', '01910000009', 'jannatul.reception@healix.com', 29000.00),
('Sumi Islam', 'pass123', 'Nursing Staff', '01910000010', 'sumi.nursing@healix.com', 35000.00),
('Imran Kabir', 'pass123', 'Support Staff', '01910000011', 'imran.support@healix.com', 27000.00),
('Farhan Karim', 'pass123', 'General Staff', '01910000012', 'farhan.general@healix.com', 26000.00);
('HR Manager', 'pass123', 'HR Manager', '01910000013', 'hr.manager@healix.com', 55000.00),
('Senior Staff', 'pass123', 'Senior Staff', '01910000014', 'senior.staff@healix.com', 50000.00),
('Staff Manager', 'pass123', 'Staff Manager', '01910000015', 'staff.manager@healix.com', 52000.00),
('HR Staff', 'pass123', 'HR Staff', '01910000016', 'hr.staff@healix.com', 40000.00),
('Ambulance Staff', 'pass123', 'Ambulance Staff', '01910000017', 'ambulance@healix.com', 32000.00);

INSERT INTO lab_request
(request_date, status, staff_id, result, test_id)
VALUES
('2026-08-12', 'Completed', 1, 'Hemoglobin: 13.5 g/dL, WBC: Normal', 1),
('2026-08-12', 'Completed', 2, 'Blood Glucose: 95 mg/dL', 2),
('2026-08-13', 'Pending', 1, NULL, 3),
('2026-08-13', 'Completed', 4, 'Urine test: Normal', 4),
('2026-08-14', 'Pending', 4, NULL, 5);

INSERT INTO surgery
(surgery_name, surgery_type, status, cost, surgery_date, patient_id, doctor_id)
VALUES
('Appendectomy', 'Emergency', 'Completed', 45000.00, '2026-08-15', 1, 3),
('Knee Replacement', 'Major', 'Scheduled', 120000.00, '2026-08-20', 3, 3),
('Cataract Surgery', 'Minor', 'Scheduled', 35000.00, '2026-08-22', 4, 5),
('Gallbladder Surgery', 'Major', 'Completed', 85000.00, '2026-08-10', 2, 1);

INSERT INTO admin
(admin_name, username, admin_password, admin_email, admin_phone)
VALUES
('System Admin', 'admin1', 'admin123', 'admin@healix.com', '01610000001');