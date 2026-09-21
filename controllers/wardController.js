const db=require('../config/db');
exports.getAllWards=async(req,res)=>
{
    try{
        const result=await db.query('SELECT * FROM ward ORDER BY ward_id ASC');
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

exports.createWard = async (req, res) => {
  try {
    const { 
        ward_name, 
      ward_type, 
      floor, 
      total_bed, 
      available_bed, 
      discharge_date
    } = req.body;

    const result = await db.query(
      `INSERT INTO ward 
       (ward_name, ward_type, floor, total_bed, available_bed, discharge_date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [ward_name, ward_type, floor, total_bed, available_bed, discharge_date]
    );
        res.status(201).json({
      success: true,
      message: 'ward created successfully!',
      data: result.rows[0],
    });
    }catch(error){
      res.status(500).json({
            success:false,
            error:error.message
        });
    }
}