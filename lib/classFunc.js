const path = require("path");

const defaultGoDict = require("../defaultParams");

/**
 * Gets go-build configuation parameter from serverless.yml - or default
 * @param  {string} param -- Key to get - must be defined in defaultGoDict
 * @return {object}
 */
function getGoConfigParam(param) {
  try {
    const val = this.serverless.service.custom["go-build"][param];
    return val !== undefined ? val : defaultGoDict[param];
  } catch (err) {
    return defaultGoDict[param];
  }
}

/**
 * Gets all functions for building.
 *
 * This filters out functions from the wrong runtime, or returns only a single
 * function in the case that a specific function was passed in at runtime
 *
 * @return {list(objects)} List of functions, objects defined by serverless
 */
function getRelevantGoFunctions() {
  let functionNames;

  if (this.options.function) {
    functionNames = [this.options.function];
  } else {
    // Get all functions just gets names - not full object
    functionNames = this.serverless.service.getAllFunctions();
  }

  // Retrieve the full objects
  const rawFunctions = functionNames.map((func) =>
    this.serverless.service.getFunction(func)
  );

  const functions =
    this.getGoConfigParam("useBinPathForHandler") === true
      ? rawFunctions.map((func) => {
          const p = func.handler
            .substring(this.getGoConfigParam("binPath").length + 1)
            .split("/");
          p.pop();
          return {
            ...func,
            handler: p.join("/") + "/*.go",
          };
        })
      : rawFunctions;

  //
  // Filter out functions that are not the expected runtime
  //

  // Get the runtime we are expecting a function to have
  const runtime = this.getGoConfigParam("runtime");

  // First determine if project default is golang
  const isProjectGolang = this.serverless.service.provider.runtime === runtime;

  let isFileGolangFunc;
  if (isProjectGolang) {
    isFileGolangFunc = (f) => !f.runtime || f.runtime === runtime;
  } else {
    isFileGolangFunc = (f) => f.runtime && f.runtime === runtime;
  }

  const goFunctions = functions.filter(isFileGolangFunc);

  return goFunctions;
}

/**
 * Get the destination binary path for a given function
 * @param  {object} func -- Serverless function object
 * @return {string}      -- Path of binary
 */
function getOutputBin(func) {
  let outputbin = func.handler.replace(/\.go$/, "");
  if (this.getGoConfigParam("useBinPathForHandler")) {
    outputbin = outputbin.replace(/\*$/, "main");
  }
  const binPath = this.getGoConfigParam("binPath");
  outputbin = path.join(binPath, outputbin);
  return outputbin;
}

/**
 * Path to GO root
 * Gets it from optional field goPath, otherwise ENV variable GOPATH
 * @return {string} GOPATH to source
 */
function getGoPath() {
  const goPath = this.getGoConfigParam("goPath");
  return goPath ? goPath : `${process.env.GOPATH}/src/`;
}

/**
   * Find functions needing generated main paths
   * @param  {object} func Serverless function object
   * @return {object}     
   *      func {object} (same as passed in)
   *      publicFunctionName Public Function
   *      modulePath         Path to module
   *      moduleName         Name of module
   *      mainPath           Path to place the created main.go file

   */
function getFunctionNeedingMain(func) {
  if (!func || !func.handler) {
    return null;
  }
  // Which is the public function that should be run
  // Match the "file extension" part of the path
  const matchedFunc = func.handler.match(/(.*?)\.([^\.]*)$/);
  if (!matchedFunc) {
    return null;
  }

  const modulePath = matchedFunc[1];
  const publicFunctionName = matchedFunc[2];

  // If a .go - it's not a function needing a generated main
  // (It's a .go file...)
  if (publicFunctionName === "go") {
    return null;
  }

  // Get filename from the modulePath
  const mainBasePath = this.getGoConfigParam("generatedMainPath");
  // Get module name by replacing everything in the leading path (TODO: switch to library)
  const moduleName = modulePath.replace(/^.*[\\\/]/, "");
  // Generate full path to generated go file
  const mainPath = path.join(
    mainBasePath,
    modulePath,
    publicFunctionName,
    "main.go"
  );

  return {
    func,
    publicFunctionName,
    modulePath,
    moduleName,
    mainPath,
  };
}

module.exports = {
  getGoConfigParam,
  getRelevantGoFunctions,
  getOutputBin,
  getGoPath,
  getFunctionNeedingMain,
};
