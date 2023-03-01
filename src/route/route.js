const express = require('express');
const router =express.Router()
const kueController = require("../controller/kueController")

router.get("/status/:id",kueController.createid)
router.get("create/:url",kueController.createUrl)



module.exports= router 