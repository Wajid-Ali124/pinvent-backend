const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add a name"]
    },

    email: {
        type: String,
        required: [true, "Please add an email"],
        unique: true,
        trim: true,
        match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "please enter a valid email"]
    },
    password: {
        type: String,
        required: [true, "Please add a name"],
        minlength: [6, "Password cannot be less then 6 characters"],
        // maxlength: [23, "Password cannot be more then 23 characters"]
    },

    photo: {
        type: Object,
        required: [true, "Please add a photo"],
        default: {
            url: "https://i.ibb.co/4pDNDk1/avatar.png",
            publicId: ""
        }
    },

    phone: {
        type: String,
        default: "+92"
    },

    bio: {
        type: String,
        default: "bio",
        maxlength: [250, "Bio cannot be more then 250 characters"]
    },

},

    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next()
    }

    //Create Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt)
    this.password = hashedPassword;
})



const User = mongoose.model("User", userSchema)
module.exports = User