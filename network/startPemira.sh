#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# Exit on first error
set -e

# launch network; create channel and join peer to channel
# ./network.sh up 
# ./network.sh createChannel -c pemirastischannel -ca

#deploy chaincode
# ./network.sh deployCC -c pemirastischannel -ccn pemiraChaincode -ccp ../chaincode-javascript -ccl javascript -ccv "1.0" -ccs "1" -cci "NA" -ccep "AND('PemilihanMSP.peer')" -cccg "NA"
./network.sh deployCC -c pemirastischannel -ccn pemiraChaincode -ccp ../chaincode-javascript -ccl javascript 
