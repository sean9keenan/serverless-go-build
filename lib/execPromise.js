const { exec } = require('child_process');
const BbPromise = require('bluebird');
const chalk = require('chalk');

/**
 * Lightweight wrapper around exec
 *
 * Returns a BbPromise and always prints to stdout and stderr
 * in white and red respectively
 * 
 * @param  {string} cmd -- Command to run on cmd line
 * @return {BbPromise}        
 */
const execPromise = cmd => {
  return new BbPromise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {

      // Always print out stdout (normally empty)
      stdout && console.log(stdout);

      // Print stderr in red
      stderr && console.log(chalk.red(stderr));

      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

module.exports = execPromise;