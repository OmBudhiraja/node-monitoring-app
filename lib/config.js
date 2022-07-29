const environments = {};

environments.development = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'development',
  hashingSalt: 'c09481fc7ad05144ab030d2304043e9c',
  maxChecks: 5,
  twilio: {
    fromPhone: '+19803754328',
    accountSid: 'AC78888fc5a356b8843725b238959d1214',
    authToken: '0c5ce96cd83aef42b77275167dad7aaa',
  },
  templateGlobals: {
    appName: 'Uptime Checker',
    baseUrl: 'https://localhost:5001',
    yearCreated: '2022',
    companyName: 'NotARealCompany, Inc',
  },
};

environments.staging = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'staging',
  hashingSalt: 'c09481fc7ad05144ab030d2304043e9c',
  maxChecks: 5,
  twilio: {
    fromPhone: '+19803754328',
    accountSid: 'AC78888fc5a356b8843725b238959d1214',
    authToken: '0c5ce96cd83aef42b77275167dad7aaa',
  },
  templateGlobals: {
    appName: 'Uptime Checker',
    baseUrl: 'https://localhost:5001',
    yearCreated: '2022',
    companyName: 'NotARealCompany, Inc',
  },
};

environments.testing = {
  httpPort: 4000,
  httpsPort: 4001,
  envName: 'testing',
  hashingSalt: 'c09481fc7ad05144ab030d2304043e9c',
  maxChecks: 5,
  twilio: {
    fromPhone: '+19803754328',
    accountSid: 'AC78888fc5a356b8843725b238959d1214',
    authToken: '0c5ce96cd83aef42b77275167dad7aaa',
  },
  templateGlobals: {
    appName: 'Uptime Checker',
    baseUrl: 'https://localhost:5001',
    yearCreated: '2022',
    companyName: 'NotARealCompany, Inc',
  },
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSalt: '9e1843bff3dce1ea4b337abc54da41b6',
  maxChecks: 5,
  twilio: {
    fromPhone: '+19803754328',
    accountSid: 'AC78888fc5a356b8843725b238959d1214',
    authToken: '0c5ce96cd83aef42b77275167dad7aaa',
  },
  templateGlobals: {
    appName: 'Uptime Checker',
    baseUrl: 'https://localhost:5001',
    yearCreated: '2022',
    companyName: 'NotARealCompany, Inc',
  },
};

const currentEvn =
  process.env.NODE_ENV && typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.toLowerCase().trim()
    : '';

const envsToExport = environments[currentEvn]
  ? environments[currentEvn]
  : environments.staging;

export default envsToExport;
