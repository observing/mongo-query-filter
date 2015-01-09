'use strict';

var operators = require('./operators');

/**
 * Strip MongoDB operators from user provided objects.
 *
 * @Constructor
 * @param {Object} options
 * @api public
 */
function Filter(options) {
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
Filter.prototype.filter = function filter(query, restrict) {
  if ('object' !== typeof query) return query;

  var groups = this.groups(restrict)
    , array = Array.isArray(query)
    , self = this;

  (array ? query : Object.keys(query)).forEach(function each(key) {
    if ('object' === typeof key || 'object' === typeof query[key]) {
      query[key] = self.filter(array ? key : query[key], restrict);
    }

    if ('$' !== key[0]) return key;
    groups.forEach(function each(group) {
      if (!self.allowed(group, key)) delete query[key];
    });
  });

  return array
    ? query.filter(function (v) { return v && Object.keys(v).length; })
    : query;
};

/**
 * Enable certain operators by providing a bitmask against the group.
 *
 * @param {String} group Group of operators to check the bitmask against.
 * @param {Number} bitmask Binary mask.
 * @returns {Array} set of allowed operators.
 * @api public
 */
Filter.prototype.mask = function mask(group, bitmask) {
  if (!group || !bitmask) return [];
  group = group.toUpperCase();

  var stack = [];
  for (var key in operators[group]) {
    if (Filter[group][key] & bitmask) {
      stack.push(operators[group][key]);
    }
  }

  return stack.join(',').split(',');
};

/**
 * Return the operator groups that have allowed operators,
 * optionally filtered by a group name.
 *
 * @param {String} restrict Optional group name to only return that group.
 * @return {Array} Set of group names.
 * @api public
 */
Filter.prototype.groups = function groups(restrict) {
  var filter = this;

  return Object.keys(operators).map(function lowercase(group) {
    group = group.toLowerCase();
    if (filter[group].length) return group;
  }).filter(function filter(group) {
    return restrict ? group === restrict : group;
  });
};

/**
 * Check if the operator is allowed for the group.
 *
 * @param {String} group Group the operator belongs to.
 * @param {String} key Operator name
 * @return {Boolean}
 * @api public
 */
Filter.prototype.allowed = function allowed(group, key) {
  key = key[0] !== '$' ? '$'+ key : key;
  return !!(this[group] && ~this[group].indexOf(key));
};

//
// Define bitmaps for all operators on the constructor.
//
for (var group in operators) {
  var i = 0;

  if ('object' !== typeof operators[group]) Filter[group] = 1 << i++;
  else for (var key in operators[group]) {
    Filter[group] = Filter[group] || Object.create(null);
    Filter[group][key] = 1 << i++;
  }

  Filter[group].ALL = (1 << i) - 1;
}

//
// Expose the module.
//
module.exports = Filter;