

pragma solidity ^0.4.4;

contract Signature {
    
    bytes32 public name;
    bytes32 public userId;
	bytes32 public hash1;
	bytes32 public hash2;
	bytes32 public pHash1;
	bytes32 public pHash2;
	bytes32 public description;

    struct Info {
        bytes32 name;
        bytes32 hash1;
        bytes32 hash2;
        bytes32 description;
    }

    Info public info;
   
    // Constructor
	function Signature(bytes32 _name, bytes32 _userId, bytes32 _description, 
	    bytes32 _hash1, bytes32 _hash2, bytes32 _pHash1, bytes32 _pHash2) public {
	    
	    name = _name;
	    userId = _userId;
	    description = _description;
		hash1 = _hash1;
		hash2 = _hash2;
		pHash1 = _pHash1;
		pHash2 = _pHash2;
	    
	    info = Info({name: _name,
	                hash1: _hash1,
	                hash2: _hash2,
	                description: _description
		}); 
	 }
	 
	 /*function addParticipant(bytes32 p) public {
	     participants = p;
	 }*/
	 
}



contract Company {
    
    bytes32[] public userIds;
    bytes32[] public passwords;
    address[] public signatures;
    
    bytes32[] public p;
    
    //Almacén contratos "Signature" existentes, indexados por el userId
    mapping (bytes32 => address[]) public userSign;
    
    // Almacén de todos los usuarios existentes, indexados por su id
    mapping (bytes32 => User) public users;
    
    // Almacén de ids de participantes, indexados por el address del contrato Signature
    mapping(address => bytes32[]) public participantsId;
    
    mapping(bytes32 => Participant) public participants;
    
    // Estructura de un Participante. Incluye el hash firmado y el id del usuario
    struct Participant {
        bytes32 id;
        bytes32 cHash1;
        bytes32 cHash2;
    }
    
    // Constructor
    function Company() {

    }
    
    // Estructura de User
    struct User {
        bytes32 id;
        bytes32 password;
        bytes32 kHash1;
        bytes32 kHash2;
    }
   
   // Añadir nuevo usuario al sistema
    function addUser(bytes32 id, bytes32 password, bytes32 kHash1, bytes32 kHash2) public {
        userIds.push(id);
        passwords.push(password);
        users[id] = User({id: id, 
  						password: password,
                        kHash1: kHash1,
                        kHash2: kHash2
        });
    }
    // Añadir nuevo participante p al contrato s
    function addParticipant(bytes32 p, address s, bytes32 cHash1, bytes32 cHash2) public {
	     participantsId[s].push(p);
	     participants[p] = Participant({id: p,
	                                    cHash1: cHash1,
	                                    cHash2: cHash2
	     });
	 }
    // Getter de los participantes de un contrato Signature
    /* Dada una address, devuelve el array de participantes 
    asociado al contrato Signature de la address */
    function getParticipantsId(address s)constant returns(bytes32[]) {
        
        uint length = participantsCount(s);
        
        for( uint i = 0; i < length; i++) {
            p.push(participantsId[s][i]);
        }
        return p;
    }
   // Desplegar contrato Signature
   function addSignature(bytes32 name, bytes32 userId, bytes32 description,
   bytes32 hash1,bytes32 hash2, bytes32 pHash1, bytes32 pHash2)public  {
		
		address newSignature = new Signature(name, userId, description,
		hash1,hash2, pHash1, pHash2);
		
		signatures.push(newSignature);
		userSign[userId].push(newSignature);

	}
	
	// Devuelve la dirección de un contrato del usuario,
	// según su id y el índice del contrato
	function getSignature(bytes32 userId, uint signIndex) returns(address){
	    return userSign[userId][signIndex];
	}
	
	// Devuelve el tamaño del array Signatures para un usuario dado
	function signatureCount(bytes32 id)constant returns (uint) {
	    return userSign[id].length;
	}
	
	function participantsCount(address s) constant returns (uint) {
	    return participantsId[s].length;
	}
	
	// Devuelve el número de usuarios existentes en la plataforma
	function usersCount() constant returns (uint) {
	    return userIds.length;
	}
	
	// Devuelve el hash del pubKey del usuario
	function getKeyHash1(bytes32 userId) constant returns (bytes32) {
	    User user = users[userId];
	    bytes32 kHash1 = user.kHash1;
	    return kHash1;
	}
	
	function getKeyHash2(bytes32 userId) constant returns (bytes32) {
	    User user = users[userId];
	    bytes32 kHash2 = user.kHash2;
	    return kHash2;
	}
	
	// Comprueba la autenticación del usuario
	function checkLogin(bytes32 userId, bytes32 password) constant returns(uint) {
	    User user = users[userId];
	    bytes32 p = user.password;
	    uint r = 0;
	    if (p == password) {
	        r = 1;
	    }
	    return r;
	}
	
	
}


