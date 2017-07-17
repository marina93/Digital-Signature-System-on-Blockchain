
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
var base64 = require('base-64');
var pad = require('pad');



var contractAddress = Web3.contractAddress;


var forge = require('node-forge');

var rsa = forge.pki.rsa;

var pki = forge.pki;



var privKey = keyFile.privKey;
var pubKey = keyFile.pubKey;

// GET /setup
exports.setup = function(req, res, next) {

    deployContract().then(function(address) {
        console.info("La direccion es:" + ((address == null || address == undefined) ? 'VACIO' : address));
            
        res.send('El contrato se ha desplegado correctamente en la dirección '+ address);
    })
    .catch(function(error) {
        console.log("EERRROORRR", error);
    });
};

// GET /contracts
exports.index = function(req, res, next) {

  var CompanyContract = Web3.CompanyContract;
  var contractAddress = Web3.contractAddress;
  var contractInstance = CompanyContract.at(contractAddress);
  var SignatureContract = Web3.SignatureContract;
 
  var userId = req.session.user.id;
  var nombres = [];
  var addresses = [];
  var descripcion = null;
  var length = null;
  var addresses = [];
  var contratos = [[]];

  console.log(userId);
// Promesa que devuelve el número de contratos que tiene el usuario
  countContracts(userId).then(function(result){

      length = result;
      contratos = new Array(length);

      for (var i = 0; i < length; i++) {
        //Para cada contrato, se crea un array de dos posiciones. 
        // Más adelante se guardará el address en la posición 0, y el nombre del contrato en la posición 1
        contratos[i] = new Array(2);
      }

      var promesas = [];
      for(var j = 0; j < length; j++) {
        // Array de promesas. Obtener cada uno de los contratos(address) del usuario. 
          promesas.push(getContrato(userId, j));

      }
      // Devuelve promesa que se evalúa cuando todas las promesas del array han devuelto un resultado
      // Es decir, cuando se tienen todos los contratos(address) del usuario
       return Promise.all(promesas);

  }).then(function(contracts) {
       addresses = contracts;
       console.log("ADDRESSES: "+ addresses);
       var promesas2 = [];
       for (var i = 0; i < length; i++) {
        // Para cada contrato, se guarda su address 
            contratos[i][0] = addresses[i];
            var signatureAddress = contratos[i][0];
            var signatureInstance = SignatureContract.at(signatureAddress);
            // Array de promesas. Contiene el nombre de cada contrato
            promesas2.push(getContractName(signatureInstance));
        }
     return Promise.all(promesas2);

 }).then(function(names) {
        console.log("NOMBRES: "+names);
      nombres = names;
      for (var i = 0; i< nombres.length; i++) {
        // Para cada contrato, se guarda su nombre
          contratos[i][1] = nombres[i];
    }
      res.render('contracts/index', {contratos: contratos,
                                     length: length});
});
     
}

// POST /contracts

exports.create = function(req, res) {

    for(var x=0; x<req.files.length;x++) {

    // ------- Cifrar y descifrar ------- //
    var doc = fs.readFileSync('./uploads/'+req.files[x].filename);
    var iv = new Buffer('');
    var password = pad(PASSWORD_LEN, "12345");

    // Password encriptada con la clave pública
    var pwEncrypt = base64.encode(pubKey.encrypt(password));

    var cipher = crypto.createCipheriv(ALGORITHM, password, iv);
    var cbuf1 = cipher.update(doc);
    var cbuf2 = cipher.final();
    var encriptado = Buffer.concat([cbuf1, cbuf2]);

    // Fichero encriptado con la password, formato base64
    var encriptadobase64 = encriptado.toString('base64');


    // ------- Parámetros de Ethereum contract ------- //
    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    
        
    // ------- Parámetros del documento a subir ------- //
    var userId = req.session.user.id;
    var descripcion = req.body.descripcion; 
    var codigo = req.body.codigo;
    var participants = "";
   
    var promesas = [];
 
    promesas.push(uploadIPFS(Buffer.from(pwEncrypt)));
    promesas.push(uploadIPFS(Buffer.from(encriptadobase64)));

    return Promise.all(promesas)
    .then(function(results) {

        var pHash = results[0];
        console.log("PHASH: "+ pHash);
        var hash = results[1];
        console.log("HASH: "+ hash);

        var length1 = pHash.length;
        var pHash1 = pHash.substring(0, length1/2);
        var pHash2 = pHash.substring((length1+1)/2, length1);
        
        var length2 = hash.length;
        var hash1 = hash.substring(0, length2/2);
        var hash2 = hash.substring((length2+1)/2, length2);

        deploySignature(codigo, userId, descripcion, hash1, hash2, pHash1, pHash2).then(function(address) {
                console.log("SUCCESS: Nuevo contrato Signature despleado en Ethereum: "+ address);
                res.render('contracts/new');
        });

    });
        
    }
}

