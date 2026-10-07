var Repository = {
  count:0
};

export default {
  '/example': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"test":"coucou","count":0}', then 1, 2...
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });

  },
  
  '/exampleMethod': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"method":"<the request method>","params":{...}}'.
    // HTTP code is 200
    sendSuccess(req, res, {
      method: req.method,
      params: params
    });

  },

  '/exampleJSONP': function (req, res, params, sendSuccess, sendError) {
    
    // With '?myCallbackName=myCallback', the response result is: myCallback({"test":"coucou","count":0});
    // HTTP code is 200
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    }, params.myCallbackName);

  },

  '/exampleError': function (req, res, params, sendSuccess, sendError) {
    
    // Response result is: '{"error":{"code":401,"message":"An error occurred while doing something"}}'.
    // HTTP code is 401
    sendError(req, res, 401, 'An error occurred while doing something');

  }
};