FUNCFLAG = '_$$ND_FUNC$$_'
FUNCBODY = '_$$ND_FUNCBODY$$_'
PROTO = '_$$ND_PROTO$$_'
PROTOTYPE = '_$$ND_PROTOTYPE$$_'
CIRCULARFLAG = '_$$ND_CC$$_'
KEYPATHSEPARATOR = '_$$.$$_'
ISNATIVEFUNC = /^function\s*[^(]*\(.*\)\s*\{\s*\[native code\]\s*\}$/

getKeyPath = (obj, path) ->
  try
    path = path.split(KEYPATHSEPARATOR)
    currentObj = obj
    path.forEach (p, index) ->
      if index
        currentObj = currentObj[p]
      return
    return currentObj
  catch e
    return false
  return

serializeCircular = (obj, cache) ->
  for subKey of cache
    if cache.hasOwnProperty(subKey)
      if cache[subKey] == obj
        return CIRCULARFLAG + subKey
  false

serializeFunction = (func, ignoreNativeFunc) ->
  funcStr = func.toString()
  if ISNATIVEFUNC.test(funcStr)
    if ignoreNativeFunc
      funcStr = 'function() {throw new Error("Call a native function unserialized")}'
    else
      throw new Error('Can\'t serialize a object with a native function property. Use serialize(obj, true) to ignore the error.')
  funcStr

unserializeFunction = (func, originObj) ->
  funcObj = eval('( ' + func[FUNCFLAG] + ' )')
  delete func[FUNCFLAG]
  for key of func
    funcObj[key] = func[key]
  funcObj

serializeObject = (obj, ignoreNativeFunc, outputObj, cache, path) ->
  output = {}
  keys = Object.keys(obj)
  if !path.endsWith('prototype') and !path.endsWith('__proto__')
    keys.push 'prototype'
    keys.push '__proto__'
  keys.forEach (key) ->
    if obj.hasOwnProperty(key) or key == 'prototype' or key == '__proto__'
      destKey = if key == '__proto__' then PROTO else if key == 'prototype' then PROTOTYPE else key
      if typeof obj[key] == 'object' and obj[key] != null
        found = serializeCircular(obj[key], cache)
        if found
          output[destKey] = found
        else
          output[destKey] = exports.serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key)
      else if typeof obj[key] == 'function'
        output[destKey] = exports.serialize(obj[key], ignoreNativeFunc, outputObj[key], cache, path + KEYPATHSEPARATOR + key)
      else
        output[destKey] = obj[key]
    return
  output

module.exports.serialize = (obj, ignoreNativeFunc, outputObj, cache, path) ->
  path = path or '$'
  cache = cache or {}
  outputObj = outputObj or {}
  if typeof obj == 'string' or typeof obj == 'number' or typeof obj == 'undefined'
    return obj
  else if obj.constructor == Array
    outputObj = []
    cache[path] = outputObj
    obj.forEach (value, index) ->
      outputObj.push exports.serialize(value, ignoreNativeFunc, outputObj, cache, path + KEYPATHSEPARATOR + index)
      return
  else
    found = serializeCircular(obj, cache)
    if found
      outputObj = found
    else
      cache[path] = obj
      outputObj = serializeObject(obj, ignoreNativeFunc, outputObj, cache, path)
      if typeof obj == 'function'
        outputObj[FUNCFLAG] = serializeFunction(obj, ignoreNativeFunc)
  if path == '$' then JSON.stringify(outputObj) else outputObj

module.exports.unserialize = (obj, originObj) ->
  isIndex = undefined
  if typeof obj == 'string'
    obj = JSON.parse(obj)
  originObj = originObj or obj
  if obj[FUNCFLAG]
    obj = unserializeFunction(obj)
  circularTasks = []
  for key of obj
    if obj.hasOwnProperty(key)
      destKey = if key == PROTO then '__proto__' else if key == PROTOTYPE then 'prototype' else key
      if typeof obj[key] == 'object' or typeof obj[key] == 'function'
        obj[destKey] = exports.unserialize(obj[key], originObj)
        if destKey != key
          delete obj[key]
      else if typeof obj[key] == 'string' and (obj[key].indexOf(KEYPATHSEPARATOR) > -1 or obj[key].indexOf(CIRCULARFLAG) == 0)
        if obj[key].indexOf(CIRCULARFLAG) == 0
          obj[key] = obj[key].substring(CIRCULARFLAG.length)
        circularTasks.push
          obj: obj
          sourceKey: key
          destKey: destKey
  circularTasks.forEach (task) ->
    found = getKeyPath(originObj, task.obj[task.sourceKey])
    if found
      task.obj[task.destKey] = found
    if task.sourceKey != task.destKey
      delete task.obj[task.sourceKey]
    return
  obj
