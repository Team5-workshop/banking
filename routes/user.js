const express = require("express");
const router = express.Router();
const setup = require("../db_setup");
const sha = require("sha256");

// 회원가입 화면
router.get("/user/signup", (req, res) => {
  res.render("signup", { data: {} });
});

// 회원가입 처리
router.post("/user/signup", async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const { userid, useremail, username } = req.body;

  try {
    const existingUser = await mongodb.collection("user").findOne({ userid });

    if (existingUser) {
      res.render("signup", { data: { msg: "ID가 중복되었습니다." } });
    } else {
      const generateSalt = (length = 16) => {
        const crypto = require("crypto");
        return crypto.randomBytes(length).toString("hex");
      };
      const salt = generateSalt();
      const hashedPw = sha(req.body.userpw + salt);

      const newUser = { userid, useremail, userpw: hashedPw, username };

      const result = await mongodb.collection("user").insertOne(newUser);

      if (result) {
        const sql = "INSERT INTO UserSalt(userid, salt) VALUES(?, ?)";
        mysqldb.query(sql, [userid, salt], (err) => {
          if (err) {
            console.log("Salt 저장 실패:", err);
          } else {
            console.log("Salt 저장 성공");
          }
        });

        console.log("회원가입 성공");
        res.redirect("/");
      } else {
        console.log("회원가입 실패");
        res.render("signup", { data: { alertMsg: "회원가입 실패" } });
      }
    }
  } catch (err) {
    console.log("회원가입 실패:", err);
    res.render("signup", { data: { alertMsg: "회원가입 실패" } });
  }
});

// 로그인 화면
router.get("/user/login", (req, res) => {
  res.render("login", { data: {} });
});

// 로그인 처리
router.post("/user/login", async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const { userid, userpw } = req.body;

  try {
    const user = await mongodb.collection("user").findOne({ userid });

    if (user) {
      const sql = "SELECT salt FROM UserSalt WHERE userid=?";
      mysqldb.query(sql, [userid], (err, rows) => {
        if (err) {
          console.log("Salt 조회 실패:", err);
          return res.render("login", { data: { alertMsg: "로그인 실패" } });
        }

        const salt = rows[0].salt;
        const hashedPw = sha(userpw + salt);

        if (user.userpw === hashedPw) {
          console.log(user);
          req.session.user = user; // serialize
          res.cookie("uid", userid);
          res.redirect("/");
          console.log(req.session.user); // serialize
        } else {
          res.render("login", { data: { alertMsg: "비밀번호가 틀렸습니다." } });
        }
      });
    } else {
      res.render("login", { data: { alertMsg: "사용자를 찾을 수 없습니다." } });
    }
  } catch (err) {
    console.log("로그인 실패:", err);
    res.render("login", { data: { alertMsg: "로그인 실패" } });
  }
});

// 로그아웃 처리
router.get("/user/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("uid");
  res.redirect("/");
});

module.exports = router;
