"""
Tests for the functions from groups.sql
"""
import datetime

from .user_accounts import make_user, remove_user

async def test(test):
    usr1, auth1 = await make_user(test, email='a@example.com', username='a')
    usr2, auth2 = await make_user(test, email='b@example.com', username='b')
    usr3, auth3 = await make_user(test, email='c@example.com', username='c')

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

    test.expect_eq(group_infos[0][0], grp3)
    test.expect_eq(group_infos[0][1], 'boring group')
    test.expect_eq(group_infos[0][2], 'nothing to see here')
    test.expect_eq(group_infos[0][3], '$')
    test.expect_eq(group_infos[0][4], 1)
    test.expect_eq(
        group_infos[0][5],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(
        group_infos[0][6],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(group_infos[0][7], None)
    test.expect_eq(group_infos[0][8], True)
    test.expect_eq(group_infos[0][9], True)

    test.expect_eq(group_infos[1][0], grp1)
    test.expect_eq(group_infos[1][1], 'best group')
    test.expect_eq(group_infos[1][2], 'this group is amazing')
    test.expect_eq(group_infos[1][3], '\N{EURO SIGN}')
    test.expect_eq(group_infos[1][4], 1)
    test.expect_eq(
        group_infos[1][5],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(
        group_infos[1][6],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(group_infos[1][7], None)
    test.expect_eq(group_infos[1][8], True)
    test.expect_eq(group_infos[1][9], True)

    # check the groups that user2 is a part of
    group_info = await test.fetchrow(
        'select * from group_list(authtoken := $1)',
        auth2
    )
    test.expect_eq(group_info[0], grp2)
    test.expect_eq(group_info[1], 'acceptable group')
    test.expect_eq(group_info[2], 'this group is mediocre')
    test.expect_eq(group_info[3], '\N{EURO SIGN}')
    test.expect_eq(group_info[4], 1)
    test.expect_eq(
        group_info[5],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(
        group_info[6],
        datetime.datetime.now(datetime.timezone.utc),
        tolerance=datetime.timedelta(minutes=1)
    )
    test.expect_eq(group_info[7], None)
    test.expect_eq(group_info[8], True)
    test.expect_eq(group_info[9], True)

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
    invitetoken1 = await test.fetchval(
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
        column='token'
    )

    # user2 creates a multi-use invite to group 2
    invitetoken2 = await test.fetchval(
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
        True,
        column='token'
    )




    # clean up the test
    await test.fetch('delete from grp where grp.id=$1', grp1)
    await test.fetch('delete from grp where grp.id=$1', grp2)
    await test.fetch('delete from grp where grp.id=$1', grp3)
    await remove_user(test, usr1)
    await remove_user(test, usr2)
    await remove_user(test, usr3)
