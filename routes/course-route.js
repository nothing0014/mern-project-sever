const router = require("express").Router();
const Course = require("../models/course-model");
const courseValidation = require("../validation").courseValidation;

router.use((req, res, next) => {
  console.log("course route正在接受一個request...");
  next();
});

//獲得系統中的所有課程
router.get("/", async (req, res) => {
  try {
    let foundCourses = await Course.find({})
      .populate("instructor", ["username", "email"])
      .exec();
    if (foundCourses) {
      return res.send({ message: "以下為課程列表", foundCourses });
    } else {
      return res.send("目前尚無課程註冊。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

// 用講師id尋找課程
router.get("/instructor/:_instructor_id", async (req, res) => {
  try {
    let { _instructor_id } = req.params;
    let foundCourses = await Course.find({ instructor: _instructor_id })
      .populate("instructor", ["username", "email"])
      .exec();
    if (foundCourses) {
      return res.send({ message: "以下為課程列表", foundCourses });
    } else {
      return res.send("目前此老師尚未開課。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

// 用學生id尋找課程
router.get("/student/:_student_id", async (req, res) => {
  try {
    let { _student_id } = req.params;
    let foundCourses = await Course.find({ students: _student_id })
      .populate("instructor", ["username", "email"])
      .exec();
    if (foundCourses) {
      return res.send({ message: "以下為課程列表", foundCourses });
    } else {
      return res.send("目前此學生尚未註冊課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

// 用課程id尋找課程
router.get("/:courseID", async (req, res) => {
  try {
    let { courseID } = req.params;
    let foundCourse = await Course.findOne({ _id: courseID })
      .populate("instructor", ["username", "email"])
      .exec();
    if (foundCourse) {
      return res.send({ message: "找到課程", foundCourse });
    } else {
      return res.status(400).send("找不到該課程");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

//用課程名稱尋找課程
router.get("/findbyname/:name", async (req, res) => {
  try {
    let { name } = req.params;
    let foundCourse = await Course.find({ title: name })
      .populate("instructor", ["username", "email"])
      .exec();
    if (foundCourse) {
      return res.send({ message: "找到課程", foundCourse });
    } else {
      return res.status(400).send("找不到該課程");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

//新增課程
router.post("/", async (req, res) => {
  //驗證數據符合規範
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (req.user.isStudent()) {
    return res
      .status(400)
      .send("只有講師才能發布新課程。若你已經是講師，請透過講師帳號登入。");
  }

  let { title, description, price } = req.body;
  try {
    let newCourse = new Course({
      title,
      description,
      price,
      instructor: req.user._id,
    });
    let savedCourse = await newCourse.save();
    return res.send({ message: "新課程已經保存", savedCourse });
  } catch (e) {
    return res.status(500).send("無法創建課程。");
  }
});

// 讓學生透過課程id來註冊新課程
router.post("/enroll/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let course = await Course.findOne({ _id }).exec();
    if (course.students.includes(req.user._id)) {
      return res.send({ result: "failed" });
    } else {
      course.students.push(req.user._id);
      await course.save();
      return res.send({ result: "success" });
    }
  } catch (e) {
    return res.send(e);
  }
});
//更改課程
router.patch("/:courseID", async (req, res) => {
  //驗證數據符合規範
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //確認課程存在
  try {
    let { courseID } = req.params;
    let foundCourse = await Course.findOne({ _id: courseID }).exec();
    if (!foundCourse) {
      return res.status(400).send("找不到該課程");
    }
    //使用者必須是此課程講師才能修改此課程
    if (foundCourse.instructor.equals(req.user._id)) {
      let updatedCourse = await Course.findOneAndUpdate(
        { _id: courseID },
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );
      return res.send({ message: "課程已經被修改", updatedCourse });
    } else {
      return res.status(403).send("只有此課程講師才能編輯課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

//取消註冊課程
router.patch("/dropOut/:courseID", async (req, res) => {
  //確認課程存在
  try {
    let { courseID } = req.params;
    let foundCourse = await Course.findOne({ _id: courseID }).exec();
    console.log("正在取消註冊課程...");
    if (!foundCourse) {
      return res.status(400).send("找不到該課程");
    }
    //使用者必須是此課程學生才能取消註冊此課程
    if (foundCourse.students.includes(req.user._id)) {
      foundCourse.students.splice(
        foundCourse.students.indexOf(req.user._id),
        1
      );
      let updatedCourse = await Course.findOneAndUpdate(
        { _id: courseID },
        {
          students: foundCourse.students,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      return res.send({ message: "已經取消註冊課程", updatedCourse });
    } else {
      return res.status(403).send("只有此課程的學生才能取消註冊課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

//刪除課程
router.delete("/:_id", async (req, res) => {
  //確認課程存在
  try {
    let { _id } = req.params;
    let foundCourse = await Course.findOne({ _id }).exec();
    if (!foundCourse) {
      return res.status(400).send("找不到該課程");
    }
    //使用者必須是此課程講師才能刪除此課程
    if (foundCourse.instructor.equals(req.user._id)) {
      let courseDeleted = await Course.findOneAndDelete({ _id }).exec();
      return res.send({ meassge: "課程已經被刪除", courseDeleted });
    } else {
      return res.status(403).send("只有此課程講師才能刪除課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

module.exports = router;
