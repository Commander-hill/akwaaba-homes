import NodeCache from 'node-cache';

// stdTTL is the default time-to-live in seconds (5 minutes)
// checkperiod is the interval in seconds for checking and deleting expired keys (1 minute)
const appCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export default appCache;