// GET /users/:userId/contracts/new
exports.new = function(req, res, next) {

    res.render('contracts/new');
}

// GET /contracts/:contractId
exports.show = function (req, res, next) {

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);

    var SignatureContract = Web3.SignatureContract;
    var signatureAddress = req.body.address;
    var signatureInstance = SignatureContract.at(signatureAddress); 

    var contractId = req.body.contractId;
    var userId = req.session.user.id;
    var address = req.body.address;
    var p = req.body.p;
    var participants = [];

    var info = [];
    var name = "";

    var promesas = [];
    var promesas2 = [];

    if (p!="0") {

        var participante = req.body.participante;

        // Hash firmado por el participante
        var cHash = req.body.cHash;
        var length = cHash.length;
        var cHash1 = cHash.substring(0, length/2);
        var cHash2 = cHash.substring((length+1)/2, length);

        // Promesa par añadir participante     results[0]
        promesas.push(addParticipant(participante, signatureAddress, cHash1, cHash2));

    }

    // Promesa para obtener la información del contrato Signature    results[1 ]
    promesas.push(getInfo(signatureInstance));

    // Promesa que cuenta el número de participantes en el cotnrato Signature
    participantsCount(signatureAddress).then(function(result) {

        var participantsLength = result;

        for(var i = 0; i<participantsLength; i++) {
            // Promesa que obtiene todos los participantes del contrato Signature
            promesas2.push(getParticipants(signatureAddress,i));
        }

        return Promise.all(promesas2).then(function(promesas2) {

            return Promise.all(promesas).then(function(results) {

            if (p!="0") {
                info = results[1];
            }
            else{
                info = results[0];
            }
                res.render('contracts/show', {info: info,
                                              userId: userId,
                                              contractId: contractId,
                                              address: address,
                                              participants: promesas2});

                });
            });   
        });   
       
    // Una vez han terminado todas las promesas, se devuelven sus resultados
    

     
};

// GET /contracts/:contractId/signatures/new
exports.newSignature = function (req, res, next) {

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    var contractId = req.body.contractId;
    var descripcion = req.body.descripcion;
    var hash = req.body.hash;
    var address = req.body.address;
    console.log("HASH EN newSignature: "+ hash);
    var names = [];
    var url = "http://localhost:8080/ipfs/" + hash;
    countUsers(contractInstance).then(function(users) {
        var promesas = [];
        for(var i = 0; i< users; i++) {
            promesas.push(getUserName(contractInstance, i))
        }
       return Promise.all(promesas)
    }).then(function(nombres) {

        for (var i = 0; i < nombres.length; i++) {
          if(nombres[i] != nombres[i-1]){
              names.push(nombres[i]);
          }
        }

        res.render('contracts/signatures/new', {names: names, 
                                                contractId: contractId, 
                                                descripcion: descripcion, 
                                                hash: hash,
                                                address: address,
                                                url: url});
    });   
};

