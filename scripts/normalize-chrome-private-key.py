import os
import sys

key = os.environ["CHROME_SERVICE_ACCOUNT_PRIVATE_KEY"].strip()
if key.startswith("{") or key.startswith('"'):
    sys.exit("CHROME_SERVICE_ACCOUNT_PRIVATE_KEY 应只包含 private_key，不要粘贴整份 JSON")

key = key.replace("\\n", "\n").strip().strip('"')
if not key.startswith("-----BEGIN"):
    head = "".join(ch if ch.isascii() and ch.isalnum() else "." for ch in key[:24])
    sys.exit(f"CHROME_SERVICE_ACCOUNT_PRIVATE_KEY 不是 PEM 私钥，开头是 {head}")

sys.stdout.write(key)
