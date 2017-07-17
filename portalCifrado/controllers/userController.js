var Web3 = require("./web3");
var keyFile = require("./keyFile");
var fs = require('fs');
var crypto = require('crypto');
const PASSWORD_LEN = 16;
const ALGORITHM = 'aes-128-ecb';
var ipfs = require('ipfs-api')();
var Readable = require('readable-stream')
var QRCode = require('yaqrcode')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)


// Formulario para registrar nuevo usuario
exports.new = function(req, res, next) {

    var user = {
        username: "",
        password: ""
};

    res.render('users/new', {user: user});
};

// Crear nuevo usuario
exports.create = function(req, res) {

for(var x=0; x<req.files.length;x++) {

    var username = req.body.username;
    console.log(username);
    var password = req.body.password;
    console.log(password);
    var pubKey = fs.readFileSync('./uploads/'+req.files[x].filename);

    uploadIPFS(pubKey).then(function(hash) {
            console.log("SUCCESS: PubKey subido a IPFS: "+ hash);
            var length = hash.length;
            var hash1 = hash.substring(0, length/2);
            var hash2 = hash.substring((length+1)/2, length);
            console.log("HASH1: "+hash1);
            console.log("HASH2: "+hash2);
            
            addUser(username, password, hash1, hash2).then(function(result) {
                res.render('index');
            });                                  
    });

    }

};

// Añadir el nuevo usuario a Ethereum
var addUser = function(userName, password, hash1, hash2) {

    var CompanyContract = Web3.CompanyContract;
    var accountAddress = Web3.accountAddress;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
         
    return new Promise(function(result, reject) {

    contractInstance.addUser.sendTransaction(userName,
                                             password,
                                             hash1,
                                             hash2,
                                             { from: accountAddress,
                                               gas: 500000
                                             },
                                             function(error, result) { 
                                                  if(!error) {
                                                     console.log("USUARIO1: "+contractInstance.users(userName));
                                                     console.log('result: ' + result );
                                                     return result;
                                                  } else {
                                                     return null;
                                                  }
                        
                                             }
                            );
    });
}

// Método auxiliar para subir ficheros a IPFS
var uploadIPFS = function(fichero) {

    var hash = "";

    return new Promise(function(result, reject) {
        ipfs.files.add(
                   fichero,
                   function (error, success) {
                        if(!error) {
                            success.forEach(function(file) {
                                hash = file.path;
                                result(hash);
                            });
                        } else {
                            reject(error);
                        }
                    });
        });
}