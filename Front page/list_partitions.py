import psutil
for part in psutil.disk_partitions(all=True):
    print(f"Device: {part.device}, Mountpoint: {part.mountpoint}, Type: {part.fstype}, Opts: {part.opts}")