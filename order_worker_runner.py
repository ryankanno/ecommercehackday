from iron_worker import *

worker = IronWorker(config='config.ini')

name = "HelloWorker-python"
zipFile = IronWorker.createZip(files=["hello_worker.py"],
        destination="hello_worker.zip", overwrite=True)
ret = worker.postCode(name=name, runFilename="hello_worker.py",
        zipFilename="hello_worker.zip")
print str(ret)

ret = worker.postTask(name=name)
print "postTask returned:  %s" % ret
task_id = ret['tasks'][0]['id']

# Repeat task every minute five times
ret = worker.postSchedule(name=name, run_every=60, run_times=5, delay=2)
print "postSchedule returned:  %s" % ret