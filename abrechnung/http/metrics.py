from prometheus_client import Gauge
from prometheus_fastapi_instrumentator.metrics import Info

from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService


def abrechnung_number_of_groups_total(group_service: GroupService):
    metric = Gauge(
        "abrechnung_number_of_groups_total",
        "Number of groups created on this Abrechnung instance..",
    )

    async def instrumentation(info: Info) -> None:
        total = await group_service.total_number_of_groups()
        metric.set(total)

    return instrumentation


def abrechnung_number_of_transactions_total(transaction_service: TransactionService):
    metric = Gauge(
        "abrechnung_number_of_transactions_total",
        "Number of transactions created on this Abrechnung instance..",
    )

    async def instrumentation(info: Info) -> None:
        total = await transaction_service.total_number_of_transactions()
        metric.set(total)

    return instrumentation


def abrechnung_total_amount_of_money(transaction_service: TransactionService):
    metric = Gauge(
        "abrechnung_total_amount_of_money",
        "Total amount of money per currency cleared via thisthis Abrechnung instance..",
        labelnames=("currency_identifier",),
    )

    async def instrumentation(info: Info) -> None:
        total = await transaction_service.total_amount_of_money_per_currency()
        for currency, value in total.items():
            metric.labels(currency).set(value)

    return instrumentation
