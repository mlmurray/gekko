#navigate to gekko folder, change this if your location is different
cd /home/ec2-user/gekko

# zip previous log files for this config
now="`date +%Y%m%d%H%M%S`"
current_log=log/$1-log
archive_log=log/$1-log.$now

if [ -f $current_log ]; then
    mv $current_log $archive_log
    zip -vu log/$1-logs.zip $archive_log

    # remove raw text files now that they're zipped
    rm $archive_log
fi

# finally launch gekko and log output to log file as well as stdout
while [ TRUE ]; do
	node gekko config="/home/ec2-user/gekko/gekko-conf-$1.js" 2>&1 | tee -a $current_log
	echo "Crash - Gekko CRASH" >> $current_log
done
