var JSZip = require('jszip');
var Docxtemplater = require('docxtemplater');
var natural = require('natural');
var speak = require('speakeasy-nlp');

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var dbService = require('./dbservice.js');
var emailService = require('./emailservice.js');
var calculationService = require('./calculationservice.js');

module.exports = {
    run: run
};

async function run(_db, user, message){

  // Reset the return message so new messages can be added.
  user.returnMessage = [];

  // "Sanitize" the input by making sure the message is a string. Otherwise an object could get through and make it into a query.
  message = message.toString();
  message = message.toLowerCase();

  if ( user.currentForm === 'emailFinal') {
    user.qualifications[0].value = message;
    await emailService.generate(user);
    user.previousQuestion = null;
    user.currentQuestion = null;
    user.qualifications = [];
    user.qualQuestions = [];
    user.currentForm = "done";
    return user;
  }

  message = message.replace(/[^\w\s]/gi, '');

  /*
    Give the user additional information on a question if they request it.
  */
  if ( message === 'help' || message === 'hint' ) {
    if ( user.currentQuestion && user.currentQuestion.hint) {
      user.returnMessage = [user.currentQuestion.hint];
      return user;
    } else {
      // User doesn't have a current question, or that question doesn't have a hint
      user.returnMessage = ["Sorry, I can't give you additional information at this time."];
      if ( user.currentQuestion ){
        user.returnMessage = _.concat(user.returnMessage, user.currentQuestion.content);
      }
      return user;
    }
  }

  /*
    Return to the last question that the user was asked.
    User cannot return if the last question completed a form.
  */
  if ( message === 'rewind' ) {
    if( user.previousQuestion ) {
      user.currentQuestion = user.previousQuestion;
      user.returnMessage = [user.currentQuestion.content];
      return user;
    } else {
      // Inform user they can't return now and ask them the last question again.
      user.returnMessage = ["Sorry, you can't return to a previous question at this stage of the conversation."];
      if ( user.currentQuestion ) {
        user.returnMessage = _.concat(user.returnMessage, user.currentQuestion.content);
        return user;
      }
    }
  }


  if ( user.hasOwnProperty('currentQuestion') && !(_.isEmpty(user.currentQuestion)) ) {
    var currentSaveTo = user.currentQuestion.saveto;

    // Users data can be accessed like user.data[firstName].value
    user.data[currentSaveTo] = {
      'value': message
    };

    // The last question has a corresponding qualification.
    if (_.some(user.qualifications, {saveto: currentSaveTo})) {

      var qualification = user.qualifications.find( x => x.saveto === currentSaveTo);

      // Check if the user is responding to the misspell prompt.
      if (user.currentQuestion.misspell) {
        var affirmative = new natural.Spellcheck(['yes', 'yeah', 'ya', 'correct', 'i did', user.currentQuestion.misspell]);

        // User affirms that they misspelled, set the values as if they responded correctly
        if(!_.isEmpty(affirmative.getCorrections(message, 1))) {

          qualification.value = user.currentQuestion.misspell;
          user.data[currentSaveTo].value = user.currentQuestion.misspell;

        } else {
          // User did not misspell
          user.data[currentSaveTo].value = qualification.value;
        }
      } else {
        // User is responding to a normal question.
        qualification.value = message;
      }

      message = [];

      // Check if users response was within acceptable values for the qualification.
      // If reponse doesn't match, check if its within misspelling range (range can be set greater, but it really slows down)
      if(!qualCompare(qualification)) {
        if (!user.currentQuestion.misspell) {
          var spellcheck = new natural.Spellcheck(qualification.acceptable);
          var spellArray = spellcheck.getCorrections(qualification.value, 1);

          // The user might have misspelled, and we have a close match in the record.
          if (!_.isEmpty(spellArray)) {
            user.returnMessage = _.concat(user.returnMessage, "Your response didn't match my records, did you mean to say " + spellArray[0]+"?");
            user.currentQuestion.misspell = spellArray[0];

            return user;
          }
        }
        // Users response was not within bounds, reset current question data and get new one.
        user.qualifications = [];
        user.qualQuestions = [];
        delete user.calculations;
        message = _.concat(message, await setNewForm(_db, user));

        user.returnMessage = message;
        return user;
      }
    } else {
      // TODO: Data question logic.

      if(currentSaveTo === 'form letter') {
        if(message === 'yes') {
          if(user.data['hospital']) {
            var org;
            var forms = await dbService.formQuery(_db, {'qualifications.hospital' : user.data['hospital'].value});
            // TODO: Catch here if the hospital they answered with doesn't exist in the database.
            if (!_.isEmpty(forms)) {
              org = {'_id' : forms[0].organization};
              org = await dbService.organizationQuery(_db, org);
              user.data['hospital name'] = {'value' : org[0].name};
              user.data['hospital address'] = {'value' : org[0].address};
              user.data['phone'] = {'value' : org[0].phone};
            }

            var letters;
            letters = await dbService.lettersQuery(_db);
            user.forms = user.forms.concat(letters);
            message = await setNewForm(_db, user);
            user.returnMessage = _.concat(user.returnMessage, message);

            return user;

          } else {
            var letters;
            letters = await dbService.lettersQuery(_db);
            user.forms = user.forms.concat(letters);
            message = await setNewForm(_db, user);
            user.returnMessage = _.concat(user.returnMessage, message);
          }
        } else {
          // Don't do the form letter if they chose no.
          var message = "Thanks for trying Sensubot!";
          user.returnMessage = _.concat(user.returnMessage, message);
          user.qualifications = [];
          user.qualQuestions = [];
          user.forms = [];
          user.currentForm = "emailFinal";
          delete user.calculations;

          await emailService.generate(user);

          return user;
        }
      }
    }
    user.previousQuestion = user.currentQuestion;
    user.currentQuestion = null;
  }

  // This iterates through qualifications to find the next "qualification" that needs to be answered.
  for (i = 0; i < user.qualifications.length; i++) {

    if ( user.qualifications[i].value ) {
      // Qualification has been answered, don't do anything.

    } else if ( user.data.hasOwnProperty(user.qualifications[i].saveto) ){ // Check if the qualification is in the users data array, maybe from a previous form.

      user.qualifications[i].value = user.data[user.qualifications[i].saveto].value;

    } else { // The qualification has not been filled yet

      // Find the corresponding question by saveto field
      var current = user.qualQuestions.find( x => x.saveto === user.qualifications[i].saveto);

      // Save the current question so we know where to come back to
      user.currentQuestion = current;

      user.returnMessage = _.concat(user.returnMessage, current.content);

      // Send question content text back to the user
      return user;
    }
  }

  // Handle the calculations component of forms by passing data to calculationService.
  if (user.hasOwnProperty('calculations')) {
    for (var i = 0; i < user.calculations.length; i++) {
      var funcArguments = [];

      for(j = 0; j < user.calculations[i].arguments.length; j++) {
        funcArguments.push(user.data[user.calculations[i].arguments[j]].value);
      }

      // If calculationService returns false based on the users responses;
      // then they do not qualify for the form. Set a new one.
      if(!calculationService[user.calculations[i].functionName](funcArguments)) {
        user.qualifications = [];
        user.qualQuestions = [];
        delete user.calculations;
        var message = [await setNewForm(_db, user)];
        user.returnMessage = _.concat(user.returnMessage, message);
        return user;
      }
    }
  }

  /*
    If we got through the last for loop without returning, then we have filled all of the qualifications for a form.
  */

  // Query for more forms if we just finished the initial form questions
  if (user.currentForm === 'initial') {

    // Dynamically creates query based on the users data fields.
    var ar = [];
    for( var k in user.data){
      if (user.data.hasOwnProperty(k)) {
        var obj1 = {};
        var obj2 = {};
        obj1[k] = user.data[k].value;
        obj2[k] = {$exists: false};
        ar.push({$or: [obj1,obj2]});
      }
    }
    var query = {
      $and: ar
    };

    // Query for forms and add them to user.forms. Also set currentForm, currentQuestion, etc.
    message = await retrieveForms(user, _db, query);

    if (!_.isEmpty(user.forms)) {
      message = ["It appears that you initially qualify for " + (user.forms.length + 1) + " forms."];
      message = _.concat(message, " We will ask you some additional questions to make sure that you qualify for them.");

      message = _.concat(message, user.currentQuestion.content);
      user.returnMessage = _.concat(user.returnMessage, message);
    } else {
      user.returnMessage = _.concat(user.returnMessage, message);
    }

    return user;

  } else if (user.currentForm.name === 'General Form Letter') {

      // TODO: Ideally we should ask these questions that the user hasn't seen yet from a form.
      formInfoFill(user);

      generateDoc(user);

      user.currentForm = "emailFinal";

      user.qualifications = [];
      user.qualQuestions = [];
      user = await emailService.generate(user);

      return user;

    } else { // The user just completed a form and it wasn't the initial questions.

      // Return to the user the current forms "URL" and some final string message
      message = [user.currentForm["message"]];
      message = _.concat(message, user.currentForm["url"]);

      user.completedForms.push({
        name: user.currentForm.name,
        message: user.currentForm['message'],
        url: user.currentForm['url']
      });
      message = _.concat(message, await setNewForm(_db, user));

      user.returnMessage = _.concat(user.returnMessage, message);
      return user;
    }
}