exports.showKey = function(req, res, next) {

  var CompanyContract = Web3.CompanyContract;
  var contractAddress = Web3.contractAddress;
  var contractInstance = CompanyContract.at(contractAddress);

  var SignatureContract = Web3.SignatureContract;
  var signatureAddress = req.body.address;
  var signatureInstance = SignatureContract.at(signatureAddress); 

  var userId = req.body.userId;

  var promesas = [];

  // Obtenemos el Hash de IPFS donde se encuentra almacenada la password
  promesas.push(getPasswordHash1(signatureInstance));
  promesas.push(getPasswordHash2(signatureInstance));

  // Obtenemos el hash de IPFS donde se encuentra almacenada la public Key del usuario
  promesas.push(getKeyHash1(contractInstance, userId));
  promesas.push(getKeyHash2(contractInstance, userId));

  return Promise.all(promesas).then(function(hashes) {
    var pHash1 = hashes[0];
    var pHash2 = hashes[1];
    var pHash = pHash1.concat(pHash2);
    console.log("pHash: "+ pHash);

    var kHash1 = hashes[2];
    var kHash2 = hashes[3];
    var kHash = kHash1.concat(kHash2);
    console.log("kHash: "+ kHash);

     // Descargamos la password de IPFS
     downloadIPFS(pHash).then(function(passwordPath) {

            console.log("ESTOY EN 1 ", passwordPath);

            var pBase64 = fs.readFileSync(passwordPath);
            var password = privKey.decrypt(base64.decode(pBase64));
          
            console.log("ESTOY EN 2: ", password);

            // Descargamos la public Key del usuario de IPFS
            downloadIPFS(kHash).then(function(pubKeyPath) {

                console.log("ESTOY EN 3: ", pubKeyPath);

                var pubPemUser = fs.readFileSync(pubKeyPath);
                console.log("PUBKEY: "+ pubPemUser);

                var pubKeyUser = pki.publicKeyFromPem(pubPemUser);

                // Ciframos la password con la public key del usuario
                var passwordUser = base64.encode(pubKeyUser.encrypt(password)); 

                fs.writeFileSync("key.txt", passwordUser);
                console.log("PASSWORD USER: " + passwordUser);

                res.render('contracts/signatures/showKey', {passwordUser: passwordUser,
                                                            userId: userId});


            });

        });

    }).catch(function(error) {
        console.log("Errorrrr 33", error);
        res.sendStatus(400);
       });

}
// -------------------------------------------------------------------------------------------------------------//

// ----------- FUNCIONES AUXILIARES ------------ //


// ----------- Funciones Auxiliares IPFS --------- //

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

// Método auxiliar para descargar ficheros de IPFS
var downloadIPFS = function(hash) {

return new Promise(function(result, reject) { 

    ipfs.files.get(hash, function (err, stream) {
        stream.on('data', (file) => {
    // write the file's path and contents to standard out
            var readable = file.content;
            var writable = fs.createWriteStream('./downloads/' + file.path);
            
            readable.pipe(writable);

            readable.on('error', function(error) {
                writable.close();
                reject(error);
            })
            writable.on('finish', function(error) {
              writable.close();
              result('./downloads/' + file.path);
            })
        })
    })
  })
}





// ----------- Funciones Auxiliares Ethereum --------- // 


// Método auxiliar para añadir participantes
var addParticipant = function(participant, signatureAddress, cHash1, cHash2) {

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    var accountAddress = Web3.accountAddress;
    
    return new Promise(function(result, reject) {
        contractInstance.addParticipant.sendTransaction(
                                        participant,
                                        signatureAddress,
                                        cHash1,
                                        cHash2,
                                        { from: accountAddress,
                                          gas: 500000
                                         },
                                         function(error, address) {
               
                                                if (error) {

                                                    console.log(error);
                                                    console.log("error", "Ha ocurrido un error intentando añadir un nuevo participante");                  
                                                    reject(error);
                                                 return;

                                            } else {

                                                 if(!address) {
                                                    console.log("TMP - Contract transaction send: waiting to be mined...");
                                                 } else {
                                                    console.log("Nuevo participante añadido " + address);
                                                    result(address);                                             
                                                 }
                

                                            }
                                });
    });

}

// Método auxiliar para obtener los participantes de un contrato
var getParticipants = function(signatureAddress, indice) {

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    var accountAddress = Web3.accountAddress;

    return new Promise(function(result, reject) {
        contractInstance.participantsId(signatureAddress,
                                      indice,
                                      function(error, success) {
                                          if(!error) {
                                                name = key2str(success);
                                                console.log("PARTICIPANTS: "+ name);
                                                console.log("PPPPARTICIPANTE: "+ success);
                                                result(name);
                                          } else {
                                                reject(error);
                                          }
        });
    });
}

// Método auxiliar que cuenta el número de participantes de un contrato Signature
var participantsCount = function(signatureAddress) {

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    var accountAddress = Web3.accountAddress;

    return new Promise(function(result, reject) {
        contractInstance.participantsCount(signatureAddress,
                                           function(error, success) {
                                           if(!error) {
                                                console.log("NÚMERO DE PARTICIPANTES: "+ success);
                                                result(success);
                                          } else {
                                                reject(error);
                                          }
        });
    });

}

