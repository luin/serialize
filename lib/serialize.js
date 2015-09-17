var FUNCFLAG = '_$$ND_FUNC$$_';
var FUNCBODY = "_$$ND_FUNCBODY$$_";
var PROTO = "_$$ND_PROTO$$_";
var PROTOTYPE = "_$$ND_PROTOTYPE$$_";
var CIRCULARFLAG = '_$$ND_CC$$_';
var KEYPATHSEPARATOR = '_$$.$$_';
var ISNATIVEFUNC = /^function\s*[^(]*\(.*\)\s*\{\s*\[native code\]\s*\}$/;

var getKeyPath = function(obj, path) {
  try {
    path = path.split(KEYPATHSEPARATOR);
    var currentObj = obj;
    path.forEach(function(p, index) {
      if (index) {
        currentObj = currentObj[p];
      }
    });
    return currentObj;
  } catch (e) {
    return false;
  }
};

var serializeCircular = function(obj, cache) {
  var subKey;
  for (subKey in cache) {
    if (cache.hasOwnProperty(subKey)) {
      if (cache[subKey] === obj) {
        return CIRCULARFLAG + subKey;
      }
    }
  }
  return false;
};

var serializeFunction = function(func, ignoreNativeFunc) {
  var funcStr = func.toString();
  if (ISNATIVEFUNC.test(funcStr)) {
    if (ignoreNativeFunc) {
      funcStr = 'function() {throw new Error("Call a native function unserialized")}';
    } else {
      throw new Error('Can\'t serialize a object with a native function property. Use serialize(obj, true) to ignore the error.');
    }
  }
  return funcStr;
};

var unserializeFunction = function(func, originObj) {
  var funcObj = eval("( " + func[FUNCFLAG] + " )");
  delete (func[FUNCFLAG]);
  for (var key in func) {
    funcObj[key] = func[key];
  }
  return funcObj;
};

var serializeObject = function(obj, ignoreNativeFunc, outputObj, cache, path) {
  var output = {};
  var keys = Object.keys(obj);
  if (!path.endsWith("prototype") && !path.endsWith("__proto__")) {
    keys.push("prototype");
    keys.push("__proto__");
  }
  keys.forEach(function(key) {
    if (obj.hasOwnProperty(key) || key === "prototype" || key === "__proto__") {
      var destKey = key === "__proto__" ? PROTO : key === 'prototype' ? PROTOTYPE : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        var found = serializeCircular(obj[key], cache);
        if (found) {
          output[destKey] = found;
        } else {
          output[destKey] = exports.serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key);
        }
      } else if (typeof obj[key] === 'function') {
        output[destKey] = exports.serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key);
      } else {
        output[destKey] = obj[key];
      }
    }
  });
  return output;
};

exports.serialize = function(obj, ignoreNativeFunc, outputObj, cache, path) {
  path = path || '$';
  cache = cache || {};
  outputObj = outputObj || {};

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'undefined') {
    return obj;
  } else if (typeof obj === 'function') {
    var found = serializeCircular(obj, cache);
    if (found) {
      outputObj = found;
    } else {
      outputObj = serializeObject(obj, ignoreNativeFunc, outputObj, cache, path);
      outputObj[FUNCFLAG] = serializeFunction(obj, ignoreNativeFunc);
    }
    cache[path] = obj;
  } else {
    cache[path] = obj;
    var keys = Object.keys(obj);
    if (!path.endsWith("prototype") && !path.endsWith("__proto__")) {
      keys.push("prototype");
      keys.push("__proto__");
    }
    keys.forEach(function(key) {
      var destKey = key === "__proto__" ? PROTO : key === 'prototype' ? PROTOTYPE : key;
      if (obj.hasOwnProperty(key) || key === "prototype" || key === "__proto__") {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          var found = serializeCircular(obj[key], cache);
          if (found) {
            outputObj[destKey] = found;
          } else {
            outputObj[destKey] = exports.serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key);
          }
        } else if (typeof obj[key] === 'function') {
          outputObj[destKey] = exports.serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key);
        } else {
          outputObj[destKey] = obj[key];
        }
      }
    });
  }
  return (path === '$') ? JSON.stringify(outputObj) : outputObj;
};

exports.unserialize = function(obj, originObj) {
  var isIndex;
  if (typeof obj === 'string') {
    obj = JSON.parse(obj);
  }
  originObj = originObj || obj;

  if (obj[FUNCFLAG]) {
    obj = unserializeFunction(obj);
  }
  var circularTasks = [];
  var key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      var destKey = key === PROTO ? "__proto__" : key === PROTOTYPE ? "prototype" : key;
      if (typeof obj[key] === 'object' || typeof obj[key] === 'function') {
        obj[destKey] = exports.unserialize(obj[key], originObj);
        if (destKey !== key) {
          delete obj[key];
        }
      } else if (typeof obj[key] === 'string' && (obj[key].indexOf(KEYPATHSEPARATOR) > -1 || obj[key].indexOf(CIRCULARFLAG) === 0)) {
        if (obj[key].indexOf(CIRCULARFLAG) === 0) {
          obj[key] = obj[key].substring(CIRCULARFLAG.length);
        }
        circularTasks.push({
          obj : obj,
          sourceKey : key,
          destKey : destKey
        });
      }
    }
  }

  circularTasks.forEach(function(task) {
    var found = getKeyPath(originObj, task.obj[task.sourceKey]);
    if (found) {
      task.obj[task.destKey] = found;
    }
    if (task.sourceKey !== task.destKey) {
      delete (task.obj[task.sourceKey]);
    }
  });
  return obj;
};
