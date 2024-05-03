#!/bin/bash

# imports  
source ./.env
source ./scripts/utils.sh

export PATH=${ROOTDIR}/../bin:${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx

# ---------------------------------------------------------------------------
# Clear screen
# ---------------------------------------------------------------------------
clear

echo 
echo "# ---------------------------------------------------------------------------"
echo "# Deploy Chaincode"
echo "# ---------------------------------------------------------------------------"
    ./scripts/deployCC.sh $CHANNEL_NAME $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION $CC_SEQUENCE $CC_INIT_FCN $CC_END_POLICY $CC_COLL_CONFIG $CLI_DELAY $MAX_RETRY $VERBOSE
    if [ $? -ne 0 ]; then
        fatalln "Deploying chaincode failed"
    fi