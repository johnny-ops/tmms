import urllib.request
import ssl
import sys

# Disable SSL verification for the download
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://github.com/intel-iot-devkit/sample-videos/raw/master/car-detection.mp4"
output = "c:\\xampp\\htdocs\\GOVSERVE\\tmms\\apps\\ai-service\\test-videos\\real_traffic.mp4"

print(f"Downloading {url}...")
try:
    with urllib.request.urlopen(url, context=ctx) as response, open(output, 'wb') as out_file:
        data = response.read()
        out_file.write(data)
    print("Download complete!")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
