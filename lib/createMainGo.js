const BbPromise = require('bluebird');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

// Default main file
const mainGoContent = (modulePath, moduleName, pubFunc, pathToLambda) => {
  return `package main

import (
    "${pathToLambda}"
    "${modulePath}"
)

func main() {
    lambda.Start(${moduleName}.${pubFunc})
}
`;
}

/**
 * Creates the main go file for a specific module
 * @param  {string} outPath      Path to place the created main.go file
 * @param  {string} modulePath   Path to module
 * @param  {string} moduleName   Name of module
 * @param  {string} pubFunc      Name of public function in module
 * @param  {string} pathToLambda Path to lambda import
 * @return {BbPromise}           Promise that creates the main.go file
 */
const createMainGo = (outPath, modulePath, moduleName, pubFunc, pathToLambda) => {
  return new BbPromise((resolve, reject) => {
    console.log(`Creating main for module: ${modulePath}/${pubFunc}`);

    const content = mainGoContent(modulePath, moduleName, pubFunc, pathToLambda)

    const directory = path.dirname(outPath)
    if (!fs.existsSync(directory)){
      mkdirp.sync(directory);
    }

    fs.writeFile(outPath, content, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

module.exports = createMainGo;