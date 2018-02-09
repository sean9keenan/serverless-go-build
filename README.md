# Serverless Go Builds

[![Serverless][ico-serverless]][link-serverless]
[![License][ico-license]][link-license]
[![NPM][ico-npm]][link-npm]

A Serverless v1.x plugin to making building Go easy!

This is for you if you don't want to maintain a separate build script, indirect serverless handler definitions, and want the easiest Go serverless experince!


## Installation
```bash
npm install --save serverless-go-build
```

## Usage

 - `serverless build` : Builds _all_ Go binaries listed as function handlers
 - `serverless build --function getWidget` : Builds specific Go binaries
 - `serverless test` : Runs tests specified in serverless.yml
 - Heavy customization : (Doesn't even need to build Go!)

`serverless deploy` will *not* run the builds - run `serverless build` first.

### Example `serverless.yml`

```yaml
service: myService
plugins:
  - serverless-go-build
custom:
  go-build:
    tests:
      - ./endpoints
provider:
  name: aws
  runtime: go1.x
  stage: ${opt:stage, 'testing'}
package:
  exclude:
    - ./**
  include:
    - ./bin/**
functions:
  getWidget:
    handler: entrypoints/widget/get.go
    name: myService-${self:provider.stage}-getWidget
    events:
      - http:
          path: widget
          method: get
  postWidget:
    handler: entrypoints/widget/post.go
    name: myService-${self:provider.stage}-postWidget
    events:
      - http:
          path: widget
          method: post
```

## Customization
You can override any of these fields inside of `custom.go-build`:
```js
{
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
```


## Coming Soon 
Will support the following very soon:
 - Allow packageName.FunctionName as function handlers
 - Automatically packaging go binaries into separate deployed zips
    + Remove need to include package exclude/include
 - Allowing running serverless dev environments when running tests (eg: dynamoDB)
 - `serverless test` command supporting running individual test


[ico-serverless]: http://public.serverless.com/badges/v3.svg
[ico-license]: https://img.shields.io/github/license/sean9keenan/serverless-go-build.svg
[ico-npm]: https://img.shields.io/npm/v/serverless-go-build.svg

[link-serverless]: http://www.serverless.com/
[link-license]: ./LICENSE
[link-npm]: https://www.npmjs.com/package/serverless-go-build