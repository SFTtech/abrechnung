"""
Tests for the functions from subscriptions.sql
"""
import datetime
import time

import asyncpg.exceptions

from . import compare
from . import user_accounts


async def test(test):
    forwarder_name = 'subscribetest_forwarder'

    # start a virtual websocket forwarder
    channel1_id = await test.fetchval(
        "select * from forwarder_boot(id := $1)",
        forwarder_name,
        column="channel_id"
    )
    await test.listen(f'channel{channel1_id}')

    # user 1
    usr1_connection1 = await test.fetchval(
        "select * from client_connected(channel_id := $1)",
        channel1_id,
        column="connection_id"
    )
    usr1_id, usr1_token1 = await user_accounts.make_user(
        test, email='rolf@lol', username='rolf', password='Hunter2',
        session='Firefox on GNU/Linux')

    # user 2
    usr2_connection = await test.fetchval(
        "select * from client_connected(channel_id := $1)",
        channel1_id,
        column="connection_id"
    )
    usr2_id, usr2_token = await user_accounts.make_user(
        test, email='fif@lol', username='fif', password='secure')


    # test basic subscription
    await test.fetch(
        "call subscribe(connection_id := $1, token := $2, subscription_type := $3, element_id := $4);",
        usr1_connection1,
        usr1_token1,
        'test',
        usr1_id
    )

    # look in the subscription table to invoke the notification
    usr1_subscribed_conns = await test.fetchval(
        """
        select array_agg(connection_id)
        from subscription
        where subscription.subscription_type = 'test' and
              $1 = subscription.user_id and
              $1 = subscription.element_id
        """,
        usr1_id
    )
    test.expect(set(usr1_subscribed_conns), {usr1_connection1})

    await test.fetch(
        "call notify_connections($1, 'test', '{}'::json)",
        usr1_subscribed_conns
    )

    notification = await test.get_notification()
    test.expect(
        notification[0],
        f'channel{channel1_id}'
    )
    test.expect(
        notification[1],
        {
            'connections': [usr1_connection1],
            'event': 'test',
            'args': dict()
        }
    )

    # test if two logins for same user get two notifications
    usr1_connection2 = await test.fetchval(
        "select * from client_connected(channel_id := $1)",
        channel1_id,
        column="connection_id"
    )
    usr1_token2 = await test.fetchval(
        'select * from login_with_password(session := $1, password := $2, username := $3)',
        'Firefox on Android',
        'Hunter2',
        'rolf'
    )

    await test.fetch(
        "call subscribe(connection_id := $1, token := $2, subscription_type := $3, element_id := $4);",
        usr1_connection2,
        usr1_token2,
        'test',
        usr1_id
    )

    # check that both connections are now subscribed
    usr1_subscribed_conns = await test.fetchval(
        """
        select array_agg(connection_id)
        from subscription
        where subscription.subscription_type = 'test' and
              $1 = subscription.user_id and
              $1 = subscription.element_id
        """,
        usr1_id
    )
    test.expect(set(usr1_subscribed_conns), {usr1_connection1, usr1_connection2})

    # invoke notifications, which should result in only one notification
    # sent since both connections are on the same forwarder
    await test.fetch(
        "call notify_subscribers('test', $1, $2, '{\"gnampf\": 1337}'::json)",
        usr1_id, usr1_id
    )

    notification = await test.get_notification()
    test.expect(
        notification,
        (
            f'channel{channel1_id}',
            {
                'connections': [usr1_connection1, usr1_connection2],
                'event': 'test',
                'args': {"gnampf": 1337}
            }
        )
    )

    # test notifications to two forwarders
    forwarder2_name = 'subscribetest_forwarder2'
    channel2_id = await test.fetchval(
        "select * from forwarder_boot(id := $1)",
        forwarder2_name,
        column="channel_id"
    )
    await test.listen(f'channel{channel2_id}')

    usr1_connection3 = await test.fetchval(
        "select * from client_connected(channel_id := $1)",
        channel2_id,
        column="connection_id"
    )
    await test.fetch(
        "call subscribe(connection_id := $1, token := $2, subscription_type := $3, element_id := $4);",
        usr1_connection3,
        usr1_token2,
        'test',
        usr1_id
    )


    await test.fetch(
        "call notify_subscribers('test', $1, $2, '{\"pwn\": 235}'::json)",
        usr1_id, usr1_id
    )

    notifications = await test.get_notifications(2)
    test.expect_random(
        notifications,
        [
            (
                f'channel{channel1_id}',
                {
                    'connections': [usr1_connection1, usr1_connection2],
                    'event': 'test',
                    'args': {"pwn": 235}
                }
            ),
            (
                f'channel{channel2_id}',
                {
                    'connections': [usr1_connection3],
                    'event': 'test',
                    'args': {"pwn": 235}
                }
            )
        ]
    )

    # usr2 has no "permission" to subscribe to usr1 test element_id
    await test.fetch_expect_error(
        "call subscribe(connection_id := $1, token := $2, subscription_type := $3, element_id := $4);",
        usr2_connection,
        usr2_token,
        'test',
        usr1_id,
        error=asyncpg.exceptions.RaiseError,
        error_re=r'bad-subscription: test requires correct element_id'
    )

    # teardown
    await user_accounts.remove_user(test, usr1_id)
    await user_accounts.remove_user(test, usr2_id)

    await test.unlisten(f'channel{channel1_id}')
    await test.unlisten(f'channel{channel2_id}')

    await test.fetchval(
        "select * from forwarder_stop(id := $1)",
        forwarder_name,
    )
    await test.fetchval(
        "select * from forwarder_stop(id := $1)",
        forwarder2_name,
    )

    # forwarder deletion deletes connections
    test.expect(
        await test.fetchval("select count(*) from connection"),
        0
    )
