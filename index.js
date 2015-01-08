'use strict';

var operators = require('./operators');

/**
 * Strip MongoDB operators from user provided objects.
 *
 * @Constructor
 * @param {Object} options
 * @api public
 */
function Operator(options) {
  this.options = options || {};

  for (var group in operators) {
    var prop = group.toLowerCase();
    this[prop] = this.mask(group, this.options[prop]);
  }
}

/**
 * Filter the provided query object, removing keys that are not
 * allowed to exists on the query object.
 *
 * @param {Object} query Query object.
 * @param {String} restrict Operator group to further restrict allowed operators.
 * @return {Object} Filtered query object.
 * @api public
 */
Operator.prototype.filter = function filter(query, restrict) {
  if ('object' !== typeof query) return query;

  var map = this.groups(restrict);

  for (var key in query) {
    if ('object' === typeof query[key]) {
      this.parse(query[key]);
      continue;
    }

    for (var group in map) {
      if (!~this[group].indexOf(key)) delete query[key];
    }
  }

  return query;
};

/**
 * Enable certain operators by providing a bitmask against the group.
 *
 * @param {String} group Group of operators to check the bitmask against.
 * @param {Number} bitmask Binary mask.
 * @returns {Array} set of allowed operators.
 * @api public
 */
Operator.prototype.mask = function mask(group, bitmask) {
  if (!group || !bitmask) return [];
  var stack = '';

  for (var key in operators[group]) {
    if (key !== 'ALL' && Operator[group][key] & bitmask) {
      stack += operators[group][key];
    }
  }

  return stack.split(',');
};

/**
 * Return the operator groups that have allowed operators,
 * optionally filtered by a group name.
 *
 * @param {String} restrict Optional group name to only return that group.
 * @return {Array} Set of group names.
 * @api public
 */
Operator.prototype.groups = function groups(restrict) {
  var operator = this;

  return Object.keys(operators).map(function lowercase(group) {
    group = group.toLowerCase();
    if (operator[group].length && group === restrict) return group;
  }).filter(Boolean);
};

/**
 * Check if the operator is allowed for the group.
 *
 * @param {String} group Group the operator belongs to.
 * @param {String} key Operator name
 * @return {Boolean}
 * @api public
 */
Operator.prototype.allowed = function allowed(group, key) {
  key += key[0] !== '$' ? '$' : '';
  return !!~this[group].indexOf(key);
};

//
// Define bitmaps for all operators on the constructor.
//
for (var group in operators) {
  var i = 0;

  if ('object' !== typeof operators[group]) Operator[group] = 1 << i++;
  else for (var key in operators[group]) {
    Operator[group] = Operator[group] || Object.create(null);
    Operator[group][key] = 1 << i++;
  }

  Operator[group].ALL = (1 << i) - 1;
}

//
// Expose the module.
//
module.exports = Operator;