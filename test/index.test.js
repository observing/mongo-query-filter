describe('Filter', function() {
  'use strict';

  var Filter = require('../')
    , assume = require('assume')
    , filter;

  beforeEach(function() {
    filter = new Filter({ query: Filter.QUERY.LOGICAL });
  });

  afterEach(function () {
    filter = null;
  });

  it('exposes an constructible instance', function() {
    assume(Filter).to.be.a('function');
    assume(filter).to.be.an('object');
    assume(filter).to.be.instanceof(Filter);
  });

  it('has options', function () {
    assume(filter).to.have.property('options');
    assume(filter.options).to.be.an('object');
  });

  it('enables no operators by default', function () {
    filter = new Filter;

    assume(filter.options).to.be.an('object');
    assume(filter.query.length).to.equal(0);
    assume(filter.update.length).to.equal(0);
    assume(filter.pipeline.length).to.equal(0);
    assume(filter.projection.length).to.equal(0);
  });

  it('has bitmask option map on constructor object', function () {
    assume(Filter).to.have.property('QUERY');
    assume(Filter).to.have.property('UPDATE');
    assume(Filter).to.have.property('PIPELINE');
    assume(Filter).to.have.property('PROJECTION');

    assume(Filter.QUERY).to.have.property('COMPARISON', 1<<0);
    assume(Filter.QUERY).to.have.property('SORT', 1<<Object.keys(Filter.QUERY).length);

    assume(Filter.PROJECTION).to.equal(1<<0);

    assume(Filter.PIPELINE).to.have.property('STAGE', 1<<0);
    assume(Filter.PIPELINE).to.have.property('ACCUMULATORS', 1<<Object.keys(Filter.PIPELINE).length);

    assume(Filter.UPDATE).to.have.property('FIELDS', 1<<0);
    assume(Filter.UPDATE).to.have.property('ISOLATION', 1<<Object.keys(Filter.UPDATE).length);
  });

  describe('#constructor', function () {
    it('enables operators per group', function () {
      var custom = new Filter({
        query: Filter.QUERY.COMPARISON,
        update: Filter.QUERY.ALL
      });

      assume(filter.query.length).to.equal(4);
      assume(custom.query.length).to.equal(7);
      assume(custom.update.length).to.equal(22);
    });
  });

  describe('#groups', function () {
    it('is a function', function () {
      assume(filter.groups).is.a('function');
    });

    it('returns enabled groups with operators', function () {
      var result = filter.groups();

      assume(result).to.be.an('array');
      assume(result).to.include('query');
      assume(result.length).to.equal(1);
    });

    it('can restrict returned groups', function () {
      filter = new Filter({
        query: Filter.QUERY.LOGICAL,
        update: Filter.UPDATE.OPERATORS
      });

      var result = filter.groups('update');

      assume(result).to.be.an('array');
      assume(result).to.include('update');
      assume(result).to.not.include('query');
      assume(result.length).to.equal(1);
    });

    it('returns all enabled groups', function () {
      filter = new Filter({
        query: Filter.QUERY.LOGICAL,
        update: Filter.UPDATE.OPERATORS
      });

      var result = filter.groups();

      assume(result).to.be.an('array');
      assume(result).to.include('update');
      assume(result).to.include('query');
      assume(result.length).to.equal(2);
    });
  });

  describe('#allowed', function () {
    it('is a function', function () {
      assume(filter.allowed).is.a('function');
    });

    it('checks if the operator is allowed for the group', function () {
      assume(filter.allowed('query', '$and')).to.equal(true);
      assume(filter.allowed('query', 'and')).to.equal(true);
      assume(filter.allowed('query', '$gte')).to.equal(false);
      assume(filter.allowed('query', 'gte')).to.equal(false);
    });

    it('returns false if the group does not exist', function () {
      assume(filter.allowed('notexisting', '$and')).to.equal(false);
    });
  });

  describe('#mask', function () {
    it('is a function', function () {
      assume(filter.mask).is.a('function');
    });

    it('returns an array', function () {
      assume(filter.mask()).is.an('array');
      assume(filter.mask('query', 1<<0)).is.an('array');
    });

    it('returns set of allowed operators', function () {
      var result = filter.mask('query', 1<<2);

      assume(result).to.be.an('array');
      assume(result).to.include('$exists');
      assume(result).to.include('$type');
    });

    it('checks bitmask against operator group', function () {
      var result = filter.mask('query', Filter.QUERY.LOGICAL | Filter.QUERY.COMPARISON);

      assume(result).to.be.an('array');
      assume(result.length).to.equal(11);
      assume(result).to.include('$and');
      assume(result).to.include('$gte');
      assume(result).to.not.include('$exists');
    });
  });

  describe('#filter', function () {
    it('is a function', function () {
      assume(filter.filter).is.a('function');
    });

    it('returns early if the query is not an object', function () {
      assume(filter.filter('no object')).to.equal('no object');
    });

    it('removes operators not allowed on the query', function () {
      var query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
        , result = filter.filter(query);

      assume(JSON.stringify(result)).to.equal('{"$and":[{"price":{}},{"price":{}}]}');
    });

    it('filters empty elements from arrays in the query', function () {
      var query = { $and: [ { $ne: 1.99 }, { price: { $exists: true } } ] }
        , result = filter.filter(query);

      assume(JSON.stringify(result)).to.equal('{"$and":[{"price":{}}]}');
    });

    it('skips query keys that are not operators', function () {
      var query = { price: 1.99 }
        , result = filter.filter(query);

      assume(result).to.equal(query);
    });

    it('can be restricted to a specific operator group', function () {
      filter = new Filter({
        query: Filter.QUERY.ALL,
        update: Filter.UPDATE.ALL
      });

      var query = { $inc: { quantity: -2, "metrics.orders": 1 } }
        , result = filter.filter(query, 'query');

      assume(JSON.stringify(result)).to.equal('{}');
    });
  });
});