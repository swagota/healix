const db=require('../config/db');
exports.getAllData=async(req,res)=>
{
    try{
        const result=await db.query('select* from specialization');
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

exports.createData=async(req,res)=>
{
    try{
        const{specialization_name}=req.body;
        const result=await db.query(
            'insert into specialization(specialization_name) values($1) returning*',
            [specialization_name]
        );
        res.status(201).json({
      success: true,
      message: 'specialization created successfully!',
      data: result.rows[0],
    });
    }catch(error){
      res.status(500).json({
            success:false,
            error:error.message
        });
    }
}