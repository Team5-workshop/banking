const router = require("express").Router();
const setup = require("../db_setup");
const sha = require("sha256");




router.get("/logout", (req, res) => {
    console.log("logout");
    req.session.destroy();
    res.redirect("/");
  });

  
module.exports = router;
