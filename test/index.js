import apiTests from './api.js';
import unitTests from './unit.js';

class Tests {
  constructor() {
    this.tests = {};
    this.tests.unitTests = unitTests;
    this.tests.apiTests = apiTests;
  }

  countTests() {
    let counter = 0;
    Object.keys(this.tests).forEach((subTestName) => {
      const subTest = this.tests[subTestName];
      Object.keys(subTest).forEach((testName) => {
        counter++;
      });
    });

    return counter;
  }

  runTests() {
    const limit = this.countTests();
    const errors = [];
    let successes = 0;
    let counter = 0;

    Object.keys(this.tests).forEach((subTestName) => {
      const subTest = this.tests[subTestName];
      Object.keys(subTest).forEach((testName) => {
        const test = subTest[testName];

        try {
          test(() => {
            // If it call backs without throwing, then it succeeded, so log it in green
            console.log('\x1b[32m%s\x1b[0m', `+ ${testName}`);
            counter++;
            successes++;
            if (counter === limit) {
              this.produceTestReports(limit, successes, errors);
            }
          });
        } catch (e) {
          // If it throws, then it failed, so capture the error thrown and log it in red.
          errors.push({
            name: testName,
            error: e,
          });
          console.log('\x1b[31m%s\x1b[0m', `- ${testName}`);
          counter++;
          if (counter === limit) {
            this.produceTestReports(limit, successes, errors);
          }
        }
      });
    });
  }

  produceTestReports(limit, successes, errors) {
    console.log('');
    console.log('--------------- Begin Test Report ---------------');
    console.log('');
    console.log('Total Tests', limit);
    console.log('Pass:', successes);
    console.log('Failed:', errors.length);
    console.log('');

    if (errors.length) {
      console.log('--------------- Begin Error Details ---------------');

      errors.forEach((error) => {
        console.log('\x1b[31m%s\x1b[0m', error.name);
        console.log(error.error);
        console.log('');
      });

      console.log('--------------- End Error Details ---------------');
    }

    console.log('');
    console.log('--------------- End Test Report ---------------');
    console.log('');
    process.exit(0);
  }
}

new Tests().runTests();
