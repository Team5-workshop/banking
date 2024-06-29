const express = require("express");
const router = express.Router();
const setup = require("../db_setup");
const sha = require("sha256");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");

// 회원가입 화면
router.get("/user/signup", (req, res) => {
  res.render("signup", { data: {}, user: req.session.user });
});

// 회원가입 처리
router.post("/user/signup", async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const { user_id, user_email, user_name, user_pw } = req.body;

  try {
    const existingUser = await mongodb.collection("user").findOne({ user_id });

    if (existingUser) {
      res.render("signup", {
        data: { msg: "ID가 중복되었습니다." },
        user: req.session.user,
      });
    } else {
      const generateSalt = (length = 16) => {
        return crypto.randomBytes(length).toString("hex");
      };
      const salt = generateSalt();
      const hashedPw = sha(user_pw + salt);

      const newUser = { user_id, user_email, user_pw: hashedPw, user_name };

      const result = await mongodb.collection("user").insertOne(newUser);

      if (result.insertedId) {
        const sql = "INSERT INTO UserSalt(userid, salt) VALUES(?, ?)";
        mysqldb.query(sql, [user_id, salt], (err) => {
          if (err) {
            console.log("Salt 저장 실패:", err);
          } else {
            console.log("Salt 저장 성공");
          }
        });

        console.log("회원가입 성공");
        res.redirect("/user/login");
      } else {
        console.log("회원가입 실패");
        res.render("signup", {
          data: { alertMsg: "회원가입 실패" },
          user: req.session.user,
        });
      }
    }
  } catch (err) {
    console.log("회원가입 실패:", err);
    res.render("signup", {
      data: { alertMsg: "회원가입 실패" },
      user: req.session.user,
    });
  }
});

// 로그인 화면
router.get("/user/login", (req, res) => {
  res.render("login", { data: {}, user: req.session.user || null });
});

// 로그인 처리
router.post("/user/login", async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const { user_id, user_pw } = req.body;

  try {
    const user = await mongodb.collection("user").findOne({ user_id });

    if (user) {
      const sql = "SELECT salt FROM UserSalt WHERE userid=?";
      mysqldb.query(sql, [user_id], (err, rows) => {
        if (err) {
          console.log("Salt 조회 실패:", err);
          return res.render("login", {
            data: { alertMsg: "로그인 실패" },
            user: null,
          });
        }

        const salt = rows[0].salt;
        const hashedPw = sha(user_pw + salt);

        if (user.user_pw === hashedPw) {
          req.session.user = {
            user_id: user._id.toString(), // ObjectId를 문자열로 저장
            user_name: user.user_name,
          };
          res.cookie("uid", user_id);
          res.redirect("/");
        } else {
          res.render("login", {
            data: { alertMsg: "비밀번호가 틀렸습니다." },
            user: null,
          });
        }
      });
    } else {
      res.render("login", {
        data: { alertMsg: "사용자를 찾을 수 없습니다." },
        user: null,
      });
    }
  } catch (err) {
    console.log("로그인 실패:", err);
    res.render("login", { data: { alertMsg: "로그인 실패" }, user: null });
  }
});

// 로그아웃 처리
router.get("/user/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("로그아웃 실패:", err);
      return res.redirect("/");
    }
    res.clearCookie("uid", { path: "/" });
    res.redirect("/user/login");
  });
});

module.exports = router;
