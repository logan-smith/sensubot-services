ObjectId = require('mongodb').ObjectID;


function formQuery(db, query) {
  return new Promise((resolve, reject) => {
    var collection = db.collection('Forms');

    collection.find(query).toArray(function(err, forms) {
      if (err) {
        console.log("Function formQuery failed to return any forms.");
        return reject(err);
      }
      return resolve(forms);
    });
  })
}

function questionQuery(db, query) {
    return new Promise((resolve, reject) => {
      var collection = db.collection('Questions');

      collection.find(query).toArray(function(err, questions) {
        if (err) {
          console.log("Function questionQuery failed to return any questions.");
          return reject(err);
        }
        return resolve(questions);
      });
    });
}

function insertQuestions(db, questions) {
  return new Promise((resolve, reject) => {
    let collection = db.collection('Questions');

    console.log(questions);
    collection.insertMany(questions, function(err, res) {
      if(err) {
        console.log("Function insertQuestion failed to insert the questions");
        return reject(err);
      }
      console.log(res);
      return resolve({success: true});
    });
  });
}

function insertForm(db, form){
    return new Promise((resolve, reject) => {
      var collection = db.collection('Forms');

      var ObjectId = require('mongodb').ObjectId;
      form.organization = new ObjectId(form.organization);

      collection.insertOne(form, function(err, res) {
        if (err) {
          console.log("Function insertForm failed to insert the form");
          return reject(err);
        }
        return resolve({success: true});
      });
    });
}

function getFormById(db, id){

    var ObjectId = require('mongodb').ObjectId;
    var o_id = new ObjectId(id);

    return new Promise((resolve, reject) => {
      var collection = db.collection('Forms');

      collection.findOne({_id: o_id}, function(err, form) {
        if (err) {
          console.log(err);
          return reject(err);
        }
        return resolve(form);
      });
    });
}

function updateForm(db, form) {

    var ObjectId = require('mongodb').ObjectId;
    var o_id = new ObjectId(form._id);
    var query = {_id: o_id};
    delete form._id;

    form.organization = new ObjectId(form.organization);

    return new Promise((resolve, reject) => {
      var collection = db.collection('Forms');

      collection.updateOne(query, form, function(err, res) {
        if (err) {
          console.log("Function updateForm failed to update the form");
          return reject(err);
        }
        console.log(res);
        return resolve({success: true, modifiedCount:res.modifiedCount});
      });
    });
}

function deleteForm(db, id) {

    var ObjectId = require('mongodb').ObjectId;
    var o_id = new ObjectId(id);
    var query = {_id: o_id};

    return new Promise((resolve, reject) => {
      var collection = db.collection('Forms');

      collection.deleteOne(query, function(err, res){
        if (err) {
          console.log("Function deleteForm failed to delete the form");
          return reject(err);
        }
        return resolve({success: true});
      });
    });
}
function lettersQuery(db) {
  return new Promise((resolve, reject) => {
    var collection = db.collection('Letter');
    var query = {"name" : "General Form Letter"};

    collection.find(query).toArray(function(err, letters) {
      if (err) {
        console.log("Function lettersQuery failed to return any letters.");
        return reject(err);
      }
      return resolve(letters);
    });
  })
}

function getOrganizationByName(db, username) {
  return new Promise((resolve, reject) => {
    var collection = db.collection('Organizations');
    var query = {"username": username};

    collection.find(query).toArray(function(err, organization) {
      if (err) {
        console.log("Function getOrganizationByName failed to return any organizations");
        return reject(err);
      }
      return resolve(organization);
    });
  })
}

function organizationQuery(db, query) {
  return new Promise((resolve, reject) => {
    var collection = db.collection('Organizations');

    collection.find(query).toArray(function(err, organizations) {
      if (err) {
        console.log("Function organizationQuery failed to return any organizations.");
        return reject(err);
      }
      return resolve(organizations);
    });
  })
}

/*
  Params: db (Reference to Mongodb object), userId (id string for an Organization, like "598e040affe547612f9c2c33").
  Returns: Array of "Forms" for that Organization.
*/
function getFormsByUserId(db, userId){
    return new Promise((resolve, reject) => {
      var collection = db.collection('Forms');

      // Make sure the object id string is valid
      const safeObjectId = s => ObjectId.isValid(s) ? new ObjectId(s) : null;
      var query = safeObjectId(userId);

      collection.find({ organization : query }).toArray(function(err, forms) {
        if (err) {
          console.log(err);
          return reject(err);
        }
        return resolve(forms);
      });
    })
}


module.exports = {
    formQuery: formQuery,
    questionQuery: questionQuery,
    insertQuestions: insertQuestions,
    insertForm: insertForm,
    getFormById: getFormById,
    updateForm: updateForm,
    deleteForm: deleteForm,
    lettersQuery: lettersQuery,
    organizationQuery: organizationQuery,
    getFormsByUserId: getFormsByUserId,
    getOrganizationByName: getOrganizationByName
};
