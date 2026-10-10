module.exports = {
  Master: require('./Master'),
  Client: require('./Client'),
  Booking: require('./Booking'),
  SubscriptionPayment: require('./SubscriptionPayment'),
  ...require('./Session'),
};
