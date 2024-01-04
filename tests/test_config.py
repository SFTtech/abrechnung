import os
import tempfile
from pathlib import Path

from abrechnung.config import read_config

docker_base_config = (Path(__file__).parent.parent / "docker" / "abrechnung.yaml").read_text()


def test_config_load_from_env():
    os.environ["ABRECHNUNG_SERVICE__NAME"] = "my abrechnung"
    os.environ["ABRECHNUNG_API__SECRET_KEY"] = "secret"
    os.environ["ABRECHNUNG_DATABASE__HOST"] = "localhost"
    os.environ["ABRECHNUNG_DATABASE__DBNAME"] = "abrechnung"
    os.environ["ABRECHNUNG_DATABASE__PASSWORD"] = "password"
    os.environ["ABRECHNUNG_DATABASE__USER"] = "abrechnung"
    os.environ["ABRECHNUNG_EMAIL__ADDRESS"] = "do-not-reply@test.com"
    with tempfile.NamedTemporaryFile() as f:
        filename = Path(f.name)
        filename.write_text(docker_base_config, "utf-8")

        loaded_cfg = read_config(filename)

        assert loaded_cfg.service.name == "my abrechnung"
        assert loaded_cfg.api.secret_key == "secret"
        assert loaded_cfg.database.user == "abrechnung"
        assert loaded_cfg.database.host == "localhost"
        assert loaded_cfg.database.dbname == "abrechnung"
        assert loaded_cfg.database.password == "password"
        assert loaded_cfg.email.address == "do-not-reply@test.com"
