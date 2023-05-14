const express = require("express")
const { Contact } = require("../controllers/contactController")
const protect = require("../Middleware/authMiddleware")
const router = express.Router()


router.post("/", protect, Contact)

module.exports = router