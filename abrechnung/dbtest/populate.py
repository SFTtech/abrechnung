import datetime

from .user_accounts import make_user

async def populate(test):
    usr1, auth1 = await make_user(test, email='foo@example.com', username='foo1')
    usr2, auth2 = await make_user(test, email='bar@example.com', username='bar2')
    usr3, auth3 = await make_user(test, email='baz@example.com', username='baz3')

    auth3b = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'other_test', '123456', 'foo1'
    )

    # group1 created by usr1
    grp1 = await test.fetchval(
        'select * from group_create(authtoken := $1, name := $2, description := $3, terms := $4, currency_symbol := $5)',
        auth1, 'cool group', 'the best group', '', '€', 
    )

    # group2 created by usr3
    grp2 = await test.fetchval(
        'select * from group_create(authtoken := $1, name := $2, description := $3, terms := $4, currency_symbol := $5)',
        auth3, 'amazing group', 'the bestest group', '', '€', 
    )

    # invite into group1 by usr1
    invite1 = await test.fetchval(
        'select * from group_invite_create(authtoken := $1, group_id := $2, description := $3, single_use := $4)',
        auth1, grp1, 'example invite token', False
    )

    # users accept invite to group1
    for authtoken in (auth2, auth3):
        await test.fetchval(
            'select * from group_join(authtoken := $1, invite_token := $2)',
            authtoken, invite1
        )

    # users start editing group1
    await test.fetchval(
        'select * from create_change(authtoken := $1, group_id := $2, message := $3)',
        auth1, grp1, "foo1's change"
    )
    await test.fetchval(
        'select * from create_change(authtoken := $1, group_id := $2, message := $3)',
        auth2, grp1, "bar2's change"
    )
    await test.fetchval(
        'select * from create_change(authtoken := $1, group_id := $2, message := $3)',
        auth2, grp1, "bar2's second change" 
    )
