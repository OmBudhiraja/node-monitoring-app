let appSessionToken = null;
let tokenRenewLoopReference;

const forms = document.querySelectorAll('form');
const logOutBtn = document.querySelector('#logOutBtn');

if (forms && forms.length) {
  forms.forEach((form) => form.addEventListener('submit', formSubmitHandler));
}

if (logOutBtn) {
  logOutBtn.addEventListener('click', logOutUser);
}

async function formSubmitHandler(e) {
  e.preventDefault();

  const errorContainer = e.target.querySelector('.formError');
  const successMsgContainer = e.target.querySelector('.formSuccess');
  if (errorContainer) {
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';
  }
  if (successMsgContainer) {
    successMsgContainer.style.display = 'none';
  }

  const { id: formId, elements } = this;
  let { method, action: path } = this;
  const payload = {};
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type !== 'submit') {
      const classOfElement = elements[i].classList.value.length
        ? elements[i].classList.value
        : '';

      const valueOfElement =
        elements[i].type == 'checkbox' &&
        !classOfElement.includes('multiselect')
          ? elements[i].checked
          : classOfElement.includes('intval')
          ? parseInt(elements[i].value)
          : elements[i].value;

      const elementIsChecked = elements[i].checked;
      // Override the method of the form if the input's name is _method
      let nameOfElement = elements[i].name;

      if (nameOfElement == '_method') {
        method = valueOfElement;
      } else {
        if (nameOfElement == 'httpmethod') {
          nameOfElement = 'method';
        }
        if (nameOfElement == 'uid') {
          nameOfElement = 'id';
        }
        if (classOfElement.indexOf('multiselect') > -1) {
          if (elementIsChecked) {
            payload[nameOfElement] = payload[nameOfElement] || [];
            payload[nameOfElement].push(valueOfElement);
          }
        } else {
          payload[nameOfElement] = valueOfElement;
        }
      }
    }
  }

  if (method === 'DELETE' || method === 'delete') {
    const params = new URLSearchParams(payload).toString();
    path = `${path}?${params}`;
  }

  try {
    const res = await makeApiCall(path, method.toUpperCase(), payload);
    formResponseProcessor(formId, payload, res);
  } catch (err) {
    errorContainer.textContent = err.message;
    errorContainer.style.display = 'block';
  }
}

async function logOutUser(e) {
  try {
    await makeApiCall(`/api/token?id=${appSessionToken.id}`, 'DELETE');
  } catch (err) {
    console.log('Error logging out');
  } finally {
    setSessionToken(null);
    window.location = '/';
  }
}

async function makeApiCall(url, method, payload, headers) {
  try {
    const { data } = await axios(url, {
      method,
      data: payload,
      headers: { token: appSessionToken?.id, ...(headers ? headers : {}) },
    });
    return data;
  } catch (err) {
    throw new Error(
      err.response.data?.error && typeof err.response.data?.error === 'string'
        ? err.response.data?.error
        : 'Something unexpected happened. Please Try again!'
    );
  }
}

async function formResponseProcessor(formId, requestPayload, responsePayload) {
  if (formId === 'accountCreate') {
    console.log('Successfully created the user');
    const newPayload = {
      phone: requestPayload.phone,
      password: requestPayload.password,
    };

    try {
      const res = await makeApiCall('/api/token', 'POST', newPayload);
      setSessionToken(res);
      window.location = '/checks/all';
    } catch (err) {
      throw new Error('Sorry, an error has occured. Please try again.');
    }
  }

  if (formId === 'sessionCreate') {
    console.log('Successfully logged in!');
    setSessionToken(responsePayload);
    window.location = '/checks/all';
  }

  // If forms saved successfully and they have success messages, show them
  const formsWithSuccessMessages = [
    'accountEdit1',
    'accountEdit2',
    'checksEdit1',
  ];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector('#' + formId + ' .formSuccess').style.display =
      'block';
  }

  if (formId === 'accountEdit3') {
    logOutUser();
  }

  if (formId == 'checksCreate') {
    window.location = '/checks/all';
  }

  if (formId == 'checksEdit2') {
    window.location = '/checks/all';
  }
}

function setSessionToken(token) {
  appSessionToken = token;
  if (token) {
    localStorage.setItem('token', JSON.stringify(token));
    setLoggedInClass(true);
  } else {
    localStorage.removeItem('token');
    setLoggedInClass(false);
  }
}

