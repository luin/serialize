# node-serialize

Serialize a object including it's function into a JSON.

[![Build Status](https://travis-ci.org/luin/serialize.png?branch=master)](https://travis-ci.org/luin/serialize)

## SECURITY WARNING

This module provides a way to unserialize strings into executable JavaScript code, so that it may lead security vulnerabilities if the original strings can be modified by untrusted third-parties (aka hackers). For instance, the following attack example provided by [ajinabraham](https://github.com/luin/serialize/issues/4) shows how to achieve arbitrary code injection with an IIFE:

```javascript
var serialize = require('node-serialize');
var x = '{"rce":"_$$ND_FUNC$$_function (){console.log(\'exploited\')}()"}'
serialize.unserialize(x);
```

To avoid the security issues, at least one of the following methods should be taken:

1. Make sure to send serialized strings internally, isolating them from potential hackers. For example, only sending the strings from backend to fronend and always using HTTPS instead of HTTP.

2. Introduce public-key cryptosystems (e.g. RSA) to ensure the strings not being tampered with.


## Install

```
npm install node-serialize
```

## Usage

```javascript
var serialize = require('node-serialize');
```

Serialize an object including it's function:


```javascript
var obj = {
  name: 'Bob',
  say: function() {
    return 'hi ' + this.name;
  }
};

var objS = serialize.serialize(obj);
typeof objS === 'string';
serialize.unserialize(objS).say() === 'hi Bob';
```

Serialize an object with a sub object:

```javascript
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
serialize.unserialize(objWithSubObjS).obj.say() === 'hi Jeff';
```

Serialize a circular object:

```javascript
var objCircular = {};
objCircular.self = objCircular;

var objCircularS = serialize.serialize(objCircular);
typeof objCircularS === 'string';
typeof serialize.unserialize(objCircularS).self.self.self.self === 'object';
```
