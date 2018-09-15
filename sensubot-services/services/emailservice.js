var fs = require('fs');
var path = require('path');
var _ = require('lodash');
const nodemailer = require('nodemailer');

async function generate(user) {
  // Ask email
  if (!_.isEmpty(user.qualifications)) {
    var email = user.qualifications[0].value;
  } else {
    user.qualifications.push({
      saveto: 'email',
      acceptable: '',
    });

    user.returnMessage = ['Please enter the email address that you would like to be contacted through. (Enter in this format: name@aol.com)'];
    return user;
  }

  // Check if the email address was valid.
  if (!validateEmail(email)) {
    email = "";
  }

  var emailList = 'senzubot@gmail.com, ' + email;

  // Real transporter using gmail
  // Fill in authentication data.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS
    }
  });

  var attachments = [];

  var filename = "";
  var emailMessage = "<h2> Thanks for trying Sensubot! I have attached information regarding the forms I think you qualify for. </h2>";

  // Check if user has a financial hardship letter
  if ( user.data['form letter'].value === true) {
    emailMessage += "<h4> Financial Hardship Letter: </h4>";
    emailMessage += "<p> I've filled out as much of the letter as I can, and left the sensitive information for you to complete. Please download the attached file and fill the indicated fields. </p>";

    // var filename = path.resolve()+'/assets/financial-hardship-letter-'+user.id+'.docx';
    var filename = path.join(path.resolve(), 'assets', 'financial-hardship-letter-'+user.id+'.docx');
    attachments.push(
      {
        filename: 'financial-hardship-letter.docx',
        path: filename
      }
    );
  }


  // TODO:  Add other form info to their own document and email them here.
  for(var i=0; i<user.completedForms.length; i++) {
    emailMessage += "<h4>"+user.completedForms[i].name+": </h4>";
    emailMessage += "<p>"+user.completedForms[i].message+"</p>";
    emailMessage += "<a href="+user.completedForms[i].url+"\">Click here or open the attached file</a>";
    attachments.push({
      filename: user.completedForms[i].name,
      path: user.completedForms[i].url
    });
  }

  // Setup email data with unicode symbols
  let mailOptions = {
    from: '"sensubot" <senzubot@gmail.com>', // sender address
    to: emailList, // list of receivers
    subject: 'Sensubot Results', // Subject line
    html: '<b>' + emailMessage + '</b>', // html body
    attachments: attachments
  };

  // Send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
  });

  /*
    Indicate that the user has completed the conversation.
    The user can be deleted from cache once this field is true.
  */
  user.finished = true;
  user.returnMessage = ["I have emailed you the relevant information, thank you for using Sensubot."];
  return user;
}

function validateEmail(email) {
    // First check if any value was actually set
    if (email.length == 0) return false;
    // Now validate the email format using Regex
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
    return re.test(email);
}

module.exports = {
  generate: generate
};
