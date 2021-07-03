const express = require("express");
const { body } = require("express-validator");

const feedController = require("../controllers/feed");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/posts", isAuth, feedController.getPosts);

router.get("/status", isAuth, feedController.getUserStatus);

router.post(
  "/create-post",
  isAuth,
  [
    body("title").trim().isLength({ min: 5 }).not().isEmpty(),
    body("content").trim().isLength({ min: 5 }).not().isEmpty(),
  ],
  feedController.createPost
);

router.get("/post/:postId", isAuth, feedController.getPost);

router.put(
  "/post/:postId",
  isAuth,
  [
    body("title").trim().isLength({ min: 5 }).not().isEmpty(),
    body("content").trim().isLength({ min: 5 }).not().isEmpty(),
  ],
  feedController.updatePost
);

router.put(
  "/status",
  isAuth,
  [body("status").trim().notEmpty()],
  feedController.updateUserStatus
);

router.delete("/post/:postId", isAuth, feedController.deletePost);

module.exports = router;
