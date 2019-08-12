var mongoose=require("mongoose")

var commentschema= new mongoose.Schema({
    text:String,
    date: String,
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String
    }
},{ usePushEach: true });

module.exports=mongoose.model("comment",commentschema)
