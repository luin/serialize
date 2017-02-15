(function () {
  var FUNCFLAG = '_$$ND_FUNC$$_';
  var CIRCULARFLAG = '_$$ND_CC$$_';
  var KEYPATHSEPARATOR = '_$$.$$_';
  var ISNATIVEFUNC = /^function\s*[^(]*\(.*\)\s*\{\s*\[native code\]\s*\}$/;
  var ISIIFE = /\([\s\S]*\)$/;

  var getKeyPath = function(obj, path) {
    path = path.split(KEYPATHSEPARATOR);
    var currentObj = obj;
    path.forEach(function(p, index) {
      if (index) {
        currentObj = currentObj[p];
      }
    });
    return currentObj;
  };

  serialize = function(obj, ignoreNativeFunc, outputObj, cache, path) {
    path = path || '$';
    cache = cache || {};
    cache[path] = obj;
    outputObj = outputObj || {};

    var key;
    for(key in obj) {
      if(obj.hasOwnProperty(key)) {
        if(typeof obj[key] === 'object' && obj[key] !== null) {
          var subKey;
          var found = false;
          for(subKey in cache) {
            if (cache.hasOwnProperty(subKey)) {
              if (cache[subKey] === obj[key]) {
                outputObj[key] = CIRCULARFLAG + subKey;
                found = true;
              }
            }
          }
          if (!found) {
            outputObj[key] = serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key);
          }
        } else if(typeof obj[key] === 'function') {
          var funcStr = obj[key].toString();
          if(ISNATIVEFUNC.test(funcStr)) {
            if(ignoreNativeFunc) {
              funcStr = 'function() {throw new Error("Call a native function unserialized")}';
            } else {
              throw new Error('Can\'t serialize a object with a native function property. Use serialize(obj, true) to ignore the error.');
            }
          }
          outputObj[key] = FUNCFLAG + funcStr;
        } else {
          outputObj[key] = obj[key];
        }
      }
    }

    return (path === '$') ? JSON.stringify(outputObj) : outputObj;
  };

  unserialize = function(obj, originObj, iifeEnabled) {
    var isIndex;
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
      isIndex = true;
    }
    originObj = originObj || obj;

    var circularTasks = [];
    var key;
    for(key in obj) {
      if(obj.hasOwnProperty(key)) {
        if(typeof obj[key] === 'object') {
          obj[key] = unserialize(obj[key], originObj);
        } else if(typeof obj[key] === 'string') {
          if(obj[key].indexOf(FUNCFLAG) === 0) {
            var functionString = obj[key].substring(FUNCFLAG.length);
            if (!ISIIFE.test(functionString) || iifeEnabled) {
              obj[key] = eval('(' + functionString + ')');
            } else {
              throw new Error('Try to execute an IIFE which is not allowed.');
            }
          } else if(obj[key].indexOf(CIRCULARFLAG) === 0) {
            obj[key] = obj[key].substring(CIRCULARFLAG.length);
            circularTasks.push({obj: obj, key: key});
          }
        }
      }
    }

    if (isIndex) {
      circularTasks.forEach(function(task) {
        task.obj[task.key] = getKeyPath(originObj, task.obj[task.key]);
      });
    }
    return obj;
  };


  var objectToExports = {
    serialize: serialize,
    unserialize: unserialize
  };

  // Node.js
  if (typeof module === 'object' && module.exports) {
    module.exports = objectToExports;
  }
  // AMD / RequireJS
  else if (typeof define === 'function' && define.amd) {
    define(function () { return objectToExports; });
  }
  // included directly via <script> tag
  else {
    window.serialize = objectToExports;
  }
}());
