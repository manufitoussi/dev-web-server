var Repository = {
  count:0
};

module.exports = {
  '/exemple': function (req, res, params, sendSuccess, sendError) {
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });
  }
};