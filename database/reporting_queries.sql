-- HEALIX REPORTING / DEMO QUERIES
-- These are SELECT examples for Navicat. They do not change data.

-- 1. Hospital dashboard
SELECT * FROM hospital_dashboard_view;

-- 2. Doctor availability for a date
-- SELECT * FROM get_doctor_availability('2026-09-06');

-- 3. Only cardiology availability
-- SELECT * FROM get_doctor_availability('2026-09-06', NULL, 1, NULL);

-- 4. Department performance
SELECT * FROM department_performance_report();

-- 5. Doctor utilization
SELECT * FROM doctor_utilization_view ORDER BY total_appointments DESC;

-- 6. Ward occupancy
SELECT * FROM ward_availability_view ORDER BY occupancy_percentage DESC;

-- 7. Active admissions
SELECT * FROM active_admission_view ORDER BY admission_date;

-- 8. Low/out-of-stock medicines
SELECT * FROM low_stock_medicines();

-- 9. Medicine usage
SELECT * FROM medicine_usage_view ORDER BY prescribed_units DESC;

-- 10. Outstanding bills
SELECT * FROM outstanding_bill_view ORDER BY appointment_date;

-- 11. Daily hospital load
SELECT * FROM daily_hospital_load_view ORDER BY appointment_date DESC;

-- 12. A patient's complete database-side dashboard
-- SELECT * FROM patient_dashboard(1);

-- 13. A patient's medical history
-- SELECT * FROM patient_full_history_view WHERE patient_id=1 ORDER BY appointment_date DESC NULLS LAST;
