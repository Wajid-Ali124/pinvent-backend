const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const dotenv = require("dotenv").config();
const cookieParser = require("cookie-parser");
const errorHandler = require("./Middleware/errorMiddleware");
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const contactRoute = require("./routes/contactRoute");
const path = require("path");

const app = express()

//Middlewares
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ["http://localhost:3000", "https://pinvent-by-wajid.vercel.app"],
    credentials: true
}))
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))


//Routes Middlewares
app.use("/api/users", userRoute)
app.use("/api/products", productRoute)
app.use("/api/contact", contactRoute)


//Routes
app.get("/", (req, res) => {
    res.send("Home Page!")
})


//Error Middleware
app.use(errorHandler)

const PORT = process.env.PORT || 5000

//Connect to DB and start server
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on Port ${PORT}`)
        })
    })
    .catch((err) => console.log(err))
