# Serialize ALL THE THINGS!

Serialize entire Javascript VM object hierarchies.

In addition to what JSON.stringify will do:

-Strings
-Numbers
-Arrays (without converting to dictionaries)
-Objects
-null

This also handles:

-Circular dependencies (correctly!)
-Functions (with function bodies, and properties attached! Some limitations apply, YMMV.)
-Object inheritance (ala prototype and __proto__)
-Dates (actual Dates, not strings)
-undefined and Infinity (the real deals, not the strings)


[![Build Status](https://travis-ci.org/luin/serialize.png?branch=master)](https://travis-ci.org/shinmojo/serialize)

## Install

    npm install node-serialize

## Usage

    var serialize = require('node-serialize');

Serialize an object including it's function:


    var obj = {
      name: 'Bob',
      say: function() {
        return 'hi ' + this.name;
      }
    };

    var objS = serialize.serialize(obj);
    typeof objS === 'string';
    serialize.unserialize(objS).say() === 'hi Bob';

Serialize an object with a sub object:

    var objWithSubObj = {
      obj: {
        name: 'Jeff',
        say: function() {
          return 'hi ' + this.name;
        }
      }
    };

    var objWithSubObjS = serialize.serialize(objWithSubObj);
    typeof objWithSubObjS === 'string';
    serialize.unserialize(objWithSubObjS).say() === 'hi Jeff';

Serialize a circular object:

    var objCircular = {};
    objCircular.self = objCircular;

    var objCircularS = serialize.serialize(objCircular);
    typeof objCircularS === 'string';
    typeof serialize.unserialize(objCircularS).self.self.self.self === 'object';

