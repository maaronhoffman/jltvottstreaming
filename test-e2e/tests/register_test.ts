import { testConfigs } from '@jwp/ott-testing/constants';

import constants, { longTimeout, normalTimeout } from '#utils/constants';
import passwordUtils from '#utils/password_utils';

runTestSuite(testConfigs.jwpAuth, 'JW Player');
runTestSuite(testConfigs.cleengAuthvod, 'Cleeng');

function runTestSuite(config: typeof testConfigs.svod, providerName: string) {
  Feature(`register - ${providerName}'`).retry(Number(process.env.TEST_RETRY_COUNT) || 0);

  Before(async ({ I }) => {
    I.useConfig(config);

    if (await I.isMobile()) {
      I.openMenuDrawer();
    }

    I.click('Sign up');
    I.waitForElement(constants.registrationFormSelector, normalTimeout);
  });

  Scenario(`I can open the register modal - ${providerName}`, async ({ I }) => {
    await I.seeQueryParams({ u: 'create-account' });

    I.see('Email');
    I.see('Password');
    I.see('Use a minimum of 8 characters (case sensitive) with at least one number');

    // No validation error messages in the account.registration.* namespace before form submission
    I.dontSee('registration.', constants.customRegFields.topContainerSelector);

    if (await I.hasTermsAndConditionField()) {
      I.see('I accept the');
      I.see('Terms and Conditions');
      I.see(`I accept the Terms and Conditions of ${providerName}.`);
    }

    I.see('Yes, I want to receive Blender updates by email');
    I.see('Continue');
    I.see('Already have an account?');
    I.see('Sign in');

    I.seeElement(constants.registrationFormSelector);
  });

  Scenario(`I can close the modal - ${providerName}`, async ({ I }) => {
    I.waitForElement(constants.registrationFormSelector, normalTimeout);

    I.clickCloseButton();
    I.dontSeeElement(constants.registrationFormSelector);
    I.dontSee('Email');
    I.dontSee('Password');

    const { isMobile } = await I.openSignInMenu();

    I.see('Sign in');
    I.see('Sign up');
  });

  Scenario(`I can switch to the Sign In modal - ${providerName}`, ({ I }) => {
    I.click('Sign in', constants.registrationFormSelector);
    I.seeElement(constants.loginFormSelector);
    I.see('Forgot password');
    I.dontSee(constants.registrationFormSelector);
    I.click('Sign up', constants.loginFormSelector);
    I.seeElement(constants.registrationFormSelector);
    I.see('Already have an account?');
    I.dontSeeElement(constants.loginFormSelector);
  });

  Scenario(`I get warned when filling in incorrect credentials - ${providerName}`, async ({ I }) => {
    I.fillField('Email', 'test');
    I.pressKey('Tab');
    I.see('Please re-enter your email details');
    I.fillField('Email', '12345@test.org');
    I.dontSee('Please re-enter your email details');

    function checkColor(expectedColor) {
      I.seeCssPropertiesOnElements('text="Use a minimum of 8 characters (case sensitive) with at least one number"', { color: expectedColor });
    }

    checkColor('rgb(255, 255, 255)');

    I.fillField('password', '1234');
    I.pressKey('Tab');
    checkColor('rgb(255, 53, 53)');

    I.fillField('password', 'Test1234');
    checkColor('rgb(255, 255, 255)');
  });

  Scenario(`I get strength feedback when typing in a password - ${providerName}`, async ({ I }) => {
    const textOptions = ['Weak', 'Fair', 'Strong', 'Very strong'];

    function checkFeedback(password, expectedColor, expectedText) {
      I.fillField('password', password);
      I.seeCssPropertiesOnElements('div[class*="passwordStrengthFill"]', { 'background-color': expectedColor });
      I.see(expectedText);

      I.seeCssPropertiesOnElements(`text="${expectedText}"`, { color: expectedColor });

      textOptions.filter((opt) => opt !== expectedText).forEach((opt) => I.dontSee(opt));
    }

    checkFeedback('1111aaaa', 'orangered', 'Weak');
    checkFeedback('1111aaaA', 'orange', 'Fair');
    checkFeedback('1111aaaA!', 'yellowgreen', 'Strong');
    checkFeedback('Ax854bZ!$', 'green', 'Very strong');
  });

  Scenario(`I can toggle to view password - ${providerName}`, async ({ I }) => {
    await passwordUtils.testPasswordToggling(I);
  });

  Scenario(`I can't submit without checking required consents - ${providerName}`, async ({ I }) => {
    I.fillField('Email', 'test@123.org');
    I.fillField('Password', 'pAssword123!');

    I.click('Continue');

    if (!(await I.hasTermsAndConditionField())) {
      return;
    }

    I.seeCssPropertiesOnElements('input[name="terms"]', { 'border-color': '#FF3535' });
  });

  Scenario(`I get warned for duplicate users - ${providerName}`, async ({ I }) => {
    I.fillField('Email', constants.username);
    I.fillField('Password', 'Password123!');
    await I.fillCustomRegistrationFields();
    I.click('Continue');
    I.waitForLoaderDone();
    I.see(constants.duplicateUserError);
  });

  Scenario(`I can register - ${providerName}`, async ({ I }) => {
    I.fillField('Email', passwordUtils.createRandomEmail());
    I.fillField('Password', passwordUtils.createRandomPassword());

    await I.fillCustomRegistrationFields();
    I.click('Continue');
    I.waitForElement('form[data-testid="personal_details-form"]', longTimeout);
    I.dontSee(constants.duplicateUserError);
    I.dontSee(constants.registrationFormSelector);

    I.fillField('firstName', 'John');
    I.fillField('lastName', 'Doe');

    I.click('Continue');
    I.waitForLoaderDone();

    I.see('Welcome to JW OTT Web App (AuthVod)');
  });
}
