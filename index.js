'use strict';

const BbPromise = require('bluebird');
const chalk = require('chalk');
const execPromise = require('./lib/execPromise');

/**
 * Default values for the serverless.yml definition.
 *
 * You can override any of these by overriding them in custom.go-build
 * @type {Object}
 */
const defaultGoDict = {
  // Prefix used for building for AWS
  awsbuildPrefix: 'GOOS=linux ',
  // Build command - followed by bin dest and input path
  buildCmd: `go build -ldflags="-s -w" -o`,
  // Test command - followed by value in tests array below
  testCmd: `GO_TEST=serverless go test`,
  // Path to store build results
  binPath: 'bin/',
  // Array of tests to run
  tests: [],
  // Runtime to require
  runtime: "go1.x"
}

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      build: {
        usage: 'Builds your go files needed for deployment',
        lifecycleEvents: [
          'build',
        ],
        options: {
          local: {
            usage:
              'If the build should be made for the local machine (otherwise defaults to AWS deployment)',
            shortcut: 'l',
          },
        },
      },
      test: {
        usage: 'Runs your go tests',
        lifecycleEvents: [
          'test',
        ],
      },
    };

    this.hooks = {
      'build:build': this.build.bind(this),
      'test:test': this.tests.bind(this),
      'before:deploy:function:packageFunction': this.predeploy.bind(this),
      'before:package:createDeploymentArtifacts': this.predeploy.bind(this),
    };
  }

  getGoConfigParam(param) {
    try {
      const val = this.serverless.service.custom['go-build'][param]
      return val !== undefined ? val : defaultGoDict[param]
    }
    catch (err) {
      return defaultGoDict[param]
    }
  }

  getRelevantGoFunctions() {
    let functionNames;
    
    if (this.options.function) {
      functionNames = [this.options.function];
    } else {
      // Get all functions just gets names - not full object
      functionNames = this.serverless.service.getAllFunctions()
    }

    // Retrieve the full objects
    const functions = functionNames.map((func) => this.serverless.service.getFunction(func))

    // Filter out functions that are not the expected runtime

    // Get the runtime we are expecting a function to have
    const runtime = this.getGoConfigParam('runtime')

    // First determine if project default is golang
    const isProjectGolang = this.serverless.service.provider.runtime === runtime

    let isFileGolangFunc;
    if (isProjectGolang) {
      isFileGolangFunc = f => !f.runtime || f.runtime === runtime
    } else {
      isFileGolangFunc = f => f.runtime && f.runtime === runtime
    }

    const goFunctions = functions.filter(isFileGolangFunc)

    return goFunctions
  }

  getOutputBin(func) {
      let outputbin = func.handler.replace(/\.go$/, "")
      const binPath = this.getGoConfigParam('binPath')
      outputbin = binPath + outputbin
      return outputbin
  }


  build() {
    this.serverless.cli.log('Beginning Go build');

    // Run build on relevant go functions
    const functions = this.getRelevantGoFunctions();

    return BbPromise.mapSeries(functions, func => {

      // Construct the build command
      const awsbuildPrefix = this.getGoConfigParam('awsbuildPrefix')
      const buildPrefix = awsbuildPrefix + this.getGoConfigParam('buildCmd')
      const buildCmd = `${buildPrefix} ${this.getOutputBin(func)} ${func.handler}`

      // Log the build command being run
      this.serverless.cli.log(buildCmd);

      // Return a promise executing the build command
      return execPromise(buildCmd).catch(err => {
        // Couldn't build file - output appropriate errors
        console.log(chalk.red(`Error building golang file at ${func.handler}\n` + 
                              `To replicate please run:\n` + 
                              `${buildCmd}\n`));
        throw Error("Go build failure")
      });
    });
  }

  tests() {
    this.serverless.cli.log('Running Go tests')

    const tests = this.getGoConfigParam('tests')

    if (!tests.length) {
      console.log(chalk.red('No tests to run - add tests to custom.go-build.tests in your serverless file.'))
    }

    return BbPromise.mapSeries(tests, test => {
      // Construct the test command
      const testPrefix = this.getGoConfigParam('testCmd')
      const testCmd = `${testPrefix} ${test}`

      // Return a promise executing the build command
      return execPromise(testCmd).catch(err => {
        // Couldn't build file - output appropriate errors
        console.log(chalk.red(`Error running test on ${test}\n` + 
                              `To replicate please run:\n` + 
                              `${testCmd}\n`));
        throw Error("Go test failure")
      });
    })
  }

  predeploy() {
    this.serverless.cli.log(`Reassigning go paths to point to ${this.getGoConfigParam('binPath')}`);

    const functions = this.getRelevantGoFunctions();
    for (const func of functions) {
      func.handler = this.getOutputBin(func)
    }
  }
}

module.exports = ServerlessPlugin;
