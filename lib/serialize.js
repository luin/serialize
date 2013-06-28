var FUNCFLAG = '_$$ND_FUNC$$_';
var CIRCULARFLAG = '_$$ND_CC$$_';
var KEYPATHSEPARATOR = '_$$.$$_';
var ISNATIVEFUNC = /^function\s*[^(]*\(.*\)\s*\{\s*\[native code\]\s*\}$/;

exports.serialize = function(obj, outputObj, cache, path) {
  path = path || '$';
  cache = cache || {};
  cache[path] = obj;

  var ignoreNativeFunc = false;
  if (typeof outputObj === 'boolean') {
    ignoreNativeFunc = outputObj;
    outputObj = null;
  }
  outputObj = outputObj || {};

  var key;
  for(key in obj) {
    if(obj.hasOwnProperty(key)) {
      if(typeof obj[key] === 'object') {
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
          outputObj[key] = exports.serialize(obj[key], outputObj[key], cache, path + KEYPATHSEPARATOR + key);
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

exports.unserialize = function(obj, originObj) {
  var isIndex;
  if (typeof obj === 'string') {
    obj = JSON.parse(obj);
    isIndex = true;
  }
  originObj = originObj || obj;

  circularTasks = [];
  var key;
  for(key in obj) {
    if(obj.hasOwnProperty(key)) {
      if(typeof obj[key] === 'object') {
        obj[key] = exports.unserialize(obj[key], originObj);
      } else if(typeof obj[key] === 'string') {
        if(obj[key].indexOf(FUNCFLAG) === 0) {
          obj[key] = eval('(' + obj[key].substring(FUNCFLAG.length) + ')');
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

function getKeyPath(obj, path) {
  path = path.split(KEYPATHSEPARATOR);
  var currentObj = obj;
  path.forEach(function(p, index) {
    if (index) {
      currentObj = currentObj[p];
    }
  });
  return currentObj;
}

