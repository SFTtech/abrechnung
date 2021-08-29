# abrechnung

payment management and bookkeeping

## Architecture

* psql DB, exposed as websocket and http REST API
* web-client
* various python services (e.g. mail delivery)

## Setup

### Database Setup

* Have a running psql db
* Create the database:
    * `sudo -u postgres psql`
    * `create role someuser with login password 'somepassword';`
    * `create database somedatabasename owner someuser;`
    * exit the `psql` prompt
* Copy `config.example.yaml` and edit it, e.g. enter someuser, somepassword and somedatabasename
* Populate database:
    * `python3 -m abrechnung -c your-config.yaml db migrate` to apply all database migrations
* Launch `python3 -m abrechnung -c your-config.yaml api`
* Launch `python3 -m abrechnung -c your-config.yaml mailer` to get mail delivery

## Developing

Run the tests via

```
make test
```

To wipe and rebuild the database run

```
python3 -m abrechnung -c your-config.yaml db rebuild
```

## Contact

If you have questions, suggestions, encounter any problem, please join our Matrix or IRC channel and ask!

```
#sfttech:matrix.org
irc.freenode.net #sfttech
```

Of course, create [issues](https://github.com/SFTtech/abrechnung/issues)
and [pull requests](https://github.com/SFTtech/abrechnung/pulls).

## License

Released under the **GNU Affero General Public License** version 3 or later, see [COPYING](COPYING)
and [LICENSE](LICENSE) for details.
