const router = require("express").Router();
const db = require("../db_setup");

// 특정 사용자의 거래 내역을 조회하는 라우터
router.get("/transactions", (req, res) => {
  const userId = req.session.userId;
    console.log(`${userId}가 거래내역을 확인하려 했습니다.`)
  if (!userId) {
    return res.redirect("/user/login");
  }

  db.all("SELECT * FROM transactions WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render("transactions", { transactions: rows });
  });
});

module.exports = router;
