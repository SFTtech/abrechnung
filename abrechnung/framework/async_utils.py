import asyncio
import threading
import traceback
from functools import wraps

from stustapay.framework.database import create_db_pool


def with_db_pool(func):
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        db_pool = await create_db_pool(self.config.database)
        try:
            return await func(self, *args, db_pool=db_pool, **kwargs)
        finally:
            await db_pool.close()

    return wrapper


class AsyncThread:
    def __init__(self, coroutine_callable):
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self.loop.run_forever)
        self.callable = coroutine_callable
        self.future = None

    def start(self):
        async def runner():
            try:
                await self.callable()
            except:  # pylint: disable=bare-except
                traceback.print_exc()

        self.thread.start()
        self.future = asyncio.run_coroutine_threadsafe(runner(), self.loop)

    def join(self):
        self.thread.join()

    def stop(self):
        if self.future:
            self.future.cancel()
        self.loop.stop()
