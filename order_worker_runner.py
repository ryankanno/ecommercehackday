from iron_worker import *

worker = IronWorker(config='config.ini')

name = "friendly-feast"

zipFile = IronWorker.createZip(files=["order_worker.py", "helpers.py"],
        destination="order_worker.zip", overwrite=True)

ret = worker.postCode(name=name, runFilename="order_worker.py",
        zipFilename="order_worker.zip")
