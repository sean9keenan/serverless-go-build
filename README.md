# serverless-go-build
Makes building go with serverless easy!

 - `serverless build` : Builds _all_ Go binaries listed as function handlers
 - `serverless test` : Allows running tests
 - Heavy customization : (Doesn't even need to build Go!)

`serverless deploy` will not run the builds - run `serverless build` first.

Will support the following very soon:
 - Allow packageName.FunctionName as function handlers
 - Automatically packaging go binaries into separate deployed zips
 - Allowing running serverless dev environments when running tests (eg: dynamoDB)
 - `test` command supporting 

Example `serverless.yml`
```yaml
service: myService
plugins:
  - serverless-go-build
custom:
  go-build:
    tests:
      - ./endpoints
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
The most up-to-date place to look is the code - the top of `index.js`.

 - Prefix used for building for AWS
    + `awsbuildPrefix: 'GOOS=linux '`
 - Build command - followed by bin dest and input path
    + `buildCmd: 'go build -ldflags="-s -w" -o'`
 - Test command - followed by value in tests array below
    + `testCmd: 'GO_TEST=serverless go test'`
 - Path to store build results
    + `binPath: 'bin/',`
 - Array of tests to run
    + `tests: []`

