import requests
import re

url = "https://www.skylinewebcams.com/en/webcam/philippines/davao/davao-del-sur/davao-city-leon-garcia-street.html"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}
response = requests.get(url, headers=headers)
html = response.text

matches = re.findall(r'(https?://[^"\'\s]+\.m3u8[^"\'\s]*)', html)
print("Found m3u8 matches:", matches)

matches2 = re.findall(r'(https?://[^"\'\s]+skylinewebcams[^"\'\s]*)', html)
print("Found skylinewebcams matches:", matches2)
