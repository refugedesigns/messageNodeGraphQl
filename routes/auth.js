const express = require("express")
const { body } = require("express-validator")
const User = require("../models/user")

const router = express.Router()

const authController = require("../controllers/auth")

router.put("/signup",[
    body("email").isEmail().custom((value, {req}) => {
        return User.findOne({email: value}).then(userDoc => {
            if(userDoc) {
                return Promise.reject("E-mail address already exist!")
            }
        })
    }).normalizeEmail(),
    body("name").trim().notEmpty(),
    body("password").isStrongPassword().trim().notEmpty()
], authController.signup)

router.post("/login", authController.login)

module.exports = router