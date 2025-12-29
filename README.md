# Abrechnung

[![GitHub Actions Status](https://github.com/SFTtech/abrechnung/actions/workflows/push_on_master.yaml/badge.svg)](https://github.com/SFTtech/abrechnung/actions/workflows/push_on_master.yaml)
[![Translation Status](https://hosted.weblate.org/widget/abrechnung/svg-badge.svg)](https://hosted.weblate.org/engage/abrechnung/)

The _Abrechnung_ (German for _reckoning_, _settlement_, _revenge_) aims to be a versatile and user-centric **payment**, **transaction** and **bookkeeping** management tool for human groups and events.
It aims to be a feature-complete, free and open source alternative to Splitwise, Tricount or similar.

> You can simply **try** our [**demo instance**](https://demo.abrechnung.sft.lol)!

### Features

- Create and share groups
- Create expenses and money transfers with uneven shares
- Track expense positions
- Permission management within groups to distinguish between viewers, editors and group owners
- Installable on Mobile as a Progressive Web App - use the "Add to Home Screen" feature of your favourite web browser
- Upload images for expenses
- Use multiple currencies with different converesion rates within one group
- Use math expressions when entering numeric values, e.g. typing `(2 + 4) * 3` in a text field will automatically enter `18`
- Graphical representations of the current group balance as well as individual peoples balances over time
- Automatic settlement plans for the whole group
- Create events to manage complex expenses, e.g. multiple people buying things for a multi-day event with different participants each day
- Add tags to expenses and events to quickly filter the expense and event lists
- Unsaved changes are stored locally to not get lost when your internet connection drops
- Export expenses to CSV
- Archive groups to make them readonly

## Documentation

To help you set up your instance or understand the inner workings:

**[Read the documentation!](https://abrechnung.readthedocs.io)**

## Technical foundation

| Technology              | Component       |
| ----------------------- | --------------- |
| **PostgresSQL**         | Database        |
| **Python + FastAPI**    | Backend logic   |
| **React + Material UI** | Web UI frontend |
| **Homo Sapiens**        | Magic sauce     |

## Contributing

If there is **that feature** you really want to see implemented, you found a **bug** or would like to help in some other way, the project of course benefits from your contributions!

- [Contribution guide](https://abrechnung.readthedocs.io/en/latest/development/contributing.html)
- [Issue tracker](https://github.com/SFTtech/abrechnung/issues)
- [Code contributions](https://github.com/SFTtech/abrechnung/pulls)
- [Development roadmap](https://github.com/SFTtech/abrechnung/projects)

### Translations

Translations are managed using the hosted weblate service [here](https://hosted.weblate.org/engage/abrechnung/).

[![Translation Status](https://hosted.weblate.org/widget/abrechnung/multi-auto.svg)](https://hosted.weblate.org/engage/abrechnung/)

## Contact

To directly reach developers and other users, we have chat rooms.
For questions, suggestions, problem support, please join and just ask!

| Contact       | Where?                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Issue Tracker | [SFTtech/abrechnung](https://github.com/SFTtech/abrechnung/issues)                              |
| Matrix Chat   | [`#sfttech:matrix.org`](https://app.element.io/#/room/#sfttech:matrix.org)                      |
| Support us    | [![money sink](https://liberapay.com/assets/widgets/donate.svg)](https://liberapay.com/SFTtech) |

## License

Released under the **GNU Affero General Public License** version 3 or later, see [the authors](authors.md)
and [LICENSE](LICENSE) for details.
