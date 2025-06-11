import requests
import pandas as pd

# Download NAVAll.txt
url = "https://www.amfiindia.com/spages/NAVAll.txt"
response = requests.get(url)
lines = response.text.splitlines()

# Skip header lines and extract scheme code and scheme name
funds = []
for line in lines:
    if ";" not in line:
        continue
    parts = line.split(";")
    if len(parts) >= 3:
        scheme_code = parts[0].strip()
        scheme_name = parts[2].strip()
        funds.append((scheme_code, scheme_name))

# Create DataFrame
df = pd.DataFrame(funds, columns=['SchemeCode', 'SchemeName'])

# Export to CSV
df.to_csv("amfi_fund_list.csv", index=False)

# Export to JSON
# Each entry: {"_id": scheme_code, "scheme_name": scheme_name}
amfi_json = df.rename(columns={"SchemeCode": "_id", "SchemeName": "scheme_name"})
amfi_json.to_json("amfi_fund_list.json", orient="records", indent=4)

print("Exported amfi_fund_list.csv and amfi_fund_list.json") 