// Método auxiliar que devuelve el nombre de un usuario situado en el índice del array indicado
var getUserName = function(contractInstance, indice) {
    return new Promise(function(result, reject) {
        contractInstance.userIds(indice, 
                                function(error, success) {
                                    if(!error) {
                                        name = key2str(success);
                                        console.log("NAME: "+name);
                                        result(name);
                                    } else {
                                        reject(error);
                                    }
                                });
    });
} 

// Método que devuelve la información de un contrato
var getInfo = function(contractInstance) {

    var name = "";
    var hash1 = "";
    var hash2 = "";
    var descripcion = "";
    var info = [];
    var hash = "";

    return new Promise(function(result, reject) {
         contractInstance.info(function(error, success) { 
                             if(!error) {
                                 name = key2str(success[0]);
                                 info.push(name);
                                 console.log("NAME: "+name);

                                 hash1 = key2str(success[1]);
                                 console.log("HASH1: "+hash1);

                                 hash2 = key2str(success[2]);
                                 console.log("HASH2: "+hash2);

                                 hash = hash1.concat(hash2);
                                 info.push(hash); 

                                 descripcion = key2str(success[3]);
                                 info.push(descripcion);
                                 console.log("DESCRIPCION: "+descripcion);
                                 
                                 console.log("INFO: "+info);
                                 result(info);
                            } else {
                                 reject(error);
                            }
        });
    });
}

// Método auxiliar para contar los contratos desplegados de un usuario
var countUsers = function(contractInstance) {
         
    return new Promise(function(result, reject) {
        contractInstance.usersCount(
                         function(error, success) { 
                            if(!error) {
                                 console.log('Número de usuarios: ' + success );
                                 result(success);
                            } else {
                                 reject(error);
                            }
                        });
    });
}

// Método auxiliar para contar los contratos desplegados de un usuario
var countContracts = function(userId) {

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    return new Promise(function(result, reject) {
        contractInstance.signatureCount(
                         userId,
                         function(error, success) { 
                             if(!error) {
                                 console.log('Número de contratos: ' + success );
                                 result(success);
                            } else {
                                 reject(error);
                            }
                        });
    });
}
// Método auxiliar para desplegar un nuevo contrato SIGNATURE
var deploySignature = function(codigo, userId, participants, hash1, hash2, pHash1, pHash2){

    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress);
    var accountAddress = Web3.accountAddress;
    return new Promise(function(result, reject) {
        contractInstance.addSignature.sendTransaction(
                                      codigo,
                                      userId,
                                      participants,
                                      hash1,
                                      hash2,
                                      pHash1,
                                      pHash2,
                                      { from: accountAddress,
                                         gas: 500000
                                       },
                                      function(error, address) {
               
                                            if (error) {

                                                 console.log(error);
                                                 console.log("error", "Ha ocurrido un error intentando desplegar el contrato Signature.");                  
                                                 reject(error);
                                                 return;

                                            } else {

                                                 if(!address) {
                                                    console.log("TMP - Contract transaction send: waiting to be mined...");
                                                 } else {
                                                    console.log("Contract mined! Address: " + address);
                                                    result(address);                                             
                                                 }
                

                                            }
                                });
    });

}
// Método auxiliar para obtener el nombre de un contrato en Ethereum según su address
var getContractName = function(contractInstance) {

    return new Promise(function(result, reject) {
         contractInstance.name(function(error, success) { 
                            if(!error) {
                                var string = key2str(success); 
                               console.log('Nombre del contrato: ' + string );
                                result(string);
                            } else {
                                 reject(error);
                            }
                        });
    });

}

var getPasswordHash1 = function(contractInstance) {

    return new Promise(function(result, reject) {
         contractInstance.pHash1(function(error, success) { 
                            if(!error) {
                                var string = key2str(success); 
                               console.log('Password hash 1: ' + string );
                                result(string);
                            } else {
                                 reject(error);
                            }
                        });
    });

}

var getPasswordHash2 = function(contractInstance) {

    return new Promise(function(result, reject) {
         contractInstance.pHash2(function(error, success) { 
                            if(!error) {
                                var string = key2str(success); 
                               console.log('Password hash 2: ' + string );
                                result(string);
                            } else {
                                 reject(error);
                            }
                        });
    });

}

