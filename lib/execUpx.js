const BbPromise = require("bluebird");
const chalk = require("chalk");

/**
 * Lightweight wrapper around upx command
 *
 * Returns a BbPromise and always prints to stdout and stderr
 * in white and red respectively
 *
 * @param  {string} binPath -- Bin path location of go build result
 * @param  {string} upxOption -- Upx execution options
 * @return {BbPromise}
 */
const execUpx = (binPath, upxOption) => {
  return new BbPromise((resolve, reject) => {
    const UPX = require("upx")(upxOption);

    // Execute UPX compressing
    UPX(binPath)
      .start()
      .then(function (stats) {
        // Get upx execution metadata
        const optionName =
          Object.keys(upxOption)[0] == null
            ? "standard"
            : Object.keys(upxOption)[0];
        const sizeBefore = (parseInt(stats.fileSize.before) / 1000000).toFixed(
          2
        );
        const sizeAfter = (parseInt(stats.fileSize.after) / 1000000).toFixed(2);
        const totalReduced = 100 - parseFloat(stats.ratio);

        console.log(
          `[${optionName}] ${binPath} (${totalReduced}% reduced) ${sizeBefore} Mb => ${sizeAfter} Mb`
        );
      })
      .catch(function (err) {
        console.log(chalk.red(err));
        reject(err);
      });

    resolve();
  });
};

module.exports = execUpx;
