const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const uniqid = require("uniqid");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middleware/is-auth");
const {clearImage} = require("./util")

const app = express();

const fileStorage = multer.diskStorage({
  destination: "images",
  filename: (req, file, cb) => {
    cb(null, uniqid("", `-${file.originalname}`));
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(express.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated!");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No image provided." });
  }
  if (req.body.oldPath) {
    const oldPath = req.body.oldPath.replace( "/","\\");
    clearImage(oldPath);
  }
  const imageUrl = req.file.path.replace("\\", "/");
  console.log(req.file);
  return res.status(201).json({ message: "File Stored.", filePath: imageUrl });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occured!";
      const code = err.originalError.code || 500;
      return {
        message: message,
        status: code,
        data: data,
      };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.uv3ti.mongodb.net/messages?retryWrites=true&w=majority`
  )
  .then((res) => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });


