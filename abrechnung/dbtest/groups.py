"""
Tests for the functions from groups.sql
"""
import datetime

from .user_accounts import make_user, remove_user
from . import compare

async def test(test):
    usr1, auth1 = await make_user(test, email='a@example.com', username='a')
    usr2, auth2 = await make_user(test, email='b@example.com', username='b')
    usr3, auth3 = await make_user(test, email='c@example.com', username='c')
    usr4, auth4 = await make_user(test, email='d@example.com', username='d')

    # usr1 creates a group
    grp1 = await test.fetchval(
        '''
        select * from group_create(
            authtoken := $1,
            name := $2,
            description := $3,
            terms := $4,
            currency_symbol := $5
        )
        ''',
        auth1, 'best group', 'this group is amazing',
        'you must be amazing to join', '\N{EURO SIGN}',
        column='group_id'
    )

    # usr2 creates a group
    grp2 = await test.fetchval(
        '''
        select * from group_create(
            authtoken := $1,
            name := $2,
            description := $3,
            terms := $4,
            currency_symbol := $5
        )
        ''',
        auth2, 'acceptable group', 'this group is mediocre',
        'you must be mediocre to join', '\N{EURO SIGN}',
        column='group_id'
    )

    # usr1 creates another group
    grp3 = await test.fetchval(
        '''
        select * from group_create(
            authtoken := $1,
            name := $2,
            description := $3,
            terms := $4,
            currency_symbol := $5
        )
        ''',
        auth1, 'boring group', 'nothing to see here',
        'why even join', '$',
        column='group_id'
    )

    # check the groups that user1 is a part of
    group_infos = await test.fetch(
        'select * from group_list(authtoken := $1)',
        auth1,
        columns=[
            'group_id', 'name', 'description', 'currency_symbol',
            'member_count', 'created', 'joined',
            'latest_commit', 'is_owner', 'can_write'
        ]
    )

    test.expect(
        group_infos[0],
        (
            grp3,
            'boring group',
            'nothing to see here',
            '$',
            1,
            compare.with_tolerance(datetime.datetime.now(datetime.timezone.utc),
                                   datetime.timedelta(minutes=1)),
            compare.with_tolerance(datetime.datetime.now(datetime.timezone.utc),
                                   datetime.timedelta(minutes=1)),
            None,
            True,
            True,
        )
    )


    test.expect(
        group_infos[1],
        (
            grp1,
            'best group',
            'this group is amazing',
            '\N{EURO SIGN}',
            1,
            compare.with_tolerance(datetime.datetime.now(datetime.timezone.utc),
                                   datetime.timedelta(minutes=1)),
            compare.with_tolerance(datetime.datetime.now(datetime.timezone.utc),
                                   datetime.timedelta(minutes=1)),
            None,
            True,
            True,
        )
    )

    # check the groups that user2 is a part of
    group_info = await test.fetchrow(
        'select * from group_list(authtoken := $1)',
        auth2
    )
    test.expect(group_info[0], grp2)
    test.expect(group_info[1], 'acceptable group')
    test.expect(group_info[2], 'this group is mediocre')
    test.expect(group_info[3], '\N{EURO SIGN}')
    test.expect(group_info[4], 1)
    test.expect(
        group_info[5],
        compare.with_tolerance(datetime.datetime.now(datetime.timezone.utc),
                               datetime.timedelta(minutes=1)),
    )
    test.expect(
        group_info[6],
        compare.with_tolerance(datetime.datetime.now(datetime.timezone.utc),
                               datetime.timedelta(minutes=1)),
    )
    test.expect(group_info[7], None)
    test.expect(group_info[8], True)
    test.expect(group_info[9], True)

    # test session_auth_group
    # check invalid session token against grp1
    await test.fetch_expect_raise(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2,
            need_write_permission := $3,
            need_owner_permission := $4
        )
        ''',
        'b' * 32, grp1, True, True,
        error_id='bad-authtoken'
    )

    # check session token against grp1 of user1
    await test.fetchrow(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2,
            need_write_permission := $3,
            need_owner_permission := $4
        )
        ''',
        auth1, grp1, True, True,
        columns=['user_id', 'can_write', 'is_owner'],
        expect=(usr1, True, True),
    )

    # test if the permissions are returned
    await test.fetchrow(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2
        )
        ''',
        auth1, grp1,
        columns=['user_id', 'can_write', 'is_owner'],
        expect=(usr1, True, True),
    )

    # test if user2 can't access group1
    await test.fetch_expect_raise(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2
        )
        ''',
        auth2, grp1,
        error_id='no-group-membership'
    )

    # test group_invite_create
    # attempt to invite with bad authtoken
    await test.fetch_expect_raise(
        'select * from group_invite_create('
            'authtoken := $1, '
            'group_id := $2, '
            'description := $3, '
            'valid_until := $4, '
            'single_use := $5)',
        'a'*32,
        grp1,
        'best invite',
        datetime.datetime.now() + datetime.timedelta(hours=1),
        True,
        error_id='bad-authtoken'
    )

    # user2 attempts to invite to a group they're not a member of
    await test.fetch_expect_raise(
        'select * from group_invite_create('
            'authtoken := $1, '
            'group_id := $2, '
            'description := $3, '
            'valid_until := $4, '
            'single_use := $5)',
        auth2,
        grp1,
        'best invite',
        datetime.datetime.now() + datetime.timedelta(hours=1),
        True,
        error_id='no-group-membership'
    )

    # user1 creates a single-use invite to group 1
    grp1_invite_single = await test.fetchrow(
        'select * from group_invite_create('
            'authtoken := $1, '
            'group_id := $2, '
            'description := $3, '
            'valid_until := $4, '
            'single_use := $5)',
        auth1,
        grp1,
        'best invite',
        datetime.datetime.now() + datetime.timedelta(hours=1),
        True,
        columns=['invite_id', 'token']
    )

    # user2 creates a multi-use invite to group 2
    grp2_invite_multi = await test.fetchrow(
        'select * from group_invite_create('
            'authtoken := $1, '
            'group_id := $2, '
            'description := $3, '
            'valid_until := $4, '
            'single_use := $5)',
        auth2,
        grp2,
        'infinite invite',
        None,
        False,
        columns=['invite_id', 'token']
    )

    # -> we now have 1-use group1-invite: grp1_invite_single
    #    and n-use group2-invite: grp2_invite_multi

    # test gc_group_invite
    # garbage collection shouldn't do anything
    invite_count = await test.fetchval('select count(*) from group_invite')
    await test.fetch('call gc()')
    await test.fetchval(
        'select count(*) from group_invite',
        expect=invite_count
    )

    expired_invitetoken = await test.fetchrow(
        'select * from group_invite_create('
            'authtoken := $1, '
            'group_id := $2, '
            'description := $3, '
            'valid_until := $4, '
            'single_use := $5)',
        auth1,
        grp1,
        'expired invite',
        datetime.datetime.now() - datetime.timedelta(hours=1),
        True,
        columns=['invite_id', 'token']
    )

    # test group_preview
    # see if group1 singletoken provides the right group metadata
    await test.fetchrow(
        '''
        select * from group_preview(
            invite_token := $1
        )
        ''',
        grp1_invite_single[1],
        columns=['group_id', 'group_name', 'group_description',
                 'group_created',
                 'invite_description',
                 'invite_valid_until',
                 'invite_single_use'],
        expect=(grp1, 'best group', 'this group is amazing',
                compare.with_tolerance(datetime.datetime.now(tz=datetime.timezone.utc),
                                       datetime.timedelta(minutes=5)),
                'best invite',
                compare.with_tolerance(datetime.datetime.now(tz=datetime.timezone.utc) +
                                       datetime.timedelta(hours=1),
                                       datetime.timedelta(minutes=5)),
                True),
    )

    # test group_join
    # user2 uses user1's expired group1 singleuse invite -> no-group-invite
    await test.fetch_expect_raise(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth2,
        expired_invitetoken[1],
        error_id='no-group-invite',
    )

    # user2 uses user1's group1 singleuse invite -> success
    await test.fetchval(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth2,
        grp1_invite_single[1],
        expect=grp1,
    )

    # user2 creates another group1 singleuse invite, i.e. a chain invite -> success
    grp1_invite_chain_single = await test.fetchrow(
        'select * from group_invite_create('
        '    authtoken := $1,'
        '    group_id := $2,'
        '    description := $3,'
        '    valid_until := $4,'
        '    single_use := $5)',
        auth2,
        grp1,
        'chained invite',
        datetime.datetime.now() + datetime.timedelta(hours=1),
        True,
        columns=['invite_id', 'token']
    )
    # user3 uses user2's group1 singleuse chain invite -> success
    await test.fetchval(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth3,
        grp1_invite_chain_single[1],
        expect=grp1,
    )

    # user3 can't use user1's group1 singleuse invite any more -> no-group-invite
    await test.fetch_expect_raise(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth3,
        grp1_invite_chain_single[1],
        error_id='no-group-invite',
    )

    # user2 uses user1's group1 singleuse invite again -> no-group-invite
    await test.fetch_expect_raise(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth2,
        grp1_invite_chain_single[1],
        error_id='no-group-invite',
    )

    # user1 uses user2's group2 multiuse token -> ok
    await test.fetchval(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth1,
        grp2_invite_multi[1],
        expect=grp2,
    )

    # user2 uses user2's group2 multiuse token -> already-member
    await test.fetch_expect_raise(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth2,
        grp2_invite_multi[1],
        error_id='already-member',
    )

    # user3 uses user2's group2 multiuse token -> ok
    await test.fetchval(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth3,
        grp2_invite_multi[1],
        expect=grp2,
    )

    # user3 uses user2's group2 multiuse token again -> already-member
    await test.fetch_expect_raise(
        'select * from group_join('
        '    authtoken := $1,'
        '    invite_token := $2)',
        auth3,
        grp2_invite_multi[1],
        error_id='already-member',
    )

    # => user1 owns group1,
    #    user2 owns group2,
    #    user2 in group1,
    #    user3 in group1 (via user2),
    #    user1 in group2,
    #    user3 in group2

    # user4 not member of group 1
    await test.fetch_expect_raise(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2,
            need_write_permission := $3
        )
        ''',
        auth4, grp1, True,
        error_id='no-group-membership',
    )

    # test if user2 now in group1 is not owner/writer
    await test.fetchrow(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2
        )
        ''',
        auth2, grp1,
        columns=['user_id', 'can_write', 'is_owner'],
        expect=(usr2, False, False),
    )

    # user2 can't write in grp1
    await test.fetch_expect_raise(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2,
            need_write_permission := $3
        )
        ''',
        auth2, grp1, True,
        error_id='no-group-write-permission',
    )

    # user2 isn't owner of grp1
    await test.fetch_expect_raise(
        '''
        select * from session_auth_group(
            token := $1,
            group_id := $2,
            need_owner_permission := $3
        )
        ''',
        auth2, grp1, True,
        error_id='no-group-owner-permission',
    )

    # test if expired token is garbage collected
    await test.fetch('call gc()')
    await test.fetch(
        'select * from group_invite where token=$1',
        expired_invitetoken[1],
        rowcount=0
    )

    # TODO test group_member_list

    # TODO test group_member_privileges_set

    # TODO test group_invite_list

    # TODO test group_invite_delete

    # TODO test group_log_post

    # TODO test group_log_get

    # TODO test group_metadata_get

    # TODO test group_metadata_set

    # TODO test group_leave


    # clean up the test
    await test.fetch('delete from grp where grp.id=$1', grp1)
    await test.fetch('delete from grp where grp.id=$1', grp2)
    await test.fetch('delete from grp where grp.id=$1', grp3)
    await remove_user(test, usr1)
    await remove_user(test, usr2)
    await remove_user(test, usr3)
