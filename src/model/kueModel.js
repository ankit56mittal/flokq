


const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    urlCode: {
      type: String,
      
    },
    jobId: { type: String, 
         
        
    },
    status: { type: String, 
        },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Flokq", urlSchema);
