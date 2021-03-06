import datetime

from .user_accounts import get_user

async def populate(test):
    usr1, auth1 = await get_user(test, email='aaa@example.com', username='aaa')
    usr2, auth2 = await get_user(test, email='bbb@example.com', username='bbb')
    usr3, auth3 = await get_user(test, email='ccc@example.com', username='ccc')

    auth3b = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'other_test', '123456', 'aaa'
    )

    # group1 created by usr1
    grp1 = await test.fetchval(
        'select * from group_create(authtoken := $1, name := $2, description := $3, terms := $4, currency := $5)',
        auth1, 'example group', 'this is an example group', '', '€', 
    )

    # group2 created by usr3
    grp2 = await test.fetchval(
        'select * from group_create(authtoken := $1, name := $2, description := $3, terms := $4, currency := $5)',
        auth3, 'example group', 'this is an example group', '', '€', 
    )

    #invite1 = await test.fetchval(
    #    'select * from group_invite(authtoken := $1, grp := $2, description := $3, single_use := $4)',
    #    auth1, grp1, 'example invite token', True
    #)

    # unused (TODO: populate more stuff using this)
    del usr2, auth2, usr3, auth3b, grp2 #, invite1
