import threading


def run_in_thread(target_function):
    """Decorator to run a function in a separate thread."""

    def run(*k, **kw):
        t = threading.Thread(target=target_function, args=k, kwargs=kw)
        t.start()
        return t

    return run
