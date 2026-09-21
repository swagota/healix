const db=require('../config/db');
exports.getAllTimeSlots=async(req,res)=>
{
    try{
        const result=await db.query('SELECT * FROM time_slot ORDER BY slot_id ASC');
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

exports.createTimeSlot = async (req, res) => {
  try {
    const {day, start_time, end_time} = req.body;

    const result = await db.query(
      `INSERT INTO time_slot (day, start_time, end_time) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [day, start_time, end_time]
    );
        res.status(201).json({
      success: true,
      message: 'TimeSlot created successfully!',
      data: result.rows[0],
    });
    }catch(error){
      res.status(500).json({
            success:false,
            error:error.message
        });
    }
}