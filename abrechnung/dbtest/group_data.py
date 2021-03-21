"""
Tests for the functions from group_data.sql
"""
import datetime

from .user_accounts import get_user, remove_user

async def test(test):
    usr1, auth1 = await get_user(test, email='a@example.com', username='a')
    usr2, auth2 = await get_user(test, email='b@example.com', username='b')

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
        'you must be amazing to join', '€',
        column='id'
    )

    # TODO tests here!

    await test.fetch('delete from grp where grp.id=$1', grp1)
    await remove_user(test, usr1)
    await remove_user(test, usr2)