/*
  If the database didn't have some info required for the general form letter,
  fill that data field here.
  TODO: If user hasn't been asked for hospital, ask them.
*/
function formInfoFill(user) {
  var fields = ['hospital name', 'hospital address', 'phone', 'treatment date', 'monthly payment', 'income'];
  for(i = 0; i < fields.length; i++) {
    if (!user.data[fields[i]]) {
      user.data[fields[i]] = {'value' : '< ' + fields[i] + ' >'};
    }
  }
  return user;
}

/*
  Retrieves forms from database and assigns them to the user.
  Then calls setNewForm to assign attributes for the form.
*/
async function retrieveForms(user, _db, query) {
  const forms = await dbService.formQuery(_db, query);
  user.forms = user.forms.concat(forms);
  return await setNewForm(_db, user);
}

/*
  Sets user.qualifications based on user.currentForm.
  Queries for questions based on saveto fields in qualifications.
  Sets user.qualQuestions based on results of query.
*/
async function setQualificationsAndQuestions(_db, user) {

  var qualificationsToQuery = [];

  user.qualifications = [];

  for( var k in user.currentForm){
    if (k === 'qualifications') {
      for( var j in user.currentForm[k]) {
        if (user.currentForm[k].hasOwnProperty(j)) {
          if (j in user.data) {
            user.qualifications.push({saveto: j, acceptable: user.currentForm[k][j], value: user.data[j].value});
          } else {
              user.qualifications.push({saveto: j, acceptable: user.currentForm[k][j]});
              qualificationsToQuery.push(j);
            }
        }
      }
    } else if (k === 'calculations') {
      for( var j in user.currentForm[k]) {
        if (user.currentForm[k].hasOwnProperty(j)) {
          if(!user.hasOwnProperty('calculations')) {
            user.calculations = [];
          }
          user.calculations.push({compareto: j, arguments: user.currentForm[k][j].arguments, functionName: user.currentForm[k][j].functionName});
        }
      }
    }
  }

  var query = {'$in' : qualificationsToQuery};
  query = {'saveto' : query};

  const qualQuestions = await dbService.questionQuery(_db, query);

  user.qualQuestions = qualQuestions;
  return user.qualQuestions;
}

