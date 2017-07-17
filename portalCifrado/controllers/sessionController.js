var url = require('url');
var Web3 = require("./web3");

var contractAddress = Web3.contractAddress;





// Método auxiliar para autenticar al usuario a través del contrato Ethereum
var authenticate = function(login, password) {
 	
 	var CompanyContract = Web3.CompanyContract;
    var accountAddress = Web3.accountAddress;
    var contractInstance = CompanyContract.at(contractAddress);

    return new Promise(function(result, reject) {
        contractInstance.checkLogin(
                            login,
                            password,
    						function(error, ok) { 
    							if(!error) {
    								console.log('result: ' + ok );
    								result(ok);
      							} else {
           							reject(error);
       							}
    						});
    });
 };



// GET /session   -- Formulario de login
 exports.new = function(req, res, next) {
 
     // Donde ire despues de hacer login:
     var redir = req.query.redir || url.parse(req.headers.referer || "/").path;
 
     // No volver aqui mismo (el formulario de login).
     if (redir === '/session') {
        redir = "/";
     }
 
     res.render('sessions/new');
 };
 
// POST /session   -- Crear la sesion si usuario se autentica
 exports.create = function(req, res, next) {
 
     var redir = req.body.redir || '/'
 
     var login = req.body.login;
     var password = req.body.password;

 
     authenticate(login, password)
     .then(function(result) {
         if (result == 1) {

             // Crear req.session.user y guardar campos id y username
             // La sesión se define por la existencia de: req.session.user
             req.session.user = {
                 id: login
             };
 
             res.redirect(redir); // redirección a redir

         } else {
             console.log('error', 'La autenticación ha fallado. Reinténtelo otra vez.');
 
             res.render('session/new', { redir: redir });
 
         }
     })
     .catch(function(error) {
         console.log('error', 'Se ha producido un error: ' + error);
         next(error);
     });
 };


