const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const authRoute = require("./routes").auth;
const courseRoute = require("./routes").courseRoute;
const passport = require("passport");
require("./config/passport")(passport);
const cors = require("cors");

//連結MongoDB
mongoose
  .connect(process.env.MONGODB_CONNECTION)
  .then(() => {
    console.log("連結mongodb...");
  })
  .catch((e) => {
    console.log(e);
  });

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/user", authRoute);
// course Route應該被jwt保護
// 如果request header 內部沒有jwt，則request將被視為unauthorized
app.use(
  "/api/courses",
  passport.authenticate("jwt", { session: false }),
  courseRoute
);

//只有登入系統的人，才能夠去新增或是註冊課程

app.listen(8080, () => {
  console.log("後端伺服器聆聽在port 8080...");
});
