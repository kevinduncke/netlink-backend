import assert from 'assert';
import { registerSchema, loginSchema, createPostSchema } from '../schemas';
import { validateRequest } from '../middleware/validate';
import { BadRequestError } from './errors';
import { Request, Response, NextFunction } from 'express';

console.log('--> Starting Zod Validation Test Suite (Part 1)...\n');

// 1. REGISTRATION SCHEMA TESTS
console.log('▶ [1/4] Testing Registration Schema...');
{
    // 1a. Valid Registration
    const validUser = {
        email: '  kevin@netlink.local  ',
        name: 'Kevin von Dumke',
        password: 'Password123!',
        bio: 'Full Stack Software Engineer',
        avatarUrl: 'https://netlink.com/avatar.webp'
    };
    const res1 = registerSchema.safeParse(validUser);
    assert.strictEqual(res1.success, true, 'Valid user registration should succeed');
    if (res1.success) {
        assert.strictEqual(res1.data.email, 'kevin@netlink.local', 'Email should be trimmed and lowercased');
        assert.strictEqual(res1.data.name, 'Kevin von Dumke', 'Name should be trimmed');
    }

    // 1b. Missing Required Fields
    const missingFields = { email: 'kevin@netlink.local' };
    const res2 = registerSchema.safeParse(missingFields);
    assert.strictEqual(res2.success, false, 'Missing name and password should fail');

    // 1c. Invalid Email Format
    const badEmail = { email: 'not-an-email', name: 'Kevin', password: 'Password123!' };
    const res3 = registerSchema.safeParse(badEmail);
    assert.strictEqual(res3.success, false, 'Invalid email format should fail');

    // 1d. Weak Password (missing special char or number)
    const weakPass = { email: 'test@netlink.local', name: 'Test User', password: 'password' };
    const res4 = registerSchema.safeParse(weakPass);
    assert.strictEqual(res4.success, false, 'Weak password should fail complexity check');

    // 1e. Invalid Name (contains digits or symbols)
    const badName = { email: 'test@netlink.local', name: 'User123', password: 'Password123!' };
    const res5 = registerSchema.safeParse(badName);
    assert.strictEqual(res5.success, false, 'Name with numbers should fail regex');

    console.log('  ✔ Registration schema validations passed.');
}

// 2. LOGIN SCHEMA TESTS
console.log('▶ [2/4] Testing Login Schema...');
{
    // 2a. Valid Login
    const validLogin = { email: '  User@Netlink.local ', password: 'Password123!' };
    const res1 = loginSchema.safeParse(validLogin);
    assert.strictEqual(res1.success, true, 'Valid login should succeed');
    if (res1.success) {
        assert.strictEqual(res1.data.email, 'user@netlink.local', 'Email should be trimmed and lowercased');
    }

    // 2b. Missing Email
    const missingEmail = { password: 'Password123!' };
    const res2 = loginSchema.safeParse(missingEmail);
    assert.strictEqual(res2.success, false, 'Missing email should fail');

    // 2c. Missing Password
    const missingPass = { email: 'user@netlink.local' };
    const res3 = loginSchema.safeParse(missingPass);
    assert.strictEqual(res3.success, false, 'Missing password should fail');

    console.log('  ✔ Login schema validations passed.');
}

// 3. POST CREATION SCHEMA TESTS
console.log('▶ [3/4] Testing Post Creation Schema...');
{
    // 3a. Valid Minimal Post (defaults applied)
    const minPost = { content: '  Hello Netlink world!  ' };
    const res1 = createPostSchema.safeParse(minPost);
    assert.strictEqual(res1.success, true, 'Minimal post should succeed');
    if (res1.success) {
        assert.strictEqual(res1.data.content, 'Hello Netlink world!', 'Content should be trimmed');
        assert.strictEqual(res1.data.visibility, 'PUBLIC', 'Visibility should default to PUBLIC');
        assert.strictEqual(res1.data.hideLikes, false, 'hideLikes should default to false');
        assert.strictEqual(res1.data.disableComments, false, 'disableComments should default to false');
    }

    // 3b. Empty / Whitespace-Only Content
    const emptyPost = { content: '     ' };
    const res2 = createPostSchema.safeParse(emptyPost);
    assert.strictEqual(res2.success, false, 'Whitespace-only content should fail min(1)');

    // 3c. Valid Post with SPECIFIC visibility and followers
    const specificPost = {
        content: 'Exclusive update',
        visibility: 'SPECIFIC',
        specificFollowers: ['user-id-1', 'user-id-2']
    };
    const res3 = createPostSchema.safeParse(specificPost);
    assert.strictEqual(res3.success, true, 'SPECIFIC post with followers should succeed');

    // 3d. Invalid Post with SPECIFIC visibility but empty followers
    const invalidSpecific = {
        content: 'Exclusive update',
        visibility: 'SPECIFIC',
        specificFollowers: []
    };
    const res4 = createPostSchema.safeParse(invalidSpecific);
    assert.strictEqual(res4.success, false, 'SPECIFIC post without followers must fail superRefine');

    console.log('  ✔ Post creation schema and refinements passed.');
}

// 4. VALIDATEREQUEST MIDDLEWARE INTEGRATION TESTS
console.log('▶ [4/4] Testing validateRequest Express Middleware...');
{
    const middleware = validateRequest(loginSchema);

    // 4a. Valid request passes to next() without error and updates req.body
    let nextCalled = false;
    let nextError: any = null;
    const validReq: any = { body: { email: '  Test@Netlink.local ', password: 'Password123!' } };
    const mockRes: any = {};

    middleware(validReq, mockRes, (err?: any) => {
        nextCalled = true;
        nextError = err;
    });

    assert.strictEqual(nextCalled, true, 'next() should be called');
    assert.strictEqual(nextError, undefined, 'No error should be passed to next()');
    assert.strictEqual(validReq.body.email, 'test@netlink.local', 'req.body should contain parsed/trimmed data');

    // 4b. Invalid request forwards BadRequestError to next(err)
    let invalidNextCalled = false;
    let receivedError: any = null;
    const invalidReq: any = { body: { email: 'bad-email' } };

    middleware(invalidReq, mockRes, (err?: any) => {
        invalidNextCalled = true;
        receivedError = err;
    });

    assert.strictEqual(invalidNextCalled, true, 'next(err) should be called');
    assert.ok(receivedError instanceof BadRequestError, 'Error must be instance of BadRequestError');
    assert.strictEqual(receivedError.statusCode, 400, 'Error status must be 400');
    assert.ok(Array.isArray(receivedError.details), 'Error details should contain field-level issues');
    assert.ok(receivedError.details.length >= 2, 'Should report both invalid email and missing password');

    console.log('  ✔ validateRequest middleware integration verified.');
}

console.log('\n🎉 ALL VALIDATION TESTS PASSED SUCCESSFULLY!\n');
