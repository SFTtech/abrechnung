"""
Tests for the functions from user_accounts.sql
"""
import datetime
import time

import asyncpg.exceptions


async def get_user(test, email='rofl@bar.baz', username='foowoman', password='123456', session='test'):
    """
    registers a user and logs them in

    returns a tuple of (usr.id, session.token)

    designed to be used from other tests as well; use remove_user to undo the effects
    """
    # this function isn't supposed to test the login function family so it doesn't
    # do any verification.
    # only call it after independently verifying the login function family.
    await test.fetch(
        'select * from register_user(email := $1, password := $2, username := $3)',
        email,
        password,
        username
    )
    usr_id = await test.fetchval(
        'select id from usr where email=$1',
        email
    )
    pending_token = await test.fetchval(
        'select token from pending_registration where usr=$1',
        usr_id
    )
    await test.fetch(
        'call confirm_registration(token := $1)',
        pending_token
    )
    authtoken = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        session,
        password,
        username
    )

    return usr_id, authtoken


async def remove_user(test, usr_id):
    """
    deletes the user and their sessions
    """
    await test.fetch('delete from usr where id=$1', usr_id)


async def test(test):
    # watch the notifications that are sent to the mailer
    await test.listen('email')

    # create a pending registration
    start = time.time()
    valid_until = await test.fetchval(
        'select * from register_user(email := $1, password := $2, username := $3)',
        'foo@bar.baz',
        '123457',
        'fooma',
        column='valid_until'
    )
    print(f'duration of register_user(): {time.time() - start:.3f} s')
    test.expect_eq((await test.get_notification())[1], 'pending_registration')

    # overwrite the existing pending registration for the same email
    valid_until = await test.fetchval(
        'select * from register_user(email := $1, password := $2, username := $3)',
        'foo@bar.baz',
        '123456',
        'fooman',
        column='valid_until'
    )
    print(f'duration of register_user(): {time.time() - start:.3f} s')
    test.expect_eq((await test.get_notification())[1], 'pending_registration')

    # registering with an already-existing username should fail
    await test.fetch_expect_error(
        'select * from register_user(email := $1, password := $2, username := $3)',
        'rofl@bar.baz',
        '12345678',
        'fooman',
        error=asyncpg.exceptions.UniqueViolationError,
        error_re=r'usr_username_key'
    )

    # the pending registration should be valid for one hour
    test.expect_eq(
        valid_until,
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )

    usr_id, usr_registered_at, usr_admin, usr_pending = await test.fetchrow(
        'select id, registered_at, admin, pending from usr where email=$1',
        'foo@bar.baz'
    )
    test.expect_eq(
        usr_registered_at,
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(usr_admin, False)
    test.expect_eq(usr_pending, True)
    del usr_registered_at, usr_admin, usr_pending

    # garbage collection shouldn't do anything
    await test.fetch('call gc()')

    # logging in as the not-yet-confirmed user should fail
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'test',
        '123456',
        'fooman',
        error_id='bad-login-credentials'
    )

    # normally, the user would retrieve the token from the pending-registration
    # email they get sent by the mailer.
    # we'll just grab it directly from the table :D
    token, valid_until_, mail_next_attempt = await test.fetchrow(
        'select token, valid_until, mail_next_attempt from pending_registration where usr=$1',
        usr_id
    )

    # check whether the mail-to-be-sent
    mail = await test.fetchrow(
        'select * from mails_pending_registration_get()',
        columns=['email', 'username', 'language', 'registered_at', 'valid_until', 'token']
    )
    test.expect_eq(mail[0], 'foo@bar.baz')
    test.expect_eq(mail[1], 'fooman')
    test.expect_eq(mail[2], 'en_int')
    test.expect_eq(
        mail[3],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(mail[4], valid_until_)
    test.expect_eq(mail[5], token)
    del mail

    # we should only get the mail once
    await test.fetch(
        'select * from mails_pending_registration_get()',
        rowcount=0
    )

    test.expect_eq(valid_until_, valid_until)
    test.expect_eq(
        mail_next_attempt,
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    del valid_until_, valid_until, mail_next_attempt

    await test.fetchval(
        'select mail_next_attempt from pending_registration where usr=$1',
        usr_id,
        expect_eq=None
    )

    # mark the mail as not-successfully-sent
    await test.fetch(
        'call mails_pending_registration_need_retry(token := $1)',
        token
    )
    await test.fetchval(
        'select mail_next_attempt from pending_registration where usr=$1',
        usr_id,
        expect_eq=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )

    # we shouldn't get the mail because it will only be re-sent in one hour
    await test.fetch(
        'select * from mails_pending_registration_get()',
        rowcount=0
    )

    # confirm the pending registration
    await test.fetch(
        'call confirm_registration(token := $1)',
        token
    )

    # confirming again should fail
    await test.fetch_expect_raise(
        "call confirm_registration(token := $1)",
        token,
        error_id='bad-registration-token'
    )
    del token

    # confirming with a totally broken token should fail
    await test.fetch_expect_raise(
        'call confirm_registration(token := $1)',
        '0' * 32,
        error_id='bad-registration-token'
    )

    # the user should be no longer pending now
    await test.fetch(
        'select token from pending_registration where usr=$1',
        usr_id,
        rowcount=0
    )
    await test.fetchval(
        'select pending from usr where id=$1',
        usr_id,
        expect_eq=False
    )

    # registering with an already-existing, confirmed email should fail
    await test.fetch_expect_error(
        'select * from register_user(email := $1, password := $2, username := $3)',
        'foo@bar.baz',
        '12345678',
        'foowoman',
        error=asyncpg.exceptions.UniqueViolationError,
        error_re=r'usr_email_key'
    )

    # test timed-out registration requests
    await test.fetch(
        'select * from register_user(email := $1, password := $2, username := $3)',
        'rofl@bar.baz',
        '123456',
        'foowoman'
    )
    test.expect_eq((await test.get_notification())[1], 'pending_registration')

    # change the valid_until column to make the row "timed_out"
    usr2_id = await test.fetchval(
        'select id from usr where email=$1',
        'rofl@bar.baz'
    )
    await test.fetch(
        'update pending_registration set valid_until = now() where usr=$1',
        usr2_id
    )
    token = await test.fetchval(
        'select token from pending_registration where usr=$1',
        usr2_id
    )
    # try to confirm the registration; it should fail
    await test.fetch_expect_raise(
        'call confirm_registration(token := $1)',
        token,
        error_id='bad-registration-token'
    )
    # garbage collection should wipe the entry from both tables
    await test.fetch(
        'select * from pending_registration where usr=$1',
        usr2_id,
        rowcount=1
    )
    await test.fetch(
        'select * from usr where id=$1',
        usr2_id,
        rowcount=1
    )
    await test.fetch('call gc()')
    await test.fetch(
        'select * from pending_registration where usr=$1',
        usr2_id,
        rowcount=0
    )
    await test.fetch(
        'select * from usr where id=$1',
        usr2_id,
        rowcount=0
    )
    del usr2_id

    # try to login with (username, password)
    token_1 = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'testscript-1',
        '123456',
        'fooman',
        column='token'
    )
    print(f'authtok: {token_1!s}')

    # try to login with (email, password)
    # this token will be timed out immediately, for later tests
    token_2 = await test.fetchval(
        "select * from login_with_password(session := $1, password := $2, email := $3, valid_for := '0 ms')",
        'testscript-2',
        '123456',
        'foo@bar.baz',
        column='token',
    )
    print(f'authtok: {token_2!s}')

    # try to login with (username, email, password)
    token_3 = await test.fetchval(
        "select * from login_with_password(session := $1, password := $2, email := $3, username := $4, valid_for := '1 hour')",
        'testscript-3',
        '123456',
        'foo@bar.baz',
        'fooman',
        column='token',
    )
    print(f'authtok: {token_3!s}')

    # try to login with just the password
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2)',
        'testscript-4',
        '123456',
        error_id='bad-login-credentials'
    )

    # try to login with wrong password
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'testscript-5',
        'wrong',
        'fooman',
        error_id='bad-login-credentials'
    )

    # try to login with wrong username
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'testscript-6',
        '123456',
        'foowoman',
        error_id='bad-login-credentials'
    )

    # try to login with wrong email
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'testscript-7',
        '123456',
        'nope@nope.lol',
        error_id='bad-login-credentials'
    )

    # check the sessions table
    sessions = await test.fetch(
        'select * from session where usr = $1',
        usr_id,
        rowcount=3
    )
    for session in sessions:
        test.expect_eq(
            session['last_seen'],
            datetime.datetime.now(datetime.timezone.utc),
            tolerance=datetime.timedelta(minutes=1)
        )
    await test.fetchval(
        'select valid_until from session where usr = $1 and name = $2',
        usr_id,
        'testscript-1',
        expect_eq=None
    )

    await test.fetchval(
        'select valid_until from session where usr = $1 and name = $2',
        usr_id,
        'testscript-2',
        expect_eq=datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    await test.fetchval(
        'select valid_until from session where usr = $1 and name = $2',
        usr_id,
        'testscript-3',
        expect_eq=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )

    # check validating the session token
    last_seen_before = await test.fetchval(
        'select last_seen from session where token = $1',
        token_1
    )
    await test.fetchval(
        'select * from session_auth(token := $1)',
        token_1,
        column='user_id',
        expect_eq=usr_id
    )
    last_seen_after = await test.fetchval(
        'select last_seen from session where token = $1',
        token_1
    )
    # the last_seen timestamp should have been incremented
    test.expect_gt(last_seen_after, last_seen_before)

    # check validating the other valid session token
    await test.fetchval(
        'select * from session_auth(token := $1)',
        token_3,
        column='user_id',
        expect_eq=usr_id
    )
    last_seen_after = await test.fetchval(
        'select last_seen from session where token = $1',
        token_1
    )
    # the last_seen timestamp for token_1 should not have been incremented
    test.expect_gt(last_seen_after, last_seen_before)

    # check validating a timed-out token
    await test.fetchval(
        'select * from session_auth(token := $1, fatal := false)',
        token_2,
        column='user_id',
        expect_eq=None
    )

    await test.fetch_expect_raise(
        'select * from session_auth(token := $1)',
        token_2,
        error_id='bad-authtoken'
    )

    # check validating a non-existing token
    await test.fetch_expect_raise(
        'select * from session_auth(token := $1)',
        'a'*32,
        error_id='bad-authtoken'
    )

    await test.fetch_expect_raise(
        'select * from session_auth(token := $1)',
        None,
        error_id='bad-authtoken'
    )

    usr1_id, usr1_token = usr_id, token_1
    # add a second user; it's used to test if users can see or manipulate each other's stuff
    usr2_id, usr2_token = await get_user(test)
    test.expect_eq((await test.get_notification())[1], 'pending_registration')

    # check listing sessions - only the two non-outdated sessions of usr_id should be visible
    await test.fetch_expect_raise(
        "select * from list_sessions(authtoken := $1)",
        token_2,
        error_id='bad-authtoken'
    )

    session_info_other, session_info_this = await test.fetch(
        "select * from list_sessions(authtoken := $1) order by this",
        usr1_token,
        columns=['session_id', 'name', 'valid_until', 'last_seen', 'this']
    )

    test.expect_eq(session_info_this['name'], 'testscript-1')
    test.expect_eq(session_info_other['name'], 'testscript-3')
    test.expect_eq(session_info_this['this'], True)
    test.expect_eq(session_info_other['this'], False)
    # last_seen should have been incremented again by the authenticated call to list_sessions
    # but the result may not yet be returned by the list_sessions call
    test.expect_eq(session_info_this['last_seen'], last_seen_after, tolerance=datetime.timedelta(minutes=1))
    test.expect_eq(
        session_info_other['last_seen'],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(session_info_this['valid_until'], None)
    test.expect_eq(
        session_info_other['valid_until'],
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )
    # now the last_seen should have increased
    await test.fetchval(
        'select last_seen from session where token = $1',
        usr1_token,
        expect_gt=last_seen_after
    )

    # gc should delete the timed-out session; two rows should be left
    await test.fetch('call gc()')

    await test.fetch(
        'select * from session where usr=$1',
        usr1_id,
        rowcount=2
    )

    # another gc shouldn't do anything
    await test.fetch('call gc()')

    await test.fetch(
        'select * from session where usr=$1',
        usr1_id,
        rowcount=2
    )

    # test renaming sessions
    await test.fetch_expect_raise(
        'call rename_session(authtoken := $1, session_id := $2, new_name := $3)',
        'a'*32,
        session_info_other['session_id'],
        'best session',
        error_id='bad-authtoken'
    )

    # test renaming an other user's sessions, it shouldn't work and the name should stay the same
    await test.fetch_expect_raise(
        'call rename_session(authtoken := $1, session_id := $2, new_name := $3)',
        usr2_token,
        session_info_other['session_id'],
        'best session',
        error_id='bad-session-id'
    )
    await test.fetchval(
        'select name from session where id=$1',
        session_info_other['session_id'],
        expect_eq=session_info_other['name']
    )

    # test renaming one's own session, it should work fine
    await test.fetch(
        'call rename_session(authtoken := $1, session_id := $2, new_name := $3)',
        usr1_token,
        session_info_other['session_id'],
        'best session'
    )
    await test.fetchval(
        'select name from session where id=$1',
        session_info_other['session_id'],
        expect_eq='best session'
    )

    # test logging out another user's session (shouldn't work)
    await test.fetch_expect_raise(
        'call logout_session(authtoken := $1, session_id := $2)',
        usr2_token,
        session_info_other['session_id'],
        error_id='bad-session-id'
    )
    await test.fetchval(
        'select * from session_auth(token := $1)',
        token_3,
        expect_eq=usr1_id
    )

    # test logging out another session
    await test.fetch_expect_raise(
        'call logout_session(authtoken := $1, session_id := $2)',
        'a'*32,
        session_info_other['session_id'],
        error_id='bad-authtoken'
    )
    await test.fetchval(
        'select * from session_auth(token := $1)',
        token_3,
        expect_eq=usr1_id
    )
    await test.fetch(
        'call logout_session(authtoken := $1, session_id := $2)',
        usr1_token,
        session_info_other['session_id']
    )
    await test.fetch_expect_raise(
        'select * from session_auth(token := $1)',
        token_3,
        error_id='bad-authtoken'
    )
    await test.fetchval(
        'select * from session_auth(token := $1)',
        usr1_token,
        expect_eq=usr1_id
    )

    # test logging out of a session
    await test.fetchval(
        'select * from session_auth(token := $1)',
        usr2_token,
        expect_eq=usr2_id
    )
    await test.fetch(
        'call logout(authtoken := $1)',
        usr2_token
    )
    await test.fetch_expect_raise(
        'select * from session_auth(token := $1)',
        usr2_token,
        error_id='bad-authtoken'
    )
    await test.fetch_expect_raise(
        'call logout(authtoken := $1)',
        usr2_token,
        error_id='bad-authtoken'
    )

    # logging in as the marked-as-deleted user should fail
    await test.fetch(
        'update usr set deleted=true where username=$1',
        'fooman'
    )
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'test',
        '123456',
        'fooman',
        error_id='bad-login-credentials'
    )

    # recover password of a non-existing user
    await test.fetch(
        'select usr from pending_password_recovery',
        rowcount=0
    )
    await test.fetch_expect_raise(
        'call request_password_recovery(email := $1)',
        'lol@nope.wtf',
        error_id='bad-email'
    )
    # the pending request table should still be empty
    await test.fetchvals(
        'select usr from pending_password_recovery',
        rowcount=0
    )

    # attempt password recovery for deleted user
    # should fail and the pending recovery table should remain empty
    await test.fetch_expect_raise(
        'call request_password_recovery(email := $1)',
        'foo@bar.baz',
        error_id='bad-email'
    )
    await test.fetchvals(
        'select usr from pending_password_recovery',
        rowcount=0
    )

    # attempt password recovery for pending user
    # should fail and the pending recovery table should remain empty
    await test.fetch(
        'update usr set deleted = false, pending = true where id=$1',
        usr1_id
    )
    await test.fetch_expect_raise(
        'call request_password_recovery(email := $1)',
        'foo@bar.baz',
        error_id='bad-email'
    )
    await test.fetchvals(
        'select usr from pending_password_recovery',
        rowcount=0
    )

    # attempt password recovery for existing user
    await test.fetch(
        'update usr set pending = false where id=$1',
        usr1_id
    )
    await test.fetch(
        'select * from mails_pending_password_recovery_get()',
        rowcount=0
    )
    await test.fetch(
        'call request_password_recovery(email := $1)',
        'foo@bar.baz'
    )
    row = await test.fetchrow(
        'select * from pending_password_recovery',
    )
    test.expect_eq(row['usr'], usr1_id)
    test.expect_eq(
        row['valid_until'],
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )
    recovery_token_1 = row['token']
    del row
    test.expect_eq((await test.get_notification())[1], 'pending_password_recovery')

    mail = await test.fetchrow(
        'select * from mails_pending_password_recovery_get()',
        columns=['email', 'username', 'language', 'valid_until', 'token']
    )
    test.expect_eq(mail[0], 'foo@bar.baz')
    test.expect_eq(mail[1], 'fooman')
    test.expect_eq(mail[2], 'en_int')
    test.expect_eq(
        mail[3],
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )
    del mail
    await test.fetch(
        'select * from mails_pending_password_recovery_get()',
        rowcount=0
    )

    # attempt password recovery for another user
    await test.fetch(
        'call request_password_recovery(email := $1)',
        'rofl@bar.baz'
    )
    # the pending request table should now have two entries
    test.expect_eq(set(await test.fetchvals(
        'select usr from pending_password_recovery',
    )), {usr1_id, usr2_id})
    recovery_token_2 = await test.fetchval(
        'select token from pending_password_recovery where usr=$1',
        usr2_id
    )
    test.expect_eq((await test.get_notification())[1], 'pending_password_recovery')

    # attempt to recover the password with a wrong token
    await test.fetch_expect_raise(
        'call confirm_password_recovery(token := $1, password := $2)',
        'a'*32,
        'foo',
        error_id='bad-recovery-token'
    )

    # set the second request to timed out and attempt recovery with timed-out token
    await test.fetch(
        'update pending_password_recovery set valid_until=now() where usr=$1',
        usr2_id
    )
    await test.fetch_expect_raise(
        'call confirm_password_recovery(token := $1, password := $2)',
        recovery_token_2,
        'foo',
        error_id='bad-recovery-token'
    )

    # the pending request table should still have two entries
    test.expect_eq(set(await test.fetchvals(
        'select usr from pending_password_recovery',
    )), {usr1_id, usr2_id})

    # garbage collection should remove the timed-out token but leave the good one
    await test.fetch('call gc()')

    # the pending request table should still have two entries
    test.expect_eq(set(await test.fetchvals(
        'select usr from pending_password_recovery',
    )), {usr1_id})

    # attempt to recover the password with the correct token
    await test.fetch(
        'call confirm_password_recovery(token := $1, password := $2)',
        recovery_token_1,
        'Mb2.r5oHf-0t'
    )

    # no pending requests should be remaining
    await test.fetch(
        'select * from pending_password_recovery',
        rowcount=0
    )

    # attempt to login with the new password
    usr1_token = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'lol foo',
        'Mb2.r5oHf-0t',
        'foo@bar.baz'
    )

    # attempt to change the password, giving the wrong password
    await test.fetch_expect_raise(
        'call change_password(authtoken := $1, password := $2, new_password := $3)',
        usr1_token,
        'wrong password',
        'secure password',
        error_id='bad-login-credentials'
    )
    await test.fetch(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'lol foo 2',
        'Mb2.r5oHf-0t',
        'foo@bar.baz'
    )
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'lol foo 2',
        'secure password',
        'foo@bar.baz',
        error_id='bad-login-credentials'
    )

    # attempt to change the password, giving the wrong authtoken
    await test.fetch_expect_raise(
        'call change_password(authtoken := $1, password := $2, new_password := $3)',
        'a'*32,
        'Mb2.r5oHf-0t',
        'secure password',
        error_id='bad-authtoken'
    )

    # attempt to change the password, giving the correct password
    await test.fetch(
        'call change_password(authtoken := $1, password := $2, new_password := $3)',
        usr1_token,
        'Mb2.r5oHf-0t',
        'secure password'
    )
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'lol foo 2',
        'Mb2.r5oHf-0t',
        'foo@bar.baz',
        error_id='bad-login-credentials'
    )
    await test.fetch(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'lol foo 2',
        'secure password',
        'foo@bar.baz',
    )

    # attempt to change email with nonexistant authtoken
    await test.fetch_expect_raise(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        'a'*32,
        'secure password',
        'new.foo@bar.baz',
        error_id='bad-authtoken'
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=0
    )
    # attempt to change email with wrong password
    await test.fetch_expect_raise(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr1_token,
        'wrong password',
        'new.foo@bar.baz',
        error_id='bad-login-credentials'
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=0
    )
    # attempt to change email to the same value
    await test.fetch_expect_raise(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr1_token,
        'secure password',
        'foo@bar.baz',
        error_id='no-change'
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=0
    )
    # attempt to change email successfully
    await test.fetch(
        'select * from mails_pending_email_change_get()',
        rowcount=0
    )
    await test.fetch(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr1_token,
        'secure password',
        'new.foo@bar.baz'
    )
    change_new_email = await test.fetchval(
        'select new_email from pending_email_change where usr=$1',
        usr1_id
    )
    test.expect_eq(change_new_email, 'new.foo@bar.baz')
    del change_new_email
    test.expect_eq((await test.get_notification())[1], 'pending_email_change')

    # overwrite the email change request
    await test.fetch(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr1_token,
        'secure password',
        'newer.foo@bar.baz'
    )
    test.expect_eq((await test.get_notification())[1], 'pending_email_change')
    change_token_1, change_new_email = await test.fetchrow(
        'select token, new_email from pending_email_change where usr=$1',
        usr1_id
    )
    test.expect_eq(change_new_email, 'newer.foo@bar.baz')
    mail = await test.fetchrow(
        'select * from mails_pending_email_change_get()',
        columns=['email', 'username', 'language', 'new_email', 'valid_until', 'token']
    )
    test.expect_eq(mail[0], 'foo@bar.baz')
    test.expect_eq(mail[1], 'fooman')
    test.expect_eq(mail[2], 'en_int')
    test.expect_eq(mail[3], change_new_email)
    test.expect_eq(
        mail[4],
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(mail[5], change_token_1)
    del change_new_email, mail
    # the pending email should be gone now
    await test.fetch(
        'select * from mails_pending_email_change_get()',
        rowcount=0
    )
    # re-enable the pending notification
    await test.fetch(
        'call mails_pending_email_change_need_retry(token := $1)',
        change_token_1
    )
    # but it should not be enabled yet
    await test.fetch(
        'select * from mails_pending_email_change_get()',
        rowcount=0
    )

    # create an email change request for the other user
    usr2_token = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'my amazing session',
        '123456',
        'rofl@bar.baz'
    )
    await test.fetch(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr2_token,
        '123456',
        'newer.rofl@bar.baz'
    )
    change_token_2 = await test.fetchval(
        'select token from pending_email_change where usr=$1',
        usr2_id
    )
    test.expect_eq((await test.get_notification())[1], 'pending_email_change')

    # attempt to confirm the timed-out email change, should fail
    await test.fetch(
        'update pending_email_change set valid_until=now() where token=$1',
        change_token_2
    )
    await test.fetch_expect_raise(
        'call confirm_email_change(token := $1)',
        change_token_2,
        error_id='bad-email-change-token'
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr2_id,
        rowcount=1
    )
    del change_token_2

    # garbage collection should delete only the usr2 pending request
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=1
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr2_id,
        rowcount=1
    )
    await test.fetch('call gc()')
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=1
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr2_id,
        rowcount=0
    )
    await test.fetch('call gc()')
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=1
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr2_id,
        rowcount=0
    )

    # attempt to confirm an unknown email change request
    await test.fetch_expect_raise(
        'call confirm_email_change(token := $1)',
        'a'*32,
        error_id='bad-email-change-token'
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=1
    )
    await test.fetchval(
        'select email from usr where usr.id=$1',
        usr1_id,
        expect_eq='foo@bar.baz'
    )
    await test.fetchval(
        'select email from usr where usr.id=$1',
        usr2_id,
        expect_eq='rofl@bar.baz'
    )

    # attempt to correctly confirm an email change request
    await test.fetch(
        'call confirm_email_change(token := $1)',
        change_token_1
    )
    await test.fetch(
        'select * from pending_email_change where usr=$1',
        usr1_id,
        rowcount=0
    )
    await test.fetchval(
        'select email from usr where usr.id=$1',
        usr1_id,
        expect_eq='newer.foo@bar.baz'
    )
    await test.fetch_expect_raise(
        'call confirm_email_change(token := $1)',
        change_token_1,
        error_id='bad-email-change-token'
    )
    del change_token_1

    # attempt to change the email to itself
    await test.fetch_expect_raise(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr1_token,
        'secure password',
        'newer.foo@bar.baz',
        error_id='no-change'
    )

    # attempt to change the email to an other user's email
    # this will give an error during confirm_email_change
    await test.fetch(
        'call request_email_change(authtoken := $1, password := $2, new_email := $3)',
        usr1_token,
        'secure password',
        'rofl@bar.baz'
    )
    test.expect_eq((await test.get_notification())[1], 'pending_email_change')
    change_token = await test.fetchval(
        'select token from pending_email_change where usr=$1',
        usr1_id
    )

    await test.fetch_expect_error(
        'call confirm_email_change(token := $1)',
        change_token,
        error=asyncpg.exceptions.UniqueViolationError,
        error_re=r'usr_email_key'
    )
    await test.fetchval(
        'select email from usr where usr.id=$1',
        usr1_id,
        expect_eq='newer.foo@bar.baz'
    )
    # the request should still exist
    await test.fetch(
        'select * from pending_email_change where token=$1',
        change_token,
        rowcount=1
    )
    del change_token

    result = await test.fetchrow(
        'select * from get_user_info(authtoken := $1)',
        usr1_token
    )
    test.expect_eq(result['email'], 'newer.foo@bar.baz')
    test.expect_eq(
        result['registered_at'],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(result['username'], 'fooman')
    test.expect_eq(result['language'], 'en_int')
    test.expect_eq(result['admin'], False)
    test.expect_eq(result['can_upload_files'], False)

    # test admin_auth
    await test.fetch_expect_raise(
        'select * from admin_auth(token := $1)',
        'a'*32,
        error_id='bad-authtoken'
    )
    await test.fetch_expect_raise(
        'select * from admin_auth(token := $1)',
        usr1_token,
        error_id='no-admin'
    )
    await test.fetch('update usr set admin=true where id=$1', usr1_id)
    await test.fetchval(
        'select * from admin_auth(token := $1)',
        usr1_token,
        channel='usr',
        expect_eq=usr1_id
    )

    # try setting can-upload-files status
    await test.fetch_expect_raise(
        'call user_allow_upload_files(authtoken := $1, email := $2, allow := $3)',
        'a'*32,
        'rofl@nope.com',
        True,
        error_id='bad-authtoken'
    )
    await test.fetch('update usr set admin=false where id=$1', usr1_id)
    await test.fetch_expect_raise(
        'call user_allow_upload_files(authtoken := $1, email := $2, allow := $3)',
        usr1_token,
        'rofl@nope.com',
        True,
        error_id='no-admin'
    )
    await test.fetch('update usr set admin=true where id=$1', usr1_id)
    await test.fetch_expect_raise(
        'call user_allow_upload_files(authtoken := $1, email := $2, allow := $3)',
        usr1_token,
        'rofl@nope.com',
        True,
        error_id='bad-email'
    )
    await test.fetchval(
        'select can_upload_files from usr where id=$1',
        usr2_id,
        expect_eq=False
    )
    await test.fetch(
        'call user_allow_upload_files(authtoken := $1, email := $2, allow := $3)',
        usr1_token,
        'rofl@bar.baz',
        True,
    )
    await test.fetchval(
        'select can_upload_files from usr where id=$1',
        usr2_id,
        expect_eq=True
    )
    await test.fetch(
        'call user_allow_upload_files(authtoken := $1, email := $2, allow := $3)',
        usr1_token,
        'rofl@bar.baz',
        False,
    )
    await test.fetchval(
        'select can_upload_files from usr where id=$1',
        usr2_id,
        expect_eq=False
    )

    # test setting admin status
    await test.fetch_expect_raise(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        'a'*32,
        'rofl@nope.com',
        True,
        error_id='bad-authtoken'
    )
    await test.fetch('update usr set admin=false where id=$1', usr1_id)
    await test.fetch_expect_raise(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'rofl@nope.com',
        True,
        error_id='no-admin'
    )
    await test.fetch('update usr set admin=true where id=$1', usr1_id)
    await test.fetch_expect_raise(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'rofl@nope.com',
        True,
        error_id='bad-email'
    )
    await test.fetchval(
        'select admin from usr where id=$1',
        usr2_id,
        expect_eq=False
    )
    await test.fetch(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'rofl@bar.baz',
        True,
    )
    await test.fetchval(
        'select admin from usr where id=$1',
        usr2_id,
        expect_eq=True
    )
    await test.fetch(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'rofl@bar.baz',
        False,
    )
    await test.fetchval(
        'select admin from usr where id=$1',
        usr2_id,
        expect_eq=False
    )
    # try setting yourself as admin (when already an admin)
    await test.fetch(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'newer.foo@bar.baz',
        True,
    )
    await test.fetchval(
        'select admin from usr where id=$1',
        usr1_id,
        expect_eq=True
    )
    # try revoking your own admin status
    await test.fetch(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'newer.foo@bar.baz',
        False,
    )
    await test.fetchval(
        'select admin from usr where id=$1',
        usr1_id,
        expect_eq=False
    )
    await test.fetch_expect_raise(
        'call user_set_admin(authtoken := $1, email := $2, admin := $3)',
        usr1_token,
        'newer.foo@bar.baz',
        False,
        error_id='no-admin'
    )

    # try setting language
    await test.fetch_expect_raise(
        'call user_set_language(authtoken := $1, language := $2)',
        'a'*32,
        'de_de',
        error_id='bad-authtoken'
    )
    await test.fetchval(
        'select language from usr where id=$1',
        usr1_id,
        expect_eq='en_int'
    )
    await test.fetch(
        'call user_set_language(authtoken := $1, language := $2)',
        usr1_token,
        'de_de'
    )
    await test.fetchval(
        'select language from usr where id=$1',
        usr1_id,
        expect_eq='de_de'
    )

    # test deleting account with wrong authtoken
    await test.fetch_expect_raise(
        'call delete_account(authtoken := $1, password := $2)',
        'a'*32,
        'secure password',
        error_id='bad-authtoken'
    )
    # test deleting account with wrong password
    await test.fetch_expect_raise(
        'call delete_account(authtoken := $1, password := $2)',
        usr1_token,
        'wrong password',
        error_id='bad-login-credentials'
    )
    # test deleting account successfully
    await test.fetchval(
        'select deleted from usr where usr.id=$1',
        usr1_id,
        expect_eq=False
    )
    await test.fetch(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'test a',
        'secure password',
        'newer.foo@bar.baz'
    )
    await test.fetch(
        'call request_password_recovery(email := $1)',
        'newer.foo@bar.baz'
    )
    await test.fetch(
        'call delete_account(authtoken := $1, password := $2)',
        usr1_token,
        'secure password'
    )
    await test.fetch_expect_raise(
        'call delete_account(authtoken := $1, password := $2)',
        usr1_token,
        'secure password',
        error_id='bad-authtoken'
    )
    await test.fetchval(
        'select deleted from usr where usr.id=$1',
        usr1_id,
        expect_eq=True
    )
    # ensure that all sessions are gone
    await test.fetch(
        'select * from session where session.usr=$1',
        usr1_id,
        rowcount=0
    )
    # ensure that all pending email change requests are gone
    await test.fetch(
        'select * from pending_email_change where pending_email_change.usr=$1',
        usr1_id,
        rowcount=0
    )
    # ensure that all pending password recovery requests are gone
    await test.fetch(
        'select * from pending_password_recovery where pending_password_recovery.usr=$1',
        usr1_id,
        rowcount=0
    )
    # ensure that the user cannot login
    await test.fetch_expect_raise(
        'select * from login_with_password(session := $1, password := $2, email := $3)',
        'test b',
        'secure password',
        'newer.foo@bar.baz',
        error_id='bad-login-credentials'
    )

    # clean up all of the test users
    await remove_user(test, usr1_id)
    await remove_user(test, usr2_id)

    await test.unlisten('email')
