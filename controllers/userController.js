const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const Token = require("../models/tokenModel")
const sendEmail = require("../utils/sendEmail")

//Generate Token Code
const generatetoken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

//Register User
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body

    //Validation
    if (!name || !email || !password) {
        res.status(400)
        throw new Error("Please fill in all required feilds")
    }

    //Password lenght
    if (password.length < 6) {
        res.status(400)
        throw new Error("Password must be up to 6 characters")
    }

    //check if email already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
        res.status(400)
        throw new Error("This email is already been registered")
    }


    //Create a new User
    const user = await User.create({
        name,
        email,
        password,
    })

    //Generate Token
    const token = generatetoken(user._id)

    //Send HTTP only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true
    })

    //Display User Data
    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio, token
        })

    }
    else {
        res.status(400)
        throw new Error("Invalid user data")
    }

});




//Login User
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Validate Request
    if (!email || !password) {
        res.status(400)
        throw new Error("Please add email and password")
    }

    // check if user exists
    const user = await User.findOne({ email })
    if (!user) {
        res.status(400)
        throw new Error("User not found, please sign up")
    }

    //Check if the passsowrd is Correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password)

    //Generate Token
    const token = generatetoken(user._id)

    //Send HTTP only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true
    })


    if (user && passwordIsCorrect) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(200).json({
            _id, name, email, photo, phone, bio, token
        })
    }
    else {
        res.status(400)
        throw new Error("Invalid email or Password")
    }

});




//Logout User
const logout = asyncHandler(async (req, res) => {
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0),
        sameSite: "none",
        secure: true
    })
    return res.status(200).json({ message: "Successfully Logged Out" })
})



//Get user Data
const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio
        })

    }
    else {
        res.status(400)
        throw new Error("Invalid user data")
    }
})


//Login Status
const loginStatus = asyncHandler(async (req, res) => {
    const token = req.cookies.token
    if (!token) {
        return res.json(false)
    }

    //Verify Token
    const verified = jwt.verify(token, process.env.JWT_SECRET)
    if (verified) {
        return res.json(true)
    }

    return res.json(false)
})



//Update User
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    if (user) {
        const { name, email, photo, phone, bio } = user
        user.name = req.body.name || name;
        user.email = email;
        user.photo = req.body.photo || photo;
        user.phone = req.body.phone || phone;
        user.bio = req.body.bio || bio;

        const updatedUser = await user.save()
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            photo: updatedUser.photo,
            phone: updatedUser.phone,
            bio: updatedUser.bio,
        })
    }
    else {
        res.status(404)
        throw new Error("User Not Found")
    }
})



//Change PAssword
const changePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)

    if (!user) {
        res.status(400)
        throw new Error("User not Found!")
    }

    const { oldPassword, password } = req.body
    //Validate
    if (!oldPassword || !password) {
        res.status(400)
        throw new Error("please add old and new password")
    }

    //Check if old password matches the passoword in DB
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password)

    //save password
    if (user && passwordIsCorrect) {
        user.password = password
        await user.save()
        res.status(200).send("Password Changed Successfully")
    }
    else {
        res.status(400)
        throw new Error("Old password is Incorrect")
    }
})



//Get user Data
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email })

    if (!user) {
        res.status(404)
        throw new Error("User does not exists")
    }

    //create Reset Token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id

    //Hash Token
    const hashToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    await new Token({
        userId: user._id,
        token: hashToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60 * 1000) //30 Minutes
    }).save()

    //Construct Reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`
    console.log(resetUrl);

    //Reset Email
    const message = `
    <h2>Hello ${user.name}</h2>
    <p>You requested for a password reset</p>
    <p>please use the URL below to rest your password</p>
    <p>This reset link is only valid for 30 minutes</p>
    <a href=${resetUrl} clicktracking = off>${resetUrl}</a>
    <p>Regards...</p>
    <p>Pinvent Team</p>
    `
    const subject = "Password Reset Request"
    const send_to = user.email
    const sent_from = process.env.EMAIL_USER

    try {
        await sendEmail(subject, message, send_to, sent_from)
        res.status(200).json({ success: true, message: "Reset Email Sent" })
    } catch (error) {
        res.status(500)
        throw new Error("Email not sent, please try again")
    }

    res.send("Forgot Password! ")
})


//Reset Password
const resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body
    const { resetToken } = req.params

    //Hash token then compare to token in db
    const hashToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    //find token in DB
    const userToken = await Token.findOne({
        token: hashToken,
        expiresAt: { $gt: Date.now() }
    })

    if (!userToken) {
        res.status(404)
        throw new Error("Invalid or Expired Token")
    }

    //Find User
    const user = await User.findOne({ _id: userToken.userId })
    user.password = password
    await user.save()
    res.status(200).json({ message: "Password reset successful, please Login" })
})

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword,
}