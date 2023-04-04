const express = require('express');
const requestPromise = require('request-promise');
const randomize = require('randomatic');


const partnerClientId = 'partnerClientId';
const partnerClientSecret = 'partnerClientSecret';
const partnerMerchantId = 'partnerMerchantId';

var partnerAccessToken;
var onboardingUrl;
var sellerNonce;
var sellerAuthCode;
var sellerSharedId;
var accessToken;
var sellerClientId;
var sellerClientSecret;
var sellerAccessToken;
var paymentUrl;

async function startServer() {
  try {
    const application = express();
    const portNo = 5000;
    await application.listen(portNo);
    console.log('Server is up and running on PORT:', portNo);
    console.log('---------------------------------------------');

    application.get('/', async (request, response) => {
      try {
        response.send("PayPal Test Application.");
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-1-----------------------------------
    application.get('/get-partner-access-token', async (request, response) => {
      try {
        let args = {
          url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
          headers: {'content-type': 'application/x-www-form-urlencoded'},
          method: 'POST',
          json: true,
          auth: {
            user: partnerClientId,
            pass: partnerClientSecret
          },
          form: {
            grant_type: 'client_credentials'
          }
        };
        let result = await requestPromise(args);
        partnerAccessToken = result.access_token;
        console.log('partnerAccessToken:', partnerAccessToken);
        console.log('-------------------------STEP-1-------------------------');
        response.json({partnerAccessToken});
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-2-----------------------------------
    application.get('/get-onboarding-url', async (request, response) => {
      try {
        sellerNonce = randomize('Aa', 45);
        console.log('sellerNonce:', sellerNonce);
        let args = {
          url: 'https://api-m.sandbox.paypal.com/v2/customer/partner-referrals',
          headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + partnerAccessToken},
          method: 'POST',
          json: true,
          body: {
            "operations": [
              {
                "operation": "API_INTEGRATION",
                "api_integration_preference": {
                  "rest_api_integration": {
                    "integration_method": "PAYPAL",
                    "integration_type": "FIRST_PARTY",
                    "first_party_details": {
                      "features": ["PAYMENT", "REFUND"],
                      "seller_nonce": sellerNonce
                    }
                  }
                }
              }
            ],
            "partner_config_override": {
              "return_url": "http://localhost:5000/pay-pal-redirect"
            },
            "products": ["EXPRESS_CHECKOUT"],
            "legal_consents": [{"type": "SHARE_DATA_CONSENT", "granted": true}]
          }
        };
        let result = await requestPromise(args);
        onboardingUrl = result.links[1].href;
        console.log('onboardingUrl:', onboardingUrl);
        console.log('-------------------------STEP-2-------------------------');
        response.json({onboardingUrl});
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-3-----------------------------------
    application.get('/onboarding-seller', async (request, response) => {
      try {
        let onboardingPage = "<script>" +
                "function onboardedCallback(authCode, sharedId) {" +
                "var xhttp = new XMLHttpRequest();" +
                "xhttp.open('GET', 'collect-seller-auth-code-and-shared-id?authCode='+authCode+'&sharedId='+sharedId);" +
                "xhttp.send();" +
                "}" +
                "</script>" +
                "<a target='_blank' data-paypal-onboard-complete='onboardedCallback' href='" + onboardingUrl + "&displayMode=minibrowser' data-paypal-button='true'>Onboard Seller</a>" +
                "<script id='paypal-js' src='https://www.sandbox.paypal.com/webapps/merchantboarding/js/lib/lightbox/partner.js'></script>";
        console.log('Onboarding Page Created.');
        console.log('-------------------------STEP-3-------------------------');
        response.send(onboardingPage);
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-4-----------------------------------
    application.get('/collect-seller-auth-code-and-shared-id', async (request, response) => {
      try {
        sellerAuthCode = request.query.authCode;
        sellerSharedId = request.query.sharedId;
        console.log('sellerAuthCode:', sellerAuthCode);
        console.log('sellerSharedId:', sellerSharedId);
        response.end();
      } catch (error) {
        console.error(error);
        response.end();
      }
    });

    application.get('/pay-pal-redirect', async (request, response) => {
      try {
        console.log('merchantId:', request.query.merchantId);
        console.log('merchantIdInPayPal:', request.query.merchantIdInPayPal);
        console.log('permissionsGranted:', request.query.permissionsGranted);
        console.log('consentStatus:', request.query.consentStatus);
        console.log('isEmailConfirmed:', request.query.isEmailConfirmed);
        console.log('accountStatus:', request.query.accountStatus);
        console.log('-------------------------STEP-4-------------------------');
        response.json(request.query);
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-5-----------------------------------
    application.get('/get-access-token', async (request, response) => {
      try {
        let args = {
          url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
          method: 'POST',
          json: true,
          auth: {
            user: sellerSharedId,
            pass: ""
          },
          form: {
            grant_type: 'authorization_code',
            code: sellerAuthCode,
            code_verifier: sellerNonce
          }
        };
        let result = await requestPromise(args);
        accessToken = result.access_token;
        console.log('accessToken:', accessToken);
        console.log('-------------------------STEP-5-------------------------');
        response.json({accessToken});
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-6-----------------------------------
    application.get('/get-seller-rest-credentials', async (request, response) => {
      try {
        let args = {
          url: 'https://api-m.sandbox.paypal.com/v1/customer/partners/' + partnerMerchantId + '/merchant-integrations/credentials',
          method: 'GET',
          json: true,
          headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + accessToken}
        };
        let result = await requestPromise(args);
        sellerClientId = result.client_id;
        sellerClientSecret = result.client_secret;
        console.log('sellerClientId:', sellerClientId);
        console.log('sellerClientSecret:', sellerClientSecret);
        console.log('-------------------------STEP-6-------------------------');
        response.json({sellerClientId, sellerClientSecret});
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-7-----------------------------------
    application.get('/get-seller-access-token', async (request, response) => {
      try {
        let args = {
          url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
          headers: {'content-type': 'application/x-www-form-urlencoded'},
          method: 'POST',
          json: true,
          auth: {
            user: sellerClientId,
            pass: sellerClientSecret
          },
          form: {
            grant_type: 'client_credentials'
          }
        };
        let result = await requestPromise(args);
        sellerAccessToken = result.access_token;
        console.log('sellerAccessToken:', sellerAccessToken);
        console.log('-------------------------STEP-7-------------------------');
        response.json({sellerAccessToken});
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });

    //---------------------------------STEP-8-----------------------------------
    application.get('/get-payment-link', async (request, response) => {
      try {
        let args = {
          url: 'https://api-m.sandbox.paypal.com/v2/checkout/orders',
          headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + sellerAccessToken},
          method: 'POST',
          json: true,
          body: {
            "intent": "CAPTURE",
            "purchase_units": [
              {
                "amount": {
                  "currency_code": "USD",
                  "value": "100.00"
                }
              }
            ]
          }
        };
        let result = await requestPromise(args);
        paymentUrl = result.links[1].href;
        console.log('paymentUrl:', paymentUrl);
        console.log('-------------------------STEP-8-------------------------');
        response.send("<a href='"+paymentUrl+"'>Pay</a>");
      } catch (error) {
        console.error(error);
        response.json(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

startServer();