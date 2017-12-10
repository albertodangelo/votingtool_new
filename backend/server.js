const express = require("express");
const nedb = require("nedb");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const bp = require('body-parser');
const checkJwt = require('express-jwt');
const bcrypt = require('bcryptjs');
var http = require('http');

require('dotenv').config();

const app = express();

app.use(bp.json());



app.use(cors());

var Datastore = require('nedb');

db = {};
db.users = new Datastore({
    filename: "users.db",
    autoload: true
});
db.polls = new Datastore({
    filename: "polls.db",
    autoload: true
});

// You need to load each database (here we do it asynchronously)
db.users.loadDatabase();
db.polls.loadDatabase();


// DATENSTRUKTUR  (MANUELL IN DER DB SPEICHERN)
 
/* var poll = {  
    question: 'Who is the champion?', 
    options:[{name:'Jack', votings: 0},{name:'James',votings: 0},{name:'Liz', votings: 0}]
}; 
 var poll = {  
    question: 'Is it good to be late?', 
    options:[{name:'sure', votings: 0},{name:'cannot answer to this question', votings: 0},{name: "it doesen't matter", votings: 0},{name:'great', votings: 0}]
}; 
 
db.polls.insert(poll, function(err, doc) {  
    console.log('Inserted', doc.name, 'with ID', doc._id);
}); */ 
app.post('/polls', function(req,res) {
        
    const data = req.body;
   // console.log(data);
    
    var fetchData = data._id == null ? {} : { _id : data._id};

    db.polls.find(fetchData, function (err, doc) {
        return res.status(200).json(doc);
    })
})

// UPDATE POLL
app.put('/upoll/', function (req, res) {
    
        const data = req.body;
    
        db.polls.update({ _id: data[0]._id },{ $set: { options:data[0].options, question:data[0].question } },{returnUpdatedDocs:true }, function (err, numAffected, updatedDocs){
            
            // angular benötigt ein Array
            var resultDB = [updatedDocs]
         
            if(!err) {
                return res.status(200).json(resultDB);
            } else {
                return res.status(404).json(err);
            }
        });
    });
 
    
// HIER FOLGEN ALLE AUFRUFE DIE EINEN EINGELOGGTEN ZUSTAND BENÖTIGEN
app.use(
    checkJwt({ secret: process.env.JWT_SECRET}).unless({ path: '/authenticate'})
)

app.use((err, req, res, next) => {
    if( err.name === 'UnauthorizedError') {
        res.status(401).send({error : err.message });
    }
}) 


// ADD POLLS 
app.post('/apolls', function(req,res) {

    console.log(req.token);

    const data = req.body;
    console.log(data);

    /* var poll = {  
    question: 'Is it good to be late?', 
    options:[{name:'sure', votings: 0},{name:'cannot answer to this question', votings: 0},{name: "it doesen't matter", votings: 0},{name:'great', votings: 0}]
    }; */

    db.polls.insert(data, function(err, doc) {  
        //console.log('Inserted', doc.name, 'with ID', doc._id);
        return res.status(200).json({inserted:doc._id});
        
    });
})



// DELETE POLL
/* {
	"id": "N72fH1KAWRCbKz1s"
} */
app.post('/dpoll', function (req, res) {
    
    var data = req.body;
    console.log(data);

    db.polls.remove({_id: data.id }, {}, function (err, numRemoved) {
        return res.status(200).json({removed: numRemoved });
    }); 
});

// DELETE OPTION 
app.post('/doption', function (req, res) {
    
    var data = req.body;
    
    var toRemove = {
        name: data.option,
        votings: data.votings
    }

    db.polls.update({ _id: data.id }, { $pull: { options: toRemove } },{}, function (){
        
        return res.status(200).json({option:'deleted'}); 
    });
});

// UPDATE OPTION 
app.post('/uoption', function (req, res) {
    
    var data = req.body;
    
    var toUpdate = {
        name: data.option,
        votings: data.votings
    }

    db.polls.update({ _id: data.id }, { $push: { options: toUpdate } }, {}, function () { 
        return res.status(200).json({option:'udated'}); 
    });
});


// TESTUSER
/* const saltRounds = 10;
const myPlaintextPassword = 'test1234';

bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {

    var user = {  
        user: 'testuser', 
        password: hash 
    }; 
    
    db.users.insert(user, function(err, doc) {  
        console.log('Inserted', doc.user, ' - password', doc.password,'with ID', doc._id);
    }); 

});
 */

// LOGIN
app.post('/authenticate', (req, res) => {
    
    console.log("in authenticate : %o", req.body);

    //const user = req.body.email.toLowerCase().replace(/\s/g,'');
    const user = req.body.username;
    const pass = req.body.password;

    db.users.findOne({ user : user }, function (err,doc) {
        
        console.log(doc);
        
        if(doc === null) {
            return res.json( { message: 'authenticated failed', token: 'user_not_found'});
        } 
        
        if (!bcrypt.compareSync(pass, doc.password)) {
            return res.status(200).json({ error: 'incorrect_password'});
        }
            
        const payload = {
            username: doc.username,
            admin: doc.admin
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4h' });

        return res.json({
            message: 'successfuly authenticated',
            token: token
        });
    })   
})


app.listen(3000, () => console.log('Example app listening on port 3000!'))