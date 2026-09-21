const db=require('../config/db');
exports.getAllMedicines=async(req,res)=>
{
    try{
        const result=await db.query('SELECT * FROM medicine ORDER BY medicine_id ASC');
        res.status(200).json({
            success:true,
            data:result.rows
        });
    }catch(error){
        res.status(500).json({
            success:false,
            error:error.message
        });
    }
};

exports.createMedicine = async (req, res) => {
  try {
    const {medicine_name, generic_name, unit_price} = req.body;

    const result = await db.query(
      `INSERT INTO medicine (medicine_name, generic_name, unit_price) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [medicine_name, generic_name, unit_price]
    );
        res.status(201).json({
      success: true,
      message: 'Medicine created successfully!',
      data: result.rows[0],
    });
    }catch(error){
      res.status(500).json({
            success:false,
            error:error.message
        });
    }
}