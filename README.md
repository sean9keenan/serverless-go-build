# Serverless Go Build

[![Serverless][ico-serverless]][link-serverless]
[![License][ico-license]][link-license]
[![NPM][ico-npm]][link-npm]

[ico-serverless]: http://public.serverless.com/badges/v3.svg
[ico-license]: https://img.shields.io/github/license/sean9keenan/serverless-go-build.svg
[ico-npm]: https://img.shields.io/npm/v/serverless-go-build.svg
[link-serverless]: http://www.serverless.com/
[link-license]: ./LICENSE
[link-npm]: https://www.npmjs.com/package/serverless-go-build

A Serverless v1.x plugin to making building Go easy!

Use your serverless.yml file as your build script, allowing specifying public functions or .go files as your entry points. Also can start other serverless plugins before running tests, and of course properly packages the built binary for upload (by default even individually packages each binary for increased performance!).

## Disclaimer

- I'm not the original creator of this plugin. This plugin is forked from [sean9keenan@serverless-go-build](https://github.com/sean9keenan/serverless-go-build).
- I'm forking and enhancing this plugin following my needs so i won't update the plugin if i don't need to, but feel free to open a PR if you think this plugin need enhancement.
- I'm not an expert JS developer, so feel free to open PR if there are some codes that can be optimized.

## Enhancement / Changes Made

- Updates npm dependencies.
- Individual go build for single function/handler.
- Add UPX functionality using [upx JS package](https://www.npmjs.com/package/upx).
- Package separation. _I can't stand looking at large code in a file_ :')
  - The default params is extracted to `defaultParams.js`.
  - The support / utils func is extracted to `lib/classFunc.js`.

## Individual Go Build

Build go executable for specified handler only.

```
sls build -f <function1>
```

## UPX Usage

List of [UPX options](https://www.npmjs.com/package/upx/v/1.0.6?activeTab=readme).

```
functions:
  function1:
    upxEnabled: true
    upxOption:
      brute: true

custom:
  go-build:
    upxEnabled: true
    upxOption:
      brute: true
```

Upx is disabled by default globally and can be enabled globally at `custom`.

If you want to only enable upx for several function, the upx need to be globally enabled and have the function disable the upx.

The function level settings will overwrite global level settings but the upx must be enabled globally first.

If there are 2 options given, only the first option is considered.
