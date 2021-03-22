# abrechnung

payment management and bookkeeping


## Architecture

* psql DB, exposed as websocket
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
  * Load and enable psql extensions: `sudo -u postgres psql somedatabasename < db/extensions.sql`
  * Load and update DB schema: `python3 -m abrechnung -c your-config.yml psql rebuild`
    * Attention: This clears all previous database content.
      Use `funcs` instead of `rebuild` to update functions only.
* Launch `python3 -m abrechnung -c your-config.yaml websocket`


## Testing

### Database Test

When developing, reinit the db and run tests:
```
python3 -m abrechnung -c your-config.yaml dbtest --confirm-destructive-test --prepare-action rebuild
```


## Contact

If you have questions, suggestions, encounter any problem,
please join our Matrix or IRC channel and ask!

```
#sfttech:matrix.org
irc.freenode.net #sfttech
```

Of course, create [issues](https://github.com/SFTtech/abrechnung/issues)
and [pull requests](https://github.com/SFTtech/abrechnung/pulls).


## License

Released under the **GNU Affero General Public License** version 3 or later,
see [COPYING](COPYING) and [LICENSE](LICENSE) for details.