function getSessionToken() {
  var tokenString = localStorage.getItem('token');
  try {
    const token = JSON.parse(tokenString);
    appSessionToken = token;
    if (token) {
      setLoggedInClass(true);
    } else {
      setLoggedInClass(false);
    }
  } catch (e) {
    appSessionToken = null;
    setLoggedInClass(false);
  }
}

function setLoggedInClass(add) {
  const target = document.querySelector('body');
  if (add) {
    target.classList.add('loggedIn');
    clearInterval(tokenRenewLoopReference);
    tokenRenewalLoop();
  } else {
    target.classList.remove('loggedIn');
    clearInterval(tokenRenewLoopReference);
  }
}

async function renewToken() {
  if (!appSessionToken) {
    clearInterval(tokenRenewLoopReference);
    return;
  }

  const payload = {
    id: appSessionToken.id,
    extend: true,
  };

  try {
    const res = await makeApiCall('/api/token', 'PUT', payload);
    setSessionToken(res);
  } catch (err) {
    setSessionToken(null);
  }
}

function tokenRenewalLoop() {
  tokenRenewLoopReference = setInterval(renewToken, 1000 * 60 * 5);
}

function loadDataOnPage() {
  const bodyClasses = document.body.classList;
  const primaryClass = bodyClasses[0];

  if (primaryClass === 'accountEdit') {
    loadAccountEditPage();
  }

  if (primaryClass === 'checksList') {
    loadChecksListPage();
  }

  if (primaryClass == 'checksEdit') {
    loadChecksEditPage();
  }
}

async function loadAccountEditPage() {
  const phone = appSessionToken?.phone;
  if (!phone) {
    return logOutUser();
  }

  try {
    const res = await makeApiCall(`/api/user?phone=${phone}`, 'GET');

    document.querySelector('#accountEdit1 .name').value = res.name;
    document.querySelector('#accountEdit1 .displayPhoneInput').value =
      res.phone;

    const hiddenPhoneInputs = document.querySelectorAll(
      'input.hiddenPhoneNumberInput'
    );
    for (let i = 0; i < hiddenPhoneInputs.length; i++) {
      hiddenPhoneInputs[i].value = res.phone;
    }
  } catch (err) {
    logOutUser();
  }
}

async function loadChecksListPage() {
  // Get the phone number from the current token, or log the user out if none is there
  const phone = appSessionToken?.phone;
  if (!phone) return logOutUser();

  try {
    const res = await makeApiCall(`/api/user?phone=${phone}`, 'GET');
    const userChecks = res.checks || [];

    if (!userChecks.length) {
      document.getElementById('noChecksMessage').style.display = 'table-row';
      document.getElementById('createCheckCTA').style.display = 'block';
      return;
    }

    userChecks.forEach(async function (checkId) {
      try {
        const checkRes = await makeApiCall(`/api/checks?id=${checkId}`);
        // Make the check data into a table row
        const table = document.getElementById('checksListTable');
        const tr = table.insertRow(-1);
        tr.classList.add('checkRow');
        const td0 = tr.insertCell(0);
        const td1 = tr.insertCell(1);
        const td2 = tr.insertCell(2);
        const td3 = tr.insertCell(3);
        const td4 = tr.insertCell(4);
        td0.innerHTML = checkRes.method.toUpperCase();
        td1.innerHTML = checkRes.protocol + '://';
        td2.innerHTML = checkRes.url;
        const state =
          typeof checkRes.state == 'string'
            ? checkRes.state.toUpperCase()
            : 'unknown';
        td3.innerHTML = state;
        td4.innerHTML = `<a href="/checks/edit?id=${checkRes.id}">View / Edit / Delete</a>`;
      } catch (err) {
        console.log('Error trying to load check ID: ', checkId);
      }
    });

    if (userChecks.length < 5) {
      // Show the createCheck CTA
      document.getElementById('createCheckCTA').style.display = 'block';
    }
  } catch (err) {
    logOutUser();
    window.location = '/session/create';
  }
}

