#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# Exit on first error
set -e

# don't rewrite paths for Windows Git Bash users
# export MSYS_NO_PATHCONV=1
# CC_RUNTIME_LANGUAGE=node # chaincode runtime language is node.js
# CC_SRC_PATH=./chaincode

# clean the keystore
# rm -rf ./hfc-key-store

# voters file
# echo "[]" > 'javascript/voters.json'
# echo '[{"candidateId":0,"name":"NOTA"}]' > 'javascript/candidates.json'

# launch network; create channel and join peer to channel
./network.sh up createChannel -c pemirastischannel -ca

#deploy chaincode
./network.sh deployCC -c pemirastischannel -ccn pemiraChaincode -ccp ../chaincode-javascript -ccl javascript -ccv "1.0" -ccs "1" -cci "NA" -ccep "AND('PemilihanMSP.peer')" -cccg "NA"
# ./network.sh deployCC -c pemirastischannel -ccn pemiraChaincode -ccp ../chaincode-javascript -ccl javascript 

# Now launch the CLI container in order to install, instantiate chaincode and submit initLedger txn
# docker-compose -f docker/docker-compose-network.yaml up -d cli