/*
  Returns true if the qualification objects 'acceptable' field is empty (could be empty array or string).
  Or returns true or false based on whether the qualifications assigned value is within the "accceptable" field.
*/
function qualCompare(qualification) {
  if (_.isEmpty(qualification.acceptable)) {
    return true;
  } else {
    if (_.includes(qualification.acceptable, qualification.value)) {
      return true;
    } else {
      return false;
    }
  }
}

/*
  Sets a new form as the users current one.
  Queries for that forms qualifications and related questions, then assigns them to the user.
  Checks if qualifications for new form have acceptable values.
  Sets the current question.
  Returns the message content of the new current question.
*/
async function setNewForm(_db, user) {

  // If user has no more forms, prompt for financial hardship letter.
  if (_.isEmpty(user.forms)) {

    // Don't let the user return to a previous question if they've completed that form.
    user.previousQuestion = null;
    user.currentQuestion = null;
    delete user.calculations;
    user.currentQuestion = { saveto: 'form letter', content: 'Would you like me to assist you in filling out a financial assistance letter? (Please respond with Yes or No)'};
    user.currentForm = "";

    return user.currentQuestion.content;

  } else {
    delete user.calculations;
    user.currentForm = user.forms.pop();

    // Set that form's qualifications and questions.
    await setQualificationsAndQuestions(_db, user);

    /*
      Check if the users previous responses disqualifies them from this form.
      Attempt to retrieve a new form if they are disqualified.
      Don't tell the user that they dont qualify.
    */
    var qualificationsValidFlag = true;

    for (let i = 0; i < user.qualifications.length; ++i) {
      if (user.qualifications[i].hasOwnProperty('value')) {
        if (!qualCompare(user.qualifications[i])) {

          var spellcheck = new natural.Spellcheck(user.qualifications[i].acceptable);
          var spellArray = spellcheck.getCorrections(user.qualifications[i].value, 1);

          // The user might have misspelled, and we have a close match in the record.
          if (!_.isEmpty(spellArray)) {

            // Set the currentQuestion to the one they may have misspelled,.
            // If the question was one of the "initial" ones, it won't be in the db so ignore it.
            var query = {'saveto' : user.qualifications[i].saveto};

            const qualQuestions = await dbService.questionQuery(_db, query);
            if(!_.isEmpty(qualQuestions)) {
              // If they misspelled the hospital name, return a Capitalized version of the name.
              if( qualQuestions[0].saveto === 'hospital' ) {
                user.returnMessage = ["Your response to the " + qualQuestions[0].saveto + " question didn't match my records, did you mean to say " + _.startCase(spellArray[0]) +"?"];
              } else {
                user.returnMessage = ["Your response to the " + qualQuestions[0].saveto + " question didn't match my records, did you mean to say " + spellArray[0]+"?"];
              }
              user.qualQuestions = qualQuestions;
              user.currentQuestion = user.qualQuestions[0];
              user.currentQuestion.misspell = spellArray[0];
              return user.returnMessage;
            }
          }
          return await setNewForm(_db, user);
        }
      } else {
        qualificationsValidFlag = false;
      }
    }

    /*
      If the user was already asked this forms qualification questions by another form,
      and they are all "acceptable" for this form, return this forms final message
      and attempt to get a new form.
    */
    if (qualificationsValidFlag) {
      var message = ["Your responses indicate that you qualify for the "+user.currentForm.name+" form. "];
      message = _.concat(message, user.currentForm['message']);
      message = _.concat(message, user.currentForm['url']);

      user.completedForms.push({
        name: user.currentForm.name,
        message: user.currentForm['message'],
        url: user.currentForm['url']
      });

      message = _.concat(message, await setNewForm(_db, user));
      return message;
    }

    // Don't let the user return to a previous question if they've completed that form.
    user.previousQuestion = null;

    // Set the current question.
    user.currentQuestion = user.qualQuestions[0];

    return user.currentQuestion.content;
  }
}

/*
  Uses Docxtemplater to create the financial hardship letter.
  Template is located at assets/input.docx.
  Additional fields can be added in setData.
  Any generated documents are deleted when the user disconnects.
*/
function generateDoc(user) {
  var content = fs
    .readFileSync(path.join(path.resolve(), 'assets/input.docx'), 'binary');

  var zip = new JSZip(content);

  var doc = new Docxtemplater();
  doc.loadZip(zip);

  doc.setData({
      hospital_name: user.data['hospital name'].value,
      hospital_address: user.data['hospital address'].value,
      phone: user.data['phone'].value,
      treatment_date: user.data['treatment date'].value,
      monthly_payment: user.data['monthly payment'].value,
      monthly_income: Math.round((user.data['income'].value / 12))
  });

  try {
      doc.render()
  }
  catch (error) {
      var e = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          properties: error.properties,
      }
      console.log(JSON.stringify({error: e}));

      throw error;
  }

  var buf = doc.getZip()
               .generate({type: 'nodebuffer'});

  fs.writeFileSync(path.join(path.resolve(), 'assets', 'financial-hardship-letter-'+user.id+'.docx'), buf);
  user.data['form letter'] = {'value': true};
}
