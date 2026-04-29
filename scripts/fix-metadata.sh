#!/bin/bash
set -e

NFTS_DIR="$(dirname "$0")/../nfts"
DESC="Toxic Ponzilio Boyfriends - 777 generative PFP characters on Solana."
URL="https://ponzilio.com"

# 0.json was renamed from 20.json - fix image ref from "20.png" to "0.png"
jq --arg desc "$DESC" --arg url "$URL" '
  del(.collection) |
  .image = "0.png" |
  . + {
    "description": $desc,
    "external_url": $url,
    "properties": {
      "files": [{"uri": "0.png", "type": "image/png"}],
      "category": "image"
    }
  }
' "$NFTS_DIR/0.json" > "$NFTS_DIR/0.json.tmp" && mv "$NFTS_DIR/0.json.tmp" "$NFTS_DIR/0.json"
echo "fixed 0.json"

# Fix 1.json through 18.json
for i in $(seq 1 18); do
  FILE="$NFTS_DIR/$i.json"
  IMG="$i.png"
  jq --arg desc "$DESC" --arg url "$URL" --arg img "$IMG" '
    del(.collection) |
    . + {
      "description": $desc,
      "external_url": $url,
      "properties": {
        "files": [{"uri": $img, "type": "image/png"}],
        "category": "image"
      }
    }
  ' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
  echo "fixed $i.json"
done

echo "done - 19 files updated"
