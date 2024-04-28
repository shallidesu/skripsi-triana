#!/bin/bash

export PATH=${ROOTDIR}/../bin:${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx

# ---------------------------------------------------------------------------
# Clear screen
# ---------------------------------------------------------------------------
clear

if [ -d "organizations/peerOrganizations" ]; then
    echo "# ---------------------------------------------------------------------------"
    echo "# Remove old artifacts"
    echo "# ---------------------------------------------------------------------------"
    rm -Rf organizations/peerOrganizations && rm -Rf organizations/ordererOrganizations
fi

# ---------------------------------------------------------------------------
# Create crypto material using Fabric CA
# ---------------------------------------------------------------------------
echo 
echo "# ---------------------------------------------------------------------------"
echo "# Generating certificates using Fabric CA"
echo "# ---------------------------------------------------------------------------"
docker stack deploy -c docker/docker-compose-ca.yaml hlf 2>&1
. organizations/fabric-ca/registerEnroll.sh

while :
  do
    if [ ! -f "organizations/fabric-ca/pemilihan/tls-cert.pem" ]; then
      sleep 1
    else
      break
    fi
  done

echo
echo "# ---------------------------------------------------------------------------"
echo "# Creating Pemilihan Identities"
createPemilihan
echo "# ---------------------------------------------------------------------------"
echo "# Creating Orderer Org Identities"
createOrderer

echo
echo "# ---------------------------------------------------------------------------"
echo "# Generating CCP files for Pemilihan"
./organizations/ccp-generate.sh