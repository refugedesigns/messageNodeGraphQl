const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const { clearImage } = require("../util");

module.exports = {
  createUser: async function ({ userInput }, req) {
    const email = userInput.email;
    const name = userInput.name;
    const password = userInput.password;
    const errors = [];
    if (!validator.isEmail(email) || validator.isEmpty(email)) {
      errors.push({ message: "Email is invalid" });
    }
    if (validator.isEmpty(name) || !validator.isLength(name, { min: 5 })) {
      errors.push({ message: "Invalid username!" });
    }
    if (validator.isEmpty(password) || !validator.isStrongPassword(password)) {
      error.push({ message: "Invalid or weak password!" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      const error = new Error("User exists already!");
      throw error;
    }
    const hashPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      name: name,
      password: hashPassword,
    });
    const createdUser = await user.save();

    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("No user found with this email!");
      error.status = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect!");
      error.status = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "thisshouldbeaverylongstring",
      { expiresIn: "1h" }
    );

    return {
      token: token,
      userId: user._id.toString(),
    };
  },
  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("creator")
      .skip((page - 1) * perPage)
      .limit(perPage);
    if (!posts) {
      const error = new Error("No post found.");
      error.code = 404;
      throw error;
    }
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },
  post: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("No post found.");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const title = validator.trim(postInput.title);
    const content = validator.trim(postInput.content);
    const imageUrl = validator.trim(postInput.imageUrl);
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid." });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid." });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    console.log(req.userId);
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user!");
      error.code = 401;
      throw error;
    }
    const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: user,
    });
    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const title = validator.trim(postInput.title);
    const content = validator.trim(postInput.content);
    const imageUrl = validator.trim(postInput.imageUrl);
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid." });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid." });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    // const postId = mongoose.Types.ObjectId(id)
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found.");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw error;
    }
    post.title = title;
    post.content = content;
    if (imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found.");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw error;
    }
    // const imageUrl = post.imageUrl.replace(/\\/g, "\\\\");
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },
  userStatus: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found.");
      error.code = 404;
      throw error;
    }
    return {
      ...user._doc,
      _id: user._id.toString(),
    };
  },
  updateUserStatus: async function ({ status }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
     if (!user) {
       const error = new Error("No user found.");
       error.code = 404;
       throw error;
     }
     if(user._id.toString() !== req.userId.toString()) {
       const error = new Error("Not authorized!")
       error.code = 403
       throw error
     }
     user.status = status
     const updatedUser = await user.save()
     return {
       ...updatedUser._doc,
       _id: updatedUser._id.toString()
     }
  },
};
