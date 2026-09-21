const db = require('../config/db');

exports.getAllPrescriptionMedicines = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        pm.prescription_id,
        pm.medicine_id,
        m.medicine_name,
        m.generic_name,
        m.unit_price,
        pm.dosage,
        pm.duration,
        pm.frequency
      FROM prescription_medicine pm
      JOIN medicine m ON pm.medicine_id = m.medicine_id
      ORDER BY pm.prescription_id ASC
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createPrescriptionMedicine = async (req, res) => {
  try {
    const { 
      prescription_id, 
      medicine_id, 
      dosage, 
      duration, 
      frequency 
    } = req.body;

    const result = await db.query(
      `INSERT INTO prescription_medicine 
       (prescription_id, medicine_id, dosage, duration, frequency) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [prescription_id, medicine_id, dosage, duration, frequency]
    );

    res.status(201).json({
      success: true,
      message: 'Medicine added to prescription successfully!',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};