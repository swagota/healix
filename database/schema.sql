CREATE TABLE admin (
    admin_id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_name     VARCHAR(100) NOT NULL,
    username       VARCHAR(50) UNIQUE NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    admin_email    VARCHAR(100),
    admin_phone    VARCHAR(20)
);



CREATE TABLE staff (
    staff_id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    staff_name     VARCHAR(100) NOT NULL,
    staff_password VARCHAR(255) NOT NULL,
    role           VARCHAR(50) NOT NULL,
    staff_phone    VARCHAR(20),
    staff_email    VARCHAR(100),
    staff_salary   NUMERIC(10,2)
);

CREATE TABLE department (
    department_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    floor            INTEGER
);

CREATE TABLE specialization (
    specialization_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specialization_name VARCHAR(100) NOT NULL
);

CREATE TABLE doctor (
    doctor_id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_name        VARCHAR(100) NOT NULL,
    doctor_gender      VARCHAR(20),
    doctor_phone       VARCHAR(20),
    doctor_email       VARCHAR(100),
    doctor_password    VARCHAR(255) NOT NULL,
    doctor_salary      NUMERIC(10,2),
    consultation_fee   NUMERIC(10,2),
    department_id      INTEGER,
    specialization_id  INTEGER,

    FOREIGN KEY (department_id)
        REFERENCES department(department_id),

    FOREIGN KEY (specialization_id)
        REFERENCES specialization(specialization_id)
);

CREATE TABLE patient (
    patient_id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_name      VARCHAR(100) NOT NULL,
    patient_gender    VARCHAR(20),
    dob               DATE,
    patient_phone     VARCHAR(20),
    address           VARCHAR(255),
    blood_group       VARCHAR(10),
    patient_password  VARCHAR(255) NOT NULL
);

CREATE TABLE room (
    room_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_no    VARCHAR(20) NOT NULL,
    room_type  VARCHAR(50),
    floor      INTEGER
);

CREATE TABLE ward (
    ward_id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ward_name       VARCHAR(100) NOT NULL,
    ward_type       VARCHAR(50),
    floor           INTEGER,
    total_bed       INTEGER,
    available_bed   INTEGER,
    discharge_date  DATE
);

CREATE TABLE time_slot (
    slot_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    day        VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time   TIME NOT NULL
);

CREATE TABLE doctor_room_slot (
    assignment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id     INTEGER NOT NULL,
    room_id       INTEGER NOT NULL,
    slot_id       INTEGER NOT NULL,

    FOREIGN KEY (doctor_id)
        REFERENCES doctor(doctor_id),

    FOREIGN KEY (room_id)
        REFERENCES room(room_id),

    FOREIGN KEY (slot_id)
        REFERENCES time_slot(slot_id)
);

CREATE TABLE appointment (
    appointment_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_date  DATE NOT NULL,
    status            VARCHAR(30),
    patient_id        INTEGER NOT NULL,
    assignment_id     INTEGER NOT NULL,

    FOREIGN KEY (patient_id)
        REFERENCES patient(patient_id),

    FOREIGN KEY (assignment_id)
        REFERENCES doctor_room_slot(assignment_id)
);

CREATE TABLE medical_record (
    record_id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    diagnosis       VARCHAR(255),
    treatment       VARCHAR(255),
    admission_date  DATE,
    patient_id      INTEGER NOT NULL,

    FOREIGN KEY (patient_id)
        REFERENCES patient(patient_id)
);

CREATE TABLE prescription (
    prescription_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date             DATE NOT NULL,
    advice           VARCHAR(255),
    record_id        INTEGER NOT NULL,

    FOREIGN KEY (record_id)
        REFERENCES medical_record(record_id)
);

CREATE TABLE medicine (
    medicine_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    medicine_name  VARCHAR(100) NOT NULL,
    generic_name   VARCHAR(100),
    unit_price     NUMERIC(10,2)
);

CREATE TABLE prescription_medicine (
    prescription_id  INTEGER NOT NULL,
    medicine_id      INTEGER NOT NULL,
    dosage            VARCHAR(100),
    duration          VARCHAR(100),
    frequency         VARCHAR(100),

    PRIMARY KEY (prescription_id, medicine_id),

    FOREIGN KEY (prescription_id)
        REFERENCES prescription(prescription_id),

    FOREIGN KEY (medicine_id)
        REFERENCES medicine(medicine_id)
);

CREATE TABLE bill (
    bill_id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    total_amount    NUMERIC(10,2) NOT NULL,
    payment_method  VARCHAR(50),
    payment_status  VARCHAR(30),
    payment_date    DATE,
    appointment_id  INTEGER NOT NULL,

    FOREIGN KEY (appointment_id)
        REFERENCES appointment(appointment_id)
);

CREATE TABLE lab_test (
    test_id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    test_name       VARCHAR(100) NOT NULL,
    cost            NUMERIC(10,2),
    description     VARCHAR(255),
    manufactured_by VARCHAR(100)
);

CREATE TABLE lab_request (
    request_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_date  DATE NOT NULL,
    status        VARCHAR(30),
    staff_id      INTEGER NOT NULL,
    result        VARCHAR(255),
    test_id       INTEGER NOT NULL,

    FOREIGN KEY (staff_id)
        REFERENCES staff(staff_id),

    FOREIGN KEY (test_id)
        REFERENCES lab_test(test_id)
);

CREATE TABLE surgery (
    surgery_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    surgery_name  VARCHAR(100) NOT NULL,
    surgery_type  VARCHAR(50),
    status        VARCHAR(30),
    cost          NUMERIC(10,2),
    surgery_date  DATE,
    patient_id    INTEGER NOT NULL,
    doctor_id     INTEGER NOT NULL,

    FOREIGN KEY (patient_id)
        REFERENCES patient(patient_id),

    FOREIGN KEY (doctor_id)
        REFERENCES doctor(doctor_id)
);