async function loadChecksEditPage() {
  // Get the check id from the query string, if none is found then redirect back to dashboard
  const { id } = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });

  if (!id) {
    return (window.location = '/checks/all');
  }

  try {
    const res = await makeApiCall(`/api/checks?id=${id}`, 'GET');
    // Put the hidden id field into both forms
    const hiddenIdInputs = document.querySelectorAll('input.hiddenIdInput');
    for (let i = 0; i < hiddenIdInputs.length; i++) {
      hiddenIdInputs[i].value = res.id;
    }

    // Put the data into the top form as values where needed
    document.querySelector('#checksEdit1 .displayIdInput').value = res.id;
    document.querySelector('#checksEdit1 .displayStateInput').value = res.state;
    document.querySelector('#checksEdit1 .protocolInput').value = res.protocol;
    document.querySelector('#checksEdit1 .urlInput').value = res.url;
    document.querySelector('#checksEdit1 .methodInput').value = res.method;
    document.querySelector('#checksEdit1 .timeoutInput').value =
      res.timeoutSeconds;
    var successCodeCheckboxes = document.querySelectorAll(
      '#checksEdit1 input.successCodesInput'
    );
    for (var i = 0; i < successCodeCheckboxes.length; i++) {
      if (
        res.successCodes.indexOf(parseInt(successCodeCheckboxes[i].value)) > -1
      ) {
        successCodeCheckboxes[i].checked = true;
      }
    }
  } catch (error) {
    window.location = '/checks/all';
  }
}

window.addEventListener('DOMContentLoaded', function () {
  console.log('Page Loaded');
  getSessionToken();
  tokenRenewalLoop();
  loadDataOnPage();
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////----------------------------------------------------------------------------------------------------------////////////

// function a() {
//   function b(e) {
//     // Stop it from submitting
//     e.preventDefault();
//     var formId = this.id;
//     var path = this.action;
//     var method = this.method.toUpperCase();

//     // Hide the error message (if it's currently shown due to a previous error)
//     document.querySelector('#' + formId + ' .formError').style.display = 'none';

//     // Hide the success message (if it's currently shown due to a previous error)
//     if (document.querySelector('#' + formId + ' .formSuccess')) {
//       document.querySelector('#' + formId + ' .formSuccess').style.display =
//         'none';
//     }

//     // Turn the inputs into a payload
//     var payload = {};
//     var elements = this.elements;
//     for (var i = 0; i < elements.length; i++) {
//       if (elements[i].type !== 'submit') {
//         // Determine class of element and set value accordingly
//         var classOfElement =
//           typeof elements[i].classList.value == 'string' &&
//           elements[i].classList.value.length > 0
//             ? elements[i].classList.value
//             : '';
//         var valueOfElement =
//           elements[i].type == 'checkbox' &&
//           classOfElement.indexOf('multiselect') == -1
//             ? elements[i].checked
//             : classOfElement.indexOf('intval') == -1
//             ? elements[i].value
//             : parseInt(elements[i].value);
//         var elementIsChecked = elements[i].checked;
//         // Override the method of the form if the input's name is _method
//         var nameOfElement = elements[i].name;
//         if (nameOfElement == '_method') {
//           method = valueOfElement;
//         } else {
//           // Create an payload field named "method" if the elements name is actually httpmethod
//           if (nameOfElement == 'httpmethod') {
//             nameOfElement = 'method';
//           }
//           // Create an payload field named "id" if the elements name is actually uid
//           if (nameOfElement == 'uid') {
//             nameOfElement = 'id';
//           }
//           // If the element has the class "multiselect" add its value(s) as array elements
//           if (classOfElement.indexOf('multiselect') > -1) {
//             if (elementIsChecked) {
//               payload[nameOfElement] =
//                 typeof payload[nameOfElement] == 'object' &&
//                 payload[nameOfElement] instanceof Array
//                   ? payload[nameOfElement]
//                   : [];
//               payload[nameOfElement].push(valueOfElement);
//             }
//           } else {
//             payload[nameOfElement] = valueOfElement;
//           }
//         }
//       }
//     }

//     // If the method is DELETE, the payload should be a queryStringObject instead
//     var queryStringObject = method == 'DELETE' ? payload : {};

//     // Call the API
//     app.client.request(
//       undefined,
//       path,
//       method,
//       queryStringObject,
//       payload,
//       function (statusCode, responsePayload) {
//         // Display an error on the form if needed
//         if (statusCode !== 200) {
//           if (statusCode == 403) {
//             // log the user out
//             app.logUserOut();
//           } else {
//             // Try to get the error from the api, or set a default error message
//             var error =
//               typeof responsePayload.Error == 'string'
//                 ? responsePayload.Error
//                 : 'An error has occured, please try again';

//             // Set the formError field with the error text
//             document.querySelector('#' + formId + ' .formError').innerHTML =
//               error;

//             // Show (unhide) the form error field on the form
//             document.querySelector('#' + formId + ' .formError').style.display =
//               'block';
//           }
//         } else {
//           // If successful, send to form response processor
//           app.formResponseProcessor(formId, payload, responsePayload);
//         }
//       }
//     );
//   }
// }
