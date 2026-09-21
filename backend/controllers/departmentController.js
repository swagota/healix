const db = require('../config/db');

exports.getAllDepartments = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM department ORDER BY department_id ASC');
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { department_name, floor } = req.body;
    
    const result = await db.query(
      'INSERT INTO department (department_name, floor) VALUES ($1, $2) RETURNING *',
      [department_name, floor]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully!',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};