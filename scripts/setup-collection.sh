#!/bin/bash

die() { echo "ERROR: $1"; exit 1; }

run() {
  echo "--- running: $*"
  "$@" 2>&1
  echo "--- exit: $?"
}

extract_irys_uri() {
  grep -oE 'https://gateway\.irys\.xyz/[A-Za-z0-9_-]+' | head -1
}

extract_core_addr() {
  grep -oE 'core\.metaplex\.com/explorer/[A-Za-z0-9]+' | grep -oE '[A-Za-z0-9]+$' | head -1
}

echo "==> [1/4] Uploading collection image..."
IMG_OUTPUT=$(run mplx toolbox storage upload ./nfts/collection.png)
echo "$IMG_OUTPUT"
COLL_IMG_URI=$(echo "$IMG_OUTPUT" | extract_irys_uri)
[ -z "$COLL_IMG_URI" ] && die "no Irys URI in image upload output — check above"
echo "    -> $COLL_IMG_URI"

echo ""
echo "==> [2/4] Updating collection.json and uploading..."
jq --arg uri "$COLL_IMG_URI" '.image = $uri | .properties.files[0].uri = $uri' \
  ./nfts/collection.json > ./nfts/collection.json.tmp && mv ./nfts/collection.json.tmp ./nfts/collection.json

META_OUTPUT=$(run mplx toolbox storage upload ./nfts/collection.json)
echo "$META_OUTPUT"
COLL_META_URI=$(echo "$META_OUTPUT" | extract_irys_uri)
[ -z "$COLL_META_URI" ] && die "no Irys URI in metadata upload output — check above"
echo "    -> $COLL_META_URI"

echo ""
echo "==> [3/4] Creating Core collection..."
COLL_OUTPUT=$(run mplx core collection create \
  --name "Toxic Ponzilio Boyfriends" \
  --uri "$COLL_META_URI" \
  --pluginsFile ./candy-machine/plugins.json)
echo "$COLL_OUTPUT"
COLLECTION_ADDR=$(echo "$COLL_OUTPUT" | extract_core_addr)
[ -z "$COLLECTION_ADDR" ] && die "could not extract collection address — copy it manually into candy-machine/cm-config.json"
echo "    -> $COLLECTION_ADDR"

echo ""
echo "==> [4/4] Patching cm-config.json..."
jq --arg addr "$COLLECTION_ADDR" '.config.collection = $addr' \
  ./candy-machine/cm-config.json > ./candy-machine/cm-config.json.tmp && \
  mv ./candy-machine/cm-config.json.tmp ./candy-machine/cm-config.json

echo ""
echo "Done."
echo "  Collection : $COLLECTION_ADDR"
echo "  Image URI  : $COLL_IMG_URI"
echo "  Meta URI   : $COLL_META_URI"
