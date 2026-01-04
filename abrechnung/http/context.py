from dataclasses import dataclass

from abrechnung.application.accounts import AccountService
from abrechnung.application.export_import import ExportImportService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config


@dataclass
class Context:
    """
    provides access to data injected by the ContextMiddleware
    into each request.
    """

    config: Config
    user_service: UserService
    transaction_service: TransactionService
    account_service: AccountService
    group_service: GroupService
    export_import_service: ExportImportService
