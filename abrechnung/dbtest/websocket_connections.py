"""
Tests for the functions from websocket_connections.sql
"""
import json

import asyncpg


async def test(test):
    forwarder_name = "test forwarder"
    channel = await test.fetchval(
        "select * from forwarder_boot(forwarder := $1)",
        forwarder_name,
        column="channel_name"
    )
    channel_number = await test.fetchval(
        'select notification_channel_number from forwarder where id = $1;',
        forwarder_name,
        column='notification_channel_number',
    )
    test.expect_eq(channel, f"channel{channel_number}")

    # same forwarder should have the same channel
    test.expect_eq(
        await test.fetchval(
            "select * from forwarder_boot(forwarder := $1)",
            forwarder_name
        ),
        channel
    )

    # different forwarder should have a different channel
    test.expect_neq(
        await test.fetchval(
            "select * from forwarder_boot(forwarder := $1)",
            forwarder_name + "_other"
        ),
        channel
    )

    # connect clients
    connection_id = await test.fetchval(
        "select * from client_connected(forwarder := $1)",
        forwarder_name,
        column="connection_id"
    )

    # disconnect clients
    await test.fetch(
        "call client_disconnected(id := $1)",
        connection_id
    )

    await test.fetch_expect_raise(
        "call client_disconnected(id := $1)",
        connection_id,
        error_id='bad-connection-id'
    )

    # connect two more clients
    connection_id = await test.fetchval(
        "select * from client_connected(forwarder := $1)",
        forwarder_name,
        column="connection_id"
    )

    connection_id_other = await test.fetchval(
        "select * from client_connected(forwarder := $1)",
        forwarder_name,
        column="connection_id"
    )

    test.expect_eq(
        set(await test.fetchvals(
            "select id from connection where forwarder = $1",
            forwarder_name,
            column="id"
        )),
        {connection_id, connection_id_other}
    )

    # test notifications
    await test.listen(channel)

    await test.fetch(
        "call notify_connections(connections := $1, event := $2, args := $3)",
        [connection_id],
        'notify_connections a',
        json.dumps({'foo': 1})
    )

    test.expect_eq(
        (await test.get_notification())[1],
        {
            'connections': [connection_id],
            'event': 'notify_connections a',
            'args': {'foo': 1}
        }
    )

    await test.fetch(
        "call notify_connections(connections := $1, event := $2, args := $3)",
        [connection_id, connection_id_other],
        'notify_connections b',
        json.dumps({'bar': 1337, 'lol': 'test'})
    )

    test.expect_eq(
        (await test.get_notification())[1],
        {
            'connections': [connection_id, connection_id_other],
            'event': 'notify_connections b',
            'args': {'bar': 1337, 'lol': 'test'}
        }
    )

    await test.fetch(
        "call notify_me(connection_id := $1, event := $2, args := $3)",
        connection_id,
        'notify_me',
        json.dumps({})
    )

    test.expect_eq(
        (await test.get_notification())[1],
        {
            'connections': [connection_id],
            'event': 'notify_me',
            'args': {}
        }
    )

    await test.fetch(
        "call notify_all(event := $1, args := $2)",
        'notify_all',
        json.dumps({'haha': 1})
    )

    test.expect_eq(
        (await test.get_notification())[1],
        {
            'connections': '*',
            'event': 'notify_all',
            'args': {'haha': 1}
        }
    )

    await test.unlisten(channel)

    # close forwarder
    test.expect_eq(
        await test.fetchval(
            "select * from forwarder_stop(forwarder := $1)",
            forwarder_name,
            column="deleted_connections"
        ),
        2
    )

    test.expect_eq(
        set(await test.fetchvals(
            "select id from connection where forwarder = $1",
            forwarder_name,
            column="id"
        )),
        set()
    )

    # clean up the forwarder entries
    await test.fetch(
        "delete from forwarder where id = $1 or id = $2 returning *",
        forwarder_name,
        forwarder_name + "_other",
        rowcount=2
    )

    # test if get_allowed_functions returns some meaningful set
    allowed_functions = await test.fetch(
        "select * from get_allowed_functions()",
        columns=["name", "requires_connection_id", "is_procedure"]
    )
    expected_allowed_functions = {"confirm_registration", "login_with_password", "notify_me"}
    for allowed_function in allowed_functions:
        expected_allowed_functions.discard(allowed_function["name"])
    test.expect_eq(expected_allowed_functions, set())
