var _ = require('lodash');

/*
  Takes an array of 2 parameters, income and size.
  Calculates whether a user is within 200% of the federal poverty level,
  based on these values.

  Returns True or False.
*/
function calculateIncome(args) {
  // Convert input array from to individual numbers.
  var income = Number(args[0]);
  var size = Number(args[1]);

  if(_.isFinite(income) && _.isFinite(size)) {
    return (income < (15760 + size*8360));
  } else {
    return false;
  }
}

module.exports = {
  calculateIncome: calculateIncome
};
