var Repository = {
  count:0
};

module.exports = {
  '/example': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"test":"coucou","count":1}'.
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });

  },

  '/exampleJSONP': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: myCallback({"test":"coucou","count":1}).
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    }, params.myCallbackName);

  },

  '/exampleError': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"code":401,"message":"An error occured durring doing something"}'.
    // HTTP code is 401
    sendError(req, res, 401, 'An error occured durring doing something');

  }
};