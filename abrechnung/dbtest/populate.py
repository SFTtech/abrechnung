from .user_accounts import make_user


async def populate(test: 'DBTest'):
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
    invite1 = await test.fetchrow(
        'select * from group_invite_create(authtoken := $1, group_id := $2, description := $3, single_use := $4)',
        auth1, grp1, 'example invite token', False
    )

    # users accept invite to group1
    await test.fetchval(
        'select * from group_join(authtoken := $1, invite_token := $2)',
        auth2, invite1[1]
    )
    await test.fetchval(
        'select * from group_join(authtoken := $1, invite_token := $2)',
        auth3, invite1[1]
    )
    # user receives write permissions to group1
    await test.fetch(
        'call group_member_privileges_set(authtoken := $1, group_id := $2, user_id := $3, can_write := true)',
        auth1, grp1, usr2
    )

    # create some accounts
    account1, account1_revision = await test.fetchrow(
        'select * from account_create(authtoken := $1, group_id := $2, name := $3, description := $4, priority := $5)',
        auth1, grp1, 'foo1', 'Main account of foo1', 0
    )
    account2, account2_revision = await test.fetchrow(
        'select * from account_create(authtoken := $1, group_id := $2, name := $3, description := $4, priority := $5)',
        auth2, grp1, 'bar1', 'Main account of bar2', 0
    )
    account3, account3_revision = await test.fetchrow(
        'select * from account_create(authtoken := $1, group_id := $2, name := $3, description := $4, priority := $5)',
        auth2, grp1, 'some other account', 'some random shit account', 0
    )

    # create a transfer
    transfer1, transfer1_revision = await test.fetchrow(
        'select * from transaction_create(authtoken := $1, group_id := $2, type := $3, description := $4, currency_symbol := $5, currency_conversion_rate := $6, value := $7)',
        auth1, grp1, 'transfer', 'Überweisung foo1 an bar1', '€', 1.0, 40.00
    )

    share1 = await test.fetchrow(
        'select * from transaction_creditor_share_create(authtoken := $1, transaction_id := $2, account_id := $3, shares := $4, description := $5, revision_id := $6)',
        auth1, transfer1, account1, 1.0, 'Foo share why ever we need a description here wtf', transfer1_revision
    )

    share2 = await test.fetchrow(
        'select * from transaction_debitor_share_create(authtoken := $1, transaction_id := $2, account_id := $3, shares := $4, description := $5, revision_id := $6)',
        auth1, transfer1, account2, 1.0, 'Foo share why ever we need a description here wtf', transfer1_revision
    )

    await test.fetch(
        'call commit_revision(authtoken := $1, revision_id := $2)',
        auth1, transfer1_revision
    )

    # create a purchase
    purchase1, purchase1_revision = await test.fetchrow(
        'select * from transaction_create(authtoken := $1, group_id := $2, type := $3, description := $4, currency_symbol := $5, currency_conversion_rate := $6, value := $7)',
        auth1, grp1, 'purchase', 'Einkauf EDEKA 01.01.1970', '€', 1.0, 35.43
    )

    share3 = await test.fetchrow(
        'select * from transaction_creditor_share_create(authtoken := $1, transaction_id := $2, account_id := $3, shares := $4, description := $5, revision_id := $6)',
        auth1, purchase1, account1, 1.0, 'Foo share why ever we need a description here wtf', purchase1_revision
    )

    share4 = await test.fetchrow(
        'select * from transaction_debitor_share_create(authtoken := $1, transaction_id := $2, account_id := $3, shares := $4, description := $5, revision_id := $6)',
        auth1, purchase1, account2, 1.0, 'Foo share why ever we need a description here wtf', purchase1_revision
    )

    share5 = await test.fetchrow(
        'select * from transaction_debitor_share_create(authtoken := $1, transaction_id := $2, account_id := $3, shares := $4, description := $5, revision_id := $6)',
        auth1, purchase1, account3, 1.0, 'Foo share why ever we need a description here wtf', purchase1_revision
    )

    await test.fetch(
        'call commit_revision(authtoken := $1, revision_id := $2)',
        auth1, purchase1_revision
    )

    # create a mimo transaction
    mimo1, mimo1_revision = await test.fetchrow(
        'select * from transaction_create(authtoken := $1, group_id := $2, type := $3, description := $4, currency_symbol := $5, currency_conversion_rate := $6, value := $7)',
        auth2, grp1, 'mimo', 'Ausgleich Gruppe asdf', '€', 1.0, 100.21
    )

