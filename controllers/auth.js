const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.signup = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  bcrypt
    .hash(password, 12)
    .then((hashPwd) => {
      const user = new User({
        name: name,
        email: email,
        password: hashPwd,
      });
      return user.save();
    })
    .then((result) => {
      res
        .status(201)
        .json({
          message: "Signup successful",
          userId: result._id,
          email: email,
        });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  console.log(password)
  console.log(email)
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email was not found.");
        error.statusCode = 422;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password.");
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign(
        { email: loadedUser.email, userId: loadedUser._id.toString() },
        "thisshouldbeaverylongstringrecommended",
        { expiresIn: "1h" }
      );
      res.status(200).json({token: token, userId: loadedUser._id.toString()})
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
