"use strict";

const BbPromise = require("bluebird");
const chalk = require("chalk");
const path = require("path");

const execUpx = require("./lib/execUpx");
const execPromise = require("./lib/execPromise");
const createMainGo = require("./lib/createMainGo");
const {
  getGoConfigParam,
  getRelevantGoFunctions,
  getOutputBin,
  getGoPath,
  getFunctionNeedingMain,
} = require("./lib/classFunc");

function format(str, arr) {
  return str.replace(/%(\d+)/g, function (_, m) {
    return arr[--m];
  });
}

class TerminateOnTestFinishSuccess extends Error {
  constructor(commands) {
    const message = `Tests completed successfully  - terminating`;

    super(message);
    this.message = message;
    this.name = "Tests Successful";
  }
}

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      build: {
        usage: "Builds your go files needed for deployment",
        lifecycleEvents: ["goBuild", "upxCompress"],
        options: {
          local: {
            usage:
              "Not yet active: If the build should be made for the local machine (otherwise defaults to AWS deployment)",
            shortcut: "l",
            required: false,
            type: "boolean",
          },
          function: {
            usage: "Build go executable for the one function given only",
            shortcut: "f",
            required: false,
            type: "string",
          },
        },
      },
      test: {
        usage: "Runs your go tests",
        lifecycleEvents: ["test"],
      },
    };

    this.hooks = {
      "before:build:goBuild": this.createMains.bind(this),
      "build:goBuild": this.goBuild.bind(this),
      "build:upxCompress": this.upxCompress.bind(this),
      "test:test": this.tests.bind(this),
      "before:deploy:function:packageFunction": this.predeploy.bind(this),
      "before:package:createDeploymentArtifacts": this.predeploy.bind(this),
    };
  }

  /**
   * Create main go files if pointing towards a package
   */
  createMains() {
    const functions = this.getRelevantGoFunctions();

    // Get all functions that need main
    const foundFunctions = [];
    for (const func of functions) {
      const funcNeedingMain = this.getFunctionNeedingMain(func);
      if (funcNeedingMain) {
        foundFunctions.push(funcNeedingMain);
      }
    }

    // Exit early if none found
    if (!foundFunctions.length) {
      return;
    }

    this.serverless.cli.log("Creating main functions for modules");
    return BbPromise.mapSeries(foundFunctions, (funcMap) => {
      const goPath = this.getGoPath();
      const fullModulePath = `${this.serverless.config.servicePath}/${funcMap.modulePath}`;

      if (!fullModulePath.startsWith(goPath)) {
        // Couldn't build file - output appropriate errors
        console.log(
          chalk.red(
            `"Module path not in GOPATH - set gopath in serverless if needed"`
          )
        );
        throw Error(
          "Module path not in GOPATH - set gopath in serverless if needed"
        );
      }

      // Variables needed to generated main file
      const outPath = path.join(
        this.serverless.config.servicePath,
        funcMap.mainPath
      );
      const moduleName = funcMap.moduleName;
      const modulePath = fullModulePath.substr(goPath.length);
      const pubFunc = funcMap.publicFunctionName;
      const pathToLambda = this.getGoConfigParam("pathToAWSLambda");

      return createMainGo(
        outPath,
        modulePath,
        moduleName,
        pubFunc,
        pathToLambda
      ).catch((err) => {
        // Couldn't build file - output appropriate errors
        console.log(err);
        throw Error("Go build failure");
      });
    });
  }

  /**
   * Run the build on all relevant files
   * @return {BbPromise}
   */
  goBuild() {
    this.serverless.cli.log("Beginning Go build");

    // Run build on relevant go functions
    const functions = this.getRelevantGoFunctions();

    return BbPromise.mapSeries(functions, (func, idx) => {
      const funcNeedingMain = this.getFunctionNeedingMain(func);
      const mainPath = funcNeedingMain
        ? funcNeedingMain.mainPath
        : func.handler;

      // Construct the build command
      const awsbuildPrefix = this.getGoConfigParam("awsbuildPrefix");
      const buildPrefix = awsbuildPrefix + this.getGoConfigParam("buildCmd");
      const buildCmd = format(buildPrefix, [mainPath, this.getOutputBin(func)]);

      // Log the build command being run
      this.serverless.cli.log(buildCmd);

      // Return a promise executing the build command
      return execPromise(buildCmd).catch((err) => {
        // Couldn't build file - output appropriate errors
        console.log(
          chalk.red(
            `Error building golang file at ${func.handler}\n` +
              `To replicate please run:\n` +
              `${buildCmd}\n`
          )
        );
        throw Error("Go build failure");
      });
    });
  }

  /**
   * Run the build on all relevant files
   * @return {BbPromise}
   */
  upxCompress() {
    if (!this.getGoConfigParam("upxEnabled")) {
      return;
    }

    this.serverless.cli.log("");
    this.serverless.cli.log("Beginning UPX compressing");

    // Run upx command on relevant build file
    const functions = this.getRelevantGoFunctions();

    BbPromise.mapSeries(functions, (func, idx) => {
      if (func.upxEnabled != null && !func.upxEnabled) {
        return;
      }

      const upxOption =
        func.upxOption != null
          ? func.upxOption
          : this.getGoConfigParam("upxOption");

      // Return a promise executing the upx command
      return execUpx(this.getOutputBin(func), upxOption).catch((err) => {
        // Couldn't compress file - output appropriate errors
        console.log(
          chalk.red(`Error compressing executable at ${func.handler}\n`)
        );
        throw Error("UPX compressing failure");
      });
    });
  }

  /**
   * Run tests
   * @return {BbPromise}
   */
  tests() {
    this.serverless.cli.log("Running Go tests");

    const tests = this.getGoConfigParam("tests");

    if (!tests.length) {
      console.log(
        chalk.red(
          "No tests to run - add tests to custom.go-build.tests in your serverless file."
        )
      );
    }

    const testPlugins = this.getGoConfigParam("testPlugins");
    const testStartDelay = this.getGoConfigParam("testStartDelay");

    return BbPromise.mapSeries(testPlugins, (plugin) => {
      return this.serverless.pluginManager.spawn(plugin, {
        terminateLifecycleAfterExecution: false,
      });
    })
      .delay(testStartDelay)
      .then((result) => {
        return BbPromise.mapSeries(tests, (test) => {
          // Construct the test command
          const testPrefix = this.getGoConfigParam("testCmd");
          const testCmd = format(testPrefix, [test]);

          // Return a promise executing the build command
          return execPromise(testCmd).catch((err) => {
            // Couldn't build file - output appropriate errors
            console.log(
              chalk.red(
                `Error running test on ${test}\n` +
                  `To replicate please run:\n` +
                  `${testCmd}\n`
              )
            );
            throw Error("Go test failure");
          });
        });
      })
      .then((result) => {
        this.serverless.cli.log(`Tests successfully exited`);
        // Unfortunately there does not seem to be a clean way
        // to quit out of serverless without throwing an error
        // and thus returning a non-zero response which is
        // unacceptable when running tests.
        // Simply exit the process with a success.
        // Re-add the BbPromise reject for a slightly cleaner exit
        process.exit(0);
        // return BbPromise.reject(new TerminateOnTestFinishSuccess())
      });
  }

  /**
   * Before packaging functions must be redirected to point at the binary built
   */
  predeploy() {
    this.serverless.cli.log(
      `Reassigning go paths to point to ${this.getGoConfigParam("binPath")}`
    );

    const functions = this.getRelevantGoFunctions();
    for (const func of functions) {
      func.handler = this.getOutputBin(func);
      if (this.getGoConfigParam("minimizePackage") && !func.package) {
        func.package = {
          exclude: [`./**`],
          include: [`./${func.handler}`],
        };
      }
    }
  }
}

// Attach functions to the class object
ServerlessPlugin.prototype.getGoConfigParam = getGoConfigParam;
ServerlessPlugin.prototype.getRelevantGoFunctions = getRelevantGoFunctions;
ServerlessPlugin.prototype.getOutputBin = getOutputBin;
ServerlessPlugin.prototype.getGoPath = getGoPath;
ServerlessPlugin.prototype.getFunctionNeedingMain = getFunctionNeedingMain;

module.exports = ServerlessPlugin;
