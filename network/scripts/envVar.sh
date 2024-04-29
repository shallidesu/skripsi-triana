#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This is a collection of bash functions used by different scripts

# imports
. scripts/utils.sh

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/pemira.com/tlsca/tlsca.pemira.com-cert.pem
export PEER0_PEMILIHAN_CA=${PWD}/organizations/peerOrganizations/pemilihan.pemira.com/tlsca/tlsca.pemilihan.pemira.com-cert.pem
export PEMILIHAN_MSP=${PWD}/organizations/peerOrganizations/pemilihan.pemira.com/users/Admin@pemilihan.pemira.com/msp

# Set environment variables for the peer org
setGlobals() {
  PEER=$1
  export CORE_PEER_LOCALMSPID="PemilihanMSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_PEMILIHAN_CA
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/pemilihan.pemira.com/users/Admin@pemilihan.pemira.com/msp
  if [ $PEER -eq 0 ]; then
    export CORE_PEER_ADDRESS=localhost:7051
  elif [ $PEER -eq 1 ]; then
    export CORE_PEER_ADDRESS=localhost:8051
  else
    errorln "PEER Unknown"
  fi

  if [ "$VERBOSE" == "true" ]; then
    env | grep CORE
  fi
}

#environment variables for orderer service
setGlobalsForOrderer() {
  export CORE_PEER_LOCALMSPID="OrdererMSP"
  export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/pemira.com/orderers/orderer.pemira.com/tls/server.crt
  export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/pemira.com/orderers/orderer.pemira.com/tls/server.key
}

setGlobalsCLI() {
  setGlobals 0

  local USING_ORG=""
  PEER=$1
  export CORE_PEER_ADDRESS=localhost:7051
  # if [ -z "$OVERRIDE_ORG" ]; then
  #   USING_ORG=$2
  # else
  #   USING_ORG="${OVERRIDE_ORG}"
  # fi
  # if [ $USING_ORG -eq 1 ]; then
  #   if [ $PEER -eq 0 ]; then
  #     export CORE_PEER_ADDRESS=peer0.pemilihan.pemira.com:7051
  #   elif [ $PEER -eq 1 ]; then
  #     export CORE_PEER_ADDRESS=peer1.pemilihan.pemira.com:8051
  #   elif [ $PEER -eq 2 ]; then
  #     export CORE_PEER_ADDRESS=peer2.pemilihan.pemira.com:9051
  #   else
  #     errorln "Peer Unknown"
  #   fi
  # else
  #   errorln "ORG Unknown"
  # fi
}

parsePeerConnectionParameters() {
  PEER_CONN_PARMS=""
  PEERS=""
  while [ "$#" -gt 0 ]; do
    setGlobals 0
    PEER="peer0.pemilihan"
    ## Set peer addresses
    if [ -z "$PEERS" ]
    then
	    PEERS="$PEER"
    else
	    PEERS="$PEERS $PEER"
    fi
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" --peerAddresses $CORE_PEER_ADDRESS)
    ## Set path to TLS certificate
    CA=PEER0_PEMILIHAN_CA
    TLSINFO=(--tlsRootCertFiles "${!CA}")
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" "${TLSINFO[@]}")
    # shift by one to get to the next organization
    shift
  done
  # remove leading space for output
  PEERS="$(echo -e "$PEERS" | sed -e 's/^[[:space:]]*//')"
}


verifyResult() {
  if [ $1 -ne 0 ]; then
    fatalln "$2"
  fi
}
