var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/', function(req, res) {
  res.json({msg : ['apple','banana','orange']});
});

module.exports = router;
