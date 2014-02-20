var Repository = {
  count:0
};

module.exports = {

  '/example': function (req, res, params, sendSuccess, sendError) {
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++,
      params: params
    });
  },

  '/exampleError': function (req, res, params, sendSuccess, sendError) {
    sendError(req, res, 401, "erreur d'authentification");
  }
};