var getKeyHash1 = function(contractInstance, userId) {

  return new Promise(function(result, reject) {
         contractInstance.getKeyHash1(
                          userId,
                          function(error, success) { 
                            if(!error) {
                                var string = key2str(success); 
                               console.log('Key hash 1: ' + string );
                                result(string);
                            } else {
                                 reject(error);
                            }
                        });
    });
}

var getKeyHash2 = function(contractInstance, userId) {

  return new Promise(function(result, reject) {
         contractInstance.getKeyHash2(
                          userId,
                          function(error, success) { 
                            if(!error) {
                                var string = key2str(success); 
                               console.log('Key hash 2: ' + string );
                                result(string);
                            } else {
                                 reject(error);
                            }
                        });
    });
}
// Método auxiliar para obtener un contrato según el usuario e índice 
var getContrato = function(userId,i) {
    var CompanyContract = Web3.CompanyContract;
    var contractAddress = Web3.contractAddress;
    var contractInstance = CompanyContract.at(contractAddress); 
    return new Promise(function(result, reject) {
         contractInstance.userSign(
                         userId,
                         i,
                         function(error, success) { 
                            if(!error) {
                                 console.log('Obtenido el contrato: ' + success );
                                 result(success);
                            } else {
                                 reject(error);
                            }
                        });
    });
}

// Función auxiliar para pasar de hexadecimal a string
function key2str(key) {
        return web3.toAscii(key).replace(/\u0000*$/,"");
    }

// Función auxiliar para desplegar el contrato principal COMPANY
function deployContract() {

    var web3 = Web3.web3;
    var accountAddress = Web3.accountAddress;
    var CompanyContract = Web3.CompanyContract;
    var codeCompany = Web3.codeCompany;
    var companyAddress = "";
    var contractData = CompanyContract.new.getData({data: codeCompany});
    var estimate = web3.eth.estimateGas({data: contractData});
    console.log("GAS ESTIMADO: "+estimate);

    var promise = new Promise(function(resolve, reject) {
        
        var companyInstance = CompanyContract.new(
                { from: accountAddress, 
                  data: codeCompany,
                  gas:2000000
                 }, 
             function(err, contract) {
               
                if (err) {

                    console.log(err);
                    console.log("error", "Ha ocurrido un error intentando desplegar el contrato.");                  
                    reject(err);
                    return;

                } else {

                    if(!contract.address) {
                        console.log("TMP - Contract transaction send: TransactionHash: " + contract.transactionHash
                         + " waiting to be mined...");
                    } else {
                        console.log("Contract mined! Address: " + contract.address);
                        console.log(contract);
                        resolve(contract.address);                                            
                    }
                

                }
              
            });
        });

    return promise;

}



// ----------- Funciones Auxiliares Criptografía --------- //

function stringToPublicKey(pubPemString) {
    return pki.publicKeyFromPem(pubPemString);
};

function stringToPrivateKey(privPemString) {
    return pki.privateKeyFromPem(privPemString);
};


// Método para encriptar con clave asimétrica
function encrypt(msg, pubKey) {

    return pubKey.encrypt(msg, 'RSA-OAEP');
};


// Método para cifrar con clave simétrica
function cipher(msg, pass) {
    var iv = Buffer.from('');

    var cipher = crypto.createCipheriv(ALGORITHM, pass, iv);

    var buf = cipher.update(msg, null, 'base64');
    buf += cipher.final('base64');
    
    return buf;
}

// Método para descifrar con la clave simétrica
function decipher(msg, pass) {
    var iv = Buffer.from('');

    var decipher = crypto.createDecipheriv(ALGORITHM, pass, iv);

    var buf1 = decipher.update(msg.toString(), 'base64');
    var buf2 = decipher.final();
    var bufDeciphered = Buffer.concat([buf1, buf2]);

    return bufDeciphered;
}

// Método para obtener una contraseña
function getNewPassword(callback) {

    crypto.randomBytes(PASSWORD_LEN, function(ex, buf) {
        if (ex) {
            var buf0 = new Buffer(PASSWORD_LEN);
            var res = Buffer.concat([new Buffer("1234567890"), buf0], PASSWORD_LEN);
            callback(res);
        } else {
            callback(buf);
        }
    });

};

// Generar password a partir de un string 
function fixPassword(password) {

    var buf0 = new Buffer("00000000000000000000000000000000",'hex');
    //var buf0 = new Buffer(PASSWORD_LEN);
    var buf1 = new Buffer(password);
    return Buffer.concat([buf1, buf0], PASSWORD_LEN);
};

