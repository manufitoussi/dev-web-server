var Repository = {
  count:0
};

module.exports = {
  '/example': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"test":"coucou","count":1, 2, 3, ...}'.
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });

  },
  
  '/exampleMethod': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"method": "The request method"}'.
    // HTTP code is 200
    sendSuccess(req, res, {
      method: req.method,
      params: params
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
    
    // Response result is: '{"code":401,"message":"An error occurred during doing something"}'.
    // HTTP code is 401
    sendError(req, res, 401, 'An error occurred during doing something');

  }
};