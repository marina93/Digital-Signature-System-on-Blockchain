
var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({dest: './uploads/'});

var contractController = require('../controllers/contractController');
var sessionController = require('../controllers/sessionController');
var userController = require('../controllers/userController');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Portal de firma y cifrado' });
});

router.get('/users/new', userController.new); // Formulario sign up
router.post('/users', upload.array('file', 1), userController.create);
//router.post('/users',userController.create);

// Definición de las rutas de sesión
router.get('/session',    sessionController.new);     // formulario login
router.post('/session', 	sessionController.create); // crear sesión

// Definición de rutas de usuarios y contratos
router.get('/users/:userId/contracts', contractController.index);
router.get('/users/:userId/contracts/new', contractController.new);
router.post('/contracts/:contractId', contractController.show);
router.post('/contracts/:contractId/signatures/new', contractController.newSignature);
router.post('/contracts/:contractId/signatures/new/showKey', contractController.showKey);

router.post('/users/:userId/contracts', upload.array('file', 1), contractController.create);

router.get('/setup', contractController.setup);



module.exports = router;
