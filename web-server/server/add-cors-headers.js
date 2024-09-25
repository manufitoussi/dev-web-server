
module.exports = {
  addCorsHeaders: function (res) {
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Requested-With, Content-Type, Origin, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },

  addCashControlHeader: function (res, value = 'no-cache') {
    res.setHeader('Cache-Control', value);
  },

}
