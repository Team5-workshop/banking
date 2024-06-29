const express = require("express");
const router = express.Router();
const setup = require("../db_setup");
const sha = require("sha256");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");

// 계좌번호 자동발급 (33??-??-??????)
function account_Number() {
  const part1 = `33${Math.floor(10 + Math.random() * 90)}`;
  const part2 = Math.floor(10 + Math.random() * 90);
  const part3 = Math.floor(100000 + Math.random() * 900000);
  return `${part1}-${part2}-${part3}`;
}

// 로그인 상태 확인 미들웨어
function check(req, res, next) {
  if (!req.session.user) {
    res.render("login", {
      data: { alertMsg: "먼저 로그인을 해주세요" },
      user: null,
    });
    return;
  }
  next();
}

// 계좌 정보 조회
router.get("/account", check, async (req, res) => {
  const user_id = req.session.user.user_id;
  const { mongodb } = await setup();

  mongodb
    .collection("account")
    .find({ user_id: new ObjectId(user_id) }) // user_id를 ObjectId로 변환하여 사용
    .toArray()
    .then((accounts) => {
      // 잔액 포맷팅
      accounts.forEach((account) => {
        account.balanceFormatted = account.balance.toLocaleString();
      });
      res.render("accountList", { accounts, user: req.session.user });
    })
    .catch((err) => {
      console.error("계좌 정보 조회 실패:", err);
      return res.status(500).send("계좌 정보를 조회하는 중 오류가 발생했습니다.");
    });
});

// 로그인 상태를 확인한 후 계좌 등록 페이지를 표시
router.get("/account/enter", check, (req, res) => {
  res.render("accountEnter", { user_id: req.session.user.user_id });
});

// 로그인 상태를 확인한 후 새로운 계좌를 등록
router.post("/account/enter", check, async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const user_id = req.session.user.user_id;
  const { account_pw, balance } = req.body;

  // 솔트 생성
  const generateSalt = (length = 16) => {
    return crypto.randomBytes(length).toString("hex");
  };
  const salt = generateSalt();
  const hashedPw = sha(account_pw + salt);

  let account_number;
  let isUnique = false;

  // 중복 계좌번호 생성 방지
  while (!isUnique) {
    account_number = account_Number();
    const existingAccount = await mongodb.collection("account").findOne({ account_number });
    if (!existingAccount) {
      isUnique = true;
    }
  }

  const newAccount = {
    account_number,
    account_pw: hashedPw,
    balance: parseInt(balance),
    user_id: new ObjectId(user_id), // user_id를 ObjectId로 변환하여 사용
    account_date: new Date(),
  };

  try {
    const result = await mongodb.collection("account").insertOne(newAccount);

    if (result.insertedId) {
      const sql = "INSERT INTO AccountSalt(account_id, account_salt) VALUES(?, ?)";
      mysqldb.query(sql, [result.insertedId.toString(), salt], (err) => {
        if (err) {
          console.log("Salt 저장 실패:", err);
        } else {
          console.log("Salt 저장 성공");
        }
      });

      res.redirect("/account");
    } else {
      res.render("login", { data: { alertMsg: "DB 오류로 계좌 등록에 실패했습니다." }, user: null });
    }
  } catch (err) {
    console.log("계좌 등록 실패:", err);
    res.render("login", { data: { alertMsg: "계좌 등록 중 오류가 발생했습니다." }, user: null });
  }
});

module.exports = router;
