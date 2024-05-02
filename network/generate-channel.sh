#!/bin/bash

# imports  
source ./.env
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx

# ---------------------------------------------------------------------------
# Clear screen
# ---------------------------------------------------------------------------
clear

echo 
echo "# ---------------------------------------------------------------------------"
echo "# Create Channel"
echo "# ---------------------------------------------------------------------------"
    scripts/createChannel.sh $CHANNEL_NAME
