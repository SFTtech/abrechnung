import unittest
from uuid import uuid4

from abrechnung.application.groups import Groups


class GroupTest(unittest.TestCase):
    def setUp(self) -> None:
        self.group_service = Groups()

    def test_group_create(self):
        group_id = self.group_service.create_group(
            uuid4(), "name", "description", "€", "terms"
        )
        self.assertIsNotNone(group_id)
